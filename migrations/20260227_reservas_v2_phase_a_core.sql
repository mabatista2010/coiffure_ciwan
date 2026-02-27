-- Reservas V2.1 - Fase A (alineación núcleo BD)
-- Objetivo:
-- 1) Incluir needs_replan como estado de booking válido y bloqueante en no-solape.
-- 2) Añadir categorización en time_off.
-- 3) Crear location_closures con RLS staff-read/admin-write.
-- 4) Materializar claves operativas en configuracion.

begin;

-- 1) bookings.status: añadir needs_replan
alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'needs_replan', 'cancelled', 'completed'));

-- 2) bookings_no_overlap: needs_replan también bloquea hueco
alter table public.bookings
  drop constraint if exists bookings_no_overlap;

alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    stylist_id with =,
    slot_range with &&
  )
  where (status in ('pending', 'confirmed', 'needs_replan'));

-- 3) time_off.category: dominio controlado
alter table public.time_off
  add column if not exists category text;

update public.time_off
set category = 'bloqueo_operativo'
where category is null;

alter table public.time_off
  alter column category set default 'bloqueo_operativo';

alter table public.time_off
  alter column category set not null;

alter table public.time_off
  drop constraint if exists time_off_category_check;

alter table public.time_off
  add constraint time_off_category_check
  check (category in ('vacaciones', 'baja', 'descanso', 'formacion', 'bloqueo_operativo'));

-- 4) location_closures: cierres excepcionales por centro/fecha
create table if not exists public.location_closures (
  id uuid primary key default uuid_generate_v4(),
  location_id uuid not null references public.locations(id) on delete cascade,
  closure_date date not null,
  start_time time without time zone null,
  end_time time without time zone null,
  reason text null,
  created_at timestamptz not null default now(),
  created_by uuid null,
  constraint location_closures_time_window_check
    check (
      (start_time is null and end_time is null)
      or
      (start_time is not null and end_time is not null and start_time < end_time)
    )
);

create index if not exists idx_location_closures_location_date_time
  on public.location_closures (location_id, closure_date, start_time, end_time);

alter table public.location_closures enable row level security;

-- Limpiar policies por idempotencia

drop policy if exists location_closures_staff_read on public.location_closures;
drop policy if exists location_closures_admin_insert on public.location_closures;
drop policy if exists location_closures_admin_update on public.location_closures;
drop policy if exists location_closures_admin_delete on public.location_closures;

create policy location_closures_staff_read
on public.location_closures
for select
to authenticated
using (public.current_user_role() in ('admin', 'employee'));

create policy location_closures_admin_insert
on public.location_closures
for insert
to authenticated
with check (public.current_user_role() = 'admin');

create policy location_closures_admin_update
on public.location_closures
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy location_closures_admin_delete
on public.location_closures
for delete
to authenticated
using (public.current_user_role() = 'admin');

grant select on public.location_closures to authenticated;
grant insert, update, delete on public.location_closures to authenticated;
grant all on public.location_closures to service_role;

-- 5) Configuración operativa de reservas
insert into public.configuracion (clave, valor, descripcion)
values
  ('booking_slot_interval_minutes', '15', 'Intervalo de slots de reservas en minutos'),
  ('booking_buffer_minutes', '0', 'Buffer entre reservas en minutos'),
  ('booking_max_advance_days', '90', 'Máximo de días de antelación para reservar'),
  ('booking_min_advance_hours', '2', 'Mínimo de horas de antelación para reservar'),
  ('business_timezone', 'Europe/Zurich', 'Zona horaria de negocio para reglas de reservas')
on conflict (clave)
do update set
  valor = excluded.valor,
  descripcion = excluded.descripcion,
  updated_at = now();

commit;
