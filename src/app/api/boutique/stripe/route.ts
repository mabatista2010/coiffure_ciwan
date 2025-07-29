import { NextResponse } from 'next/server';
import Stripe from 'stripe';

interface CartItem {
  id: number;
  precio: number;
  cantidad: number;
  stripe_price_id: string;
  nombre: string;
}

interface CustomerInfo {
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, customerInfo }: { items: CartItem[], customerInfo: CustomerInfo } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Carrito vacío' }, { status: 400 });
    }

    if (!customerInfo || !customerInfo.nombre || !customerInfo.email) {
      return NextResponse.json({ error: 'Información del cliente requerida' }, { status: 400 });
    }

    // Verificar que todos los items tengan stripe_price_id
    console.log('Items recibidos:', items);
    const itemsWithoutStripe = items.filter((item: CartItem) => !item.stripe_price_id);
    console.log('Items sin stripe_price_id:', itemsWithoutStripe);
    
    if (itemsWithoutStripe.length > 0) {
      console.log('Productos sin sincronizar:', itemsWithoutStripe.map(item => item.nombre));
      return NextResponse.json({ 
        error: 'Algunos productos no están sincronizados con Stripe. Por favor, contacta al administrador.' 
      }, { status: 400 });
    }

    // Calcular total
    const total = items.reduce((sum: number, item: CartItem) => sum + (item.precio * item.cantidad), 0);

    // NO crear pedido aquí - solo crear la sesión de Stripe
    // Los datos del pedido se pasarán en los metadatos para crearlo después del pago exitoso

    // Crear sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map((item: CartItem) => ({
        price: item.stripe_price_id,
        quantity: item.cantidad,
      })),
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/boutique/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/boutique/checkout`,
      customer_email: customerInfo.email,
      metadata: {
        // Datos del cliente para crear el pedido después del pago
        customer_name: customerInfo.nombre,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.telefono || '',
        customer_address: customerInfo.direccion || '',
        total: total.toString(),
        // Datos de los items serializados
        items: JSON.stringify(items.map((item: CartItem) => ({
          id: item.id,
          nombre: item.nombre,
          precio: item.precio,
          cantidad: item.cantidad,
          stripe_price_id: item.stripe_price_id
        })))
      },
      shipping_address_collection: {
        allowed_countries: ['ES', 'FR', 'DE', 'IT', 'PT', 'CH', 'AT', 'BE', 'NL', 'GB', 'US', 'CA'], // Países permitidos
      },
      phone_number_collection: {
        enabled: true,
      },
    });

    console.log('Stripe Checkout session created:', session.id);

    return NextResponse.json({
      sessionId: session.id,
      sessionUrl: session.url
    });

  } catch (error) {
    console.error('Error in Stripe checkout API:', error);
    
    // Si es un error de Stripe, devolver mensaje específico
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ 
        error: `Error de Stripe: ${error.message}` 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 