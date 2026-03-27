-- Fase 2 - Estado diario explícito por centro + guardado transaccional

begin;

create table if not exists public.location_daily_schedule (
  id uuid primary key default extensions.uuid_generate_v4(),
  location_id uuid not null references public.locations(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  is_closed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, day_of_week)
);

create index if not exists idx_location_daily_schedule_location_day
  on public.location_daily_schedule (location_id, day_of_week);

alter table public.location_daily_schedule enable row level security;

drop policy if exists location_daily_schedule_public_read on public.location_daily_schedule;
create policy location_daily_schedule_public_read
on public.location_daily_schedule
for select
using (true);

drop policy if exists location_daily_schedule_admin_write on public.location_daily_schedule;
create policy location_daily_schedule_admin_write
on public.location_daily_schedule
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.id = auth.uid()
      and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.id = auth.uid()
      and ur.role = 'admin'
  )
);

insert into public.configuracion (clave, valor, descripcion)
values (
  'LOCATION_DAILY_SCHEDULE_V2_ENABLED',
  'false',
  'Feature flag para lectura del estado diario explicito de centros'
)
on conflict (clave) do nothing;

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
on conflict (location_id, day_of_week) do update
set
  is_closed = excluded.is_closed,
  updated_at = now();

create or replace function public.save_location_weekly_schedule_v2(
  p_location_id uuid,
  p_day_schedules jsonb
)
returns table (
  updated_location_hours_count integer,
  closed_days_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day jsonb;
  v_slot jsonb;
  v_day_of_week integer;
  v_is_closed boolean;
  v_slot_number integer;
  v_slot_start text;
  v_slot_end text;
begin
  if p_location_id is null then
    raise exception 'location_id_required';
  end if;

  if p_day_schedules is null or jsonb_typeof(p_day_schedules) <> 'array' then
    raise exception 'invalid_day_schedules_payload';
  end if;

  create temporary table if not exists pg_temp.tmp_location_day_schedule_v2 (
    day_of_week integer primary key,
    is_closed boolean not null
  ) on commit drop;

  create temporary table if not exists pg_temp.tmp_location_hours_v2 (
    day_of_week integer not null,
    slot_number integer not null,
    start_time time without time zone not null,
    end_time time without time zone not null
  ) on commit drop;

  truncate table pg_temp.tmp_location_day_schedule_v2;
  truncate table pg_temp.tmp_location_hours_v2;

  for v_day in
    select value
    from jsonb_array_elements(p_day_schedules)
  loop
    v_day_of_week := nullif(trim(v_day ->> 'dayOfWeek'), '')::integer;
    v_is_closed := coalesce((v_day ->> 'isClosed')::boolean, true);

    if v_day_of_week is null or v_day_of_week < 0 or v_day_of_week > 6 then
      raise exception 'invalid_day_of_week';
    end if;

    insert into pg_temp.tmp_location_day_schedule_v2 (day_of_week, is_closed)
    values (v_day_of_week, v_is_closed);

    if not v_is_closed then
      v_slot_number := 0;

      for v_slot in
        select value
        from jsonb_array_elements(coalesce(v_day -> 'slots', '[]'::jsonb))
      loop
        v_slot_start := trim(coalesce(v_slot ->> 'start', ''));
        v_slot_end := trim(coalesce(v_slot ->> 'end', ''));

        if v_slot_start <> '' and v_slot_end <> '' then
          insert into pg_temp.tmp_location_hours_v2 (
            day_of_week,
            slot_number,
            start_time,
            end_time
          )
          values (
            v_day_of_week,
            v_slot_number,
            v_slot_start::time,
            v_slot_end::time
          );

          v_slot_number := v_slot_number + 1;
        end if;
      end loop;
    end if;
  end loop;

  if (select count(*) from pg_temp.tmp_location_day_schedule_v2) <> 7 then
    raise exception 'expected_7_days';
  end if;

  delete from public.location_hours
  where location_id = p_location_id;

  insert into public.location_hours (
    location_id,
    day_of_week,
    slot_number,
    start_time,
    end_time
  )
  select
    p_location_id,
    tmp.day_of_week,
    tmp.slot_number,
    tmp.start_time,
    tmp.end_time
  from pg_temp.tmp_location_hours_v2 tmp
  order by tmp.day_of_week, tmp.slot_number;

  insert into public.location_daily_schedule (
    location_id,
    day_of_week,
    is_closed,
    created_at,
    updated_at
  )
  select
    p_location_id,
    tmp.day_of_week,
    tmp.is_closed,
    now(),
    now()
  from pg_temp.tmp_location_day_schedule_v2 tmp
  on conflict (location_id, day_of_week) do update
  set
    is_closed = excluded.is_closed,
    updated_at = now();

  return query
  select
    (select count(*)::integer from pg_temp.tmp_location_hours_v2),
    (select count(*)::integer from pg_temp.tmp_location_day_schedule_v2 where is_closed);
end;
$$;

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
  v_daily_schedule_enabled boolean := false;
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
    coalesce(max(case when c.clave = 'business_timezone' then nullif(trim(c.valor), '') end), 'Europe/Zurich'),
    coalesce(max(case
      when c.clave = 'LOCATION_DAILY_SCHEDULE_V2_ENABLED'
       and lower(trim(coalesce(c.valor, ''))) in ('1', 'true', 'yes', 'on')
      then 1 else 0 end), 0) = 1
  into v_buffer_minutes, v_min_advance_hours, v_max_advance_days, v_business_timezone, v_daily_schedule_enabled
  from public.configuracion c
  where c.clave in (
    'booking_buffer_minutes',
    'booking_min_advance_hours',
    'booking_max_advance_days',
    'business_timezone',
    'LOCATION_DAILY_SCHEDULE_V2_ENABLED'
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

  if v_daily_schedule_enabled then
    select lds.is_closed
    into v_daily_is_closed
    from public.location_daily_schedule lds
    where lds.location_id = p_location_id
      and lds.day_of_week = v_day_of_week
    limit 1;

    if found and coalesce(v_daily_is_closed, true) then
      return query select false, 'outside_location_hours', null::time;
      return;
    end if;
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
