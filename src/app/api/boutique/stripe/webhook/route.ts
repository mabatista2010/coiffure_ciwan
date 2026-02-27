import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { headers } from 'next/headers';

interface PedidoItem {
  id: number;
  precio: number;
  cantidad: number;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505';
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!endpointSecret) {
      console.error('STRIPE_WEBHOOK_SECRET no configurado');
      return NextResponse.json({ error: 'Webhook secret no configurado' }, { status: 400 });
    }

    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err) {
    console.error('Error verificando webhook:', err);
    return NextResponse.json({ error: 'Error verificando webhook' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(failedPayment);
        break;

      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error procesando webhook:', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);

  try {
    const { data: existingPedido, error: existingPedidoError } = await supabase
      .from('pedidos')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (existingPedidoError) {
      console.error('Error buscando pedido existente por session_id:', existingPedidoError);
      return;
    }

    if (existingPedido) {
      console.log('Pedido ya procesado para session_id:', session.id);
      return;
    }

    // Extraer datos del pedido desde los metadatos
    const metadata = session.metadata;
    if (!metadata) {
      console.error('No metadata found in session:', session.id);
      return;
    }

    const customerName = metadata.customer_name;
    const customerEmail = metadata.customer_email;
    const customerPhone = metadata.customer_phone || null;
    const customerAddress = metadata.customer_address || null;
    const total = parseFloat(metadata.total || '0');
    let itemsData: PedidoItem[] = [];

    try {
      const parsedItems = JSON.parse(metadata.items || '[]');
      if (!Array.isArray(parsedItems)) {
        console.error('Items inválidos en metadata para session:', session.id);
        return;
      }
      itemsData = parsedItems as PedidoItem[];
    } catch {
      console.error('No se pudo parsear metadata.items para session:', session.id);
      return;
    }

    if (!customerName || !customerEmail || !total || itemsData.length === 0) {
      console.error('Datos incompletos en metadata:', metadata);
      return;
    }

    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

    // Crear el pedido en la base de datos
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert([
        {
          cliente_nombre: customerName,
          cliente_email: customerEmail,
          cliente_telefono: customerPhone,
          cliente_direccion: customerAddress,
          total,
          estado: 'pagado', // Ya está pagado porque el webhook se ejecuta después del pago exitoso
          stripe_payment_intent_id: paymentIntentId,
          stripe_session_id: session.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (pedidoError) {
      if (isUniqueViolation(pedidoError)) {
        console.log('Pedido ya insertado por otra operación concurrente:', session.id);
        return;
      }
      console.error('Error creating pedido:', pedidoError);
      return;
    }

    // Crear los items del pedido
    const itemsPedido = itemsData.map((item: PedidoItem) => ({
      pedido_id: pedido.id,
      producto_id: item.id,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
      subtotal: item.precio * item.cantidad
    }));

    const { error: itemsError } = await supabase
      .from('items_pedido')
      .insert(itemsPedido);

    if (itemsError) {
      console.error('Error creating items_pedido:', itemsError);
      return;
    }

    console.log('Pedido creado exitosamente:', pedido.id);

  } catch (error) {
    console.error('Error procesando checkout.session.completed:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id);

  // Buscar pedido por payment_intent_id
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (error) {
    console.error('Error buscando pedido:', error);
    return;
  }

  if (pedido) {
    // Actualizar estado del pedido
    const { error: updateError } = await supabase
      .from('pedidos')
      .update({ 
        estado: 'pagado',
        updated_at: new Date().toISOString()
      })
      .eq('id', pedido.id);

    if (updateError) {
      console.error('Error actualizando pedido:', updateError);
    } else {
      console.log('Pedido confirmado como pagado:', pedido.id);
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment intent failed:', paymentIntent.id);

  // Buscar pedido por payment_intent_id
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (error) {
    console.error('Error buscando pedido:', error);
    return;
  }

  if (pedido) {
    // Actualizar estado del pedido a 'fallido'
    const { error: updateError } = await supabase
      .from('pedidos')
      .update({ 
        estado: 'fallido',
        updated_at: new Date().toISOString()
      })
      .eq('id', pedido.id);

    if (updateError) {
      console.error('Error actualizando pedido:', updateError);
    } else {
      console.log('Pedido marcado como fallido:', pedido.id);
    }
  }
} 
