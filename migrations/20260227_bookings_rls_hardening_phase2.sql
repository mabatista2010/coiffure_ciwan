-- Fase 2: endurecimiento de RLS en bookings.

alter table public.bookings enable row level security;

-- Limpiar policies anteriores (permisivas / duplicadas)
drop policy if exists "Permitir creación de reservas a público" on public.bookings;
drop policy if exists "Permitir lectura de propias reservas" on public.bookings;
drop policy if exists "Permitir gestión completa a usuarios autenticados de bookings" on public.bookings;

-- Limpieza defensiva por si ya existian nombres nuevos
drop policy if exists bookings_staff_select on public.bookings;
drop policy if exists bookings_staff_update on public.bookings;

-- Solo staff autenticado (admin/employee) puede leer reservas
create policy bookings_staff_select
  on public.bookings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.id = auth.uid()
        and ur.role in ('admin', 'employee')
    )
  );

-- Solo staff autenticado (admin/employee) puede actualizar reservas
create policy bookings_staff_update
  on public.bookings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.id = auth.uid()
        and ur.role in ('admin', 'employee')
    )
  )
  with check (
    exists (
      select 1
      from public.user_roles ur
      where ur.id = auth.uid()
        and ur.role in ('admin', 'employee')
    )
  );
