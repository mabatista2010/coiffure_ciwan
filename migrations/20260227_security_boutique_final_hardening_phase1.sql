-- Fase final de hardening boutique tras robustez.
-- 1) Evitar duplicados de pedidos por stripe_session_id / stripe_payment_intent_id.
-- 2) Definir policies explicitas deny-by-default en tablas con RLS sin policies.

begin;

create unique index if not exists pedidos_stripe_session_id_unique_idx
on public.pedidos (stripe_session_id)
where stripe_session_id is not null;

create unique index if not exists pedidos_stripe_payment_intent_id_unique_idx
on public.pedidos (stripe_payment_intent_id)
where stripe_payment_intent_id is not null;

drop policy if exists pedidos_deny_all on public.pedidos;
create policy pedidos_deny_all
on public.pedidos
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists items_pedido_deny_all on public.items_pedido;
create policy items_pedido_deny_all
on public.items_pedido
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists carrito_sesiones_deny_all on public.carrito_sesiones;
create policy carrito_sesiones_deny_all
on public.carrito_sesiones
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists items_carrito_deny_all on public.items_carrito;
create policy items_carrito_deny_all
on public.items_carrito
for all
to anon, authenticated
using (false)
with check (false);

commit;
