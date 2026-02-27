-- Fase B/C/D del plan de hardening post-robustez.
-- Objetivo:
-- 1) Eliminar policies permisivas FOR ALL USING true.
-- 2) Activar RLS en tablas publicas pendientes.
-- 3) Definir autorizacion explicita por rol (admin/employee).
-- 4) Endurecer funciones SECURITY DEFINER con search_path fijo.

begin;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select ur.role::text
  from public.user_roles ur
  where ur.id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into public.user_roles (id, role)
  values (new.id, 'employee')
  on conflict (id) do nothing;
  return new;
end;
$function$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

alter table public.location_hours enable row level security;
alter table public.productos enable row level security;
alter table public.categorias_productos enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'configuracion',
        'imagenes_galeria',
        'locations',
        'servicios',
        'stylist_services',
        'stylists',
        'time_off',
        'working_hours',
        'location_hours',
        'productos',
        'categorias_productos'
      )
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_record.policyname,
      policy_record.tablename
    );
  end loop;
end $$;

create policy configuracion_public_read
on public.configuracion
for select
to public
using (true);

create policy imagenes_galeria_public_read
on public.imagenes_galeria
for select
to public
using (true);

create policy locations_public_read
on public.locations
for select
to public
using (true);

create policy servicios_public_read
on public.servicios
for select
to public
using (true);

create policy stylist_services_public_read
on public.stylist_services
for select
to public
using (true);

create policy stylists_public_read
on public.stylists
for select
to public
using (true);

create policy working_hours_public_read
on public.working_hours
for select
to public
using (true);

create policy location_hours_public_read
on public.location_hours
for select
to public
using (true);

create policy time_off_staff_read
on public.time_off
for select
to authenticated
using (public.current_user_role() in ('admin', 'employee'));

create policy productos_admin_read
on public.productos
for select
to authenticated
using (public.current_user_role() = 'admin');

create policy categorias_productos_admin_read
on public.categorias_productos
for select
to authenticated
using (public.current_user_role() = 'admin');

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'configuracion',
    'imagenes_galeria',
    'locations',
    'servicios',
    'stylist_services',
    'stylists',
    'time_off',
    'working_hours',
    'location_hours',
    'productos',
    'categorias_productos'
  ]
  loop
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.current_user_role() = ''admin'')',
      target_table || '_admin_insert',
      target_table
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.current_user_role() = ''admin'') with check (public.current_user_role() = ''admin'')',
      target_table || '_admin_update',
      target_table
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.current_user_role() = ''admin'')',
      target_table || '_admin_delete',
      target_table
    );
  end loop;
end $$;

commit;
