-- Hardening de public.servicios.duration
-- Objetivo: garantizar default, rango valido y no-null para el contrato end-to-end.

update public.servicios
set duration = 30
where duration is null
   or duration <= 0
   or duration > 240;

alter table public.servicios
  alter column duration set default 30;

alter table public.servicios
  alter column duration set not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.servicios'::regclass
      and conname = 'servicios_duration_range_check'
  ) then
    alter table public.servicios
      drop constraint servicios_duration_range_check;
  end if;
end
$$;

alter table public.servicios
  add constraint servicios_duration_range_check
  check (duration > 0 and duration <= 240);
