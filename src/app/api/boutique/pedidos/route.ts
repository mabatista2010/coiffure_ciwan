import { NextResponse } from 'next/server';

import { requireStaffAuth } from '@/lib/apiAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      requiredPermission: 'boutique.orders.view',
      feature: 'boutique_pedidos_list',
    });
    if ('response' in auth) {
      return auth.response;
    }

    const supabase = getSupabaseAdminClient();
    const { data: pedidos, error: pedidosError } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });

    if (pedidosError) {
      console.error('Error fetching pedidos:', pedidosError);
      return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 });
    }

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
