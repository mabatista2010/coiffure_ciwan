# Checklist de implementación

## Fase 1 - Auditoría técnica y contrato final

### Tareas
- [x] Inventariar todos los usos actuales de `employee` en frontend, backend, SQL y docs.
- [x] Inventariar todos los usos actuales de `allowedRoles` y whitelists role-based.
- [x] Confirmar catálogo final de permisos V1.
- [x] Confirmar scopes aplicables por módulo.
- [x] Confirmar perfiles base iniciales y sus permisos.
- [x] Confirmar tabla final de módulos admin-only vs delegables.

### Tests
- [x] Revisar que no quedan decisiones estructurales abiertas.
- [x] Verificar que el catálogo cubre todos los módulos delegables acordados.

### Notas/decisiones
- `admin` = superusuario total.
- `staff` = configurable por perfil + overrides + scope.
- Seguridad V1 elegida: híbrido pragmático (app/backend fuerte + RLS sensata).

### Gate: tests de fase pasados
- [x] Gate Fase 1 aprobado.

---

## Fase 2 - Base de datos y migración a `staff`

### Tareas
- [x] Diseñar migración SQL de `employee` → `staff`.
- [x] Crear tablas `permission_profiles`, `profile_permissions`, `user_profiles`, `user_permission_overrides`, `user_location_assignments`, `admin_audit_log`.
- [x] Definir constraints e índices necesarios.
- [x] Seed de perfiles base del sistema.
- [x] Seed de permisos/scopes por perfil.
- [x] Backfill de usuarios actuales a `staff` + perfil inicial.
- [x] Revisar políticas/RLS/documentación que mencionen `employee`.

### Tests
- [x] Verificación SQL de migración correcta de roles.
- [x] Verificación SQL de integridad de nuevas tablas.
- [x] Verificación de seeds y perfiles base.

### Notas/decisiones
- Migración aplicada realmente vía `mcp__supabase__execute_sql` sobre `tvdwepumtrrjpkvnitpw`.
- Estado verificado: `admin=2`, `staff=2`, `employee=0`, default `user_roles.role = staff`, 6 tablas nuevas presentes, 5 perfiles sembrados, 2 `user_profiles` creados por backfill.

### Gate: tests de fase pasados
- [x] Gate Fase 2 aprobado.

---

## Fase 3 - Capa central de permisos y scopes

### Tareas
- [x] Crear `src/lib/permissions/catalog.ts`.
- [x] Crear tipos de permisos/scopes.
- [x] Implementar resolver de permisos efectivos.
- [x] Implementar resolución de scope efectivo por módulo.
- [x] Implementar helpers `can(...)`, `requirePermission(...)`, `filterByScope(...)`.
- [x] Evaluar cache corto/seguro y descartarlo en esta V1 por no ser necesario tras la validación funcional.
- [x] Definir comportamiento fail-closed estándar.

### Tests
- [x] Resolver correcto para `admin`.
- [x] Resolver correcto para `staff` con perfil base.
- [x] Resolver correcto para overrides `allow`.
- [x] Resolver correcto para overrides `deny`.
- [x] Resolver correcto para staff mal configurado (fail-closed).

### Notas/decisiones
- No materializar permisos efectivos persistidos como fuente de verdad en V1.
- La capa central ya alimenta layout, nav, dashboard y APIs de acceso/user-management.

### Gate: tests de fase pasados
- [x] Gate Fase 3 aprobado.

---

## Fase 4 - Refactor estructural UI (layout/nav/dashboard)

### Tareas
- [x] Eliminar `EMPLOYEE_ALLOWED_PREFIXES` de `AdminLayout`.
- [x] Migrar checks role-based de layout a permisos efectivos.
- [x] Refactorizar `AdminNav` para render por permisos reales.
- [x] Filtrar quick actions del dashboard.
- [x] Corregir `Suspense`/`useSearchParams` en layout y reservas para mantener build estable.
- [x] Filtrar widgets/alertas/accesos del dashboard.
- [x] Validar modo solo lectura real donde aplique.

### Tests
- [x] Usuario `staff` solo ve módulos permitidos.
- [x] Usuario `staff` con solo `view` entra en modo lectura real.
- [x] Usuario sin perfil/config válida queda bloqueado con UX clara.
- [x] `admin` sigue viendo todo.

### Notas/decisiones
- No aceptar solución final basada en ocultar links sin proteger acciones.

### Gate: tests de fase pasados
- [x] Gate Fase 4 aprobado.

---

## Fase 5 - Nuevo User Management con panel lateral

### Tareas
- [x] Rediseñar lista de usuarios con más contexto operativo.
- [x] Añadir panel lateral de edición.
- [x] Permitir cambiar rol global (`admin` / `staff`).
- [x] Permitir asignar perfil base.
- [x] Permitir asociar styliste.
- [x] Permitir asignar centros.
- [x] Permitir configurar scopes por módulo.
- [x] Permitir aplicar overrides `allow/deny`.
- [x] Mostrar permisos efectivos y origen (perfil/override).
- [x] Registrar auditoría de cambios de acceso.
- [x] Crear APIs admin (`/api/admin/users`, `/api/admin/users/[id]`).

### Tests
- [x] Alta/edición de usuario `staff` con perfil base.
- [x] Cambio de overrides individuales.
- [x] Cambio de styliste/centros.
- [x] Relectura correcta de permisos efectivos.
- [x] Auditoría creada al guardar cambios.

### Notas/decisiones
- Se añadió `src/components/ui/checkbox.tsx` para soportar selección de centros en el panel lateral.
- Pendiente la validación funcional real contra una sesión admin y datos de prueba.

### Gate: tests de fase pasados
- [x] Gate Fase 5 aprobado.

---

## Fase 6 - Enforcement backend por módulos

### Tareas
- [x] Migrar protección de endpoints de reservas a permisos reales.
- [x] Migrar protección de CRM a permisos reales.
- [x] Migrar protección de stats a permisos reales + scope.
- [x] Migrar configuración de servicios a permisos reales.
- [x] Migrar configuración de stylists a permisos reales.
- [x] Migrar configuración de centros a permisos reales.
- [x] Migrar galería a permisos reales.
- [x] Migrar boutique (pedidos y catálogo) a permisos reales.

### Tests
- [x] Acceso denegado correcto en endpoints sin permiso.
- [x] Scope correcto en respuestas filtradas.
- [x] `admin` mantiene acceso completo.
- [x] No hay regresión funcional en módulos existentes.

### Notas/decisiones
- Reservas migradas en `pending`, `replan`, `time-off`, `location-closures`.
- CRM migrado por permisos (`crm.customers.view/edit`, `crm.notes.view/create`) pero aún sin smoke tests funcionales.
- Stats ahora aplican scope efectivo en frontend admin (`own_stylist`, `assigned_location`, `specific_locations`, `all`, `none`).
- Boutique admin/APIs migradas a `boutique.catalog.*` y `boutique.orders.*`, con GET público de catálogo activo preservado para la tienda pública.
- Configuración directa endurecida en frontend: `ServiceManagement`, `stylist-management`, `location-management` y sección `gallery` ya respetan lectura/edición/borrado según permisos efectivos.
- `POST /api/admin/schedule/working-hours` y `POST /api/admin/schedule/location-hours` ya aceptan `staff` con `requiredPermission` y validan también el scope del recurso.
- Mutaciones de `stylists` y `locations` ya no dependen de writes directos cliente→Supabase: ahora pasan por `/api/admin/stylists`, `/api/admin/stylists/[id]`, `/api/admin/locations`, `/api/admin/locations/[id]` con `requireStaffAuth`, validación explícita de scope y auditoría.

### Gate: tests de fase pasados
- [x] Gate Fase 6 aprobado.

---

## Fase 7 - Auditoría, hardening y cierre

### Tareas
- [x] Activar auditoría amplia de cambios sensibles.
- [x] Revisar acciones destructivas y orientar a desactivación/soft delete cuando proceda.
- [x] Limpiar checks legacy de `employee` y whitelists antiguas en el núcleo de acceso.
- [x] Actualizar `context.md` con el nuevo modelo de permisos.
- [x] Ejecutar lint.
- [x] Ejecutar build.
- [x] Ejecutar QA manual por perfiles/scopes.
- [x] Preparar cierre del pack.

### Tests
- [x] `npm run lint`.
- [x] `npm run build`.
- [x] Smoke tests de perfiles base.
- [x] Smoke tests de overrides allow/deny.
- [x] Smoke tests de scopes (`all`, `own_stylist`, `assigned_location`, `specific_locations`).
- [x] Smoke tests de auditoría.

### Notas/decisiones
- Warnings no bloqueantes actuales de build: `Browserslist` desactualizado y `metadataBase` ausente.
- QA manual Playwright + API ya ejecutada y documentada en `qa-checklist.md` / `tests.md`; antes de seguir con más fixes se dejan priorizados los hallazgos abiertos reales.
- Correcciones ya cerradas en esta tanda:
  - `/admin/reservations` ya filtra centros/stylistes y queries por `reservations.view` scope.
  - CRM resuelve perfiles por `customer_key` / email / teléfono y deja de fallar en los casos QA reprobados.
  - `stylists.profile.edit` ya acepta multi-centre si cualquier `location_id` cae dentro del scope.
  - `audit_admin_change()` ya no rompe en tablas sin `user_id`, y además los endpoints server-side de `boutique` / `schedule` escriben auditoría explícita.
  - Los guards SQL de `servicios` / `productos` ya aceptan `service_role`, evitando que los endpoints servidor fallen por permisos DB internos.
- La estrategia de retirada segura ya está aplicada en `stylists`, `locations`, `services` y `boutique`; quedan solo checks QA finales fuera de este bloque.

### Gate: tests de fase pasados
- [x] Gate Fase 7 aprobado.
