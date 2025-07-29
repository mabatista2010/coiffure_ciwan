import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CartItem {
  id: number;
  precio: number;
  cantidad: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, customerInfo } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Panier vide' }, { status: 400 });
    }

    if (!customerInfo || !customerInfo.nombre || !customerInfo.email) {
      return NextResponse.json({ error: 'Informations client requises' }, { status: 400 });
    }

    // Calcular total
    const total = items.reduce((sum: number, item: CartItem) => sum + (item.precio * item.cantidad), 0);

    // Crear pedido en la base de datos
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert([
        {
          cliente_nombre: customerInfo.nombre,
          cliente_email: customerInfo.email,
          cliente_telefono: customerInfo.telefono || null,
          cliente_direccion: customerInfo.direccion || null,
          total,
          estado: 'pendiente'
        }
      ])
      .select()
      .single();

    if (pedidoError) {
      console.error('Error creating pedido:', pedidoError);
      return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 });
    }

    // Crear items del pedido
    const itemsPedido = items.map((item: CartItem) => ({
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
      return NextResponse.json({ error: 'Erreur lors de la création des articles de la commande' }, { status: 500 });
    }

    // Aquí se integraría con Stripe para crear la sesión de pago
    // Por ahora, simulamos la respuesta
    const stripeSession = {
      id: `cs_${Date.now()}`,
      url: `/checkout/success?pedido_id=${pedido.id}`
    };

    // Actualizar pedido con el ID de sesión de Stripe
    await supabase
      .from('pedidos')
      .update({ stripe_session_id: stripeSession.id })
      .eq('id', pedido.id);

    return NextResponse.json({
      sessionId: stripeSession.id,
      pedidoId: pedido.id,
      successUrl: stripeSession.url
    });

  } catch (error) {
    console.error('Error in checkout API:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
} 