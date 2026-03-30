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

function hasBearerToken(request: Request) {
  const authorization = request.headers.get('authorization');
  return Boolean(authorization && authorization.startsWith('Bearer '));
}

export async function GET(request: Request) {
  try {
    const query = supabase.from('productos').select('*').order('orden', { ascending: true });

    if (!hasBearerToken(request)) {
      const { data: productos, error } = await query.eq('activo', true);

      if (error) {
        console.error('Error fetching productos:', error);
        return NextResponse.json({ error: 'Erreur lors de la récupération des produits' }, { status: 500 });
      }

      return NextResponse.json(productos);
    }

    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      requiredPermission: 'boutique.catalog.view',
      feature: 'boutique_product_list_admin',
    });
    if ('response' in auth) {
      return auth.response;
    }

    const { data: productos, error } = await query;

    if (error) {
      console.error('Error fetching productos:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des produits' }, { status: 500 });
    }

    return NextResponse.json(productos);
  } catch (error) {
    console.error('Error in productos API:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      requiredPermission: 'boutique.catalog.content.edit',
      feature: 'boutique_product_create',
    });
    if ('response' in auth) {
      return auth.response;
    }

    const accessContext = await getStaffAccessContext(auth.userId);
    if (!hasPermission(accessContext, 'boutique.catalog.business.edit')) {
      return NextResponse.json({ error: 'Accès refusé', code: 'insufficient_permission' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, descripcion, precio, precio_original, stock, categoria, imagen_url, activo, destacado, orden } = body;

    if (!nombre || !precio || precio <= 0) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    let stripeProductId = null;
    let stripePriceId = null;

    try {
      const stripeProduct = await stripe.products.create({
        name: nombre,
        description: descripcion || '',
        images: imagen_url ? [imagen_url] : [],
        metadata: {
          categoria: categoria || '',
          stock: stock?.toString() || '0',
        },
      });

      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(precio * 100),
        currency: 'chf',
      });

      stripeProductId = stripeProduct.id;
      stripePriceId = stripePrice.id;
    } catch (stripeError) {
      console.error('Error creando producto en Stripe:', stripeError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du produit dans Stripe. Vérifiez votre configuration Stripe.' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('productos')
      .insert([
        {
          nombre,
          descripcion,
          precio,
          precio_original,
          stock: stock || 0,
          categoria,
          imagen_url,
          stripe_product_id: stripeProductId,
          stripe_price_id: stripePriceId,
          activo: activo ?? true,
          destacado: destacado ?? false,
          orden: orden ?? 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating producto in Supabase:', error);

      if (stripeProductId) {
        try {
          await stripe.products.del(stripeProductId);
        } catch (deleteError) {
          console.error('Erreur lors de la suppression du produit de Stripe:', deleteError);
        }
      }

      return NextResponse.json({ error: 'Erreur lors de la création du produit dans la base de données' }, { status: 500 });
    }

    await insertAdminAuditLog({
      actorUserId: auth.userId,
      entityType: 'productos',
      entityId: String(data.id),
      action: 'create',
      before: null,
      after: data,
      meta: {
        source: 'boutique_productos_api',
      },
    });

    return NextResponse.json({
      ...data,
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
    });
  } catch (error) {
    console.error('Error in productos POST API:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
