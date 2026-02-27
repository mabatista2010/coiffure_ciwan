# Plan de Robustez Máxima para Reservas

## Objetivo
Diseñar un flujo de reservas robusto frente a concurrencia, latencia, reintentos, inconsistencias de UI y cambios de configuración en tiempo real.

Este documento es **propuesta**. No aplica cambios por sí mismo.

## Estado Actual (resumen)
- La disponibilidad se calcula en servidor con `GET /api/reservation/availability`.
- La creación de reservas tiene dos caminos:
  - Route handler `POST /api/reservation/create`.
  - Inserción directa desde cliente en `/admin/reservations/nueva`.
- En BD (`public.bookings`) no hay constraint anti-solape por rango de tiempo.
- RLS en `bookings` permite `INSERT` público con `WITH CHECK (true)`.
- `bookings` no tiene índices funcionales para consultas de agenda/availability.

## Principios de Diseño
1. **Single source of truth en servidor**: ningún alta de reserva desde cliente directo.
2. **Invariante en base de datos**: no permitir solapes aunque falle la app.
3. **Operación atómica**: validar + insertar en una sola transacción.
4. **Idempotencia**: mismo intento no debe crear reservas duplicadas.
5. **Errores tipados**: frontend y MCP deben recibir códigos de error estables.

## Arquitectura Propuesta

### 1) Capa BD (bloqueo fuerte)

#### 1.1. Extensión e índice de exclusión anti-solape
- Habilitar `btree_gist`.
- Añadir columna generada de rango temporal.
- Añadir constraint `EXCLUDE USING gist` por `stylist_id + slot_range` solo para `pending|confirmed`.

SQL orientativo:
```sql
create extension if not exists btree_gist;

alter table public.bookings
add column if not exists slot_range tsrange
generated always as (
  tsrange(
    booking_date::timestamp + start_time,
    booking_date::timestamp + end_time,
    '[)'
  )
) stored;

alter table public.bookings
add constraint bookings_no_overlap
exclude using gist (
  stylist_id with =,
  slot_range with &&
)
where (status in ('pending','confirmed'));
```

#### 1.2. Checks de integridad mínima
- `start_time < end_time`.
- Opcional: duración máxima razonable por reserva (ej. 4h).

#### 1.3. Índices de rendimiento
- `bookings(stylist_id, booking_date, status, start_time)`
- `bookings(location_id, booking_date, status, start_time)`
- `bookings(service_id, booking_date)`
- `working_hours(stylist_id, location_id, day_of_week)`
- `time_off(stylist_id, location_id, start_datetime, end_datetime)`

### 2) Capa Servidor (orquestación)

#### 2.1. Función SQL atómica (RPC)
Crear `public.create_booking_atomic(...)` con `security definer` que:
1. Valida relación estilista-centro-servicio.
2. Valida horario laboral.
3. Valida `time_off`.
4. Calcula `end_time` según duración del servicio.
5. Inserta en `bookings`.
6. Devuelve respuesta tipada (`ok`, `error_code`, `booking_id`).

Códigos de error propuestos:
- `invalid_combination`
- `outside_working_hours`
- `stylist_time_off`
- `slot_conflict`
- `invalid_payload`
- `internal_error`

#### 2.2. Endpoint único de creación
- Reescribir `POST /api/reservation/create` para que:
  - No haga insert directo.
  - Llame a `rpc('create_booking_atomic', ...)`.
  - Mapee errores SQL/RPC a HTTP coherente:
    - `400` validación
    - `409` conflicto de slot
    - `422` reglas de negocio
    - `500` error interno

#### 2.3. Idempotencia
- Añadir tabla `booking_requests` o columna `idempotency_key` única por origen.
- Aceptar header `Idempotency-Key` en el endpoint.
- Si llega repetido, devolver resultado anterior (no duplicar).

### 3) Capa Seguridad (RLS y permisos)

#### 3.1. `bookings` sin escritura pública abierta
- Eliminar policy `INSERT ... WITH CHECK true`.
- Mantener lectura pública **solo si es necesaria** y sin PII (ideal: eliminarla para `bookings`).

#### 3.2. Escritura controlada
- Escritura de reservas solo por:
  - `service_role` desde route handlers, o
  - RPC `security definer` con validaciones estrictas.

#### 3.3. Admin vs público
- Admin: creación manual con sesión + rol validado en servidor.
- Público/MCP: creación con reglas de negocio equivalentes, pero sin privilegios directos a tabla.

### 4) Capa Aplicación (frontend/admin/MCP)

#### 4.1. Eliminar inserciones directas a `bookings`
- `/admin/reservations/nueva`: reemplazar `supabase.from('bookings').insert(...)` por `fetch('/api/reservation/create')`.

#### 4.2. Manejo de conflictos en UX
- Si `409 slot_conflict`: refrescar disponibilidad y sugerir alternativas.
- Si `outside_working_hours` o `invalid_combination`: forzar recálculo de filtros.

#### 4.3. Consistencia de dominios
- Reutilizar mismos códigos de error en UI admin y MCP.

### 5) Observabilidad y Operación

#### 5.1. Logging estructurado
- Log de cada intento de creación con:
  - `request_id`, `idempotency_key`, `source` (`admin|web|mcp`), `error_code`, `latency_ms`.

#### 5.2. Métricas mínimas
- `% conflictos (409)`
- latencia p95 creación
- ratio de reintentos por `Idempotency-Key`

#### 5.3. Alertas
- pico anormal de `slot_conflict` o `invalid_combination`.

## Plan por Fases

### Fase 1 (crítica, recomendada primero)
1. Migración SQL: `btree_gist`, `slot_range`, `EXCLUDE`, checks e índices.
2. Crear RPC `create_booking_atomic`.
3. Reescribir `POST /api/reservation/create` para usar RPC.
4. Migrar admin nueva reserva para usar endpoint (no insert directo).

**Resultado esperado**: no solapes, incluso con concurrencia.

### Fase 2 (seguridad)
1. Endurecer RLS en `bookings`.
2. Eliminar políticas permisivas y duplicadas.
3. Revisar tablas expuestas con PII sin RLS.

**Resultado esperado**: superficie de ataque reducida.

### Fase 3 (resiliencia operativa)
1. Idempotencia real.
2. Logging/metrics/alertas.
3. Tests de carga y carrera.

**Resultado esperado**: comportamiento estable ante reintentos y picos.

## Estrategia de Testing

### Pruebas funcionales
1. Crear reserva válida en slot libre.
2. Intentar solape exacto y parcial (debe fallar).
3. Intentar fuera de horario laboral (debe fallar).
4. Intentar en `time_off` (debe fallar).

### Pruebas de concurrencia
1. Lanzar 10 requests simultáneos al mismo slot.
2. Verificar que solo 1 inserta y el resto devuelve conflicto.

### Pruebas de idempotencia
1. Repetir misma request con mismo `Idempotency-Key`.
2. Verificar misma respuesta sin duplicar filas.

## Riesgos y Mitigaciones
1. **Migración con datos inconsistentes**: pre-check antes de crear constraint anti-solape.
2. **Regresión de flujos actuales**: feature flag temporal para endpoint nuevo.
3. **Bloqueos en hora pico**: índices + transacciones cortas.

## Backlog Técnico (archivos objetivo)

### SQL / Supabase
- `migrations/<timestamp>_bookings_hardening.sql`
- `migrations/<timestamp>_create_booking_atomic.sql`
- `migrations/<timestamp>_bookings_rls_hardening.sql`

### API / servidor
- `src/app/api/reservation/create/route.ts` (refactor a RPC + idempotencia)
- (opcional) `src/lib/supabaseAdmin.ts` (cliente service_role server-only)

### Frontend admin
- `src/app/admin/reservations/nueva/page.tsx` (crear vía endpoint)

### Documentación
- `context.md` (actualizar al finalizar implementación real)
- runbook de errores y códigos de respuesta.

## Criterio de "listo para producción"
1. No existe inserción directa a `bookings` desde cliente.
2. Constraint anti-solape activo en BD.
3. Endpoint de creación usa operación atómica (RPC/transaction).
4. RLS de `bookings` sin `INSERT public WITH CHECK true`.
5. Test de concurrencia validado en entorno de staging.
