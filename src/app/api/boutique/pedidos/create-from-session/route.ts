import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID requerido' }, { status: 400 });
    }

    // Verificar si el pedido ya existe
    const { data: existingPedido } = await supabase
      .from('pedidos')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .single();

    if (existingPedido) {
      return NextResponse.json({ 
        success: true, 
        pedidoId: existingPedido.id,
        message: 'Pedido ya existe' 
      });
    }

    // Obtener la sesión de Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    // Verificar que el pago fue exitoso
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ 
        error: 'El pago no fue completado exitosamente' 
      }, { status: 400 });
    }

    // Extraer datos del pedido desde los metadatos
    const metadata = session.metadata;
    if (!metadata) {
      return NextResponse.json({ 
        error: 'No se encontraron datos del pedido en la sesión' 
      }, { status: 400 });
    }

    const customerName = metadata.customer_name;
    const customerEmail = metadata.customer_email;
    const customerPhone = metadata.customer_phone || null;
    const customerAddress = metadata.customer_address || null;
    const total = parseFloat(metadata.total || '0');
    const itemsData = JSON.parse(metadata.items || '[]');

    if (!customerName || !customerEmail || !total || itemsData.length === 0) {
      return NextResponse.json({ 
        error: 'Datos incompletos en la sesión' 
      }, { status: 400 });
    }

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
          estado: 'pagado',
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_session_id: session.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (pedidoError) {
      console.error('Error creating pedido:', pedidoError);
      return NextResponse.json({ 
        error: 'Error al crear el pedido en la base de datos' 
      }, { status: 500 });
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
      return NextResponse.json({ 
        error: 'Error al crear los items del pedido' 
      }, { status: 500 });
    }

    console.log('Pedido creado manualmente desde fallback:', pedido.id);

    return NextResponse.json({
      success: true,
      pedidoId: pedido.id,
      message: 'Pedido creado exitosamente'
    });

  } catch (error) {
    console.error('Error in create-from-session API:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
} 