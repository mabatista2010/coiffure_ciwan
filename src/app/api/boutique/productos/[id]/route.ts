import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params;
    const body = await request.json();
    const { nombre, descripcion, precio, precio_original, stock, categoria, imagen_url, activo, destacado, orden } = body;

    // Validaciones básicas
    if (!nombre || !precio || precio <= 0) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    // Obtener el producto actual para verificar si tiene IDs de Stripe
    const { data: currentProduct, error: fetchError } = await supabase
      .from('productos')
      .select('stripe_product_id, stripe_price_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching current product:', fetchError);
      return NextResponse.json({ error: 'Erreur lors de la récupération du produit actuel' }, { status: 500 });
    }

    // Actualizar producto en Stripe si existe
    if (currentProduct?.stripe_product_id) {
      try {
        // Actualizar el producto en Stripe
        await stripe.products.update(currentProduct.stripe_product_id, {
          name: nombre,
          description: descripcion || '',
          images: imagen_url ? [imagen_url] : [],
          metadata: {
            categoria: categoria || '',
            stock: stock?.toString() || '0'
          }
        });

        // Si el precio cambió, crear un nuevo precio en Stripe
        if (precio) {
          const newPrice = await stripe.prices.create({
            product: currentProduct.stripe_product_id,
            unit_amount: Math.round(precio * 100), // Convertir a centavos
            currency: 'eur',
          });

          // Actualizar el stripe_price_id en la base de datos
          const { error: updatePriceError } = await supabase
            .from('productos')
            .update({ stripe_price_id: newPrice.id })
            .eq('id', id);

          if (updatePriceError) {
            console.error('Error updating stripe_price_id:', updatePriceError);
          }

          console.log('Nuevo precio creado en Stripe:', newPrice.id);
        }

        console.log('Producto actualizado en Stripe:', currentProduct.stripe_product_id);

      } catch (stripeError) {
        console.error('Error updating producto in Stripe:', stripeError);
        // Continuar con la actualización en Supabase aunque falle Stripe
      }
    }

    // Actualizar producto en Supabase
    const { data, error } = await supabase
      .from('productos')
      .update({
        nombre,
        descripcion,
        precio,
        precio_original,
        stock: stock || 0,
        categoria,
        imagen_url,
        activo,
        destacado,
        orden: orden || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating producto in Supabase:', error);
      return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
    }

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
    const { id } = await params;
    // Obtener el producto para verificar si tiene ID de Stripe
    const { data: producto, error: fetchError } = await supabase
      .from('productos')
      .select('stripe_product_id, nombre')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching product for deletion:', fetchError);
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    console.log('Producto a eliminar:', producto);

    // Eliminar referencias en items_carrito primero
    const { error: carritoError } = await supabase
      .from('items_carrito')
      .delete()
      .eq('producto_id', id);

    if (carritoError) {
      console.error('Error deleting items_carrito:', carritoError);
      return NextResponse.json({ 
        error: 'No se puede eliminar el producto porque está en carritos activos' 
      }, { status: 400 });
    }

    // Eliminar referencias en items_pedido
    const { error: pedidoError } = await supabase
      .from('items_pedido')
      .delete()
      .eq('producto_id', id);

    if (pedidoError) {
      console.error('Error deleting items_pedido:', pedidoError);
      return NextResponse.json({ 
        error: 'No se puede eliminar el producto porque está en pedidos existentes' 
      }, { status: 400 });
    }

    // Eliminar producto de Stripe si existe
    if (producto?.stripe_product_id) {
      try {
        console.log('Intentando eliminar de Stripe:', producto.stripe_product_id);
        await stripe.products.del(producto.stripe_product_id);
        console.log('✅ Producto eliminado de Stripe:', producto.stripe_product_id);
      } catch (stripeError) {
        console.error('❌ Error deleting producto from Stripe:', stripeError);
        // Si es un error de producto no encontrado, continuar
        if (stripeError instanceof Stripe.errors.StripeError && stripeError.code === 'resource_missing') {
          console.log('Producto ya no existe en Stripe, continuando...');
        } else {
          // Para otros errores, devolver el error
          const errorMessage = stripeError instanceof Error ? stripeError.message : 'Error desconocido de Stripe';
          return NextResponse.json({ 
            error: `Error al eliminar de Stripe: ${errorMessage}` 
          }, { status: 500 });
        }
      }
    } else {
      console.log('⚠️ Producto no tiene stripe_product_id, saltando eliminación de Stripe');
    }

    // Eliminar producto de Supabase
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting producto from Supabase:', error);
      return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error in productos DELETE API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 