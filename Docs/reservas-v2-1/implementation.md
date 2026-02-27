# Implementación Reservas V2.1

## Resumen
Paquete de implementación para endurecer el sistema de reservas en todo el stack (BD, motor de disponibilidad, APIs y admin), con foco en consistencia entre canales, concurrencia segura y operación diaria sin parches manuales.

## Objetivo y alcance

### Objetivo
Implementar un motor de reservas robusto, único y consistente para web pública, admin y MCP, minimizando errores operativos y evitando dobles reservas.

### Alcance
1. Cambios de esquema y constraints en BD.
2. Motor transaccional atómico `create_booking_atomic_v2`.
3. Alineación estricta entre `create` y `availability`.
4. Operativa de agenda (ausencias, cierres, `needs_replan`).
5. Flujos admin para triage y resolución.
6. Hardening de seguridad y permisos.
7. QA, rollout y rollback.

### No-objetivos
1. Rediseño visual completo del panel admin.
2. Cambios de pricing, catálogo o e-commerce.
3. Soporte multi-tenant avanzado fuera del modelo actual.
4. Automatizaciones externas no relacionadas con reservas.

## Decisiones tomadas en esta sesión
1. El plan activo se ejecutará desde `Docs/reservas-v2-1`.
2. El orden operativo será por fases A → E con gate obligatorio por fase.
3. Se mantiene la política de no implementar código en esta apertura de pack (solo documentación y puntero activo).

Pendiente de decisión:
1. Escritura de `location_closures` por `admin` solamente o `admin|employee`.
Recomendación: `admin` para escrituras y `admin|employee` para lectura, por control operativo y trazabilidad.

## Arquitectura propuesta
1. BD como fuente de verdad para reglas de negocio críticas.
2. RPC transaccional para alta de reserva (`create_booking_atomic_v2`).
3. API de disponibilidad con reglas equivalentes a creación.
4. UI admin consumiendo solo APIs servidoras (sin lógica crítica cliente).
5. Observabilidad transversal (`request_id`, códigos de error, latencias).

## Plan por fases

### Fase A: Alineación BD núcleo
Entregables:
1. Estado `needs_replan` en `bookings`.
2. Constraint de no-solape con estados bloqueantes completos.
3. `time_off.category` con check de dominio.
4. Tabla `location_closures` + índices + RLS.
5. Upsert de claves operativas en `configuracion`.

Criterios de aceptación:
1. Migraciones aplican sin errores en entorno objetivo.
2. Constraints/checks validados con casos positivos y negativos.
3. Esquema final documentado en `context.md`.

### Fase B: Motor unificado de reglas
Entregables:
1. RPC `create_booking_atomic_v2`.
2. `/api/reservation/create` delegando en v2 con idempotencia.
3. `/api/reservation/availability` alineado 1:1 con reglas de creación.

Criterios de aceptación:
1. Concurrencia: no hay doble reserva para mismo hueco.
2. Create y availability devuelven resultados consistentes en fronteras.
3. Errores homologados por código y HTTP status.

### Fase C: Operativa de agenda
Entregables:
1. CRUD admin de `time_off` con categoría.
2. CRUD admin de `location_closures`.
3. Trigger/proceso para marcar `needs_replan` cuando corresponda.

Criterios de aceptación:
1. Cambios de agenda impactan disponibilidad real.
2. Reservas afectadas se mueven a `needs_replan` con motivo trazable.

### Fase D: Admin UX y workflows
Entregables:
1. Triage de `needs_replan` en `/admin/reservations`.
2. Flujo `/admin/reservations/nueva` consumiendo disponibilidad robusta.
3. Wizard unificado de alta empleado/estilista (si queda dentro del alcance operativo aprobado).

Criterios de aceptación:
1. Operación diaria resoluble sin SQL manual.
2. Menor tasa de errores de creación/replanificación.

### Fase E: QA, rollout y estabilización
Entregables:
1. QA funcional y técnico firmado.
2. Checklist de release y plan de rollback validados.
3. Monitoreo post-release y criterios de estabilización.

Criterios de aceptación:
1. Sin regresiones críticas en flujos core.
2. Métricas de error y conflicto dentro de umbrales esperados.

## Riesgos y mitigaciones
1. Riesgo: drift entre disponibilidad y creación.
Mitigación: centralizar reglas en SQL/función común + tests de paridad.
2. Riesgo: regresiones por constraints nuevas.
Mitigación: migraciones graduales, pruebas con dataset de staging y rollback documentado.
3. Riesgo: saturación operativa por `needs_replan` masivo.
Mitigación: triage en lote, filtros dedicados y runbook de priorización.
4. Riesgo: permisos excesivos.
Mitigación: revisión de grants, RLS mínimo privilegio y auditoría de endpoints.

## Plan de despliegue / rollout
1. Aplicar Fase A en ventana controlada y verificar esquema.
2. Activar Fase B detrás de rutas/API con fallback claro.
3. Habilitar Fase C con entrenamiento operativo mínimo.
4. Publicar Fase D con feature flags si es necesario.
5. Ejecutar Fase E y cerrar con checklist de salida.

## Definition of Done
1. Reglas de disponibilidad consistentes en web/admin/MCP.
2. Cero dobles reservas para un mismo estilista/hueco.
3. `needs_replan` operable de punta a punta.
4. Permisos y RLS ajustados al mínimo privilegio.
5. QA completado y evidenciado en `Docs/reservas-v2-1/tests.md` y `checklist.md`.
6. `context.md` actualizado con cualquier cambio funcional/BD/API.

## Outcome summary (2026-02-27)

### Qué se implementó
1. Fase A: alineación de BD (`needs_replan`, `time_off.category`, `location_closures`, claves operativas).
2. Fase B: motor unificado (`check_booking_slot_v2`, `create_booking_atomic_v2`, `get_availability_slots_v2`) y APIs de create/availability alineadas.
3. Fase C: operativa de agenda con CRUD de `time_off` y `location_closures` + triggers de marcado automático `needs_replan`.
4. Fase D: flujo admin de triage/replan y mejoras operativas en reservas (`/admin/reservations`, `/admin/reservations/nueva`).
5. Fase E: QA técnico/funcional ejecutado y documentación de evidencias/tests.

### Qué se cambió vs plan original
1. Se incorporó validación/fix adicional de compatibilidad con Next.js 15 en handlers dinámicos (`context.params` async).
2. Se reforzó normalización de relaciones en endpoints admin para evitar inconsistencias de shape en respuestas.
3. Se documentó y validó el flujo operativo con paneles de triage y responsive real en admin.

### Pendientes
1. QA manual final del usuario en entorno operativo antes de limpiar puntero.
2. Gap detectado después del cierre técnico: validar en motor el cruce estricto con `location_hours` (cierre regular de centro) para evitar ofertas de slot límite tipo `11:45` con servicio de `30 min` y cierre `12:00`.

### Riesgos conocidos post-release
1. Hasta cerrar el gap de `location_hours`, puede aparecer algún slot límite incorrecto si `working_hours` del estilista excede horario regular del centro.
2. El endpoint MCP admin (`admin_bookings_day`) requiere validación OAuth en cliente real; en pruebas HTTP crudas puede seguir mostrando challenge aunque el token admin sea válido para API interna.
