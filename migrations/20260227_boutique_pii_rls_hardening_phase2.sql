-- Fase 2: reducir exposición de PII en tablas boutique.
-- Se aplica enfoque deny-by-default (sin policies públicas).

alter table public.pedidos enable row level security;
alter table public.items_pedido enable row level security;
alter table public.carrito_sesiones enable row level security;
alter table public.items_carrito enable row level security;

-- Limpieza defensiva de posibles políticas públicas antiguas
-- (si no existen, no falla)
drop policy if exists pedidos_public_read on public.pedidos;
drop policy if exists pedidos_public_write on public.pedidos;
drop policy if exists carrito_sesiones_public_read on public.carrito_sesiones;
drop policy if exists carrito_sesiones_public_write on public.carrito_sesiones;
