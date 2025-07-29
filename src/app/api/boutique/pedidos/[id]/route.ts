import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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