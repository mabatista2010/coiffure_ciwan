# Contexto Resumen - Plantilla SaaS (Single-Tenant)

## Objetivo
Preparar una base reutilizable para nuevos clientes, donde cada cliente tenga:

- Su propio repositorio.
- Su propio proyecto Supabase.
- La misma lógica funcional de la app base (landing + reservas + admin + roles + MCP), sin rehacer todo desde cero.

## Decisiones tomadas en esta sesión
1. El modelo correcto para este caso es **single-tenant por cliente** (no multitenant).
2. El flujo operativo será con agentes usando **MCP Supabase**.
3. El usuario proporcionará al agente: `project_id`, `supabase_url` y `anon_key`.
4. Para bootstrap completo de BD, el agente debe ejecutar migraciones por MCP (no confiar solo en `anon_key`).
5. Se acordó que conviene cerrar primero seguridad/estabilidad y congelar una **v1.0** antes de publicar la plantilla definitiva.

## Hallazgos técnicos relevantes (estado actual auditado)
1. El esquema real de Supabase incluye tablas core de reservas/admin y también tablas de boutique.
2. Existen políticas RLS y trigger de `handle_new_user()` activos en la BD real.
3. Hay divergencia potencial entre SQL local histórico y el estado real de Supabase.
4. Hay acoplamientos de negocio y branding que deben parametrizarse en la plantilla.

## Regla de oro para el agente
**La fuente de verdad para migraciones debe ser la BD real auditada por MCP**, no scripts SQL antiguos del repo.

## Alcance funcional previsto de la plantilla (fase inicial)
- Incluir: landing, reservas, panel admin, roles, MCP.
- Excluir temporalmente: boutique y Stripe (hasta decidir reintroducción en una fase posterior).

## Resultado esperado cuando se ejecute la implementación
1. Repo plantilla funcional en local y publicado en GitHub.
2. Estructura de instrucciones interna para clonar desde cero con otro agente.
3. Migraciones canónicas y checklist de validación para nuevos clientes.
