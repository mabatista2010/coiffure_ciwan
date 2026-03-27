-- Fase 2.5 - Retirada de compatibilidad legacy basada solo en location_hours

begin;

insert into public.location_daily_schedule (
  location_id,
  day_of_week,
  is_closed,
  created_at,
  updated_at
)
select
  l.id,
  d.day_of_week,
  not exists (
    select 1
    from public.location_hours lh
    where lh.location_id = l.id
      and lh.day_of_week = d.day_of_week
  ) as is_closed,
  now(),
  now()
from public.locations l
cross join generate_series(0, 6) as d(day_of_week)
on conflict (location_id, day_of_week) do nothing;

delete from public.configuracion
where clave = 'LOCATION_DAILY_SCHEDULE_V2_ENABLED';

create or replace function public.check_booking_slot_v2(
  p_service_id bigint,
  p_location_id uuid,
  p_stylist_id uuid,
  p_booking_date date,
  p_start_time time without time zone
)
returns table (
  ok boolean,
  error_code text,
  end_time time without time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_duration integer;
  v_buffer_minutes integer := 0;
  v_min_advance_hours integer := 2;
  v_max_advance_days integer := 90;
  v_business_timezone text := 'Europe/Zurich';
  v_slot_start_local timestamp without time zone;
  v_slot_end_local timestamp without time zone;
  v_slot_busy_end_local timestamp without time zone;
  v_slot_start_tstz timestamptz;
  v_slot_busy_end_tstz timestamptz;
  v_end_time time without time zone;
  v_day_of_week integer;
  v_now_local timestamp without time zone;
  v_daily_is_closed boolean;
begin
  if p_service_id is null
     or p_location_id is null
     or p_stylist_id is null
     or p_booking_date is null
     or p_start_time is null
  then
    return query select false, 'invalid_payload', null::time;
    return;
  end if;

  if not exists (
    select 1
    from public.stylists s
    where s.id = p_stylist_id
      and coalesce(s.active, true)
  ) then
    return query select false, 'invalid_combination', null::time;
    return;
  end if;

  if not exists (
    select 1
    from public.locations l
    where l.id = p_location_id
      and coalesce(l.active, true)
  ) then
    return query select false, 'invalid_combination', null::time;
    return;
  end if;

  select coalesce(s.duration, 30)
  into v_service_duration
  from public.servicios s
  where s.id = p_service_id
    and coalesce(s.active, true)
  limit 1;

  if v_service_duration is null or v_service_duration <= 0 or v_service_duration > 240 then
    return query select false, 'invalid_combination', null::time;
    return;
  end if;

  if not exists (
    select 1
    from public.stylist_services ss
    where ss.stylist_id = p_stylist_id
      and ss.service_id = p_service_id
  ) then
    return query select false, 'invalid_combination', null::time;
    return;
  end if;

  if not exists (
    select 1
    from public.working_hours wh
    where wh.stylist_id = p_stylist_id
      and wh.location_id = p_location_id
  ) then
    return query select false, 'invalid_combination', null::time;
    return;
  end if;

  select
    coalesce(max(case when c.clave = 'booking_buffer_minutes' then nullif(c.valor, '')::integer end), 0),
    coalesce(max(case when c.clave = 'booking_min_advance_hours' then nullif(c.valor, '')::integer end), 2),
    coalesce(max(case when c.clave = 'booking_max_advance_days' then nullif(c.valor, '')::integer end), 90),
    coalesce(max(case when c.clave = 'business_timezone' then nullif(trim(c.valor), '') end), 'Europe/Zurich')
  into v_buffer_minutes, v_min_advance_hours, v_max_advance_days, v_business_timezone
  from public.configuracion c
  where c.clave in (
    'booking_buffer_minutes',
    'booking_min_advance_hours',
    'booking_max_advance_days',
    'business_timezone'
  );

  v_buffer_minutes := greatest(v_buffer_minutes, 0);
  v_min_advance_hours := greatest(v_min_advance_hours, 0);
  v_max_advance_days := greatest(v_max_advance_days, 0);

  v_slot_start_local := p_booking_date::timestamp + p_start_time;
  v_slot_end_local := v_slot_start_local + make_interval(mins => v_service_duration);
  v_slot_busy_end_local := v_slot_end_local + make_interval(mins => v_buffer_minutes);
  v_end_time := v_slot_end_local::time;

  if v_slot_end_local::date <> p_booking_date
     or v_slot_busy_end_local::date <> p_booking_date
     or p_start_time >= v_end_time
  then
    return query select false, 'outside_working_hours', null::time;
    return;
  end if;

  v_now_local := now() at time zone v_business_timezone;

  if v_slot_start_local < (v_now_local + make_interval(hours => v_min_advance_hours))
     or v_slot_start_local > (v_now_local + make_interval(days => v_max_advance_days))
  then
    return query select false, 'outside_booking_window', null::time;
    return;
  end if;

  v_day_of_week := extract(dow from p_booking_date)::integer;

  if not exists (
    select 1
    from public.working_hours wh
    where wh.stylist_id = p_stylist_id
      and wh.location_id = p_location_id
      and wh.day_of_week = v_day_of_week
      and p_start_time >= wh.start_time
      and v_slot_busy_end_local::time <= wh.end_time
  ) then
    return query select false, 'outside_working_hours', null::time;
    return;
  end if;

  select lds.is_closed
  into v_daily_is_closed
  from public.location_daily_schedule lds
  where lds.location_id = p_location_id
    and lds.day_of_week = v_day_of_week
  limit 1;

  if not found or coalesce(v_daily_is_closed, true) then
    return query select false, 'outside_location_hours', null::time;
    return;
  end if;

  if not exists (
    select 1
    from public.location_hours lh
    where lh.location_id = p_location_id
      and lh.day_of_week = v_day_of_week
      and p_start_time >= lh.start_time
      and v_slot_busy_end_local::time <= lh.end_time
  ) then
    return query select false, 'outside_location_hours', null::time;
    return;
  end if;

  if exists (
    select 1
    from public.location_closures lc
    where lc.location_id = p_location_id
      and lc.closure_date = p_booking_date
      and (
        (lc.start_time is null and lc.end_time is null)
        or
        tsrange(
          p_booking_date::timestamp + p_start_time,
          p_booking_date::timestamp + v_slot_busy_end_local::time,
          '[)'
        ) && tsrange(
          p_booking_date::timestamp + lc.start_time,
          p_booking_date::timestamp + lc.end_time,
          '[)'
        )
      )
  ) then
    return query select false, 'location_closed', null::time;
    return;
  end if;

  v_slot_start_tstz := v_slot_start_local at time zone v_business_timezone;
  v_slot_busy_end_tstz := v_slot_busy_end_local at time zone v_business_timezone;

  if exists (
    select 1
    from public.time_off t
    where t.stylist_id = p_stylist_id
      and (t.location_id is null or t.location_id = p_location_id)
      and tstzrange(v_slot_start_tstz, v_slot_busy_end_tstz, '[)')
          && tstzrange(t.start_datetime, t.end_datetime, '[)')
  ) then
    return query select false, 'stylist_time_off', null::time;
    return;
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.stylist_id = p_stylist_id
      and b.booking_date = p_booking_date
      and b.status in ('pending', 'confirmed', 'needs_replan')
      and tsrange(v_slot_start_local, v_slot_busy_end_local, '[)')
          && tsrange(
            b.booking_date::timestamp + b.start_time,
            b.booking_date::timestamp + b.end_time + make_interval(mins => v_buffer_minutes),
            '[)'
          )
  ) then
    return query select false, 'slot_conflict', null::time;
    return;
  end if;

  return query select true, null::text, v_end_time;
end;
$$;

commit;
