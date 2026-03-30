import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

import { insertAdminAuditLog } from '@/lib/admin/audit';
import { requireStaffAuth } from '@/lib/apiAuth';
import { getStaffAccessContext, hasPermission } from '@/lib/permissions/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

type ProductPayload = {
  nombre?: string;
  descripcion?: string | null;
  precio?: number;
  precio_original?: number | null;
  stock?: number;
  categoria?: string | null;
  imagen_url?: string | null;
  activo?: boolean;
  destacado?: boolean;
  orden?: number;
};

function requiresBusinessPermission(currentProduct: ProductPayload, nextProduct: ProductPayload) {
  return (
    currentProduct.precio !== nextProduct.precio ||
    currentProduct.precio_original !== nextProduct.precio_original ||
    currentProduct.stock !== nextProduct.stock ||
    currentProduct.activo !== nextProduct.activo
  );
}

function requiresContentPermission(currentProduct: ProductPayload, nextProduct: ProductPayload) {
  return (
    currentProduct.nombre !== nextProduct.nombre ||
    currentProduct.descripcion !== nextProduct.descripcion ||
    currentProduct.categoria !== nextProduct.categoria ||
    currentProduct.imagen_url !== nextProduct.imagen_url ||
    currentProduct.destacado !== nextProduct.destacado ||
    currentProduct.orden !== nextProduct.orden
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      requiredPermission: 'boutique.catalog.view',
      feature: 'boutique_product_detail',
    });
    if ('response' in auth) {
      return auth.response;
    }

    const { id } = await params;
    const { data: producto, error } = await supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error('Error fetching producto:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      requiredPermission: 'boutique.catalog.view',
      feature: 'boutique_product_update',
    });
    if ('response' in auth) {
      return auth.response;
    }

    const accessContext = await getStaffAccessContext(auth.userId);
    const { id } = await params;
    const body = (await request.json()) as ProductPayload;
    const { nombre, descripcion, precio, precio_original, stock, categoria, imagen_url, activo, destacado, orden } = body;

    if (!nombre || !precio || precio <= 0) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const { data: currentProduct, error: fetchError } = await supabase
      .from('productos')
      .select('nombre, descripcion, precio, precio_original, stock, categoria, imagen_url, activo, destacado, orden, stripe_product_id, stripe_price_id')
      .eq('id', id)
      .single();

    if (fetchError || !currentProduct) {
      console.error('Error fetching current product:', fetchError);
      return NextResponse.json({ error: 'Erreur lors de la récupération du produit actuel' }, { status: 500 });
    }

    const nextProduct = {
      nombre,
      descripcion: descripcion ?? null,
      precio,
      precio_original: precio_original ?? null,
      stock: stock || 0,
      categoria: categoria ?? null,
      imagen_url: imagen_url ?? null,
      activo: activo ?? true,
      destacado: destacado ?? false,
      orden: orden || 0,
    };

    if (requiresContentPermission(currentProduct, nextProduct) && !hasPermission(accessContext, 'boutique.catalog.content.edit')) {
      return NextResponse.json({ error: 'Accès refusé', code: 'insufficient_permission' }, { status: 403 });
    }

    if (requiresBusinessPermission(currentProduct, nextProduct) && !hasPermission(accessContext, 'boutique.catalog.business.edit')) {
      return NextResponse.json({ error: 'Accès refusé', code: 'insufficient_permission' }, { status: 403 });
    }

    if (currentProduct.stripe_product_id) {
      try {
        await stripe.products.update(currentProduct.stripe_product_id, {
          name: nombre,
          description: descripcion || '',
          images: imagen_url ? [imagen_url] : [],
          metadata: {
            categoria: categoria || '',
            stock: stock?.toString() || '0',
          },
        });

        if (currentProduct.precio !== precio) {
          const newPrice = await stripe.prices.create({
            product: currentProduct.stripe_product_id,
            unit_amount: Math.round(precio * 100),
            currency: 'chf',
          });

          const { error: updatePriceError } = await supabase
            .from('productos')
            .update({ stripe_price_id: newPrice.id })
            .eq('id', id);

          if (updatePriceError) {
            console.error('Error updating stripe_price_id:', updatePriceError);
          }
        }
      } catch (stripeError) {
        console.error('Error updating producto in Stripe:', stripeError);
      }
    }

    const { data, error } = await supabase
      .from('productos')
      .update({
        ...nextProduct,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating producto in Supabase:', error);
      return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
    }

    await insertAdminAuditLog({
      actorUserId: auth.userId,
      entityType: 'productos',
      entityId: String(id),
      action: 'update',
      before: currentProduct,
      after: data,
      meta: {
        source: 'boutique_productos_api',
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in productos PUT API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      requiredPermission: 'boutique.catalog.delete',
      feature: 'boutique_product_delete',
    });
    if ('response' in auth) {
      return auth.response;
    }

    const { id } = await params;
    const { data: producto, error: fetchError } = await supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching product for deletion:', fetchError);
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    if (producto.activo === false) {
      return NextResponse.json({ message: 'Produit déjà retiré', producto, alreadyInactive: true });
    }

    const { error } = await supabase
      .from('productos')
      .update({
        activo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error deactivating producto from Supabase:', error);
      return NextResponse.json({ error: 'Erreur lors du retrait du produit' }, { status: 500 });
    }

    await insertAdminAuditLog({
      actorUserId: auth.userId,
      entityType: 'productos',
      entityId: String(id),
      action: 'deactivate',
      before: producto,
      after: {
        ...producto,
        activo: false,
      },
      meta: {
        source: 'boutique_productos_api',
      },
    });

    return NextResponse.json({ message: 'Produit retiré du catalogue' });
  } catch (error) {
    console.error('Error in productos DELETE API:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
