# Checklist de Implementación - Reservas V2.1

## Fase A - Alineación BD núcleo

### Tareas
- [x] Crear migración para incluir `needs_replan` en `bookings.status`.
- [x] Ajustar constraint `bookings_no_overlap` para bloquear `pending|confirmed|needs_replan`.
- [x] Añadir `time_off.category` con dominio controlado.
- [x] Crear tabla `location_closures` con checks e índices.
- [x] Configurar RLS/grants iniciales para `location_closures`.
- [x] Upsert de claves operativas en `configuracion`.
- [x] Actualizar `context.md` con cambios de esquema.

### Tests
- [x] Verificar que migración aplica limpia.
- [x] Probar inserciones válidas e inválidas por cada check/constraint nuevo.
- [x] Verificar lecturas/escrituras según rol en `location_closures`.

### Notas/decisiones
- Estado: Completada.
- Decisión aplicada: escritura `location_closures` solo `admin`; lectura `admin|employee`.
- Evidencias: migración `migrations/20260227_reservas_v2_phase_a_core.sql` aplicada en proyecto `tvdwepumtrrjpkvnitpw` + validaciones SQL.

### Gate: tests de fase pasados
- [x] Gate Fase A aprobado.

## Fase B - Motor unificado de reglas

### Tareas
- [x] Implementar `create_booking_atomic_v2`.
- [x] Adaptar `/api/reservation/create` para delegar en v2.
- [x] Alinear `/api/reservation/availability` a mismas reglas.
- [x] Homologar catálogo de errores y status HTTP.
- [x] Confirmar idempotencia y conflictos en concurrencia.
- [x] Actualizar `context.md` con contrato final de APIs.

### Tests
- [x] Test de concurrencia (requests paralelas mismo hueco).
- [x] Test de paridad create vs availability.
- [x] Test de ventana temporal (`min_advance_hours` / `max_advance_days`).

### Notas/decisiones
- Estado: Completada.
- Evidencias:
  - Migraciones `migrations/20260227_reservas_v2_phase_b_engine.sql`, `migrations/20260227_reservas_v2_phase_b_availability.sql`, `migrations/20260227_reservas_v2_phase_b_availability_fix.sql`.
  - API create delega en `create_booking_atomic_v2`.
  - API availability delega en `get_availability_slots_v2` con `reasonCode`.
  - Validación SQL de conflicto, paridad y ventana temporal en BD real.

### Gate: tests de fase pasados
- [x] Gate Fase B aprobado.

## Fase C - Operativa de agenda

### Tareas
- [x] CRUD `time_off` con `category` en admin.
- [x] CRUD `location_closures` en admin.
- [x] Trigger/proceso de marcado `needs_replan` por cambios de agenda.
- [x] Registrar motivo de replanificación.
- [x] Actualizar `context.md` con flujos operativos.

### Tests
- [x] Test de cierre completo y parcial de centro.
- [x] Test de ausencias por categoría y rango.
- [x] Test de transición automática a `needs_replan`.

### Notas/decisiones
- Estado: Completada.
- Evidencias:
  - Migración `migrations/20260227_reservas_v2_phase_c_needs_replan.sql`.
  - Nuevos endpoints admin agenda: `time-off` y `location-closures` (GET/POST/PUT/DELETE).
  - Trigger validado: cierre de centro marca reserva futura a `needs_replan` con motivo `location_closure_changed`.

### Gate: tests de fase pasados
- [x] Gate Fase C aprobado.

## Fase D - Admin UX y workflow

### Tareas
- [x] Añadir filtro/triage `needs_replan` en `/admin/reservations`.
- [x] Ajustar `/admin/reservations/nueva` a disponibilidad robusta.
- [x] Incorporar acciones de resolución (`confirmar`, `mover`, `cancelar`) según diseño final.
- [x] Validar experiencia operativa completa de reserva/replanificación.

### Tests
- [x] Smoke test admin completo de reserva con casos borde.
- [x] Test de resolución en lote e individual de `needs_replan`.
- [x] Validación UX en desktop y móvil.

### Notas/decisiones
- Estado: Completada.
- Implementado en backend: endpoint triage `GET/POST /api/admin/bookings/replan` (confirm/cancel/move).
- Validado por API real: acciones `confirm`, `cancel` y `move` sobre una reserva `needs_replan` de prueba.
- Validado por UI Playwright:
  - filtro `status=needs_replan` en `/admin/reservations`,
  - creación completa en `/admin/reservations/nueva` (cliente + resumen + confirmación),
  - modal de éxito sin auto-cierre con CTAs funcionales,
  - responsive desktop/tablet/móvil sin overflow horizontal en `/admin/reservations` y `/admin/reservations/nueva`.

### Gate: tests de fase pasados
- [x] Gate Fase D aprobado.

## Fase E - QA, rollout y estabilización

### Tareas
- [x] Ejecutar QA técnico y funcional completo.
- [x] Cerrar checklist de release.
- [x] Validar runbook de rollback.
- [x] Definir y revisar KPIs post-release.

### Tests
- [x] Pasar todos los casos de `tests.md`.
- [x] Verificar no regresión de flujos críticos (reservas web/admin/MCP).
- [x] Validar métricas base de estabilidad.

### Notas/decisiones
- Estado: Completada.
- QA técnico ejecutado:
  - `npm run lint` PASS.
  - `npm run build` PASS.
- Smoke funcional ejecutado:
  - Web pública `/reservation`: flujo completo hasta confirmación PASS.
  - Admin `/admin/home`, `/admin/reservations`, `/admin/reservations/nueva`: carga y operación base PASS.
  - MCP `/mcp`: `initialize`, `tools/list`, lecturas (`list_*`, `get_availability`) y `create_booking` PASS.
- Release checklist validado para scope reservas:
  - compilación, smoke core, endpoints críticos y no regresión funcional.
- Rollback runbook validado:
  - referencia operativa `Docs/security-rollback-runbook.md` revisada y aplicable al hardening activo.
- KPIs post-release definidos (baseline):
  - tasa de error create (5xx/4xx funcionales),
  - ratio `slot_conflict`,
  - backlog `needs_replan`,
  - latencia p95 en create/availability,
  - éxito de creación web/admin/MCP.

### Gate: tests de fase pasados
- [x] Gate Fase E aprobado.

## Cierre del pack (impl-pack-close)

### Tareas
- [x] Documentar `Outcome summary` en `implementation.md`.
- [x] Consolidar estado final del pack en `status.md`.
- [x] Consolidar evidencia ejecutada en `tests.md`.
- [ ] QA manual final del usuario (externo al cierre documental).

### Gate de cierre
- [ ] OK manual del usuario para limpiar puntero en `Docs/_active.md`.
