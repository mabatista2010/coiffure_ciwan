# Checklist de implementacion

## Fase 1 - MVP escalable

### Tareas
- [x] UI: agregar estado `Ouvert/Ferme` por dia en edicion/creacion de centro.
- [x] UI: ocultar/desactivar slots cuando `isClosed=true`.
- [x] UI: exigir al menos 1 slot valido cuando `isClosed=false`.
- [x] UI: validar formato, orden y solapes de franjas en cliente.
- [x] API: crear endpoint server para guardar horarios de centro.
- [x] API: mapear `isClosed=true` a ausencia de filas en `location_hours`.
- [x] UX: mostrar errores y confirmaciones dentro del panel lateral.

### Tests
- [x] Manual: guardar centro con dias cerrados y reabrir panel (persistencia correcta).
- [x] Manual: reservar en dia cerrado (sin slots).
- [x] Manual: bloquear guardado con franjas invalidas/solapadas.
- [x] Tecnico: `npm run lint`.

### Notas/decisiones
- Contrato frontend estable desde Fase 1: `DaySchedule { dayOfWeek, isClosed, slots }`.
- Se prioriza no romper compatibilidad funcional del modelo actual.
- Implementado ademas endpoint protegido `POST /api/admin/schedule/location-hours`.
- Verificacion tecnica adicional completada: `npm run build`.
- Smoke test real ejecutado con centro temporal QA y limpieza posterior de datos.
- Evidencia visual Playwright generada: `qa-centros-ferme-panel-initial.png`, `qa-centros-ferme-validation-error.png`, `qa-centros-ferme-success.png`, `qa-centros-ferme-persistence.png`, `qa-centros-ferme-overlap-error.png`.
- El caso "dia cerrado sin slots" se verifico contra `/api/reservation/availability`: lunes abierto con slots disponibles y martes cerrado con `reasonCode=outside_location_hours` en todos los slots.

### Gate: tests de fase pasados
- [x] Gate Fase 1 aprobado.

---

## Fase 2 - Robustez transaccional

### Tareas
- [x] BD: crear tabla `location_daily_schedule` con unique `(location_id, day_of_week)`.
- [x] BD: agregar constraints de integridad necesarios.
- [x] Migracion: backfill de estado diario por centro.
- [x] API: implementar upsert transaccional de horario semanal.
- [x] API: doble lectura/escritura temporal entre modelo antiguo y nuevo.
- [x] Availability: adaptar lectura a estado diario explicito.
- [x] Rollout: habilitar feature flag por entorno y monitorear.
- [x] Limpieza: retirar compatibilidad antigua tras estabilizacion.

### Tests
- [x] Manual: casos mixtos (abrir/cerrar varios dias) sin perdida de datos.
- [x] Manual: disponibilidad consistente en dias abiertos/cerrados.
- [x] Tecnico: pruebas de rollback transaccional ante error intermedio.
- [x] Tecnico: `npm run lint` y smoke test de flujos admin/reserva.

### Notas/decisiones
- Feature flag temporal retirada en Fase 2.5: ya no existe `LOCATION_DAILY_SCHEDULE_V2_ENABLED`.
- `mcp__supabase__apply_migration` no estuvo disponible; la DDL se aplico en el proyecto real mediante `execute_sql` y se dejo el SQL versionado en `migrations/20260326_location_daily_schedule_phase2.sql`.
- Se versiono ademas `migrations/20260326_location_daily_schedule_cleanup_phase25.sql` para fijar `location_daily_schedule` como fuente autoritativa del cierre diario.
- Fase 2.5 validada con test controlado de inconsistencia: incluso con `location_hours` presente para martes, `location_daily_schedule.is_closed=true` bloquea todos los slots.

### Gate: tests de fase pasados
- [x] Gate Fase 2 aprobado.
