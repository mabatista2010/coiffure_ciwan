# Plan de Implementación Reservas V2.1 (Actualizado)

Fecha: 2026-02-27
Estado: Planeado (no implementado en este documento)
Alcance: hardening integral de reservas (BD + motor + API + admin + QA + rollout)

## 1. Objetivo

Llevar el sistema de reservas a nivel producción robusto y consistente, de forma que:
1. La disponibilidad sea la misma en web pública, admin y MCP.
2. No haya doble reserva por concurrencia.
3. Los cambios de agenda se gestionen sin romper operación.
4. La lógica crítica viva en servidor/BD (no en heurísticas de frontend).
5. Exista trazabilidad, rollback y criterios claros de salida a producción.

## 2. Qué cubre este plan (y por qué)

Este plan existe para cerrar brechas entre diseño y estado real actual.

Brechas detectadas:
1. `needs_replan` no está implementado end-to-end como bloqueante.
2. Falta `location_closures` en BD.
3. Falta `time_off.category` en BD.
4. No existe `create_booking_atomic_v2`.
5. `availability` no usa todavía todas las reglas de negocio configurables.
6. No están materializadas claves operativas en `configuracion`.
7. Falta trigger/proceso formal para marcar `needs_replan` tras cambios de agenda.
8. Falta wizard unificado completo de alta empleado + estilista + agenda inicial.
9. Falta validar explícitamente horario regular del centro (`location_hours`) en el motor de slot (caso límite 11:45 para servicio de 30 min con cierre 12:00).

## 3. Decisiones funcionales cerradas

1. Motor de verdad: servidor + SQL (no frontend).
2. Creación de reserva: transaccional y atómica por RPC (`create_booking_atomic_v2`).
3. Bloqueo de hueco: `pending`, `confirmed`, `needs_replan`.
4. Ventana de reserva configurable: `max_advance_days`, `min_advance_hours`.
5. Intervalo de slots y buffer configurables globalmente.
6. Cierres excepcionales de centro por fecha (completo o parcial), sin recurrencia anual en esta versión.
7. Cambio de agenda con impacto: reservas afectadas pasan a `needs_replan` y siguen bloqueando hueco.
8. Timezone de negocio única vía configuración (`business_timezone`) y aplicada en todo el flujo.
9. Admin y web pública usan exactamente las mismas reglas para disponibilidad.

## 4. Requisitos no funcionales (NFR)

1. Consistencia cross-canal: 100% de equivalencia de reglas entre create/availability/admin/MCP.
2. Concurrencia: cero dobles reservas del mismo estilista en el mismo hueco.
3. Observabilidad:
- logging estructurado con `request_id`, `error_code`, `latency_ms`, `source`.
- métricas mínimas: tasa de conflicto, tasa error 5xx, p95 latencia.
4. Seguridad:
- principio de mínimo privilegio (RLS + grants ajustados).
- operaciones críticas de escritura solo por rutas servidoras autorizadas.
5. Operabilidad:
- checklist de release y runbook de rollback por fase.

## 5. Cambios obligatorios en BD

## 5.1 `bookings`

1. Ampliar check de estado:
- `pending | confirmed | needs_replan | cancelled | completed`.

2. Ajustar constraint de no solape:
- `bookings_no_overlap` debe bloquear `pending`, `confirmed`, `needs_replan`.

3. Mantener validación temporal:
- `start_time < end_time`.

## 5.2 Nueva tabla `location_closures`

Estructura:
1. `id uuid pk default gen_random_uuid()`.
2. `location_id uuid not null fk -> locations(id)`.
3. `closure_date date not null`.
4. `start_time time null`.
5. `end_time time null`.
6. `reason text null`.
7. `created_at timestamptz default now()`.
8. `created_by uuid null` (opcional pero recomendado).

Checks:
1. Cierre completo: `start_time is null and end_time is null`.
2. Cierre parcial: `start_time is not null and end_time is not null and start_time < end_time`.

Índices:
1. `(location_id, closure_date, start_time, end_time)`.

RLS:
1. Lectura staff.
2. Escritura solo admin (o staff según política final).

## 5.3 `time_off`

1. Añadir `category text not null default 'bloqueo_operativo'`.
2. Check de dominio:
- `vacaciones | baja | descanso | formacion | bloqueo_operativo`.
3. Mantener check `start_datetime < end_datetime`.

## 5.4 `configuracion`

Upsert de claves:
1. `booking_slot_interval_minutes` (default 15).
2. `booking_buffer_minutes` (default 0).
3. `booking_max_advance_days` (default 90).
4. `booking_min_advance_hours` (default 2).
5. `business_timezone` (default del negocio definido en despliegue).

## 5.5 Marcado automático `needs_replan`

Crear función + trigger/evento para cambios en:
1. `working_hours`.
2. `time_off`.
3. `location_closures`.

Regla:
1. Si una reserva futura queda fuera de nueva disponibilidad, pasar a `needs_replan`.
2. Registrar motivo de replanificación (columna de auditoría o tabla auxiliar recomendada).

## 6. Cambios obligatorios backend/API

## 6.1 RPC `create_booking_atomic_v2`

Debe validar, en una transacción:
1. payload.
2. compatibilidad servicio-estilista-centro.
3. activos (`servicio`, `estilista`, `centro`).
4. ventana temporal (min/max) usando `business_timezone`.
5. duración real del servicio.
6. disponibilidad efectiva con:
- `working_hours`,
- `time_off`,
- `location_closures`,
- `buffer` global,
- bloqueo por estados (`pending|confirmed|needs_replan`).

Salida tipada:
1. `ok`.
2. `booking_id`.
3. `error_code` estable.

## 6.2 `/api/reservation/create`

1. Delegación total a `create_booking_atomic_v2`.
2. Mantener idempotencia (`booking_requests`).
3. Homologar catálogo de errores 4xx/409/422/500.

## 6.3 `/api/reservation/availability`

1. Misma lógica que create (idealmente reutilizando función SQL común).
2. No hardcodear intervalo, buffer ni timezone.
3. Aplicar cierres de centro y `needs_replan` bloqueante.
4. Devolver resultado explicable para UI (por qué un slot no está disponible).
5. Validar también contra `location_hours` (cierre regular) para no ofrecer slots que excedan la hora de cierre del centro.

## 6.4 APIs admin operativas

1. CRUD `time_off` con `category`.
2. CRUD `location_closures`.
3. Endpoint de triage `needs_replan` (listar, confirmar, mover o cancelar).

## 7. Cambios obligatorios frontend/admin

1. `/admin/reservations/nueva`:
- consumir disponibilidad unificada,
- impedir selección inválida,
- soportar realidades de agenda (cierres/ausencias/replan).

2. `/admin/reservations`:
- filtro/estado visible `needs_replan`,
- acciones rápidas para resolución.

3. Gestión de estilistas:
- múltiples franjas por día,
- anti-solape,
- aviso de impacto cuando un cambio genera `needs_replan`.

4. Gestión de cierres de centro:
- módulo visual con alta/edición/baja y feedback de impacto.

5. Wizard alta empleado + estilista:
- invitación usuario,
- rol,
- vínculo `stylist_users`,
- centros/servicios,
- agenda inicial,
- confirmación final.

## 8. Seguridad y permisos (hardening)

1. Revisar grants amplios existentes y ajustar mínimo privilegio.
2. Mantener RLS por rol funcional.
3. Evitar escrituras directas desde cliente sobre tablas críticas de reservas.
4. Verificar que solo backends autorizados puedan ejecutar RPC crítica.

## 9. Plan por fases (ejecución)

## Fase A - Alineación BD núcleo

Entregables:
1. Estado `needs_replan` en `bookings`.
2. Constraint de solape actualizado.
3. `time_off.category` + checks.
4. Tabla `location_closures`.
5. Config keys operativas upsert.

Gate:
1. Migraciones aplicadas sin error.
2. Checks/constraints verificados en BD real.

## Fase B - Motor unificado de reglas

Entregables:
1. `create_booking_atomic_v2`.
2. `availability` alineado 1:1 con reglas de create.
3. Códigos de error homogéneos.

Gate:
1. Concurrencia: solo una reserva creada para mismo hueco.
2. Mismo resultado en create/availability para casos frontera.

## Fase C - Operativa de agenda

Entregables:
1. CRUD `time_off` con categoría.
2. CRUD `location_closures`.
3. Trigger/proceso `needs_replan`.

Gate:
1. Cambios de agenda impactan en disponibilidad real.
2. Reservas afectadas pasan a `needs_replan` correctamente.

## Fase D - Admin UX y workflow

Entregables:
1. Triage `needs_replan`.
2. Mejoras calendario y filtros.
3. Wizard unificado alta empleado/estilista.

Gate:
1. Operación diaria resoluble sin SQL manual.

## Fase E - QA, rollout y estabilización

Entregables:
1. QA técnico + funcional firmado.
2. Checklist release.
3. Runbook rollback.

Gate:
1. Sin regresiones críticas.
2. KPIs mínimos de estabilidad aceptables.

## 10. Matriz de pruebas obligatorias

1. Concurrencia simultánea (doble click + requests paralelas).
2. Solapes parciales/totales con estados bloqueantes.
3. Ventana temporal min/max en timezone de negocio.
4. Cierres de centro completos y parciales.
5. Ausencias por categorías y rangos multi-día.
6. Cambio de agenda que produzca `needs_replan`.
7. Duración variable por servicio.
8. Buffer distinto de cero.
9. Consistencia web/admin/MCP.
10. Casos DST (cambio horario).
11. Caso borde de cierre regular: servicio de 30 min no debe iniciar a 11:45 si `location_hours` termina 12:00.

## 11. Rollout y rollback

Rollout:
1. Aplicar migraciones en orden por fase.
2. Activar código backend.
3. Activar UI admin.
4. QA smoke.
5. Monitoreo intensivo 48h.

Rollback:
1. Revertir deployment app.
2. Desactivar rutas nuevas por feature flag si aplica.
3. Migraciones con rollback documentado por objeto (no destructivo si hay datos vivos).
4. Comunicación interna de incidencia y estado.

## 12. Definition of Done (DoD)

Se considera completado cuando:
1. Todas las fases A-E están en verde.
2. Plan y estado real (BD + API + UI) están alineados sin gaps.
3. Disponibilidad y creación son consistentes en todos los canales.
4. Existe operación administrable para `needs_replan`.
5. Seguridad y observabilidad cumplen mínimos definidos.

## 13. Nota operativa

Este documento es un plan de ejecución. No implica que esté implementado en el estado actual.
