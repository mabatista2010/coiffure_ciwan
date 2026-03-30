# Implementación: permisos granulares admin V1

## Resumen
Este pack documenta la evolución del sistema actual de acceso admin desde un modelo rígido de dos roles (`admin` / `employee`) a un modelo robusto, granular y escalable basado en:
- rol global (`admin` / `staff`),
- perfil base de permisos,
- overrides por usuario (`allow` / `deny`),
- scopes de acceso a datos,
- enforcement centralizado en frontend y backend,
- auditoría de cambios sensibles.

El objetivo es permitir delegación real y controlada del panel admin sin dejar deuda técnica estructural, evitando whitelists hardcodeadas, checks dispersos y semánticas rígidas tipo “employee solo puede entrar a X”.

## Objetivo y alcance

### Objetivo
Dejar un sistema de permisos admin con estas garantías:
- `admin` sigue siendo superusuario total e irrevocable.
- `staff` puede configurarse de forma fina y comprensible.
- Los permisos se aplican de forma consistente en UI, navegación, páginas y API.
- El alcance de datos (scope) queda modelado explícitamente.
- La configuración de acceso puede administrarse desde un panel lateral por usuario.
- Los cambios sensibles quedan auditados.
- El sistema nace preparado para crecer sin rediseño profundo.

### Alcance
Incluye:
- migración real de rol `employee` a `staff`,
- nuevo modelo de perfiles/permisos/scopes,
- diseño de tablas de soporte,
- nueva capa central de autorización,
- refactor de checks actuales en layout/nav/backend,
- rediseño de `admin/user-management` con panel lateral completo,
- activación gradual de permisos granulares sobre módulos definidos,
- estrategia de auditoría,
- plan de rollout y QA.

### No-objetivos
No incluye en V1:
- editor completo de perfiles personalizados desde UI,
- delegación de gestión de usuarios a `staff`,
- modelar toda la granularidad de permisos dentro de RLS SQL,
- duplicar configuración de un usuario a otro,
- abrir permisos para `hero / page d'accueil site`,
- convertir todos los borrados existentes a soft delete si el módulo no lo soporta todavía, aunque la filosofía objetivo sea desactivación/archivo preferente.

## Estado actual detectado
Actualmente el repo usa un modelo de acceso limitado y disperso:
- `src/lib/userRoles.ts`: roles `admin | employee`.
- `src/app/admin/layout.tsx`: whitelist fija `EMPLOYEE_ALLOWED_PREFIXES`.
- `src/components/AdminNav.tsx`: navegación role-based con entradas admin-only o all.
- `src/lib/apiAuth.ts`: protección backend basada en `allowedRoles`.
- `src/app/admin/user-management/page.tsx`: edición limitada a rol + estilista asociado.

Esto crea varias limitaciones:
- imposibilidad de delegación fina,
- mezcla de rol, permiso y scope,
- lógica repetida en UI/backend,
- crecimiento difícil sin debt creep,
- semántica antigua (`employee`) demasiado rígida.

## Decisiones tomadas en esta sesión

### 1. Modelo base
- Se adopta un modelo **híbrido**:
  - perfil base,
  - más overrides por usuario.

### 2. Granularidad
- Los permisos serán **finos por acción**.
- La UI los agrupará **por módulo**.

### 3. Rol `admin`
- `admin` tendrá acceso total e irrevocable.
- No se le aplicarán restricciones finas.

### 4. Rol no-admin
- El rol visible y real pasa de `employee` a `staff`.
- La migración será **real y completa**, no solo cosmética en UI.

### 5. Relación usuario ↔ stylist
- Se mantiene `stylist_users`.
- Pasa a interpretarse como mecanismo de **scope**, no como permiso.

### 6. Modelo de scope
- El sistema se diseña para soportar scopes escalables.
- Scopes V1 acordados:
  - `all`
  - `none`
  - `own_stylist`
  - `assigned_location`
  - `specific_locations`

### 7. Unidad de scope
- El scope será **principalmente por módulo**.
- Se deja preparada la posibilidad de **excepciones por acción** si aparece un caso real.

### 8. Perfiles base
- Habrá perfiles del sistema base.
- En el futuro podrán existir perfiles personalizados, pero no son objetivo de V1.

### 9. Overrides por usuario
- El admin podrá **añadir y quitar permisos** individuales a cada usuario.
- Semántica acordada:
  - `deny` explícito gana,
  - luego `allow` explícito,
  - luego herencia del perfil base,
  - si no hay permiso concedido, se deniega.

### 10. UX de edición
- La gestión del usuario evolucionará a un **panel lateral** consistente con otros módulos admin.
- Desde ese panel se podrá:
  - ver usuario,
  - asignar perfil,
  - asociar styliste,
  - asociar centros,
  - configurar scopes,
  - aplicar overrides,
  - ver permisos efectivos.

### 11. Catálogo de permisos
- Los permisos posibles en V1 serán **canónicos y definidos por la aplicación**.
- La arquitectura no cerrará la puerta a más dinamismo futuro.

### 12. Módulos delegables en V1
Se acuerda delegación potencial para `staff` en:
- reservas,
- CRM,
- servicios,
- stylists,
- centros,
- galería,
- boutique,
- stats.

Quedan fuera de delegación en V1:
- gestión de usuarios,
- hero / page d'accueil site,
- administración global equivalente.

### 13. Boutique
- Se separa en dos subámbitos:
  - pedidos,
  - catálogo.

### 14. CRM
- Se separa en:
  - ver clientes / buscar clientes,
  - editar ficha,
  - ver notas,
  - crear notas.

### 15. Reservas
- Se separa explícitamente en:
  - ver calendario/listado,
  - crear reserva manual,
  - reprogramar/editar,
  - gestionar pendientes,
  - cancelar,
  - gestionar `time_off`,
  - gestionar `location_closures`,
  - gestionar `working_hours`,
  - gestionar `location_hours`.

### 16. Servicios
- El patrón general será:
  - ver,
  - crear/editar,
  - eliminar.
- Además, dentro de edición se separa:
  - contenido/ficha,
  - parámetros de negocio (`precio`, `duration`).

### 17. Stylists
- Se separa en:
  - perfil,
  - operativa.
- La asignación de servicios a stylists se considera parte de `stylists`, no de `services`.

### 18. Centros
- Se separan en:
  - perfil,
  - operativa.

### 19. Galería
- Sigue el patrón:
  - ver,
  - crear/editar,
  - eliminar.

### 20. Boutique catálogo
- Se separa edición de contenido de edición de parámetros comerciales (`precio`, `stock`, activación).

### 21. Stats
- `stats` será delegable con **scope configurable por admin**.
- El admin podrá decidir si un usuario ve:
  - solo lo suyo,
  - solo su styliste,
  - solo sus centros,
  - varios centros,
  - o todo.

### 22. User management
- Queda **admin-only en V1**.
- El diseño no impedirá una delegación parcial futura.

### 23. Lectura real
- El permiso `view` será una capacidad real, no decorativa.
- Permitirá módulos en modo solo lectura.

### 24. Borrado
- Filosofía objetivo: **soft delete / desactivación preferente**.
- Donde el módulo ya no soporte eso, se evaluará la migración o una transición controlada.

### 25. Auditoría
- V1 incluye auditoría amplia de cambios sensibles.

### 26. Capa central
- La autorización deberá centralizarse.
- No se aceptan checks dispersos como solución final.

### 27. Seguridad V1
- Opción elegida: **híbrido pragmático**.
- Enforcement fuerte y centralizado en app/backend.
- RLS sigue protegiendo de forma razonable, pero no se intenta reflejar toda la matriz granular en SQL desde el día 1.

### 28. Robustez operativa
- El sistema será **fail-closed con UX guiada**.
- Un `staff` sin perfil/scope/config válida no tendrá acceso sensible por defecto.

### 29. Resolución y cache
- Los permisos efectivos se resolverán on-demand mediante capa central.
- Se permite cache corto por usuario/sesión cuando convenga.
- No se materializarán como fuente principal persistida en V1.

### 30. Perfiles base iniciales acordados
- Staff básico
- Recepción
- Responsable de centro
- Catálogo / contenido
- Analista

### 31. Copia de configuración entre usuarios
- No es necesaria en V1.

## Ajuste de implementación durante la ejecución

## Hallazgos abiertos antes de la tanda de correcciones

Antes de empezar la siguiente ola de correcciones, la QA manual/API acumulada deja estos gaps abiertos y ya confirmados:
- `/admin/reservations` sigue exponiendo en UI centros fuera del scope de `center_manager` en el selector de centro.
- El subpanel editable de CRM todavía puede mostrar `Impossible de créer le profil client` en algunos clientes aunque el detalle abra.
- `stylists.profile.edit` no es robusto con stylists multi-centre cuando la primera `location_ids[0]` cae fuera del scope pero otra localización sí está permitida.
- Falta auditoría en `admin_audit_log` para cambios de `user_profiles`, `services`, `boutique` y `schedule.*`.
- La estrategia de retirada segura quedó cerrada: `stylists`, `locations`, `services` y `boutique` se retiran vía `active/activo=false` y conservan historial.

### Gap real detectado en QA técnica (2026-03-27)
La estrategia inicial intentó mantener mutaciones directas cliente→Supabase para `stylists` y `locations`, reforzando RLS con helpers SQL de scope. La QA real con cuentas `admin` y `staff` mostró un gap importante:
- los helpers SQL resolvían correctamente `assigned_location`,
- las APIs server-side de `schedule/*` respetaban permiso+scope,
- pero las mutaciones directas de `stylists` y `locations` desde cliente seguían devolviendo `0` filas / noop para `staff` scoped.

### Decisión de pivot
Para cerrar el pack sin deuda técnica ni comportamiento ambiguo, las escrituras de `stylists` y `locations` dejan de depender de mutaciones directas cliente→Supabase y pasan a **APIs dedicadas server-side** con:
- `requireStaffAuth`,
- validación explícita de `requiredPermission`,
- validación explícita de `scope`,
- uso de `service_role` en servidor,
- auditoría de cambios sensibles.

### Alcance del pivot
- `src/app/admin/stylist-management.tsx`: `create/update/delete` del estilista y sus `stylist_services` deberán salir por API dedicada.
- `src/app/admin/location-management.tsx`: `create/update/delete` del centro deberán salir por API dedicada.
- Las lecturas pueden seguir temporalmente vía cliente mientras el enforcement de escritura quede centralizado y verificado.
- La tanda final de borrado seguro aprovecha este pivot: `DELETE` en `stylists`/`locations` ya no cascada ni destruye datos; solo desactiva y audita. En `services` el permiso `services.delete` pasó a significar retirada (`active=false`) y en `boutique` el `DELETE` retira del catálogo (`activo=false`) sin tocar Stripe ni referencias históricas.

## Pendientes de decisión
- **Pendiente de decisión:** definición exacta del naming final de las tablas nuevas (`permission_profiles`, `profile_permissions`, etc.) y si conservarán prefijos `user_`/`admin_` o nomenclatura más genérica.
- **Recomendación:** usar naming explícito, corto y consistente con el modelo de dominio, priorizando claridad (`permission_profiles`, `user_profiles`, `user_permission_overrides`, `user_location_assignments`, `admin_audit_log`).

## Arquitectura propuesta

## 1. Capa de identidad
Mantener y adaptar:
- `user_roles` → migrada a `admin | staff`.
- `stylist_users` → scope por styliste.

Añadir:
- asignaciones de centros por usuario.

## 2. Capa de perfiles y permisos
Tablas nuevas propuestas:
- `permission_profiles`
- `profile_permissions`
- `user_profiles`
- `user_permission_overrides`
- `user_location_assignments`
- `admin_audit_log`

### Contratos conceptuales
#### `permission_profiles`
Perfil base del sistema:
- `id`
- `key`
- `name`
- `description`
- `is_system`
- `active`
- timestamps

#### `profile_permissions`
Permisos y scopes base por perfil:
- `profile_id`
- `permission_key`
- `scope_mode`
- metadata opcional

#### `user_profiles`
Asignación de perfil a usuario:
- `user_id`
- `profile_id`
- timestamps

#### `user_permission_overrides`
Overrides individuales:
- `user_id`
- `permission_key`
- `effect` (`allow | deny`)
- `scope_mode?`
- metadata opcional

#### `user_location_assignments`
Asignaciones de centros:
- `user_id`
- `location_id`

#### `admin_audit_log`
Auditoría de cambios sensibles:
- `actor_user_id`
- `target_user_id?`
- `entity_type`
- `entity_id`
- `action`
- `before_json`
- `after_json`
- `meta_json`
- `created_at`

## 3. Catálogo canónico de permisos
Definido en código, agrupado por módulo.

### Dashboard
- `dashboard.view`

### Reservas / agenda
- `reservations.view`
- `reservations.create`
- `reservations.replan`
- `reservations.manage_pending`
- `reservations.cancel`
- `schedule.time_off.manage`
- `schedule.location_closures.manage`
- `schedule.working_hours.manage`
- `schedule.location_hours.manage`

### CRM
- `crm.customers.view`
- `crm.customers.edit`
- `crm.notes.view`
- `crm.notes.create`

### Servicios
- `services.view`
- `services.content.edit`
- `services.business.edit`
- `services.delete`

### Stylists
- `stylists.profile.view`
- `stylists.profile.edit`
- `stylists.profile.delete`
- `stylists.operations.view`
- `stylists.operations.edit`

### Centros
- `locations.profile.view`
- `locations.profile.edit`
- `locations.profile.delete`
- `locations.operations.view`
- `locations.operations.edit`

### Galería
- `gallery.view`
- `gallery.edit`
- `gallery.delete`

### Boutique pedidos
- `boutique.orders.view`
- `boutique.orders.edit`

### Boutique catálogo
- `boutique.catalog.view`
- `boutique.catalog.content.edit`
- `boutique.catalog.business.edit`
- `boutique.catalog.delete`

### Stats
- `stats.view`

## 4. Capa central de autorización
Nueva carpeta propuesta: `src/lib/permissions/`

Archivos sugeridos:
- `catalog.ts` → catálogo canónico.
- `types.ts` → tipos de permisos, scopes y resultado efectivo.
- `resolver.ts` → cálculo de permisos efectivos.
- `scopes.ts` → helpers de filtrado por scope.
- `guards.ts` → `can`, `requirePermission`, `requirePermissionForRequest`, etc.
- `ui.ts` → helpers específicos de render/navegación.

### API de alto nivel propuesta
- `getCurrentStaffContext()`
- `getEffectivePermissions(userId)`
- `can(context, permissionKey)`
- `getEffectiveScope(context, permissionKey | module)`
- `requirePermission(request, permissionKey)`
- `filterByScope(...)`

## 5. Frontend

### 5.1 AdminLayout
- Eliminar la whitelist fija `EMPLOYEE_ALLOWED_PREFIXES`.
- Resolver acceso real por permisos efectivos.
- Mantener comportamiento fail-closed.

### 5.2 AdminNav
- Render dinámico por permisos de lectura/gestión.
- Módulo visible si existe `view` o capacidad relevante.
- `user-management` y `hero` permanecen admin-only.

### 5.3 Dashboard
- Acciones rápidas filtradas por permisos.
- Widgets, accesos y alertas filtrados por permisos/scopes.

### 5.4 User Management
Evolucionar `src/app/admin/user-management/page.tsx` a:
- lista más informativa,
- panel lateral completo de edición.

#### Contenido del panel lateral
1. Identidad
2. Rol global (`admin` / `staff`)
3. Perfil base
4. Asociaciones operativas
   - styliste asociado
   - centros asignados
5. Scopes por módulo
6. Overrides por módulo/permiso
7. Permisos efectivos
8. Acciones de guardado/auditoría

## 6. Backend

### 6.1 `requireStaffAuth`
Evolucionar desde `allowedRoles` a modelo basado en permiso.

### 6.2 Endpoint protection
Migrar endpoints críticos a `requiredPermission`:
- reservas,
- CRM,
- stats,
- boutique,
- configuración admin.

### 6.3 Filtrado por scope
Aplicar scope efectivo en queries de:
- bookings,
- CRM,
- stats,
- boutique pedidos,
- módulos que exponen datos multi-centro o multi-styliste.

## 7. Auditoría
Registrar en V1:
- cambios de perfil,
- cambios de permisos,
- cambios de scope,
- cambios de asociaciones (`stylist`, `locations`),
- cambios sensibles de servicios,
- cambios sensibles de boutique,
- horarios / cierres / indisponibilidades.

## Plan por fases

## Fase 1 - Auditoría técnica y contrato final
### Entregables
- inventario de checks actuales (`employee`, `allowedRoles`, whitelists UI, nav, dashboard),
- catálogo final de permisos V1,
- mapa módulo → permisos → scopes,
- decisiones documentadas en este pack.

### Criterios de aceptación
- no quedan decisiones estructurales relevantes abiertas,
- existe mapa claro del estado actual y del target.

## Fase 2 - Base de datos y migración a `staff`
### Entregables
- migración SQL de `employee` a `staff`,
- nuevas tablas de perfiles/permisos/overrides/locations/audit,
- seeds de perfiles base,
- seeds de permisos por perfil,
- backfill de usuarios existentes.

### Criterios de aceptación
- BD soporta el modelo completo acordado,
- todos los `employee` pasan a `staff`,
- no quedan datos huérfanos.

## Fase 3 - Capa central de permisos
### Entregables
- `src/lib/permissions/*`,
- catálogo canónico,
- resolver de permisos efectivos,
- helpers de scope,
- cache corto y seguro.

### Criterios de aceptación
- existe una única fuente de lógica de autorización,
- `admin` y `staff` se resuelven correctamente,
- comportamiento fail-closed comprobado.

## Fase 4 - Refactor estructural UI
### Entregables
- `AdminLayout` sin whitelist antigua,
- `AdminNav` por permisos efectivos,
- dashboard filtrado por permisos,
- modo solo lectura real en módulos soportados.

### Criterios de aceptación
- no quedan checks legacy de `employee` en layout/nav,
- UI no muestra accesos inconsistentes.

## Fase 5 - Nuevo User Management
### Entregables
- lista de usuarios enriquecida,
- panel lateral de edición,
- edición de perfil base,
- styliste asociado,
- centros asignados,
- scopes,
- overrides,
- permisos efectivos.

### Criterios de aceptación
- un admin puede configurar completamente a un `staff` desde el panel lateral,
- la UX no necesita saltar a múltiples pantallas.

## Fase 6 - Enforcement backend por módulos
### Entregables
- reservas,
- CRM,
- stats,
- servicios,
- stylists,
- centros,
- galería,
- boutique.

### Criterios de aceptación
- endpoints protegidos por permiso, no solo por rol,
- scope correctamente aplicado donde corresponda.

## Fase 7 - Auditoría, hardening y cierre
### Entregables
- auditoría activa en acciones sensibles,
- limpieza de checks legacy,
- actualización de `context.md`,
- QA integral,
- pack listo para cierre.

### Criterios de aceptación
- trazabilidad operativa suficiente,
- no quedan bypasses obvios,
- definición de done cumplida.

### Correcciones de robustez ya cerradas dentro de Fase 7
- **Scope visual de reservas**: la UI y las queries de `/admin/reservations` ya consumen el scope efectivo `reservations.view`; desaparece la fuga de centros/stylists fuera de perímetro en filtros y cargas de mes/semana/día.
- **CRM editable**: la resolución del perfil CRM ya no depende solo de `customer_key`; ahora recupera por email/teléfono normalizados y evita falsos `Impossible de créer le profil client`.
- **Stylists multi-centre**: `stylists.profile.edit` deja de depender de `location_ids[0]`; basta con que cualquier `location_id` del styliste esté dentro del scope efectivo.
- **Auditoría real**:
  - la función SQL `audit_admin_change()` se endureció para tablas sin `user_id`,
  - `boutique` y `schedule.*` añaden además auditoría explícita server-side,
  - se revalidó evidencia real en `admin_audit_log` para `user_profiles`, `servicios`, `productos`, `time_off`, `location_closures`, `working_hours` y `location_hours`.
- **Compatibilidad service_role**: los guards SQL de `servicios` y `productos` permiten ya `auth.role() = 'service_role'`, evitando falsos fallos en endpoints server-side que escriben con el cliente admin.

## Riesgos y mitigaciones

### Riesgo 1: mezclar rol global con permiso granular
- **Impacto:** lógica confusa y deuda inmediata.
- **Mitigación:** `admin` simple; `staff` siempre resuelto por capa central.

### Riesgo 2: UI protegida pero API no
- **Impacto:** falsa seguridad.
- **Mitigación:** enforcement backend obligatorio por permiso.

### Riesgo 3: scopes inconsistentes por módulo
- **Impacto:** fugas de datos o UX errática.
- **Mitigación:** modelar scopes en un punto central y aplicarlos en helpers reutilizables.

### Riesgo 4: migración parcial `employee → staff`
- **Impacto:** compatibilidad rota y strings legacy mezclados.
- **Mitigación:** migración real y revisión exhaustiva de usos en código/documentación.

### Riesgo 5: panel lateral demasiado complejo
- **Impacto:** mala UX para admin.
- **Mitigación:** jerarquía clara, bloques plegables, resumen de permisos efectivos.

### Riesgo 6: auditoría insuficiente
- **Impacto:** imposibilidad de investigar cambios sensibles.
- **Mitigación:** registrar cambios críticos desde V1.

## Plan de despliegue / rollout
1. Confirmar este pack como contrato activo.
2. Ejecutar Fase 1 y cerrar catálogo definitivo.
3. Ejecutar Fase 2 en rama de trabajo y validar esquema real.
4. Implementar capa central antes de tocar módulos masivos.
5. Migrar layout/nav/dashboard.
6. Entregar nuevo user-management.
7. Activar enforcement por módulos en orden controlado.
8. Ejecutar QA integral por perfiles/scopes.
9. Actualizar `context.md` y cerrar pack.

## Definition of Done
Se considerará terminado solo si:
- `employee` ha desaparecido del modelo operativo y se usa `staff`,
- existe capa central de permisos/scopes reutilizable,
- layout/nav/dashboard ya no usan whitelists hardcodeadas de rol antiguo,
- `user-management` permite configurar perfil, asociaciones, scopes y overrides desde panel lateral,
- los módulos delegables definidos soportan lectura/gestión según permisos,
- backend protege por permiso real y no solo por rol global,
- los scopes limitan datos donde corresponde,
- existe auditoría de cambios sensibles,
- `context.md` refleja el nuevo modelo,
- `npm run lint` pasa,
- QA manual por perfiles y scopes queda documentada,
- no quedan decisiones estructurales relevantes abiertas.

## Outcome summary

### Qué se implementó
- Migración completa del modelo legacy `admin/employee` a `admin/staff`.
- Nuevo sistema de autorización con perfiles base, overrides `allow/deny`, scopes y resolución centralizada.
- Refactor de layout, navegación, dashboard, user-management, módulos admin y APIs para usar permisos reales en vez de whitelists legacy.
- Auditoría de cambios sensibles en accesos, schedule, boutique y módulos operativos críticos.
- Retirada segura/soft-delete en `stylists`, `locations`, `services` y `boutique` mediante desactivación (`active/activo=false`) en lugar de borrado duro.
- QA manual completa con Playwright + verificaciones SQL/API sobre perfiles, overrides, scopes y módulos delegables.

### Qué cambió vs plan original
- Las mutaciones de `stylists` y `locations` se pivotaron desde writes directos cliente→Supabase a APIs dedicadas server-side para eliminar noops y hacer el enforcement de scope más robusto.
- `POST /api/admin/schedule/location-hours` se amplió para aceptar también `locations.operations.edit` además de `schedule.location_hours.manage`, porque operativamente ese permiso también debe permitir editar horarios de centro.
- La estrategia de borrado se cerró dentro de este mismo pack, en vez de dejarla como mejora posterior, porque apareció como hallazgo real de robustez durante la QA.

### Pendientes
- No quedan pendientes funcionales abiertos dentro del alcance de este pack.
- Como mejora futura independiente, conviene abrir un pack específico para test hardening automático (unit/integration) del motor de permisos y scopes.

### Riesgos conocidos post-release
- No están cubiertas automáticamente todas las combinaciones posibles de permisos/scopes; la robustez actual se apoya en QA manual representativa + verificaciones SQL/API. Para cobertura combinatoria amplia harán falta tests automatizados.
- Persisten warnings no bloqueantes de `Browserslist` y `metadataBase`, pero no afectan al modelo de permisos ni a la funcionalidad validada.

