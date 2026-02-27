# Checklist - CRM Ficha Cliente

## Fase 1 - DB + Seguridad

### Tareas
- [x] Diseñar esquema final de `customer_profiles`.
- [x] Diseñar esquema final de `customer_notes`.
- [x] Crear migración SQL en `migrations/`.
- [x] Definir índices mínimos de rendimiento.
- [x] Activar RLS en tablas nuevas.
- [x] Crear policies para `admin|employee`.
- [x] Verificar grants y acceso esperado.

### Tests
- [x] Ejecutar migración sin errores.
- [x] Verificar acceso permitido con rol interno.
- [x] Verificar denegación a accesos no autorizados.

### Notas / decisiones
- Decisión cerrada: detalle principal en pantalla (no modal).

### Gate
- [x] Gate Fase 1: tests de fase pasados.

## Fase 2 - API Admin

### Tareas
- [x] Implementar `GET /api/admin/crm/customers/:id/profile`.
- [x] Implementar `PUT /api/admin/crm/customers/:id/profile`.
- [x] Implementar `GET /api/admin/crm/customers/:id/notes`.
- [x] Implementar `POST /api/admin/crm/customers/:id/notes`.
- [x] Añadir validaciones de payload.
- [x] Añadir errores tipados y manejo de estados.

### Tests
- [x] Test manual de lectura de perfil.
- [x] Test manual de edición de perfil.
- [x] Test manual de alta y listado de notas.
- [x] Validar errores 4xx por payload inválido.
- [x] Smoke auth API (`401 missing_token` y `401 invalid_token`) en `profile` y `notes`.

### Notas / decisiones
- Decisión aplicada: usar `customer_key` estable derivado de email/teléfono normalizados (`email:<value>` / `phone:<value>`) para enrutar perfil/notas desde el CRM actual.
- `customer_profiles` mantiene `id` UUID como PK interna para relaciones (`customer_notes.customer_profile_id`).

### Gate
- [x] Gate Fase 2: tests de fase pasados.

## Fase 3 - UI CRM (detalle en pantalla)

### Tareas
- [x] Refactor de `/admin/crm` a layout maestro-detalle.
- [x] Implementar panel derecho editable en desktop.
- [x] Implementar detalle full-screen en mobile.
- [x] Implementar timeline de notas.
- [x] Añadir modal solo para “nota rápida”.

### Tests
- [x] Flujo desktop: seleccionar cliente y editar.
- [x] Flujo mobile: detalle full-screen editable.
- [x] Verificar que no hay modal principal para detalle.

### Notas / decisiones
- Priorizar claridad y densidad de información operativa.

### Gate
- [x] Gate Fase 3: tests de fase pasados.

## Fase 4 - Hardening UX / Operación

### Tareas
- [x] Prevenir pérdida de cambios no guardados.
- [x] Añadir feedback de guardado/error por sección.
- [x] Pulir estados de carga y vacíos.
- [x] Revisar accesibilidad básica del flujo.

### Tests
- [x] Smoke completo de `/admin/crm`.
- [x] `npm run lint` sin errores.
- [x] `npm run build` sin errores.
- [ ] Verificación manual de regresiones en búsqueda/orden.

### Notas / decisiones
- Mantener acción rápida en modal solo para operaciones acotadas.

### Gate
- [ ] Gate Fase 4: tests de fase pasados.
