# Plan de Implementación: Agenda Robusta en `/admin?section=stylists`

Fecha: 2026-02-27  
Estado: Planeado (sin implementación en este documento)

## 1. Objetivo

Completar la operación de agenda desde la sección de estilistas para que un admin pueda gestionar, en una sola UX coherente:
1. Horario base semanal por centro.
2. Excepciones del estilista (ausencias, vacaciones, baja, etc.).
3. Cierres/festivos del centro relevantes para ese estilista.
4. Impacto operativo sobre reservas (`needs_replan`) antes de confirmar cambios sensibles.

Además, añadir en modo de horarios personalizados la capacidad de definir múltiples `plages horaires` por día (no solo un tramo).

## 2. Estado actual validado

Backend ya disponible:
1. `GET/POST /api/admin/schedule/time-off` y `PUT/DELETE /api/admin/schedule/time-off/[id]`.
2. `GET/POST /api/admin/schedule/location-closures` y `PUT/DELETE /api/admin/schedule/location-closures/[id]`.
3. Trigger en BD que marca reservas afectadas como `needs_replan` cuando cambia `working_hours`, `time_off` o `location_closures`.

Frontend actual en `stylists`:
1. Solo gestiona `working_hours` de forma directa desde cliente.
2. No usa todavía la capa de excepciones/cierres vía endpoints de agenda.
3. En modo personalizado solo permite un rango `start/end` por día.

Gap crítico detectado en motor de disponibilidad:
1. La validación robusta actual no cruza explícitamente contra `location_hours` (horario regular del centro).
2. Esto permite casos inválidos si `working_hours` del estilista queda fuera del horario real del centro.
3. Ejemplo reportado: servicio 30 min a las 11:45 cuando el centro cierra a las 12:00.

## 3. Principios de robustez

1. El servidor/BD decide disponibilidad y validez final, nunca el frontend.
2. La UI debe prevenir errores operativos, pero no sustituir validación backend.
3. Cambios destructivos siempre con confirmación explícita (`AlertDialog`).
4. Reutilizar componentes existentes admin para consistencia:
- `AdminSidePanel` para edición contextual.
- `Dialog` para formularios compactos.
- `AlertDialog` para confirmaciones críticas.

## 4. Diseño UX propuesto (coherente con lo existente)

## 4.1 Estructura en `stylists`

1. Mantener grid de estilistas como vista principal.
2. Al editar agenda de un estilista, abrir panel lateral (`AdminSidePanel`, ancho `xl`) con 4 bloques:
- Horaires de base.
- Indisponibilités (time_off).
- Fermetures du centre (location_closures).
- Impact & replanification.

## 4.2 Horaires de base con `plages horaires`

1. Por cada centro y día:
- Toggle día activo/inactivo.
- Selector de modo:
  - `Horaires du centre` (selección de slots del centro).
  - `Horaires personnalisés`.
2. En `Horaires personnalisés` permitir múltiples rangos:
- Botón `Ajouter une plage`.
- Cada fila con `start_time`, `end_time`, eliminar.
- Reordenado automático por hora.
3. Validaciones cliente y servidor:
- `start < end`.
- Sin solapes entre rangos del mismo día.
- Si día activo, al menos un rango.
- Duración mínima de rango configurable (base: 15 min).

## 4.3 Indisponibilités (time_off)

1. Listado en panel por rango de fechas y categoría.
2. Alta/edición con formulario:
- categoría (`vacaciones|baja|descanso|formacion|bloqueo_operativo`).
- inicio/fin.
- opcional centro.
- motivo.
3. Borrado con `AlertDialog`.

## 4.4 Fermetures du centre

1. Mostrar cierres de los centros asociados al estilista en el mismo panel.
2. Permitir crear/editar/borrar cierres (día completo o tramo parcial) sin salir de `stylists`.
3. Etiquetar visualmente: `Fermé toute la journée` o `Fermeture partielle HH:MM-HH:MM`.

## 4.5 Impacto operativo

1. Antes de guardar cambios de agenda, mostrar modal resumen:
- cambios detectados.
- advertencia de impacto.
- CTA confirmar/cancelar.
2. Después de guardar:
- feedback con conteo real de reservas movidas a `needs_replan` (si aplica).
- acceso directo al flujo de resolución en reservas (`status=needs_replan`).

## 5. Cambios técnicos propuestos

## 5.1 Frontend

1. Refactor de `src/app/admin/stylist-management.tsx` a modelo por secciones internas (manteniendo sección admin actual).
2. Nuevo estado para rangos personalizados múltiples por centro/día.
3. Integración de llamadas a:
- `/api/admin/schedule/time-off`.
- `/api/admin/schedule/location-closures`.
4. Sustituir confirmaciones nativas (`window.confirm`) por `AlertDialog`.

## 5.2 Backend (recomendado para máxima robustez)

1. Crear endpoint interno de guardado de `working_hours` por estilista/centro con validación server-side de solapes.
2. Dejar de depender de escritura directa cliente->tabla para agenda crítica.
3. Devolver respuesta estructurada de impacto de guardado:
- `updated_working_hours_count`.
- `needs_replan_detected_count` (o métrica equivalente).

## 5.3 Reserva y calendario (consistencia)

1. Mantener `/api/reservation/availability` y `/api/reservation/create` como fuente de verdad.
2. Ajustar el pintado mensual de `/admin/reservations/nueva` para evitar heurísticas de “30 min promedio” y usar datos derivados del motor real.

## 5.4 Cierre regular de centro (`location_hours`) como regla dura

1. Ampliar `check_booking_slot_v2` para exigir que el rango completo de la cita (`start -> end + buffer`) esté contenido en una franja de `location_hours` del centro para ese día.
2. Mantener `location_closures` como capa de cierre excepcional adicional, no como sustituto de `location_hours`.
3. Aplicar la misma regla en `get_availability_slots_v2` por reutilización de `check_booking_slot_v2`.
4. Definir código de error explícito para este caso (`outside_location_hours`) y mapearlo en `/api/reservation/create`.
5. Alinear validaciones de configuración en admin:
- al guardar `working_hours`, impedir que se creen franjas fuera de `location_hours`,
- o marcar advertencia bloqueante para corrección inmediata.

## 6. Fases de implementación

## Fase A - Base UX y modelo de datos en `stylists`

1. Introducir panel lateral de agenda del estilista.
2. Mantener edición actual estable (sin regresión).
3. Preparar estado para múltiples `plages`.

Gate:
1. Editar estilista sigue funcionando como hoy.
2. Panel lateral abre/cierra correctamente desktop/móvil.

## Fase B - `plages horaires` personalizadas múltiples

1. UI para añadir/quitar varios rangos en modo personalizado.
2. Validaciones de solape/orden en cliente.
3. Persistencia en `working_hours` por múltiples filas día/centro.

Gate:
1. Se guardan varias franjas en un mismo día.
2. No se permite guardar franjas solapadas.

## Fase C - CRUD de `time_off` dentro de `stylists`

1. Listado, alta, edición, borrado con categorías.
2. Confirmaciones con `AlertDialog`.
3. Refresh de datos y feedback tras operación.

Gate:
1. Operaciones CRUD completas sin salir de `stylists`.

## Fase D - CRUD de `location_closures` contextual

1. Listado por centros asociados.
2. Alta/edición/borrado de cierres completos o parciales.
3. UX clara de alcance (centro + fecha + tramo).

Gate:
1. Cierres visibles y editables desde `stylists`.

## Fase E - Impacto y flujo `needs_replan`

1. Modal de confirmación con resumen de cambios.
2. Mensaje post-guardado con impacto real.
3. CTA a reservas filtradas `needs_replan`.

Gate:
1. El usuario entiende impacto antes y después de guardar.

## Fase F - QA funcional y regresión

1. QA de agenda con casos reales:
- horario base,
- múltiples franjas,
- ausencia,
- cierre parcial,
- cierre completo,
- `needs_replan`.
2. QA móvil/tablet en panel lateral y formularios.
3. QA de coherencia centro-estilista:
- caso límite: centro cierra 12:00, servicio 30 min, slot 11:45 no debe aparecer ni ser reservable,
- verificación en web pública y admin `nueva`.

Gate:
1. Sin regresiones en creación de reserva.
2. Sin desbordes en mobile admin.
3. Sin slots ofrecidos fuera de `location_hours`.

## 7. Criterios de aceptación

1. Un admin puede gestionar horario base + ausencias + cierres desde `stylists` sin SQL manual.
2. `Horaires personnalisés` soporta múltiples `plages` por día.
3. Cambios de agenda sensibles muestran confirmación e impacto.
4. El flujo de resolución `needs_replan` queda enlazado de forma operativa.
5. UX consistente con paneles/modales ya existentes en admin.
6. Nunca se ofrecen ni confirman reservas cuyo fin exceda el cierre regular del centro.

## 8. Riesgos y mitigación

1. Riesgo: inconsistencias por escritura directa desde cliente.
Mitigación: endpoint server-side para agenda crítica.

2. Riesgo: sobrecarga visual del panel.
Mitigación: bloques colapsables y acciones primarias claras.

3. Riesgo: impacto inesperado en reservas futuras.
Mitigación: confirmación previa + resumen post-guardado + enlace de triage.

## 9. Resultado esperado

Tras implementar este plan, `stylists` pasa de ser un editor básico de horario semanal a una consola operativa completa de agenda real: horario base, excepciones, cierres y gestión de impacto sobre reservas, manteniendo la robustez del motor backend ya existente.
