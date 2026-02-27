-- Fase 1: hardening de reservas para evitar solapes y mejorar rendimiento.

create extension if not exists btree_gist;

alter table public.bookings
  add column if not exists slot_range tsrange
  generated always as (
    tsrange(
      booking_date::timestamp + start_time,
      booking_date::timestamp + end_time,
      '[)'
    )
  ) stored;

alter table public.bookings
  drop constraint if exists bookings_start_before_end;

alter table public.bookings
  add constraint bookings_start_before_end
  check (start_time < end_time);

do $$
declare
  v_overlap_pairs integer;
begin
  select count(*)::int
  into v_overlap_pairs
  from public.bookings a
  join public.bookings b
    on a.id < b.id
   and a.stylist_id = b.stylist_id
   and a.booking_date = b.booking_date
   and a.status in ('pending', 'confirmed')
   and b.status in ('pending', 'confirmed')
   and tsrange(
        a.booking_date::timestamp + a.start_time,
        a.booking_date::timestamp + a.end_time,
        '[)'
      ) && tsrange(
        b.booking_date::timestamp + b.start_time,
        b.booking_date::timestamp + b.end_time,
        '[)'
      );

  if v_overlap_pairs > 0 then
    raise exception 'No se puede aplicar bookings_no_overlap: existen % solapes activos en bookings', v_overlap_pairs;
  end if;
end
$$;

alter table public.bookings
  drop constraint if exists bookings_no_overlap;

alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    stylist_id with =,
    slot_range with &&
  )
  where (status in ('pending', 'confirmed'));

create index if not exists idx_bookings_stylist_date_status_start
  on public.bookings (stylist_id, booking_date, status, start_time);

create index if not exists idx_bookings_location_date_status_start
  on public.bookings (location_id, booking_date, status, start_time);

create index if not exists idx_bookings_service_date
  on public.bookings (service_id, booking_date);

create index if not exists idx_working_hours_stylist_location_day
  on public.working_hours (stylist_id, location_id, day_of_week);

create index if not exists idx_time_off_stylist_location_start_end
  on public.time_off (stylist_id, location_id, start_datetime, end_datetime);
