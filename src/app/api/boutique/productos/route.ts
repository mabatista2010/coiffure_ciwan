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

export async function GET() {
  try {
    const { data: productos, error } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

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
    const body = await request.json();
    const { nombre, descripcion, precio, precio_original, stock, categoria, imagen_url } = body;

    // Validaciones básicas
    if (!nombre || !precio || precio <= 0) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    // Crear producto en Stripe
    let stripeProductId = null;
    let stripePriceId = null;

    try {
      // Crear el producto en Stripe
      const stripeProduct = await stripe.products.create({
        name: nombre,
        description: descripcion || '',
        images: imagen_url ? [imagen_url] : [],
        metadata: {
          categoria: categoria || '',
          stock: stock?.toString() || '0'
        }
      });

      // Crear el precio en Stripe (convertir a centavos)
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(precio * 100), // Convertir a centavos
        currency: 'eur',
      });

      stripeProductId = stripeProduct.id;
      stripePriceId = stripePrice.id;

      console.log('Producto creado en Stripe:', stripeProduct.id);
      console.log('Precio creado en Stripe:', stripePrice.id);

    } catch (stripeError) {
      console.error('Error creando producto en Stripe:', stripeError);
      return NextResponse.json({ 
        error: 'Erreur lors de la création du produit dans Stripe. Vérifiez votre configuration Stripe.'
      }, { status: 500 });
    }

    // Crear producto en Supabase con los IDs de Stripe
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
          activo: true
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating producto in Supabase:', error);
      
      // Si falla en Supabase, intentar eliminar el producto de Stripe
      if (stripeProductId) {
        try {
          await stripe.products.del(stripeProductId);
          console.log('Produit supprimé de Stripe en raison d\'une erreur dans Supabase');
        } catch (deleteError) {
          console.error('Erreur lors de la suppression du produit de Stripe:', deleteError);
        }
      }
      
      return NextResponse.json({ error: 'Erreur lors de la création du produit dans la base de données' }, { status: 500 });
    }

    return NextResponse.json({
      ...data,
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId
    });

  } catch (error) {
    console.error('Error in productos POST API:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
} 