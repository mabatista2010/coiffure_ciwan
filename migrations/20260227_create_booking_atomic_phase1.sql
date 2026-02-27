-- Fase 1: RPC atómica de creación de reservas.

create or replace function public.create_booking_atomic(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_notes text,
  p_service_id bigint,
  p_location_id uuid,
  p_stylist_id uuid,
  p_booking_date date,
  p_start_time time without time zone,
  p_status text default 'pending'
)
returns table (
  ok boolean,
  error_code text,
  booking_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_duration integer;
  v_end_time time without time zone;
  v_slot_start_ts timestamp without time zone;
  v_slot_end_ts timestamp without time zone;
  v_day_of_week integer;
  v_booking_id uuid;
begin
  if coalesce(trim(p_customer_name), '') = ''
     or coalesce(trim(p_customer_phone), '') = ''
     or p_service_id is null
     or p_location_id is null
     or p_stylist_id is null
     or p_booking_date is null
     or p_start_time is null
  then
    return query select false, 'invalid_payload', null::uuid;
    return;
  end if;

  if p_status not in ('pending', 'confirmed') then
    return query select false, 'invalid_payload', null::uuid;
    return;
  end if;

  if not exists (
    select 1
    from public.stylists s
    where s.id = p_stylist_id
      and coalesce(s.active, true)
  ) then
    return query select false, 'invalid_combination', null::uuid;
    return;
  end if;

  if not exists (
    select 1
    from public.locations l
    where l.id = p_location_id
      and coalesce(l.active, true)
  ) then
    return query select false, 'invalid_combination', null::uuid;
    return;
  end if;

  select coalesce(s.duration, 30)
  into v_service_duration
  from public.servicios s
  where s.id = p_service_id
    and coalesce(s.active, true)
  limit 1;

  if v_service_duration is null or v_service_duration <= 0 then
    return query select false, 'invalid_combination', null::uuid;
    return;
  end if;

  if v_service_duration > 240 then
    return query select false, 'invalid_payload', null::uuid;
    return;
  end if;

  if not exists (
    select 1
    from public.stylist_services ss
    where ss.stylist_id = p_stylist_id
      and ss.service_id = p_service_id
  ) then
    return query select false, 'invalid_combination', null::uuid;
    return;
  end if;

  if not exists (
    select 1
    from public.working_hours wh
    where wh.stylist_id = p_stylist_id
      and wh.location_id = p_location_id
  ) then
    return query select false, 'invalid_combination', null::uuid;
    return;
  end if;

  v_slot_start_ts := p_booking_date::timestamp + p_start_time;
  v_slot_end_ts := v_slot_start_ts + make_interval(mins => v_service_duration);
  v_end_time := v_slot_end_ts::time;

  if v_slot_end_ts::date <> p_booking_date then
    return query select false, 'outside_working_hours', null::uuid;
    return;
  end if;

  if p_start_time >= v_end_time then
    return query select false, 'invalid_payload', null::uuid;
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
      and v_end_time <= wh.end_time
  ) then
    return query select false, 'outside_working_hours', null::uuid;
    return;
  end if;

  if exists (
    select 1
    from public.time_off t
    where t.stylist_id = p_stylist_id
      and t.location_id = p_location_id
      and tsrange(v_slot_start_ts, v_slot_end_ts, '[)')
          && tsrange(
            t.start_datetime at time zone 'UTC',
            t.end_datetime at time zone 'UTC',
            '[)'
          )
  ) then
    return query select false, 'stylist_time_off', null::uuid;
    return;
  end if;

  begin
    insert into public.bookings (
      customer_name,
      customer_email,
      customer_phone,
      notes,
      stylist_id,
      service_id,
      location_id,
      booking_date,
      start_time,
      end_time,
      status
    ) values (
      trim(p_customer_name),
      coalesce(trim(p_customer_email), ''),
      trim(p_customer_phone),
      nullif(trim(coalesce(p_notes, '')), ''),
      p_stylist_id,
      p_service_id,
      p_location_id,
      p_booking_date,
      p_start_time,
      v_end_time,
      p_status
    )
    returning id into v_booking_id;
  exception
    when exclusion_violation then
      return query select false, 'slot_conflict', null::uuid;
      return;
    when check_violation then
      return query select false, 'invalid_payload', null::uuid;
      return;
    when foreign_key_violation then
      return query select false, 'invalid_combination', null::uuid;
      return;
  end;

  return query select true, null::text, v_booking_id;
exception
  when others then
    return query select false, 'internal_error', null::uuid;
end;
$$;

revoke all on function public.create_booking_atomic(
  text,
  text,
  text,
  text,
  bigint,
  uuid,
  uuid,
  date,
  time without time zone,
  text
) from public, anon, authenticated;

grant execute on function public.create_booking_atomic(
  text,
  text,
  text,
  text,
  bigint,
  uuid,
  uuid,
  date,
  time without time zone,
  text
) to service_role;
