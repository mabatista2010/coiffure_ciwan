-- Conversion segura de groupe avec un seul sous-groupe vers services directs

create or replace function public.servicios_before_write_hierarchy()
returns trigger
language plpgsql
as $$
declare
  v_slug text;
  v_subgroup_group_id bigint;
  v_existing_featured_count integer;
  v_allow_flatten boolean := coalesce(current_setting('app.catalog_allow_flatten', true), '') = 'true';
begin
  if new.nombre is null or btrim(new.nombre) = '' then
    raise exception 'Le nom du service est obligatoire';
  end if;

  if new.subgroup_id is not null then
    select group_id into v_subgroup_group_id
    from public.service_subgroups
    where id = new.subgroup_id;

    if v_subgroup_group_id is null then
      raise exception 'Le sous-groupe selectionne est introuvable';
    end if;

    new.group_id := v_subgroup_group_id;
  end if;

  if new.group_id is null then
    raise exception 'Le groupe parent est obligatoire';
  end if;

  if new.subgroup_id is null and public.current_service_group_mode(new.group_id) = 'subgroups' and not v_allow_flatten then
    raise exception 'Ce groupe contient deja des sous-groupes et ne peut pas recevoir de services directs';
  end if;

  if new.slug is null or btrim(new.slug) = '' then
    v_slug := public.slugify_catalog_text(new.nombre);
    if v_slug = '' then
      v_slug := 'service';
    end if;
    new.slug := v_slug;
  else
    new.slug := public.slugify_catalog_text(new.slug);
  end if;

  new.sort_order := coalesce(new.sort_order, 0);
  new.landing_featured := coalesce(new.landing_featured, false);

  if new.landing_featured then
    select count(*)::integer
      into v_existing_featured_count
    from public.servicios s
    where s.landing_featured = true
      and (tg_op = 'INSERT' or s.id <> new.id);

    if v_existing_featured_count >= 6 then
      raise exception 'Maximum 6 services mis en avant sur la landing';
    end if;
  end if;

  if new.landing_featured and (new.landing_sort_order is null or new.landing_sort_order < 1) then
    select coalesce(max(s.landing_sort_order), 0) + 1
      into new.landing_sort_order
    from public.servicios s
    where s.landing_featured = true
      and (tg_op = 'INSERT' or s.id <> new.id);
  end if;

  if not new.landing_featured then
    new.landing_sort_order := null;
  end if;

  return new;
end;
$$;

create or replace function public.convert_group_single_subgroup_to_direct_services(p_group_id bigint)
returns void
language plpgsql
as $$
declare
  v_subgroup_id bigint;
  v_subgroup_count integer;
begin
  if p_group_id is null then
    raise exception 'Le groupe cible est obligatoire';
  end if;

  if public.current_service_group_mode(p_group_id) <> 'subgroups' then
    raise exception 'Ce groupe n''est pas en mode sous-groupes';
  end if;

  select count(*)::integer, min(id)
    into v_subgroup_count, v_subgroup_id
  from public.service_subgroups
  where group_id = p_group_id;

  if v_subgroup_count <> 1 or v_subgroup_id is null then
    raise exception 'La conversion en services directs n''est possible que pour un groupe avec un seul sous-groupe';
  end if;

  perform set_config('app.catalog_allow_flatten', 'true', true);

  update public.servicios
  set subgroup_id = null,
      group_id = p_group_id
  where subgroup_id = v_subgroup_id;

  delete from public.service_subgroups
  where id = v_subgroup_id;
end;
$$;
