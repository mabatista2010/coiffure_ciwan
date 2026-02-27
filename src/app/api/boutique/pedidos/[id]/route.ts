import { NextRequest, NextResponse } from 'next/server';
import { requireStaffAuth } from '@/lib/apiAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin'],
      feature: 'boutique_pedido_detail',
    });
    if ('response' in auth) {
      return auth.response;
    }

    const supabase = getSupabaseAdminClient();
    const { id } = await params;
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
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching pedido:', error);
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    return NextResponse.json(pedido);
  } catch (error) {
    console.error('Error in pedidos API:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin'],
      feature: 'boutique_pedido_update',
    });
    if ('response' in auth) {
      return auth.response;
    }

    const supabase = getSupabaseAdminClient();
    const { id } = await params;
    const body = await request.json();
    const { estado } = body;

    // Validar que el estado sea válido
    const estadosValidos = ['pendiente', 'en_traitement', 'traite'];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json(
        { error: 'Estado no válido' },
        { status: 400 }
      );
    }

    // Actualizar el pedido
    const { data, error } = await supabase
      .from('pedidos')
      .update({ 
        estado,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating pedido:', error);
      return NextResponse.json(
        { error: 'Error al actualizar el pedido' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in pedido update API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 
