# Implementacion: Estado "ferme" por dia en centros (2 fases)

## Resumen
Este paquete operacionaliza el plan `Docs/plan-centros-estado-ferme-2-fases.md` para introducir estado explicito `Ouvert/Ferme` por dia en centros, sin romper reserva/disponibilidad y preparando una evolucion robusta.

## Objetivo y alcance
Objetivo:
- Permitir gestionar dias cerrados (`ferme`) de forma explicita en Admin de centros.
- Mantener compatibilidad con el comportamiento actual en Fase 1.
- Evolucionar a persistencia explicita y guardado transaccional en Fase 2.

Alcance:
- UI Admin de centros (edicion/creacion de horarios por dia).
- API de guardado de horarios de centro.
- Validaciones de franjas.
- Motor de disponibilidad (adaptacion en Fase 2).
- Migracion de datos y rollout controlado.

No-objetivos:
- Rediseño visual completo del panel de centros.
- Refactor global de todas las APIs de schedule no relacionadas con centros.
- Cambios en pricing, CRM, boutique o auth.

## Decisiones tomadas en esta sesion
- Se usa un contrato estable de frontend desde Fase 1:
  - `dayOfWeek`, `isClosed`, `slots[]`.
- Se crea un paquete de implementacion en `Docs/centros-estado-ferme-2-fases` para ejecutar por fases.
- Se separa claramente:
  - Fase 1: MVP escalable compatible con modelo actual.
  - Fase 2: modelo robusto y transaccional.

Pendiente de decision:
- Nombre final de la feature flag de conmutacion de lectura (modelo antiguo vs nuevo).
Recomendacion:
- Usar `LOCATION_DAILY_SCHEDULE_V2_ENABLED`.

## Arquitectura propuesta
Fase 1 (compatibilidad):
- UI trabaja con `DaySchedule[]`.
- Persistencia compatible:
  - `isClosed=true` => sin filas en `location_hours` para ese dia.
  - `isClosed=false` => filas en `location_hours`.
- Guardado via API server (evitar escritura directa desde cliente).

Fase 2 (robustez):
- Nueva tabla explicita `location_daily_schedule`.
- `location_hours` conserva franjas de dias abiertos.
- API transaccional hace upsert de estado diario + slots.
- Motor de disponibilidad consulta estado diario explicito y luego franjas.

## Plan por fases

### Fase 1 - MVP escalable
Entregables:
- Toggle `Ouvert/Ferme` por dia en admin de centros.
- Validacion cliente de franjas (`HH:mm`, `start < end`, sin solapes).
- Mensajes de error visibles dentro del panel.
- Endpoint server de guardado de horarios de centro (compatible).

Criterios de aceptacion:
- Se puede marcar un dia como `Ferme` y guardar.
- No se puede guardar un dia abierto con franjas invalidas.
- Reserva no ofrece slots en dias cerrados.
- Errores/confirmaciones son visibles en el panel (no solo consola).

### Fase 2 - Robustez transaccional
Entregables:
- Migracion BD: tabla `location_daily_schedule` + constraints.
- API transaccional de guardado semanal.
- Adaptacion del motor de disponibilidad al estado diario explicito.
- Migracion aditiva con doble lectura/escritura temporal.

Criterios de aceptacion:
- Estado diario explicito persistido para todos los centros.
- Guardado semanal atomico (sin estados intermedios rotos).
- Disponibilidad consistente sin regresiones funcionales.
- Errores de validacion claros por dia/franja.

## Riesgos y mitigaciones
- Riesgo: regresion en disponibilidad al migrar reglas.
  - Mitigacion: migracion aditiva + smoke tests diarios + conmutacion gradual por feature flag.
- Riesgo: inconsistencia entre `isClosed` y `location_hours`.
  - Mitigacion: validacion server y transaccion unica en Fase 2.
- Riesgo: UX confusa si alertas quedan fuera de viewport.
  - Mitigacion: contenedor de alertas fijo dentro del panel lateral.

## Plan de despliegue / rollout
1. Desplegar Fase 1 en entorno de pruebas.
2. QA funcional + tecnico y correccion de incidencias.
3. Estabilizacion operativa (1 semana).
4. Desplegar Fase 2 con migracion aditiva y doble lectura/escritura.
5. Activar feature flag por entorno y monitorizar.
6. Retirar compatibilidad antigua cuando no haya incidencias.

## Definition of Done
- Fase 1 y Fase 2 completadas segun checklist.
- Gates de tests por fase marcados como pasados.
- Sin errores bloqueantes en flujos admin/availability.
- `Docs/centros-estado-ferme-2-fases/status.md` actualizado con estado final.
- `context.md` actualizado en el turno donde se implementen cambios reales de API/DB.

## Outcome summary

### Que se implemento
- UI admin de centros con estado explicito `Ouvert/Ferme` por dia y validacion de franjas en cliente.
- Endpoint protegido `POST /api/admin/schedule/location-hours` para guardar el horario semanal completo.
- Persistencia transaccional en BD con `public.save_location_weekly_schedule_v2`.
- Nueva tabla `public.location_daily_schedule` como registro explicito del estado diario abierto/cerrado.
- Adaptacion de disponibilidad para que `check_booking_slot_v2` use `location_daily_schedule` como fuente autoritativa del cierre diario.
- Limpieza Fase 2.5 para retirar el feature flag y la compatibilidad legacy basada solo en la ausencia de filas en `location_hours`.

### Que se cambio vs plan original
- El rollout intermedio con feature flag si existio, pero quedo retirado en la misma ventana de implementacion porque el proyecto esta en entorno de test sin usuarios reales.
- Se mantuvo `location_hours` como tabla de franjas de apertura en lugar de eliminarla, pero ya no decide por si sola si un dia esta cerrado.
- La DDL se aplico en Supabase via `execute_sql` porque `apply_migration` no estaba disponible, aunque el SQL quedo versionado localmente en `migrations/`.

### Pendientes
- QA manual del usuario.
- Cierre formal del pack y limpieza del puntero activo cuando el usuario confirme.

### Riesgos conocidos post-release
- Si quedaran consumidores externos no auditados leyendo solo `location_hours`, podrian interpretar mal un dia cerrado; dentro del alcance verificado del repo ya se adapto admin, availability y la vista publica de centros.
- Sigue existiendo deuda potencial de UAT amplia del producto completo fuera del flujo de horarios de centros.
