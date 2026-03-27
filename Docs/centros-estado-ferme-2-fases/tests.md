# Plan de tests

## Estrategia por fase

### Fase 1
- Prioridad: validar UX y reglas de negocio con modelo compatible.
- Foco:
  - Estado `Ferme` por dia.
  - Validaciones cliente de franjas.
  - Mensajeria visible en panel.

### Fase 2
- Prioridad: validar integridad de datos y atomicidad.
- Foco:
  - Migracion y consistencia entre tablas.
  - API transaccional y rollback.
  - No regresion en availability.

## Casos borde
- Dia marcado `Ferme` con slots residuales en estado UI.
- Dia `Ouvert` sin slots.
- Slot con `start == end`.
- Slot con `start > end`.
- Solape parcial y total entre slots del mismo dia.
- Cambios simultaneos (dos admins editando mismo centro).
- Migracion con centros que no tienen ningun horario definido.

## Datos de prueba
- Centro A: semana mixta (3 dias abiertos, 4 cerrados).
- Centro B: todos los dias abiertos con 2 slots por dia.
- Centro C: todos los dias cerrados.
- Slots ejemplo validos: `09:00-13:00`, `15:00-19:00`.
- Slots ejemplo invalidos: `13:00-13:00`, `14:00-12:00`, `10:00-12:00` + `11:30-13:00`.

## Comandos
- `npm run lint`
- `npm run dev`
- `npm run build` (gate previo a despliegue si aplica)

## Ejecucion realizada
- 2026-03-26: `npm run lint` ✅
- 2026-03-26: `npm run build` ✅
- 2026-03-26: smoke test manual admin ✅
  - Centro temporal QA creado con lunes `Ouvert 09:00-12:00` y resto `Fermé`.
  - Validacion visible al intentar guardar lunes abierto sin franjas.
  - Persistencia correcta al reabrir el panel del centro recien creado.
- 2026-03-26: smoke test manual invalidacion por solape ✅
  - En Playwright se añadieron 2 franjas solapadas (`09:00-12:00` + `11:00-13:00`) y el panel bloqueo el guardado con mensaje explicito.
- 2026-03-26: smoke test availability dia cerrado ✅
  - `/api/reservation/availability` para `2026-03-30` devolvio slots disponibles.
  - `/api/reservation/availability` para `2026-03-31` devolvio todos los slots con `available=false` y `reasonCode=outside_location_hours`.
- 2026-03-26: QA visual Playwright ✅
  - Capturas: `qa-centros-ferme-panel-initial.png`, `qa-centros-ferme-validation-error.png`, `qa-centros-ferme-success.png`, `qa-centros-ferme-persistence.png`, `qa-centros-ferme-overlap-error.png`.
- 2026-03-26: limpieza post-QA ✅
  - Centro temporal y usuario admin temporal eliminados tras la validacion.
- 2026-03-26: `npm run lint` + `npm run build` tras Fase 2 ✅
- 2026-03-26: migracion/backfill Fase 2 en proyecto real ✅
  - `location_daily_schedule` creada y rellenada con `28` filas (`4` centros x `7` dias).
  - Feature flag `LOCATION_DAILY_SCHEDULE_V2_ENABLED` creada en `configuracion` y activada al final del rollout.
- 2026-03-26: test tecnico de rollback transaccional ✅
  - `save_location_weekly_schedule_v2` recibio payload invalido (menos de 7 dias) dentro de bloque controlado y no altero el estado persistido del centro QA.
- 2026-03-26: smoke test API read-switch ✅
  - Con flag `false`, un martes inconsistente (`location_daily_schedule.is_closed=true` pero `location_hours` presente) seguia devolviendo slots disponibles.
  - Con flag `true`, el mismo martes devolvio todos los slots con `available=false` y `reasonCode=outside_location_hours`.
- 2026-03-26: smoke test route admin Fase 2 ✅
  - `POST /api/admin/schedule/location-hours` respondio `{\"updated_location_hours_count\":1,\"closed_days_count\":6}` para un centro QA temporal.
  - Verificado en BD: `location_daily_schedule` con 7 filas y `location_hours` con 1 franja para lunes.
- 2026-03-26: limpieza post-Fase 2 ✅
  - Centros QA temporales, working_hours auxiliares y usuarios admin temporales eliminados.
- 2026-03-26: limpieza legacy Fase 2.5 en BD real ✅
  - SQL versionado en `migrations/20260326_location_daily_schedule_cleanup_phase25.sql`.
  - Eliminada la clave `LOCATION_DAILY_SCHEDULE_V2_ENABLED` de `configuracion` (`flag_rows=0`).
  - `check_booking_slot_v2` ya no usa feature flag ni fallback para decidir cierres diarios.
- 2026-03-26: smoke test inconsistencia controlada Fase 2.5 ✅
  - Caso QA con lunes abierto y martes marcado `is_closed=true` en `location_daily_schedule`, manteniendo filas legacy en `location_hours` para ambos dias.
  - `GET /api/reservation/availability` para lunes `2026-03-30` devolvio slots disponibles.
  - `GET /api/reservation/availability` para martes `2026-03-31` devolvio todos los slots con `available=false` y `reasonCode=outside_location_hours`, demostrando que el cierre diario ya depende solo del modelo nuevo.
- 2026-03-26: limpieza post-Fase 2.5 ✅
  - Centro QA temporal y registros auxiliares (`working_hours`, `location_hours`, `location_daily_schedule`) eliminados tras la prueba.
- 2026-03-26: `npm run lint` + `npm run build` tras Fase 2.5 ✅
- 2026-03-26: ajuste UX reserva publica para dias cerrados ✅
  - `src/components/reservation/DateTimeSelect.tsx` ahora muestra mensaje especifico de cierre cuando todos los slots vienen con `reasonCode` de cierre (`outside_location_hours` / `location_closed`).
  - Playwright validado sobre centro QA temporal: para `martes 2026-03-31` se mostro `Ce centre est fermé pour cette date.` en lugar de solo botones grises deshabilitados.
  - Limpieza QA posterior completada.

## Criterio para avanzar de fase
- Avanzar de Fase 1 a Fase 2 solo si:
  - Gate Fase 1 aprobado en `checklist.md`.
  - No hay bloqueantes en flujos admin de centros ni en reserva.
- Cerrar Fase 2 solo si:
  - Gate Fase 2 aprobado.
  - Rollout completado sin incidencias criticas.

## Pendiente por ejecutar
- QA manual final del usuario en su entorno de uso.
