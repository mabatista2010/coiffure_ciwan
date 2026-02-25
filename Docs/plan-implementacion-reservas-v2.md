# Plan de Implementacion Reservas V2 (Cerrado)

Fecha: 2026-02-25  
Estado: Decision-complete, listo para ejecucion por agente  
Alcance: alta empleado/estilista, horarios, indisponibilidades, cierres, disponibilidad y reservas atomicas

## 1. Objetivo

Dejar el sistema de reservas preparado para operativa real sin decisiones pendientes de implementacion:
- disponibilidad fiable y consistente en web publica, admin y MCP,
- gestion real de agenda (vacaciones, descansos, cierres puntuales),
- eliminacion de colisiones por concurrencia en creacion de reservas,
- flujo unificado de alta de empleado + estilista.

## 2. Decisiones cerradas

Estas decisiones quedan bloqueadas para implementacion y no se deben reabrir salvo cambio explicito de negocio.

1. Modelo de horarios:
- Se mantiene `location_hours` como horario base del centro.
- Se mantiene `working_hours` como disponibilidad efectiva del estilista por centro/dia/franja.
- Se elimina el comportamiento ambiguo de "snapshot implicito" al guardar estilista.

2. Reserva atomica:
- Estrategia oficial: funcion SQL transaccional (RPC) para validacion + insercion.

3. Bloqueo por estado de reserva:
- Bloquean disponibilidad: `pending`, `confirmed`, `needs_replan`.
- `pending` bloquea indefinidamente (sin expiracion automatica).

4. Ventana de reserva:
- Maximo 90 dias hacia futuro.
- Minimo 2 horas de antelacion.

5. Conflictos por cambios de agenda:
- Se permite guardar cambios de agenda.
- Reservas afectadas pasan a estado `needs_replan`.
- `needs_replan` sigue bloqueando hueco.
- Notificacion automatica: solo aviso interno admin (sin aviso automatico al cliente).

6. Cierres excepcionales de centro:
- Solo fecha puntual.
- Dia completo o franja horaria parcial.
- No se implementa recurrencia anual en esta version.

7. Slots y buffer:
- Granularidad de slots configurable desde admin (default 15 min).
- Buffer entre citas configurable global desde admin (default 0 min).

8. Zona horaria y domingo:
- Zona horaria unica de negocio: `Europe/Madrid`.
- Domingo gestionado por datos reales de horario (no hardcoded cerrado).

9. Wizard de alta:
- Incluye invitacion de usuario + rol + creacion/vinculacion estilista + agenda inicial.

## 3. Implementaciones incluidas (10/10)

1. CRUD admin de indisponibilidades de estilista (`time_off` usable por negocio).
2. Cierres excepcionales de centro por fecha (`location_closures`).
3. Fuente unica de verdad de horarios (`location_hours` base + `working_hours` efectivo).
4. Multiples franjas personalizadas por estilista/dia.
5. Validaciones fuertes de horario (UI, API y DB).
6. Creacion de reserva atomica y segura frente a concurrencia.
7. Validacion backend obligatoria de compatibilidad servicio-estilista-centro.
8. Gestion completa de `duration` en CRUD de servicios.
9. Calendario admin con capacidad real (sin heuristica fija de 30 min).
10. Wizard unificado de alta empleado + estilista + agenda inicial.

## 4. Cambios tecnicos obligatorios

## 4.1 Cambios en base de datos

1. `bookings.status`
- Ampliar enum/check para incluir `needs_replan`.
- Estados finales: `pending | confirmed | needs_replan | cancelled | completed`.

2. Nueva tabla `location_closures`
- `id uuid pk`
- `location_id uuid fk -> locations`
- `closure_date date not null`
- `start_time time null`
- `end_time time null`
- `reason text null`
- `created_at timestamptz default now()`
- Regla: ambos null (cierre completo) o ambos informados (`start_time < end_time`).

3. `time_off`
- Mantener tabla.
- Anadir `category text` con valores de negocio:
  - `vacaciones`
  - `baja`
  - `descanso`
  - `formacion`
  - `bloqueo_operativo`
- Validar `start_datetime < end_datetime`.

4. Configuracion operativa en `configuracion`
- `booking_slot_interval_minutes` default `15`
- `booking_buffer_minutes` default `0`
- `booking_max_advance_days` default `90`
- `booking_min_advance_hours` default `2`
- `business_timezone` default `Europe/Madrid`

5. Indices recomendados
- `bookings(stylist_id, location_id, booking_date, start_time, end_time, status)`
- `working_hours(stylist_id, location_id, day_of_week, start_time, end_time)`
- `time_off(stylist_id, location_id, start_datetime, end_datetime)`
- `location_closures(location_id, closure_date, start_time, end_time)`

## 4.2 Cambios en API y backend

1. RPC oficial: `create_booking_atomic_v2`
- Input: cliente + servicio + estilista + centro + fecha/hora inicio + notas.
- Flujo interno transaccional:
  - cargar configuracion global,
  - validar ventana temporal 90d/2h,
  - validar compatibilidad servicio-estilista-centro,
  - validar activos (`servicio`, `estilista`, `centro`),
  - calcular `end_time` por `servicios.duration`,
  - validar disponibilidad efectiva con horarios, ausencias, cierres y bloqueos,
  - insertar reserva o devolver conflicto tipado.

2. `/api/reservation/create`
- Debe delegar siempre en `create_booking_atomic_v2`.
- Prohibido mantener patron `check + insert` separado.

3. Reserva manual admin (`/admin/reservations/nueva`)
- Debe usar el mismo servicio atomico.
- Prohibido insertar directo en `bookings`.

4. `/api/reservation/availability`
- Debe usar las mismas reglas que la creacion atomica:
  - timezone `Europe/Madrid`,
  - slot interval configurable,
  - buffer configurable,
  - bloqueo por `pending`, `confirmed`, `needs_replan`,
  - aplicacion de `time_off` y `location_closures`.

## 4.3 Cambios en frontend/admin

1. Servicios (`/admin` seccion services)
- Crear/editar `duration` obligatorio.

2. Gestion de estilistas
- En modo personalizado, soportar multiples franjas por dia.
- Validacion anti-solape.

3. Modulo de ausencias estilista
- CRUD `time_off` con categoria y rango (parcial o completo).

4. Modulo de cierres de centro
- CRUD `location_closures` (fecha puntual, completo/parcial).

5. Wizard unificado de alta
- Paso 1: invitacion/alta de usuario.
- Paso 2: asignacion de rol.
- Paso 3: crear o vincular estilista.
- Paso 4: centros + servicios.
- Paso 5: agenda inicial y confirmacion.

6. Calendario admin
- Estado real por dia: disponible, parcial, completo, cerrado centro, needs_replan.

## 5. Plan por fases (secuencia de ejecucion)

## Fase 1 - Modelo y validaciones base
Implementaciones: `3`, `5`, `8` (+ base de `7`)

Entregables:
- migraciones SQL (`needs_replan`, `location_closures`, config keys, `time_off.category`),
- validaciones UI/API/DB de horarios,
- `duration` operativo en CRUD servicios,
- indices y checks aplicados.

Gate de salida:
- no se pueden guardar horarios invalidos ni desde UI ni API,
- `duration` ya afecta a calculo de reserva.

## Fase 2 - Motor de disponibilidad y reserva atomica
Implementaciones: `6`, `7`

Entregables:
- RPC `create_booking_atomic_v2`,
- `/api/reservation/create` refactorizado para usar RPC,
- flujo admin manual usando motor atomico,
- `/availability` alineado con mismas reglas.

Gate de salida:
- bajo concurrencia no hay doble reserva del mismo estilista/hora,
- web publica y admin validan igual.

## Fase 3 - Operativa de agenda
Implementaciones: `1`, `2`, `4`

Entregables:
- modulo admin ausencias estilista,
- modulo admin cierres centro,
- multiples franjas personalizadas por estilista/dia.

Gate de salida:
- cualquier ausencia/cierre aparece como no disponible en reserva.

## Fase 4 - Alta unificada empleado + estilista
Implementacion: `10`

Entregables:
- wizard end-to-end invitacion + rol + estilista + agenda.

Gate de salida:
- un profesional nuevo queda operativo desde un solo flujo.

## Fase 5 - Calendario de capacidad real
Implementacion: `9`

Entregables:
- calculo de ocupacion real sin heuristica fija de 30 min,
- visualizacion de `needs_replan` bloqueante y accionable.

Gate de salida:
- el estado visual del calendario coincide con disponibilidad real.

## Fase 6 - QA, despliegue y estabilizacion
Implementaciones: validacion final `1..10`

Entregables:
- checklist QA firmado,
- guia operativa de uso para admin,
- plan de rollback por modulo.

Gate de salida:
- sin regresiones criticas en reservas.

## 6. Casos de prueba obligatorios

1. Concurrencia:
- dos requests simultaneas mismo estilista/slot => solo una reserva creada.

2. Solapes:
- intento que pisa parcial o totalmente cita existente (`pending`, `confirmed`, `needs_replan`) => conflicto.

3. Ventana temporal:
- menos de 2h => rechazo.
- mas de 90 dias => rechazo.

4. Cierres de centro:
- cierre completo y cierre parcial bloquean correctamente.

5. Ausencias estilista:
- parcial, diaria y multidia bloquean correctamente.

6. Domingo data-driven:
- si hay horario real, debe haber disponibilidad.
- si no hay horario real, no debe haber disponibilidad.

7. Duracion variable:
- cambio de `duration` modifica slots y hora fin.

8. Conflictos por cambio de agenda:
- al cambiar horario con reservas afectadas, reservas pasan a `needs_replan`.
- esas reservas siguen bloqueando hueco.

9. Wizard de alta:
- usuario invitado, rol correcto, relacion `stylist_users` correcta, agenda inicial correcta.

10. Consistencia cross-canal:
- disponibilidad y bloqueo coinciden entre web publica, admin y MCP.

## 7. Matriz implementacion -> fase

- `1` -> Fase 3
- `2` -> Fase 3
- `3` -> Fase 1
- `4` -> Fase 3
- `5` -> Fase 1
- `6` -> Fase 2
- `7` -> Fase 2
- `8` -> Fase 1
- `9` -> Fase 5
- `10` -> Fase 4

## 8. Supuestos bloqueados y defaults

- TZ unica de negocio: `Europe/Madrid`.
- Granularidad slots default: 15 min (editable desde admin).
- Buffer default: 0 min (editable global desde admin).
- `pending` bloquea indefinidamente.
- `needs_replan` bloquea hasta resolucion manual.
- Notificacion de conflicto solo interna de admin.
- Cierres excepcionales sin recurrencia anual en esta version.

## 9. Criterio de cierre del plan

El plan se considera cerrado cuando:
- no queda ninguna decision funcional o tecnica pendiente en las secciones anteriores,
- el implementador puede ejecutar por fases sin tomar decisiones de producto adicionales.
