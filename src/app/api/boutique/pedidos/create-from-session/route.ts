import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { timingSafeEqual } from 'crypto';

interface PedidoItem {
  id: number;
  precio: number;
  cantidad: number;
}

interface PedidoSummary {
  id: number;
  total: number | string;
  estado: string;
  created_at: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505';
}

function isValidSyncToken(token: string): boolean {
  return /^[a-f0-9]{32,128}$/i.test(token);
}

function syncTokenMatches(providedToken: string, expectedToken: string): boolean {
  const providedBuffer = Buffer.from(providedToken);
  const expectedBuffer = Buffer.from(expectedToken);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
    const syncToken = typeof body?.syncToken === 'string' ? body.syncToken.trim() : '';

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID requerido' }, { status: 400 });
    }

    if (!syncToken || !isValidSyncToken(syncToken)) {
      return NextResponse.json({ error: 'Token de sincronización inválido' }, { status: 401 });
    }

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

    const expectedSyncToken = (metadata.sync_token || '').trim();
    if (!expectedSyncToken || !syncTokenMatches(syncToken, expectedSyncToken)) {
      return NextResponse.json({
        error: 'Token de sincronización no válido'
      }, { status: 403 });
    }

    // Verificar si el pedido ya existe (solo después de validar sync_token)
    const { data: existingPedido, error: existingPedidoError } = await supabase
      .from('pedidos')
      .select('id,total,estado,created_at')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (existingPedidoError) {
      console.error('Error fetching existing pedido:', existingPedidoError);
      return NextResponse.json({
        error: 'Error al verificar pedido existente'
      }, { status: 500 });
    }

    if (existingPedido) {
      return NextResponse.json({
        success: true,
        pedidoId: existingPedido.id,
        pedido: existingPedido as PedidoSummary,
        message: 'Pedido ya existe'
      });
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
        return NextResponse.json({
          error: 'Items inválidos en la sesión'
        }, { status: 400 });
      }
      itemsData = parsedItems as PedidoItem[];
    } catch {
      return NextResponse.json({
        error: 'Items inválidos en la sesión'
      }, { status: 400 });
    }

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
          stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          stripe_session_id: session.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select('id,total,estado,created_at')
      .single();

    if (pedidoError) {
      if (isUniqueViolation(pedidoError)) {
        const { data: concurrentPedido, error: concurrentPedidoError } = await supabase
          .from('pedidos')
          .select('id,total,estado,created_at')
          .eq('stripe_session_id', session.id)
          .maybeSingle();

        if (!concurrentPedidoError && concurrentPedido) {
          return NextResponse.json({
            success: true,
            pedidoId: concurrentPedido.id,
            pedido: concurrentPedido as PedidoSummary,
            message: 'Pedido ya existe'
          });
        }
      }

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
      pedido: pedido as PedidoSummary,
      message: 'Pedido creado exitosamente'
    });

  } catch (error) {
    console.error('Error in create-from-session API:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
} 
