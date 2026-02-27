-- Reservas V2.1 - Fase C (needs_replan automático)

begin;

alter table public.bookings
  add column if not exists replan_reason text;

alter table public.bookings
  add column if not exists replan_marked_at timestamptz;

create or replace function public.mark_bookings_needs_replan_v2(
  p_stylist_id uuid default null,
  p_location_id uuid default null,
  p_from_date date default current_date,
  p_reason text default 'schedule_change'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_affected integer := 0;
  v_buffer_minutes integer := 0;
  v_business_timezone text := 'Europe/Zurich';
  v_reason text := coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'schedule_change');
begin
  select
    coalesce(max(case when c.clave = 'booking_buffer_minutes' then nullif(c.valor, '')::integer end), 0),
    coalesce(max(case when c.clave = 'business_timezone' then nullif(trim(c.valor), '') end), 'Europe/Zurich')
  into v_buffer_minutes, v_business_timezone
  from public.configuracion c
  where c.clave in ('booking_buffer_minutes', 'business_timezone');

  v_buffer_minutes := greatest(v_buffer_minutes, 0);

  update public.bookings b
  set
    status = 'needs_replan',
    replan_reason = v_reason,
    replan_marked_at = now()
  where b.status in ('pending', 'confirmed')
    and b.booking_date >= coalesce(p_from_date, current_date)
    and (p_stylist_id is null or b.stylist_id = p_stylist_id)
    and (p_location_id is null or b.location_id = p_location_id)
    and (
      not exists (
        select 1
        from public.working_hours wh
        where wh.stylist_id = b.stylist_id
          and wh.location_id = b.location_id
          and wh.day_of_week = extract(dow from b.booking_date)::integer
          and b.start_time >= wh.start_time
          and (b.end_time + make_interval(mins => v_buffer_minutes)) <= wh.end_time
      )
      or exists (
        select 1
        from public.time_off t
        where t.stylist_id = b.stylist_id
          and (t.location_id is null or t.location_id = b.location_id)
          and tstzrange(
                (b.booking_date::timestamp + b.start_time) at time zone v_business_timezone,
                (b.booking_date::timestamp + b.end_time + make_interval(mins => v_buffer_minutes)) at time zone v_business_timezone,
                '[)'
              )
              && tstzrange(t.start_datetime, t.end_datetime, '[)')
      )
      or exists (
        select 1
        from public.location_closures lc
        where lc.location_id = b.location_id
          and lc.closure_date = b.booking_date
          and (
            (lc.start_time is null and lc.end_time is null)
            or
            tsrange(
              b.booking_date::timestamp + b.start_time,
              b.booking_date::timestamp + b.end_time + make_interval(mins => v_buffer_minutes),
              '[)'
            )
            && tsrange(
              b.booking_date::timestamp + lc.start_time,
              b.booking_date::timestamp + lc.end_time,
              '[)'
            )
          )
      )
    );

  get diagnostics v_affected = row_count;
  return v_affected;
end;
$$;

create or replace function public.trg_mark_replan_from_working_hours_v2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.mark_bookings_needs_replan_v2(
    p_stylist_id => coalesce(new.stylist_id, old.stylist_id),
    p_location_id => coalesce(new.location_id, old.location_id),
    p_from_date => current_date,
    p_reason => 'working_hours_changed'
  );

  return null;
end;
$$;

create or replace function public.trg_mark_replan_from_time_off_v2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_date date;
begin
  v_from_date := coalesce(
    (new.start_datetime at time zone 'UTC')::date,
    (old.start_datetime at time zone 'UTC')::date,
    current_date
  );

  perform public.mark_bookings_needs_replan_v2(
    p_stylist_id => coalesce(new.stylist_id, old.stylist_id),
    p_location_id => coalesce(new.location_id, old.location_id),
    p_from_date => v_from_date,
    p_reason => 'time_off_changed'
  );

  return null;
end;
$$;

create or replace function public.trg_mark_replan_from_location_closures_v2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_date date;
begin
  v_from_date := coalesce(new.closure_date, old.closure_date, current_date);

  perform public.mark_bookings_needs_replan_v2(
    p_stylist_id => null,
    p_location_id => coalesce(new.location_id, old.location_id),
    p_from_date => v_from_date,
    p_reason => 'location_closure_changed'
  );

  return null;
end;
$$;

drop trigger if exists trg_mark_replan_working_hours_v2 on public.working_hours;
create trigger trg_mark_replan_working_hours_v2
after insert or update or delete on public.working_hours
for each row
execute function public.trg_mark_replan_from_working_hours_v2();

drop trigger if exists trg_mark_replan_time_off_v2 on public.time_off;
create trigger trg_mark_replan_time_off_v2
after insert or update or delete on public.time_off
for each row
execute function public.trg_mark_replan_from_time_off_v2();

drop trigger if exists trg_mark_replan_location_closures_v2 on public.location_closures;
create trigger trg_mark_replan_location_closures_v2
after insert or update or delete on public.location_closures
for each row
execute function public.trg_mark_replan_from_location_closures_v2();

revoke all on function public.mark_bookings_needs_replan_v2(uuid, uuid, date, text) from public, anon, authenticated;
grant execute on function public.mark_bookings_needs_replan_v2(uuid, uuid, date, text) to service_role;

commit;
