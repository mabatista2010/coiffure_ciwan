-- Checks de seguridad post-robustez (ejecucion manual/CI).
-- Proyecto objetivo: tvdwepumtrrjpkvnitpw

-- 1) Tablas en esquema public sin RLS.
select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and rowsecurity = false
order by tablename;

-- 2) Policies peligrosas (FOR ALL con USING/WITH CHECK true).
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and cmd = 'ALL'
  and coalesce(qual, 'true') = 'true'
  and coalesce(with_check, 'true') = 'true'
order by tablename, policyname;

-- 3) Policies de lectura anon/public en tablas con PII.
select p.schemaname, p.tablename, p.policyname, p.roles, p.cmd, p.qual
from pg_policies p
where p.schemaname = 'public'
  and p.cmd = 'SELECT'
  and p.tablename in ('bookings', 'pedidos', 'items_pedido', 'carrito_sesiones', 'items_carrito')
  and (
    p.roles::text like '%anon%'
    or p.roles::text like '%public%'
  )
order by p.tablename, p.policyname;

-- 4) Funciones SECURITY DEFINER sin search_path fijo.
select n.nspname as schema_name, p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
  and (p.proconfig is null or not exists (
    select 1
    from unnest(p.proconfig) cfg
    where cfg like 'search_path=%'
  ))
order by p.proname;

-- 5) Grants EXECUTE de funciones sensibles.
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name in ('handle_new_user', 'create_booking_atomic', 'current_user_role')
order by routine_name, grantee;
