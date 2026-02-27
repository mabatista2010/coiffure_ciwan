import { NextResponse } from 'next/server';
import { requireStaffAuth } from '@/lib/apiAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin'],
      feature: 'boutique_pedido_by_session',
    });
    if ('response' in auth) {
      return auth.response;
    }

    const supabase = getSupabaseAdminClient();
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
