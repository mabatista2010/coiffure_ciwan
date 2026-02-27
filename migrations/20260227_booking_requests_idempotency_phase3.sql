-- Fase 3: idempotencia para creación de reservas.

create extension if not exists pgcrypto;

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'web',
  idempotency_key text not null,
  request_hash text not null,
  status text not null default 'processing' check (status in ('processing', 'succeeded', 'failed')),
  booking_id uuid references public.bookings(id) on delete set null,
  http_status integer not null default 202 check (http_status >= 100 and http_status <= 599),
  response_body jsonb,
  error_code text,
  request_id uuid not null,
  latency_ms integer,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  completed_at timestamp with time zone
);

create unique index if not exists idx_booking_requests_source_key
  on public.booking_requests (source, idempotency_key);

create index if not exists idx_booking_requests_created_at
  on public.booking_requests (created_at desc);

create index if not exists idx_booking_requests_booking_id
  on public.booking_requests (booking_id);

alter table public.booking_requests enable row level security;

drop policy if exists booking_requests_staff_select on public.booking_requests;

create policy booking_requests_staff_select
  on public.booking_requests
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
