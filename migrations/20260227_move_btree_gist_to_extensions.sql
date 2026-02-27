-- Mover extension btree_gist fuera de public para reducir superficie expuesta.

begin;
create schema if not exists extensions;
alter extension btree_gist set schema extensions;
commit;
