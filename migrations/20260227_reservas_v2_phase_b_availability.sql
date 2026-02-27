-- Reservas V2.1 - Fase B (availability unificada)
-- Objetivo:
-- Exponer slots diarios utilizando la misma validación central (check_booking_slot_v2).

begin;

create or replace function public.get_availability_slots_v2(
  p_booking_date date,
  p_stylist_id uuid,
  p_location_id uuid,
  p_service_id bigint
)
returns table (
  slot_time text,
  available boolean,
  reason_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot_interval integer := 15;
  v_buffer_minutes integer := 0;
  v_service_duration integer;
  v_day_of_week integer;
  v_current_ts timestamp without time zone;
  v_latest_start_ts timestamp without time zone;
  v_check record;
  v_wh record;
begin
  if p_booking_date is null or p_stylist_id is null or p_location_id is null or p_service_id is null then
    return;
  end if;

  select
    coalesce(max(case when c.clave = 'booking_slot_interval_minutes' then nullif(c.valor, '')::integer end), 15),
    coalesce(max(case when c.clave = 'booking_buffer_minutes' then nullif(c.valor, '')::integer end), 0)
  into v_slot_interval, v_buffer_minutes
  from public.configuracion c
  where c.clave in ('booking_slot_interval_minutes', 'booking_buffer_minutes');

  v_slot_interval := greatest(5, least(v_slot_interval, 120));
  v_buffer_minutes := greatest(v_buffer_minutes, 0);

  select coalesce(s.duration, 30)
  into v_service_duration
  from public.servicios s
  where s.id = p_service_id
    and coalesce(s.active, true)
  limit 1;

  if v_service_duration is null or v_service_duration <= 0 or v_service_duration > 240 then
    return;
  end if;

  v_day_of_week := extract(dow from p_booking_date)::integer;

  create temporary table if not exists pg_temp.tmp_availability_slots_v2 (
    slot_time text primary key,
    available boolean not null,
    reason_code text null
  ) on commit drop;

  truncate table pg_temp.tmp_availability_slots_v2;

  for v_wh in
    select wh.start_time, wh.end_time
    from public.working_hours wh
    where wh.stylist_id = p_stylist_id
      and wh.location_id = p_location_id
      and wh.day_of_week = v_day_of_week
    order by wh.start_time
  loop
    v_current_ts := p_booking_date::timestamp + v_wh.start_time;
    v_latest_start_ts := p_booking_date::timestamp + v_wh.end_time - make_interval(mins => (v_service_duration + v_buffer_minutes));

    while v_current_ts <= v_latest_start_ts loop
      select *
      into v_check
      from public.check_booking_slot_v2(
        p_service_id => p_service_id,
        p_location_id => p_location_id,
        p_stylist_id => p_stylist_id,
        p_booking_date => p_booking_date,
        p_start_time => v_current_ts::time
      );

      insert into pg_temp.tmp_availability_slots_v2 (slot_time, available, reason_code)
      values (
        to_char(v_current_ts::time, 'HH24:MI'),
        coalesce(v_check.ok, false),
        case when coalesce(v_check.ok, false) then null else coalesce(v_check.error_code, 'internal_error') end
      )
      on conflict (slot_time)
      do update
      set
        available = pg_temp.tmp_availability_slots_v2.available or excluded.available,
        reason_code = case
          when (pg_temp.tmp_availability_slots_v2.available or excluded.available) then null
          when pg_temp.tmp_availability_slots_v2.reason_code is not null then pg_temp.tmp_availability_slots_v2.reason_code
          else excluded.reason_code
        end;

      v_current_ts := v_current_ts + make_interval(mins => v_slot_interval);
    end loop;
  end loop;

  return query
  select s.slot_time, s.available, s.reason_code
  from pg_temp.tmp_availability_slots_v2 s
  order by s.slot_time;
end;
$$;

revoke all on function public.get_availability_slots_v2(
  date,
  uuid,
  uuid,
  bigint
) from public, anon, authenticated;

grant execute on function public.get_availability_slots_v2(
  date,
  uuid,
  uuid,
  bigint
) to service_role;

commit;
