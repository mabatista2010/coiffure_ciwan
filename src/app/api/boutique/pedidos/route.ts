import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Obtener todos los pedidos
    const { data: pedidos, error: pedidosError } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });

    if (pedidosError) {
      console.error('Error fetching pedidos:', pedidosError);
      return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 });
    }

    // Para cada pedido, obtener sus items con información del producto
    const pedidosConItems = await Promise.all(
      pedidos.map(async (pedido) => {
        const { data: items, error: itemsError } = await supabase
          .from('items_pedido')
          .select(`
            *,
            producto:productos(nombre, imagen_url)
          `)
          .eq('pedido_id', pedido.id);

        if (itemsError) {
          console.error('Error fetching items for pedido:', pedido.id, itemsError);
          return { ...pedido, items: [] };
        }

        return { ...pedido, items };
      })
    );

    return NextResponse.json(pedidosConItems);
  } catch (error) {
    console.error('Error in pedidos API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 