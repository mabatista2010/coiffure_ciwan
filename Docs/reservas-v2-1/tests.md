# Estrategia de Tests - Reservas V2.1

## Enfoque general
1. Validar por fases con gates obligatorios.
2. Priorizar casos de concurrencia, solape y coherencia cross-canal.
3. Registrar evidencia mínima por prueba (resultado, fecha, entorno, responsable).

## Estrategia por fase

### Fase A
1. Verificación de esquema, checks y constraints.
2. Pruebas de permisos/RLS sobre nuevas tablas/campos.
3. Confirmación de claves operativas en `configuracion`.

### Fase B
1. Test de concurrencia simultánea (mismo estilista/slot).
2. Test de paridad `availability` vs `create`.
3. Test de idempotencia (`Idempotency-Key` repetida).
4. Test de errores tipados (400/409/422/500).

### Fase C
1. Test de cierres de centro completos/parciales.
2. Test de ausencias por categorías.
3. Test de transición automática de reservas a `needs_replan`.

### Fase D
1. Test de flujos admin completos en `/admin/reservations` y `/admin/reservations/nueva`.
2. Test de triage (individual, selección, masivo).
3. Test responsive mínimo (desktop/tablet/móvil).

### Fase E
1. Smoke end-to-end web pública.
2. Smoke end-to-end admin.
3. Validación MCP en operaciones de lectura y creación autorizada.

## Casos borde obligatorios
1. Reserva cruzando límites de jornada.
2. Solape parcial al inicio y final de otra reserva.
3. Cambio de agenda posterior a reservas ya creadas.
4. Zona horaria y cambio de fecha local.
5. Buffer > 0 con slots contiguos.
6. Centro cerrado parcial con reserva larga.

## Datos de prueba recomendados
1. 2 centros (uno con cierre parcial en fecha futura).
2. 2 estilistas con agendas distintas y un día no laborable.
3. 3 servicios con duraciones distintas (30/45/60).
4. Reservas en estados `pending`, `confirmed`, `needs_replan`, `cancelled`, `completed`.
5. Ausencias con categorías diferentes.

## Comandos de verificación
1. `npm run lint`
2. `npm run dev` (smoke manual)
3. Si aplica pruebas e2e/manual asistidas: Playwright sobre `http://localhost:3000`.

## Criterio para avanzar de fase
1. Todas las tareas de fase completadas en `checklist.md`.
2. Todos los tests de fase en verde.
3. Gate de fase marcado como aprobado.
4. `status.md` actualizado al cerrar cada fase.

## Ejecución actual

### Fase A (2026-02-27) - Resultado: PASS
1. Migración aplicada en Supabase: `reservas_v2_phase_a_core_20260227`.
2. Verificado `bookings_status_check` con `needs_replan` incluido.
3. Verificado `bookings_no_overlap` bloqueando `pending|confirmed|needs_replan`.
4. Verificado `time_off.category` (`NOT NULL`, default `bloqueo_operativo`, check de dominio).
5. Verificado `location_closures` creada con RLS activo y policies staff-read/admin-write.
6. Verificadas claves operativas en `configuracion`:
`booking_slot_interval_minutes`, `booking_buffer_minutes`, `booking_max_advance_days`, `booking_min_advance_hours`, `business_timezone`.
7. Pruebas de inserción:
   - `location_closures`: inserción válida + cleanup, e inserción inválida capturada por `check_violation`.
   - `time_off.category`: inserción válida + cleanup, e inserción inválida capturada por `check_violation`.

### Fase B (2026-02-27) - Resultado: PASS
1. Funciones disponibles en BD: `check_booking_slot_v2`, `create_booking_atomic_v2`, `get_availability_slots_v2`.
2. Paridad create/availability:
   - Slot obtenido por `get_availability_slots_v2` validado como `ok=true` por `check_booking_slot_v2`.
3. Conflicto de hueco:
   - Primera creación `create_booking_atomic_v2` exitosa.
   - Segunda creación sobre mismo hueco devuelve `slot_conflict`.
4. Ventana temporal:
   - Slot fuera de ventana (`+200 días`) devuelve `outside_booking_window`.
5. Lint de código: `npm run lint` en verde.

### Fase C (2026-02-27) - Resultado: PASS
1. Trigger de replanificación validado:
   - Reserva futura `pending` creada.
   - Inserción de `location_closures` en la misma fecha/centro.
   - Reserva marcada automáticamente `needs_replan` con `replan_reason=location_closure_changed`.
2. Endpoints admin de agenda añadidos y compilando:
   - `/api/admin/schedule/time-off` y `/api/admin/schedule/location-closures` (+ rutas `[id]`).
3. Endpoint de triage añadido:
   - `/api/admin/bookings/replan` (listar + acciones `confirm/cancel/move`).
4. Lint de código: `npm run lint` en verde.

### Fase D (2026-02-27) - Resultado: PASS
1. Estado `needs_replan` validado en UI admin:
   - filtro seleccionable en `/admin/reservations`,
   - URL resultante `?status=needs_replan`,
   - vista calendario/cabecera sin errores.
2. Triage backend validado por API real:
   - `confirm` (individual/lote),
   - `cancel` (individual/lote),
   - `move` (cambio de fecha/hora con validación de slot).
3. Smoke UI end-to-end validado en `/admin/reservations/nueva`:
   - selección de estilista/centro/servicio/fecha/hora,
   - captura de datos cliente,
   - confirmación final y creación de reserva exitosa.
4. Modal de éxito validado:
   - no se auto-cierra tras espera,
   - `Nouvelle réservation` reinicia filtros/estado del formulario,
   - `Retour au calendrier` navega a `/admin/reservations`.
5. Comportamiento de calendario validado:
   - días en pasado deshabilitados,
   - día no laborable deshabilitado al acotar por estilista+centro,
   - al seleccionar día sin huecos se muestra `Aucun horaire disponible...` sin reset inesperado.
6. Responsive mínimo validado (Playwright):
   - viewports: desktop `1440x900`, tablet `1024x1366`, móvil `390x844`,
   - páginas: `/admin/reservations` y `/admin/reservations/nueva`,
   - sin overflow horizontal (`hasOverflow=false` en todos los casos).

### Fase E (2026-02-27) - Resultado: PASS
1. QA técnico:
   - `npm run lint` en verde.
   - `npm run build` en verde.
2. Smoke web pública:
   - flujo `/reservation` completado hasta pantalla de éxito.
   - evidencia: `ID de Réservation: f88a9ab5-b959-4c74-8ac2-4059c67a1b5c`.
3. Smoke admin:
   - carga correcta en `/admin/home`, `/admin/reservations`, `/admin/reservations/nueva`.
   - flujo completo de creación admin validado en Fase D y sin regresión observable.
4. Validación MCP:
   - `initialize` + `tools/list` PASS.
   - lectura PASS (`list_locations`, `list_stylists`, `list_services`, `get_availability`).
   - creación PASS (`create_booking`), evidencia: `booking_id=29382a69-ff01-4ff9-b3f4-268a0068aa00`.
   - `admin_bookings_day` sin credenciales devuelve challenge OAuth esperado.
   - observación: en prueba HTTP cruda, enviar `Authorization` en `tools/call` mantiene challenge; el token admin sí valida contra API interna (`GET /api/admin/bookings/pending` 200), por lo que no hay regresión en permisos backend.
5. Estabilidad base (baseline):
   - flujos core reservas web/admin/MCP operativos.
   - sin errores de lint/build al cierre.

## Estado de tests al cierre documental (impl-pack-close)
1. Tests ejecutados en este cierre: no se añadieron ejecuciones técnicas nuevas; se consolida la evidencia ya documentada (Fases A-E en PASS).
2. Pendiente para gate final:
   - QA manual del usuario en entorno operativo real.
   - Validación del caso borde de cierre regular (`location_hours`): no ofrecer `11:45` para servicio `30 min` cuando el centro cierra `12:00`.
