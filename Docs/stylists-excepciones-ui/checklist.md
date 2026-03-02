# Checklist de Implementación - Stylists Excepciones UI

## Fase A - Base UX y modelo

### Tareas
- [x] Introducir panel lateral de agenda del estilista.
- [x] Mantener edición actual de estilista estable (sin regresión de alta/edición).
- [x] Preparar estado para múltiples `plages` personalizadas por día.

### Tests
- [x] Editar estilista sigue funcionando como hoy.
- [x] Panel lateral abre/cierra correctamente en desktop/móvil.

### Gate: tests de fase pasados
- [x] Gate Fase A aprobado.

## Fase B - Plages personalizadas múltiples

### Tareas
- [x] UI para añadir/quitar varias franjas en modo personalizado.
- [x] Validaciones de solape y orden horario.
- [x] Persistencia por múltiples filas `working_hours` día/centro.

### Tests
- [x] Se guardan varias franjas en un mismo día.
- [x] No se permite guardar franjas solapadas.

### Gate: tests de fase pasados
- [x] Gate Fase B aprobado.

## Fase C - CRUD time_off en stylists

### Tareas
- [x] Listado de indisponibilidades en panel.
- [x] Alta/edición de indisponibilidades con categoría.
- [x] Borrado con confirmación modal.

### Tests
- [x] CRUD de `time_off` funcional desde stylists.

### Gate: tests de fase pasados
- [x] Gate Fase C aprobado.

## Fase D - CRUD location_closures contextual

### Tareas
- [x] Listado de cierres por centros asociados.
- [x] Alta/edición/borrado de cierres completos/parciales.
- [x] UX clara de alcance centro + fecha + tramo.

### Tests
- [x] CRUD de `location_closures` funcional desde stylists.

### Gate: tests de fase pasados
- [x] Gate Fase D aprobado.

## Fase E - Impacto y robustez motor

### Tareas
- [x] Endpoint server-side de guardado `working_hours` con validación.
- [x] Validar `location_hours` en motor SQL (`check_booking_slot_v2`).
- [x] Exponer/mapear error `outside_location_hours` en API create.
- [x] Feedback de impacto y CTA a `needs_replan`.

### Tests
- [x] Caso borde: servicio 30 min a 11:45 con cierre 12:00 no aparece/ni reserva.
- [x] Validación create y availability consistente con `location_hours`.

### Gate: tests de fase pasados
- [x] Gate Fase E aprobado.

## Fase F - QA funcional y regresión

### Tareas
- [x] QA manual de agenda (base, excepciones, cierres, replan).
- [x] QA responsive móvil/tablet del panel.
- [x] Documentar evidencias en `tests.md`.

### Tests
- [x] `npm run lint` en verde.
- [x] `npm run build` en verde.
- [x] Smoke de `/admin?section=stylists` y `/admin/reservations/nueva`.

### Gate: tests de fase pasados
- [x] Gate Fase F aprobado.
