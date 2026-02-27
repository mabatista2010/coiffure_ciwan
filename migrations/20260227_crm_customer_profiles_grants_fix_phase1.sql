-- Ajuste de grants en tablas CRM para limitar privilegios de authenticated.

begin;

revoke all on table public.customer_profiles from authenticated;
revoke all on table public.customer_notes from authenticated;

grant select, insert, update, delete on table public.customer_profiles to authenticated;
grant select, insert, update, delete on table public.customer_notes to authenticated;

commit;
