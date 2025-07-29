import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    const { data: pedido, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        items_pedido (
          *,
          productos (
            id,
            nombre,
            precio,
            imagen_url
          )
        )
      `)
      .eq('stripe_session_id', sessionId)
      .single();

    if (error) {
      console.error('Error fetching pedido by session:', error);
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    return NextResponse.json(pedido);
  } catch (error) {
    console.error('Error in pedidos session API:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
} 