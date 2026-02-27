# Runbook de Rollback (RLS/API Hardening)

## Cuándo usarlo
- Incidencia crítica tras deploy de hardening (admin boutique bloqueado, fallos masivos de lectura/escritura por RLS).

## Paso 1: rollback de código
1. Revertir commit de hardening en backend/API y frontend admin.
2. Redeploy inmediato.

## Paso 2: rollback de políticas RLS (si impacta producción)
Ejecutar en Supabase SQL Editor:

```sql
begin;

-- Quitar políticas nuevas en tablas afectadas
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'configuracion','imagenes_galeria','locations','servicios',
        'stylist_services','stylists','time_off','working_hours',
        'location_hours','productos','categorias_productos'
      )
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Restauración mínima de servicio (lectura pública + ALL authenticated legacy)
create policy "legacy_config_public_read" on public.configuracion for select to anon using (true);
create policy "legacy_config_auth_all" on public.configuracion for all to authenticated using (true) with check (true);

create policy "legacy_gallery_public_read" on public.imagenes_galeria for select to anon using (true);
create policy "legacy_gallery_auth_all" on public.imagenes_galeria for all to authenticated using (true) with check (true);

create policy "legacy_locations_public_read" on public.locations for select to public using (true);
create policy "legacy_locations_auth_all" on public.locations for all to authenticated using (true) with check (true);

create policy "legacy_services_public_read" on public.servicios for select to anon using (true);
create policy "legacy_services_auth_all" on public.servicios for all to authenticated using (true) with check (true);

create policy "legacy_stylists_public_read" on public.stylists for select to public using (true);
create policy "legacy_stylists_auth_all" on public.stylists for all to authenticated using (true) with check (true);

create policy "legacy_stylist_services_public_read" on public.stylist_services for select to public using (true);
create policy "legacy_stylist_services_auth_all" on public.stylist_services for all to authenticated using (true) with check (true);

create policy "legacy_working_hours_public_read" on public.working_hours for select to public using (true);
create policy "legacy_working_hours_auth_all" on public.working_hours for all to authenticated using (true) with check (true);

create policy "legacy_time_off_auth_all" on public.time_off for all to authenticated using (true) with check (true);

-- Volver al estado pre-hardening de RLS disabled
alter table public.location_hours disable row level security;
alter table public.productos disable row level security;
alter table public.categorias_productos disable row level security;

commit;
```

## Paso 3: validación post-rollback
1. Confirmar `/admin/boutique` operativo.
2. Confirmar checkout success y reserva pública operativos.
3. Ejecutar advisors y registrar que el rollback reabre riesgos conocidos.

## Nota
- Este rollback prioriza continuidad de negocio. Reintroduce riesgos de seguridad y debe ser temporal.
