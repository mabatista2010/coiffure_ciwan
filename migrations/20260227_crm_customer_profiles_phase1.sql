-- Fase 1 CRM ficha cliente: modelo + seguridad base.

begin;

create extension if not exists pgcrypto;

create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null default '',
  customer_email text not null default '',
  customer_phone text not null default '',
  birth_date date null,
  marital_status text null,
  has_children boolean null,
  hobbies text null,
  occupation text null,
  preferred_contact_channel text null,
  marketing_consent boolean not null default false,
  internal_notes_summary text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  updated_by uuid null,
  constraint customer_profiles_preferred_channel_check
    check (
      preferred_contact_channel is null
      or preferred_contact_channel in ('phone', 'email', 'whatsapp', 'sms', 'none')
    )
);

create unique index if not exists customer_profiles_email_unique
on public.customer_profiles (lower(customer_email))
where customer_email <> '';

create unique index if not exists customer_profiles_phone_unique
on public.customer_profiles (regexp_replace(customer_phone, '[^0-9+]', '', 'g'))
where customer_phone <> '';

create index if not exists idx_customer_profiles_name
on public.customer_profiles (customer_name);

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  note text not null,
  note_type text not null default 'general',
  created_at timestamptz not null default now(),
  created_by uuid not null,
  constraint customer_notes_note_not_empty check (length(trim(note)) > 0),
  constraint customer_notes_note_type_check
    check (note_type in ('general', 'follow_up', 'incident', 'preference'))
);

create index if not exists idx_customer_notes_profile_created_at
on public.customer_notes (customer_profile_id, created_at desc);

alter table public.customer_profiles enable row level security;
alter table public.customer_notes enable row level security;

drop policy if exists customer_profiles_staff_select on public.customer_profiles;
drop policy if exists customer_profiles_staff_insert on public.customer_profiles;
drop policy if exists customer_profiles_staff_update on public.customer_profiles;
drop policy if exists customer_profiles_staff_delete on public.customer_profiles;

drop policy if exists customer_notes_staff_select on public.customer_notes;
drop policy if exists customer_notes_staff_insert on public.customer_notes;
drop policy if exists customer_notes_staff_update on public.customer_notes;
drop policy if exists customer_notes_staff_delete on public.customer_notes;

create policy customer_profiles_staff_select
on public.customer_profiles
for select
to authenticated
using (public.current_user_role() in ('admin', 'employee'));

create policy customer_profiles_staff_insert
on public.customer_profiles
for insert
to authenticated
with check (public.current_user_role() in ('admin', 'employee'));

create policy customer_profiles_staff_update
on public.customer_profiles
for update
to authenticated
using (public.current_user_role() in ('admin', 'employee'))
with check (public.current_user_role() in ('admin', 'employee'));

create policy customer_profiles_staff_delete
on public.customer_profiles
for delete
to authenticated
using (public.current_user_role() in ('admin', 'employee'));

create policy customer_notes_staff_select
on public.customer_notes
for select
to authenticated
using (public.current_user_role() in ('admin', 'employee'));

create policy customer_notes_staff_insert
on public.customer_notes
for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'employee')
  and created_by = auth.uid()
);

create policy customer_notes_staff_update
on public.customer_notes
for update
to authenticated
using (public.current_user_role() in ('admin', 'employee'))
with check (public.current_user_role() in ('admin', 'employee'));

create policy customer_notes_staff_delete
on public.customer_notes
for delete
to authenticated
using (public.current_user_role() in ('admin', 'employee'));

revoke all on table public.customer_profiles from public, anon;
revoke all on table public.customer_notes from public, anon;
grant select, insert, update, delete on table public.customer_profiles to authenticated;
grant select, insert, update, delete on table public.customer_notes to authenticated;

commit;
