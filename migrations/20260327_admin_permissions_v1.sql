begin;

update public.user_roles
set role = 'staff'
where role = 'employee';

alter table public.user_roles
  alter column role set default 'staff';

create table if not exists public.permission_profiles (
  id bigserial primary key,
  key text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_permissions (
  id bigserial primary key,
  profile_id bigint not null references public.permission_profiles(id) on delete cascade,
  permission_key text not null,
  scope_mode text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_permissions_scope_mode_check check (scope_mode in ('all', 'none', 'own_stylist', 'assigned_location', 'specific_locations')),
  constraint profile_permissions_unique unique (profile_id, permission_key)
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_id bigint not null references public.permission_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_permission_overrides (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_key text not null,
  effect text not null,
  scope_mode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_permission_overrides_effect_check check (effect in ('allow', 'deny')),
  constraint user_permission_overrides_scope_mode_check check (scope_mode is null or scope_mode in ('all', 'none', 'own_stylist', 'assigned_location', 'specific_locations')),
  constraint user_permission_overrides_unique unique (user_id, permission_key)
);

create table if not exists public.user_location_assignments (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_location_assignments_unique unique (user_id, location_id)
);

create table if not exists public.admin_audit_log (
  id bigserial primary key,
  actor_user_id uuid,
  target_user_id uuid,
  entity_type text not null,
  entity_id text,
  action text not null,
  before_json jsonb,
  after_json jsonb,
  meta_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_permission_profiles_active on public.permission_profiles(active, is_system);
create index if not exists idx_profile_permissions_profile on public.profile_permissions(profile_id, permission_key);
create index if not exists idx_user_permission_overrides_user on public.user_permission_overrides(user_id, permission_key);
create index if not exists idx_user_location_assignments_user on public.user_location_assignments(user_id, location_id);
create index if not exists idx_admin_audit_log_actor_created_at on public.admin_audit_log(actor_user_id, created_at desc);
create index if not exists idx_admin_audit_log_target_created_at on public.admin_audit_log(target_user_id, created_at desc);
create index if not exists idx_admin_audit_log_entity_created_at on public.admin_audit_log(entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select ur.role::text
  from public.user_roles ur
  where ur.id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  default_profile_id bigint;
begin
  insert into public.user_roles (id, role)
  values (new.id, 'staff')
  on conflict (id) do nothing;

  select id into default_profile_id
  from public.permission_profiles
  where key = 'staff_basic'
  limit 1;

  if default_profile_id is not null then
    insert into public.user_profiles (user_id, profile_id)
    values (new.id, default_profile_id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$function$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.current_user_has_permission(target_permission_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  role_name text;
  override_effect text;
  profile_permission_exists boolean;
begin
  role_name := public.current_user_role();

  if role_name = 'admin' then
    return true;
  end if;

  if role_name is distinct from 'staff' then
    return false;
  end if;

  select upo.effect
  into override_effect
  from public.user_permission_overrides upo
  where upo.user_id = auth.uid()
    and upo.permission_key = target_permission_key
  limit 1;

  if override_effect = 'deny' then
    return false;
  end if;

  if override_effect = 'allow' then
    return true;
  end if;

  select exists(
    select 1
    from public.user_profiles up
    join public.profile_permissions pp on pp.profile_id = up.profile_id
    where up.user_id = auth.uid()
      and pp.permission_key = target_permission_key
  ) into profile_permission_exists;

  return coalesce(profile_permission_exists, false);
end;
$$;

revoke all on function public.current_user_has_permission(text) from public;
grant execute on function public.current_user_has_permission(text) to authenticated, service_role;

create or replace function public.current_user_permission_scope(target_permission_key text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  role_name text;
  override_effect text;
  override_scope text;
  profile_scope text;
begin
  role_name := public.current_user_role();

  if role_name = 'admin' then
    return 'all';
  end if;

  if role_name is distinct from 'staff' then
    return 'none';
  end if;

  select upo.effect, upo.scope_mode
  into override_effect, override_scope
  from public.user_permission_overrides upo
  where upo.user_id = auth.uid()
    and upo.permission_key = target_permission_key
  limit 1;

  if override_effect = 'deny' then
    return 'none';
  end if;

  select pp.scope_mode
  into profile_scope
  from public.user_profiles up
  join public.profile_permissions pp on pp.profile_id = up.profile_id
  where up.user_id = auth.uid()
    and pp.permission_key = target_permission_key
  limit 1;

  if override_effect = 'allow' then
    return coalesce(override_scope, profile_scope, 'all');
  end if;

  return coalesce(profile_scope, 'none');
end;
$$;

revoke all on function public.current_user_permission_scope(text) from public;
grant execute on function public.current_user_permission_scope(text) to authenticated, service_role;

create or replace function public.current_user_has_location_assignment(target_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.user_location_assignments ula
    where ula.user_id = auth.uid()
      and ula.location_id = target_location_id
  );
$$;

revoke all on function public.current_user_has_location_assignment(uuid) from public;
grant execute on function public.current_user_has_location_assignment(uuid) to authenticated, service_role;

create or replace function public.current_user_associated_stylist_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select su.stylist_id
  from public.stylist_users su
  where su.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_user_associated_stylist_id() from public;
grant execute on function public.current_user_associated_stylist_id() to authenticated, service_role;

create or replace function public.current_user_can_access_resource(target_permission_key text, target_location_id uuid, target_stylist_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_scope text;
  associated_stylist_id uuid;
begin
  if public.current_user_role() = 'admin' then
    return true;
  end if;

  if not public.current_user_has_permission(target_permission_key) then
    return false;
  end if;

  current_scope := public.current_user_permission_scope(target_permission_key);

  if current_scope = 'all' then
    return true;
  end if;

  if current_scope = 'none' then
    return false;
  end if;

  if current_scope = 'own_stylist' then
    associated_stylist_id := public.current_user_associated_stylist_id();
    return associated_stylist_id is not null and target_stylist_id = associated_stylist_id;
  end if;

  if current_scope in ('assigned_location', 'specific_locations') then
    return target_location_id is not null and public.current_user_has_location_assignment(target_location_id);
  end if;

  return false;
end;
$$;

revoke all on function public.current_user_can_access_resource(text, uuid, uuid) from public;
grant execute on function public.current_user_can_access_resource(text, uuid, uuid) to authenticated, service_role;

create or replace function public.current_user_can_access_stylist_row(
  target_permission_key text,
  target_stylist_id uuid,
  target_location_ids uuid[]
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  location_id uuid;
begin
  if public.current_user_role() = 'admin' then
    return true;
  end if;

  if public.current_user_can_access_resource(target_permission_key, target_stylist_id, null) then
    return true;
  end if;

  if target_location_ids is null or array_length(target_location_ids, 1) is null then
    return false;
  end if;

  foreach location_id in array target_location_ids loop
    if not public.current_user_can_access_resource(target_permission_key, target_stylist_id, location_id) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

revoke all on function public.current_user_can_access_stylist_row(text, uuid, uuid[]) from public;
grant execute on function public.current_user_can_access_stylist_row(text, uuid, uuid[]) to authenticated, service_role;

create or replace function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  target_id uuid;
  entity_identifier text;
  old_row jsonb;
  new_row jsonb;
begin
  actor_id := auth.uid();
  old_row := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_row := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  target_id := case
    when tg_table_name in ('user_profiles', 'user_permission_overrides', 'user_location_assignments', 'stylist_users')
      then coalesce(
        case
          when tg_op = 'DELETE' then nullif(old_row->>'user_id', '')::uuid
          else nullif(new_row->>'user_id', '')::uuid
        end,
        null
      )
    else null
  end;
  entity_identifier := coalesce(
    case when tg_op = 'DELETE' then old_row->>'id' else new_row->>'id' end,
    case when tg_op = 'DELETE' then old_row->>'user_id' else new_row->>'user_id' end
  );

  insert into public.admin_audit_log (
    actor_user_id,
    target_user_id,
    entity_type,
    entity_id,
    action,
    before_json,
    after_json,
    meta_json
  ) values (
    actor_id,
    target_id,
    tg_table_name,
    entity_identifier,
    lower(tg_op),
    old_row,
    new_row,
    jsonb_build_object('schema', tg_table_schema)
  );

  return case when tg_op = 'DELETE' then old else new end;
exception when others then
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.audit_admin_change() from public;
grant execute on function public.audit_admin_change() to authenticated, service_role;

create or replace function public.ensure_service_write_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  can_content boolean;
  can_business boolean;
  can_delete boolean;
begin
  if public.current_user_role() = 'admin' or auth.role() = 'service_role' then
    return new;
  end if;

  can_content := public.current_user_has_permission('services.content.edit');
  can_business := public.current_user_has_permission('services.business.edit');
  can_delete := public.current_user_has_permission('services.delete');

  if tg_op = 'INSERT' then
    if not can_content or not can_business then
      raise exception 'Permissions insuffisantes pour creer un service';
    end if;
    return new;
  end if;

  if (
    new.nombre is distinct from old.nombre
    or new.descripcion is distinct from old.descripcion
    or new.imagen_url is distinct from old.imagen_url
    or new.slug is distinct from old.slug
    or new.group_id is distinct from old.group_id
    or new.subgroup_id is distinct from old.subgroup_id
    or new.sort_order is distinct from old.sort_order
    or new.landing_featured is distinct from old.landing_featured
    or new.landing_sort_order is distinct from old.landing_sort_order
  ) and not can_content then
    raise exception 'Permissions insuffisantes pour modifier le contenu du service';
  end if;

  if new.active is distinct from old.active then
    if new.active = false and old.active = true then
      if not (can_content or can_delete) then
        raise exception 'Permissions insuffisantes pour retirer le service';
      end if;
    elsif not can_content then
      raise exception 'Permissions insuffisantes pour modifier le contenu du service';
    end if;
  end if;

  if (
    new.precio is distinct from old.precio
    or new.duration is distinct from old.duration
  ) and not can_business then
    raise exception 'Permissions insuffisantes pour modifier les parametres metier du service';
  end if;

  return new;
end;
$$;

revoke all on function public.ensure_service_write_permissions() from public;
grant execute on function public.ensure_service_write_permissions() to authenticated, service_role;

create or replace function public.ensure_products_write_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  can_content boolean;
  can_business boolean;
begin
  if public.current_user_role() = 'admin' or auth.role() = 'service_role' then
    return new;
  end if;

  can_content := public.current_user_has_permission('boutique.catalog.content.edit');
  can_business := public.current_user_has_permission('boutique.catalog.business.edit');

  if tg_op = 'INSERT' then
    if not can_content or not can_business then
      raise exception 'Permissions insuffisantes pour creer un produit';
    end if;
    return new;
  end if;

  if (
    new.nombre is distinct from old.nombre
    or new.descripcion is distinct from old.descripcion
    or new.categoria is distinct from old.categoria
    or new.imagen_url is distinct from old.imagen_url
    or new.destacado is distinct from old.destacado
    or new.orden is distinct from old.orden
  ) and not can_content then
    raise exception 'Permissions insuffisantes pour modifier le contenu du produit';
  end if;

  if (
    new.precio is distinct from old.precio
    or new.precio_original is distinct from old.precio_original
    or new.stock is distinct from old.stock
    or new.activo is distinct from old.activo
    or new.stripe_product_id is distinct from old.stripe_product_id
    or new.stripe_price_id is distinct from old.stripe_price_id
  ) and not can_business then
    raise exception 'Permissions insuffisantes pour modifier les parametres commerciaux du produit';
  end if;

  return new;
end;
$$;

revoke all on function public.ensure_products_write_permissions() from public;
grant execute on function public.ensure_products_write_permissions() to authenticated, service_role;

insert into public.permission_profiles (key, name, description, is_system, active)
values
  ('staff_basic', 'Staff basique', 'Acces minimal au dashboard et a la lecture operationnelle de base.', true, true),
  ('reception', 'Reception', 'Gestion quotidienne des reservations et du CRM.', true, true),
  ('center_manager', 'Responsable de centre', 'Gestion operationnelle d''un ou plusieurs centres.', true, true),
  ('catalog_content', 'Catalogue / contenu', 'Gestion du catalogue services, galerie et catalogue boutique.', true, true),
  ('analyst', 'Analyste', 'Consultation analytique et lecture seule.', true, true)
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    is_system = excluded.is_system,
    active = excluded.active,
    updated_at = now();

with profiles as (
  select id, key from public.permission_profiles
), desired(profile_key, permission_key, scope_mode) as (
  values
    ('staff_basic', 'dashboard.view', 'all'),
    ('staff_basic', 'reservations.view', 'own_stylist'),

    ('reception', 'dashboard.view', 'all'),
    ('reception', 'reservations.view', 'specific_locations'),
    ('reception', 'reservations.create', 'specific_locations'),
    ('reception', 'reservations.manage_pending', 'specific_locations'),
    ('reception', 'reservations.cancel', 'specific_locations'),
    ('reception', 'crm.customers.view', 'all'),
    ('reception', 'crm.customers.edit', 'all'),
    ('reception', 'crm.notes.view', 'all'),
    ('reception', 'crm.notes.create', 'all'),
    ('reception', 'boutique.orders.view', 'all'),
    ('reception', 'boutique.orders.edit', 'all'),

    ('center_manager', 'dashboard.view', 'all'),
    ('center_manager', 'reservations.view', 'assigned_location'),
    ('center_manager', 'reservations.create', 'assigned_location'),
    ('center_manager', 'reservations.replan', 'assigned_location'),
    ('center_manager', 'reservations.manage_pending', 'assigned_location'),
    ('center_manager', 'reservations.cancel', 'assigned_location'),
    ('center_manager', 'schedule.time_off.manage', 'assigned_location'),
    ('center_manager', 'schedule.location_closures.manage', 'assigned_location'),
    ('center_manager', 'schedule.working_hours.manage', 'assigned_location'),
    ('center_manager', 'schedule.location_hours.manage', 'assigned_location'),
    ('center_manager', 'crm.customers.view', 'all'),
    ('center_manager', 'crm.customers.edit', 'all'),
    ('center_manager', 'crm.notes.view', 'all'),
    ('center_manager', 'crm.notes.create', 'all'),
    ('center_manager', 'services.view', 'all'),
    ('center_manager', 'services.content.edit', 'all'),
    ('center_manager', 'stylists.profile.view', 'assigned_location'),
    ('center_manager', 'stylists.profile.edit', 'assigned_location'),
    ('center_manager', 'stylists.operations.view', 'assigned_location'),
    ('center_manager', 'stylists.operations.edit', 'assigned_location'),
    ('center_manager', 'locations.profile.view', 'assigned_location'),
    ('center_manager', 'locations.profile.edit', 'assigned_location'),
    ('center_manager', 'locations.operations.view', 'assigned_location'),
    ('center_manager', 'locations.operations.edit', 'assigned_location'),
    ('center_manager', 'gallery.view', 'all'),
    ('center_manager', 'gallery.edit', 'all'),
    ('center_manager', 'stats.view', 'assigned_location'),
    ('center_manager', 'boutique.orders.view', 'all'),
    ('center_manager', 'boutique.orders.edit', 'all'),

    ('catalog_content', 'dashboard.view', 'all'),
    ('catalog_content', 'services.view', 'all'),
    ('catalog_content', 'services.content.edit', 'all'),
    ('catalog_content', 'gallery.view', 'all'),
    ('catalog_content', 'gallery.edit', 'all'),
    ('catalog_content', 'gallery.delete', 'all'),
    ('catalog_content', 'boutique.catalog.view', 'all'),
    ('catalog_content', 'boutique.catalog.content.edit', 'all'),

    ('analyst', 'dashboard.view', 'all'),
    ('analyst', 'stats.view', 'all')
)
insert into public.profile_permissions (profile_id, permission_key, scope_mode)
select p.id, d.permission_key, d.scope_mode
from desired d
join profiles p on p.key = d.profile_key
on conflict (profile_id, permission_key) do update
set scope_mode = excluded.scope_mode,
    updated_at = now();

insert into public.user_profiles (user_id, profile_id)
select ur.id, pp.id
from public.user_roles ur
join public.permission_profiles pp on pp.key = 'staff_basic'
left join public.user_profiles up on up.user_id = ur.id
where ur.role = 'staff'
  and up.user_id is null;

alter table public.permission_profiles enable row level security;
alter table public.profile_permissions enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.user_location_assignments enable row level security;
alter table public.admin_audit_log enable row level security;

-- readable metadata for authenticated users

drop policy if exists permission_profiles_authenticated_read on public.permission_profiles;
create policy permission_profiles_authenticated_read on public.permission_profiles
for select to authenticated
using (true);

drop policy if exists profile_permissions_authenticated_read on public.profile_permissions;
create policy profile_permissions_authenticated_read on public.profile_permissions
for select to authenticated
using (true);

-- own or admin reads

drop policy if exists user_profiles_select_policy on public.user_profiles;
create policy user_profiles_select_policy on public.user_profiles
for select to authenticated
using (public.current_user_role() = 'admin' or user_id = auth.uid());

drop policy if exists user_profiles_admin_mutation_policy on public.user_profiles;
create policy user_profiles_admin_mutation_policy on public.user_profiles
for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists user_permission_overrides_select_policy on public.user_permission_overrides;
create policy user_permission_overrides_select_policy on public.user_permission_overrides
for select to authenticated
using (public.current_user_role() = 'admin' or user_id = auth.uid());

drop policy if exists user_permission_overrides_admin_mutation_policy on public.user_permission_overrides;
create policy user_permission_overrides_admin_mutation_policy on public.user_permission_overrides
for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists user_location_assignments_select_policy on public.user_location_assignments;
create policy user_location_assignments_select_policy on public.user_location_assignments
for select to authenticated
using (public.current_user_role() = 'admin' or user_id = auth.uid());

drop policy if exists user_location_assignments_admin_mutation_policy on public.user_location_assignments;
create policy user_location_assignments_admin_mutation_policy on public.user_location_assignments
for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists admin_audit_log_admin_read on public.admin_audit_log;
create policy admin_audit_log_admin_read on public.admin_audit_log
for select to authenticated
using (public.current_user_role() = 'admin');

revoke all on public.permission_profiles from public, anon;
revoke all on public.profile_permissions from public, anon;
revoke all on public.user_profiles from public, anon;
revoke all on public.user_permission_overrides from public, anon;
revoke all on public.user_location_assignments from public, anon;
revoke all on public.admin_audit_log from public, anon;

grant select on public.permission_profiles to authenticated;
grant select on public.profile_permissions to authenticated;
grant select, insert, update, delete on public.user_profiles to authenticated;
grant select, insert, update, delete on public.user_permission_overrides to authenticated;
grant select, insert, update, delete on public.user_location_assignments to authenticated;
grant select on public.admin_audit_log to authenticated;
grant all on public.permission_profiles, public.profile_permissions, public.user_profiles, public.user_permission_overrides, public.user_location_assignments, public.admin_audit_log to service_role;

-- update legacy staff policies to admin|staff
create or replace function public.current_user_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'staff');
$$;

revoke all on function public.current_user_is_staff() from public;
grant execute on function public.current_user_is_staff() to authenticated, service_role;

drop policy if exists bookings_staff_select on public.bookings;
create policy bookings_staff_select on public.bookings
for select to authenticated
using (
  public.current_user_can_access_resource('reservations.view', location_id, stylist_id)
  or public.current_user_can_access_resource('stats.view', location_id, stylist_id)
);

drop policy if exists bookings_staff_update on public.bookings;
create policy bookings_staff_update on public.bookings
for update to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists customer_profiles_staff_select on public.customer_profiles;
create policy customer_profiles_staff_select on public.customer_profiles
for select to authenticated
using (public.current_user_is_staff());

drop policy if exists customer_profiles_staff_insert on public.customer_profiles;
create policy customer_profiles_staff_insert on public.customer_profiles
for insert to authenticated
with check (public.current_user_is_staff());

drop policy if exists customer_profiles_staff_update on public.customer_profiles;
create policy customer_profiles_staff_update on public.customer_profiles
for update to authenticated
using (public.current_user_is_staff())
with check (public.current_user_is_staff());

drop policy if exists customer_profiles_staff_delete on public.customer_profiles;
create policy customer_profiles_staff_delete on public.customer_profiles
for delete to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists customer_notes_staff_select on public.customer_notes;
create policy customer_notes_staff_select on public.customer_notes
for select to authenticated
using (public.current_user_is_staff());

drop policy if exists customer_notes_staff_insert on public.customer_notes;
create policy customer_notes_staff_insert on public.customer_notes
for insert to authenticated
with check (public.current_user_is_staff() and created_by = auth.uid());

drop policy if exists customer_notes_staff_update on public.customer_notes;
create policy customer_notes_staff_update on public.customer_notes
for update to authenticated
using (public.current_user_is_staff())
with check (public.current_user_is_staff());

drop policy if exists customer_notes_staff_delete on public.customer_notes;
create policy customer_notes_staff_delete on public.customer_notes
for delete to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists time_off_staff_read on public.time_off;
create policy time_off_staff_read on public.time_off
for select to authenticated
using (public.current_user_is_staff());

drop policy if exists location_closures_staff_read on public.location_closures;
create policy location_closures_staff_read on public.location_closures
for select to authenticated
using (public.current_user_is_staff());

-- direct-client managed admin tables

drop policy if exists service_groups_admin_insert on public.service_groups;
drop policy if exists service_groups_admin_update on public.service_groups;
drop policy if exists service_groups_admin_delete on public.service_groups;
create policy service_groups_staff_insert on public.service_groups
for insert to authenticated
with check (public.current_user_role() = 'admin' or public.current_user_has_permission('services.content.edit'));
create policy service_groups_staff_update on public.service_groups
for update to authenticated
using (public.current_user_role() = 'admin' or public.current_user_has_permission('services.content.edit'))
with check (public.current_user_role() = 'admin' or public.current_user_has_permission('services.content.edit'));
create policy service_groups_staff_delete on public.service_groups
for delete to authenticated
using (public.current_user_role() = 'admin' or public.current_user_has_permission('services.delete'));

drop policy if exists service_subgroups_admin_insert on public.service_subgroups;
drop policy if exists service_subgroups_admin_update on public.service_subgroups;
drop policy if exists service_subgroups_admin_delete on public.service_subgroups;
create policy service_subgroups_staff_insert on public.service_subgroups
for insert to authenticated
with check (public.current_user_role() = 'admin' or public.current_user_has_permission('services.content.edit'));
create policy service_subgroups_staff_update on public.service_subgroups
for update to authenticated
using (public.current_user_role() = 'admin' or public.current_user_has_permission('services.content.edit'))
with check (public.current_user_role() = 'admin' or public.current_user_has_permission('services.content.edit'));
create policy service_subgroups_staff_delete on public.service_subgroups
for delete to authenticated
using (public.current_user_role() = 'admin' or public.current_user_has_permission('services.delete'));

drop policy if exists servicios_admin_insert on public.servicios;
drop policy if exists servicios_admin_update on public.servicios;
drop policy if exists servicios_admin_delete on public.servicios;
create policy servicios_staff_insert on public.servicios
for insert to authenticated
with check (
  public.current_user_role() = 'admin'
  or (
    public.current_user_has_permission('services.content.edit')
    and public.current_user_has_permission('services.business.edit')
  )
);
create policy servicios_staff_update on public.servicios
for update to authenticated
using (
  public.current_user_role() = 'admin'
  or public.current_user_has_permission('services.content.edit')
  or public.current_user_has_permission('services.business.edit')
)
with check (
  public.current_user_role() = 'admin'
  or public.current_user_has_permission('services.content.edit')
  or public.current_user_has_permission('services.business.edit')
);
create policy servicios_staff_delete on public.servicios
for delete to authenticated
using (public.current_user_role() = 'admin' or public.current_user_has_permission('services.delete'));

drop policy if exists stylists_admin_insert on public.stylists;
drop policy if exists stylists_admin_update on public.stylists;
drop policy if exists stylists_admin_delete on public.stylists;
create policy stylists_staff_insert on public.stylists
for insert to authenticated
with check (
  public.current_user_role() = 'admin'
  or (
    public.current_user_can_access_stylist_row('stylists.profile.edit', id, location_ids)
    and public.current_user_can_access_stylist_row('stylists.operations.edit', id, location_ids)
  )
);
create policy stylists_staff_update on public.stylists
for update to authenticated
using (
  public.current_user_role() = 'admin'
  or (
    public.current_user_can_access_stylist_row('stylists.profile.edit', id, location_ids)
    and public.current_user_can_access_stylist_row('stylists.operations.edit', id, location_ids)
  )
)
with check (
  public.current_user_role() = 'admin'
  or (
    public.current_user_can_access_stylist_row('stylists.profile.edit', id, location_ids)
    and public.current_user_can_access_stylist_row('stylists.operations.edit', id, location_ids)
  )
);
create policy stylists_staff_delete on public.stylists
for delete to authenticated
using (public.current_user_role() = 'admin' or public.current_user_can_access_stylist_row('stylists.profile.delete', id, location_ids));

drop policy if exists stylist_services_admin_insert on public.stylist_services;
drop policy if exists stylist_services_admin_update on public.stylist_services;
drop policy if exists stylist_services_admin_delete on public.stylist_services;
create policy stylist_services_staff_insert on public.stylist_services
for insert to authenticated
with check (
  public.current_user_role() = 'admin'
  or exists (
    select 1
    from public.stylists s
    where s.id = stylist_id
      and public.current_user_can_access_stylist_row('stylists.operations.edit', s.id, s.location_ids)
  )
);
create policy stylist_services_staff_delete on public.stylist_services
for delete to authenticated
using (
  public.current_user_role() = 'admin'
  or exists (
    select 1
    from public.stylists s
    where s.id = stylist_id
      and public.current_user_can_access_stylist_row('stylists.operations.edit', s.id, s.location_ids)
  )
);

drop policy if exists locations_admin_insert on public.locations;
drop policy if exists locations_admin_update on public.locations;
drop policy if exists locations_admin_delete on public.locations;
create policy locations_staff_insert on public.locations
for insert to authenticated
with check (
  public.current_user_role() = 'admin'
  or public.current_user_permission_scope('locations.profile.edit') = 'all'
);
create policy locations_staff_update on public.locations
for update to authenticated
using (public.current_user_role() = 'admin' or public.current_user_can_access_resource('locations.profile.edit', null, id))
with check (public.current_user_role() = 'admin' or public.current_user_can_access_resource('locations.profile.edit', null, id));
create policy locations_staff_delete on public.locations
for delete to authenticated
using (public.current_user_role() = 'admin' or public.current_user_can_access_resource('locations.profile.delete', null, id));

drop policy if exists imagenes_galeria_admin_insert on public.imagenes_galeria;
drop policy if exists imagenes_galeria_admin_update on public.imagenes_galeria;
drop policy if exists imagenes_galeria_admin_delete on public.imagenes_galeria;
create policy imagenes_galeria_staff_insert on public.imagenes_galeria
for insert to authenticated
with check (public.current_user_role() = 'admin' or public.current_user_has_permission('gallery.edit'));
create policy imagenes_galeria_staff_update on public.imagenes_galeria
for update to authenticated
using (public.current_user_role() = 'admin' or public.current_user_has_permission('gallery.edit'))
with check (public.current_user_role() = 'admin' or public.current_user_has_permission('gallery.edit'));
create policy imagenes_galeria_staff_delete on public.imagenes_galeria
for delete to authenticated
using (public.current_user_role() = 'admin' or public.current_user_has_permission('gallery.delete'));

-- products can be read by staff with explicit permission through direct client if needed

drop policy if exists productos_admin_read on public.productos;
create policy productos_staff_read on public.productos
for select to authenticated
using (
  public.current_user_role() = 'admin'
  or public.current_user_has_permission('boutique.catalog.view')
  or public.current_user_has_permission('boutique.orders.view')
);

drop policy if exists categorias_productos_admin_read on public.categorias_productos;
create policy categorias_productos_staff_read on public.categorias_productos
for select to authenticated
using (
  public.current_user_role() = 'admin'
  or public.current_user_has_permission('boutique.catalog.view')
);

-- updated_at triggers

drop trigger if exists trg_permission_profiles_set_updated_at on public.permission_profiles;
create trigger trg_permission_profiles_set_updated_at
before update on public.permission_profiles
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_profile_permissions_set_updated_at on public.profile_permissions;
create trigger trg_profile_permissions_set_updated_at
before update on public.profile_permissions
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_user_profiles_set_updated_at on public.user_profiles;
create trigger trg_user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_user_permission_overrides_set_updated_at on public.user_permission_overrides;
create trigger trg_user_permission_overrides_set_updated_at
before update on public.user_permission_overrides
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_user_location_assignments_set_updated_at on public.user_location_assignments;
create trigger trg_user_location_assignments_set_updated_at
before update on public.user_location_assignments
for each row execute function public.set_updated_at_timestamp();

-- audit triggers
drop trigger if exists trg_user_profiles_audit on public.user_profiles;
create trigger trg_user_profiles_audit
after insert or update or delete on public.user_profiles
for each row execute function public.audit_admin_change();

drop trigger if exists trg_user_permission_overrides_audit on public.user_permission_overrides;
create trigger trg_user_permission_overrides_audit
after insert or update or delete on public.user_permission_overrides
for each row execute function public.audit_admin_change();

drop trigger if exists trg_user_location_assignments_audit on public.user_location_assignments;
create trigger trg_user_location_assignments_audit
after insert or update or delete on public.user_location_assignments
for each row execute function public.audit_admin_change();

drop trigger if exists trg_stylist_users_audit on public.stylist_users;
create trigger trg_stylist_users_audit
after insert or update or delete on public.stylist_users
for each row execute function public.audit_admin_change();

drop trigger if exists trg_servicios_audit on public.servicios;
create trigger trg_servicios_audit
after insert or update or delete on public.servicios
for each row execute function public.audit_admin_change();

drop trigger if exists trg_productos_audit on public.productos;
create trigger trg_productos_audit
after insert or update or delete on public.productos
for each row execute function public.audit_admin_change();

drop trigger if exists trg_time_off_audit on public.time_off;
create trigger trg_time_off_audit
after insert or update or delete on public.time_off
for each row execute function public.audit_admin_change();

drop trigger if exists trg_location_closures_audit on public.location_closures;
create trigger trg_location_closures_audit
after insert or update or delete on public.location_closures
for each row execute function public.audit_admin_change();

drop trigger if exists trg_working_hours_audit on public.working_hours;
create trigger trg_working_hours_audit
after insert or update or delete on public.working_hours
for each row execute function public.audit_admin_change();

drop trigger if exists trg_location_hours_audit on public.location_hours;
create trigger trg_location_hours_audit
after insert or update or delete on public.location_hours
for each row execute function public.audit_admin_change();

drop trigger if exists trg_servicios_permission_guard on public.servicios;
create trigger trg_servicios_permission_guard
before insert or update on public.servicios
for each row execute function public.ensure_service_write_permissions();

drop trigger if exists trg_productos_permission_guard on public.productos;
create trigger trg_productos_permission_guard
before insert or update on public.productos
for each row execute function public.ensure_products_write_permissions();

commit;
