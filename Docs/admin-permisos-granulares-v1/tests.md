# Plan de tests

## Estrategia por fase

## Ejecución real hasta ahora
- Auditoría técnica cerrada sobre:
  - `employee` en frontend/backend/SQL/docs
  - `allowedRoles`
  - whitelist legacy `EMPLOYEE_ALLOWED_PREFIXES`
  - rutas admin delegables vs admin-only
- Implementado en repo:
  - `migrations/20260327_admin_permissions_v1.sql`
  - `src/lib/permissions/catalog.ts`
  - `src/lib/permissions/helpers.ts`
  - `src/lib/permissions/types.ts`
  - `src/lib/permissions/server.ts`
  - `src/lib/permissions/routing.ts`
  - `src/lib/permissions/adminUsers.ts`
  - `src/components/admin/AdminAccessProvider.tsx`
  - `src/components/ui/checkbox.tsx`
  - `src/app/api/admin/access-context/route.ts`
  - `src/app/api/admin/users/route.ts`
  - `src/app/api/admin/users/[id]/route.ts`
  - refactor de `src/app/admin/layout.tsx`, `src/components/AdminNav.tsx`, `src/app/admin/home/page.tsx`, `src/app/admin/page.tsx`, `src/app/admin/reservations/page.tsx`, `src/app/admin/user-management/page.tsx`, `src/app/admin/boutique/page.tsx`, `src/app/admin/location-stats/page.tsx`, `src/app/admin/stylist-stats/page.tsx`
  - enforcement inicial en APIs de reservas, CRM, schedule admin y boutique
  - endurecimiento UI de configuración directa (`services`, `stylists`, `locations`, `gallery`) con modo lecture seule / acciones condicionadas
- Validación técnica ejecutada:
  - verificación SQL real en Supabase ✅
  - `npm run lint` ✅
  - `npm run build` ✅ (2026-03-30, ejecutado sin `next dev` concurrente sobre el mismo `.next`)
- smoke HTTP local (`npm run dev` en :3002) ✅
  - `GET /api/admin/access-context` sin token -> `401 missing_token`
  - `POST /api/admin/schedule/working-hours` sin token -> `401 missing_token`
  - `POST /api/admin/schedule/location-hours` sin token -> `401 missing_token`
  - `GET /api/boutique/productos` público -> `200` con catálogo activo
- smoke auth/API con cuentas QA reales (`qa.admin.permissions@example.com`, `qa.staff.center@example.com`) ✅
  - login Supabase password grant admin/staff OK
  - `GET /api/admin/access-context` -> `200` admin y `200` staff
  - `GET /api/admin/users` -> `200` admin, `403 insufficient_role` staff
  - `PATCH /api/admin/users/[staffId]` -> `200` admin al añadir/quitar override (`services.business.edit`)
  - `admin_audit_log` registra cambios sobre `user_permission_overrides` tras el PATCH
  - `POST /api/admin/schedule/location-hours` staff con centro asignado -> `400 invalid_day_schedules` (auth+scope pasan)
  - `POST /api/admin/schedule/location-hours` staff con centro no asignado -> `403 insufficient_scope`
  - `POST /api/admin/schedule/working-hours` staff con centro asignado + stylist fake -> `404 stylist_not_found` (auth+scope pasan)
  - `POST /api/admin/schedule/working-hours` staff con centro no asignado -> `403 insufficient_scope`
  - `GET /api/boutique/pedidos` staff center_manager -> `200`
  - `GET /api/boutique/productos` staff sin `boutique.catalog.view` -> `403 insufficient_permission`
  - insercion directa `servicios` con staff sin permiso -> error `Permissions insuffisantes pour creer un service`
  - insercion directa `imagenes_galeria` con staff permitido -> OK; intento de delete sin `gallery.delete` no borra la fila (RLS noop), limpieza posterior con service role
  - nuevo QA de APIs dedicadas `stylists` / `locations` tras el pivot:
    - `PATCH /api/admin/locations/:id` staff sobre centro asignado -> `200`
    - `PATCH /api/admin/locations/:id` staff sobre centro no asignado -> `403 insufficient_scope`
    - `PATCH /api/admin/stylists/:id` staff sobre styliste asignado -> `200`
    - `PATCH /api/admin/stylists/:id` staff sobre styliste no asignado -> `403 insufficient_permission`
    - `POST /api/admin/stylists` staff con centro asignado -> `200`, luego limpieza con `admin DELETE`
    - `POST /api/admin/locations` staff `center_manager` -> `403 insufficient_scope`
- Verificación SQL real (2026-03-27):
  - `user_roles`: `admin=2`, `staff=2`, sin filas `employee` ✅
  - `user_roles.role` default = `'staff'::character varying`, `NOT NULL` ✅
  - tablas nuevas presentes: `permission_profiles`, `profile_permissions`, `user_profiles`, `user_permission_overrides`, `user_location_assignments`, `admin_audit_log` ✅
  - perfiles base sembrados: `staff_basic`, `reception`, `center_manager`, `catalog_content`, `analyst` ✅
  - `user_profiles` con backfill real: `2` filas ✅
  - policies nuevas visibles sobre tablas de permisos/auditoría ✅

## Pendiente antes de dar fases por cerradas
- [x] corregir el scope visual de `/admin/reservations` (el filtro `Centre` ya no muestra centros fuera del scope de `center_manager`)
- [x] corregir el subpanel editable de CRM que podía mostrar `Impossible de créer le profil client`
- [x] resolver el caso multi-centre de `stylists.profile.edit` cuando el primer `location_ids[0]` cae fuera del scope pero otro centro sí está permitido
- [x] añadir auditoría faltante para `user_profiles`, `services`, `boutique` y `schedule.*`
- [x] decidir/implementar estrategia de soft-delete para `stylists`, `locations`, `services` y `boutique`

### Orden de corrección acordado antes de seguir
1. scope visual de reservas ✅
2. subpanel editable de CRM ✅
3. bug multi-centre en stylists ✅
4. auditoría restante ✅
5. soft-delete / borrado seguro ✅

### Fase 1
- Revisar inventario completo de checks actuales por rol.
- Confirmar que el catálogo de permisos cubre todos los módulos delegables acordados.
- Confirmar que no quedan decisiones estructurales relevantes abiertas.

### Fase 2
- Verificar la migración `employee -> staff`.
- Verificar nuevas tablas, índices, seeds y backfill.
- Confirmar integridad de perfiles y asignaciones.

### Fase 3
- Probar el resolver central con combinaciones de:
  - admin,
  - staff con perfil,
  - staff con allow,
  - staff con deny,
  - staff sin configuración,
  - scopes distintos.

### Fase 4
- Probar layout/nav/dashboard por perfiles y scopes.
- Verificar modo solo lectura real.
- Verificar fail-closed con UX comprensible.

### Fase 5
- Probar panel lateral de usuarios.
- Verificar cambios de perfil, styliste, centros, scopes y overrides.
- Verificar resumen de permisos efectivos.
- Verificar creación de auditoría.

### Fase 6
- Probar endpoints por permiso y scope.
- Verificar accesos denegados.
- Verificar respuestas filtradas por scope.

### Fase 7
- Ejecutar lint.
- Ejecutar build.
- Ejecutar smoke tests completos por perfiles base.
- Ejecutar smoke tests de overrides.
- Ejecutar smoke tests de scopes.
- Verificar auditoría de cambios sensibles.

## Casos borde
- Usuario `staff` sin perfil asignado.
- Usuario `staff` con perfil pero sin styliste cuando el scope requiere `own_stylist`.
- Usuario `staff` con perfil pero sin centros cuando el scope requiere `assigned_location` o `specific_locations`.
- Usuario con override `deny` sobre permiso concedido por perfil.
- Usuario con override `allow` sobre permiso no concedido por perfil.
- Usuario con acceso `view` sin permisos de edición.
- Usuario con stats scope `specific_locations` intentando acceder a datos globales.
- Usuario con permisos de servicios pero sin `services.business.edit` intentando tocar precio/duración.
- Usuario con permisos de boutique catálogo pero sin `boutique.catalog.business.edit` intentando tocar precio/stock.
- Usuario con `stylists.profile.edit` pero sin `stylists.operations.edit`.
- Usuario con `locations.profile.edit` pero sin `locations.operations.edit`.
- Usuario `admin` tras migración mantiene acceso total.

## Datos de prueba sugeridos

### Usuarios
- Admin A
- Staff Básico A
- Recepción A
- Responsable de Centro A
- Catálogo/Contenido A
- Analista A
- Staff custom con overrides

### Scopes
- Usuario con `own_stylist`
- Usuario con `assigned_location`
- Usuario con `specific_locations` (2 centros)
- Usuario con `all`
- Usuario con `none`

### Módulos
- Servicios con edición separada de negocio (`precio`, `duration`).
- Boutique catálogo con edición separada de negocio (`precio`, `stock`, activación).
- Stats con acceso restringido por centro/styliste.

## Comandos previstos
- `npm run lint`
- `npm run build`
- `npm run dev`
- consultas SQL de verificación sobre roles, perfiles, overrides y auditoría
- smoke tests manuales en:
  - `/admin/home`
  - `/admin/user-management`
  - `/admin/reservations`
  - `/admin/crm`
  - `/admin?section=services`
  - `/admin?section=stylists`
  - `/admin?section=locations`
  - `/admin?section=gallery`
  - `/admin/boutique`
  - stats

## Verificaciones SQL sugeridas
- Conteo de `user_roles` por rol (`admin`, `staff`).
- Ausencia de `employee` tras migración.
- Integridad de `user_profiles`.
- Integridad de `profile_permissions`.
- Integridad de `user_permission_overrides`.
- Integridad de `user_location_assignments`.
- Trazas recientes en `admin_audit_log`.

## Criterio para avanzar de fase
- Fase 1 -> Fase 2:
  - contrato completamente cerrado.
- Fase 2 -> Fase 3:
  - BD lista y migración verificada.
- Fase 3 -> Fase 4:
  - capa central estable y fail-closed verificado.
- Fase 4 -> Fase 5:
  - layout/nav/dashboard ya no dependen de checks legacy.
- Fase 5 -> Fase 6:
  - user-management operativo para configurar usuarios reales.
- Fase 6 -> Fase 7:
  - enforcement backend por permiso/scope validado.
- Cierre final:
  - lint y build verdes,
  - QA por perfiles/scopes pasada,
  - auditoría activa,
  - sin decisiones estructurales abiertas.

## Matriz mínima de QA manual

### Perfil: Staff básico
- puede entrar a dashboard si tiene `dashboard.view`
- no ve módulos no autorizados
- queda bloqueado si no tiene configuración válida

### Perfil: Recepción
- puede ver/gestionar reservas según scope
- puede usar CRM según permisos
- no puede tocar configuración estructural no concedida

### Perfil: Responsable de centro
- puede operar reservas/CRM
- puede operar stylists/centros según permisos otorgados
- stats filtradas por scope configurado

### Perfil: Catálogo / contenido
- puede operar servicios/galería/boutique catálogo según permisos
- no puede tocar reservas/CRM/stats si no se conceden
- no puede tocar precio/duración o precio/stock si no tiene permisos business

### Perfil: Analista
- puede ver stats según scope
- puede tener acceso lectura en módulos concretos
- no puede editar

## Evidencias esperadas
- diff de migración SQL,
- evidencia de migración `employee -> staff`,
- evidencia de perfiles base sembrados,
- evidencia de panel lateral funcional,
- evidencia de permisos efectivos correctos,
- evidencia de accesos denegados correctos,
- evidencia de filtrado por scope,
- evidencia de auditoría,
- `npm run lint` verde,
- `npm run build` verde.

## QA manual Playwright ejecutada (2026-03-27, `http://127.0.0.1:3002`)

### Cuenta admin (`qa.admin.permissions@example.com`)
- `/admin/home` renderiza dashboard completo y accesos rápidos.
- `/admin/user-management` renderiza lista, panel lateral, perfil base, styliste asociado, centros, overrides, permisos efectivos y auditoría reciente.
- `/admin?section=stylists` permite abrir edición completa con perfil, servicios, horarios, indisponibilidades y cierres.
- `/admin?section=locations` permite abrir edición completa del centro con ficha y horarios.
- `/admin?section=gallery` permite alta/edición visual; formulario de nueva imagen abre correctamente.
- `/admin/boutique` muestra catálogo + pedidos con acciones completas.
- `/admin/location-stats`, `/admin/reservations`, `/admin/crm` renderizan correctamente sin errores bloqueantes.

### Cuenta staff (`qa.staff.center@example.com`)
- Navegación lateral reducida correctamente a módulos permitidos; `user-management` y hero no aparecen.
- Acceso manual a `/admin/user-management` redirige a `/admin/home`.
- `/admin?section=services` entra en modo lecture seule real: banner visible, sin alta y con acciones deshabilitadas.
- `/admin?section=gallery` permite alta/edición por override `gallery.edit`; los botones de borrado siguen deshabilitados sin `gallery.delete`.
- `/admin?section=stylists` muestra únicamente stylists dentro del scope del centro asignado y permite edición operativa.
- `/admin?section=locations` muestra solo el centro asignado; no aparece botón de alta y la edición del centro abre correctamente.
- Revalidación final (`reception` scoped a Lausanne en `http://127.0.0.1:3014/admin/reservations`): el filtro `Centre` muestra solo `Tous les centres` + `Centre Lausanne`, sin centros fuera de scope.
- Revalidación final `locations.operations.edit` (`catalog_content` + overrides `locations.operations.view/edit`): el panel de centre habilita la sección `Horaires du Centre`; `POST /api/admin/schedule/location-hours` devuelve `200` sin requerir `schedule.location_hours.manage`.
- `/admin/boutique` queda limitado a `Commandes`; no aparece catálogo/product creation.
- `/admin/stylist-stats` y `/admin/location-stats` renderizan datos dentro del scope permitido.
- `/admin/reservations` y `/admin/crm` renderizan correctamente para staff.

### Hallazgos
- Sin errores bloqueantes de funcionalidad ni de autorización en la QA visual.
- Hallazgo menor ya corregido después de esta pasada: el modal de centros estaba mezclando `Eliminar franja horaria` / `Eliminar`; se normalizó a `Supprimer la plage horaire` / `Supprimer`.

## Ajustes posteriores a la QA Playwright (2026-03-30, segunda pasada)
- `src/app/admin/location-management.tsx`: copy FR-only en los botones de borrado de franjas del modal centros.
- `src/app/admin/user-management/page.tsx`: los overrides por permiso ahora muestran claramente qué heredaría el perfil base (`Hérité du profil : autorisé/refusé` y scope heredado) para facilitar la lectura al cambiar el perfil base.
- Revalidación visual con Playwright:
  - modal centros muestra `Supprimer la plage horaire` / `Supprimer` ✅
  - panel d'accès utilisateur muestra hints heredados por permiso (`Hérité du profil ...`) ✅
- `npm run build` relanzado con `next dev` detenido -> ✅
- Warnings no bloqueantes observados en consola/build: `metadataBase` ausente y avisos `next/image`.

## Correcciones de robustez posteriores (2026-03-30, tercera pasada)
- `/admin/reservations`:
  - `src/app/admin/reservations/page.tsx` ya aplica `reservations.view` scope a:
    - filtros de centros/stylists,
    - consultas `bookings` de mes/semana/día,
    - saneado de selección fuera de scope.
  - Revalidación visual: `qa.staff.center@example.com` scoped a Lausanne ya no ve Genève/Vevey/Montreux en el combobox de centros.
- CRM:
  - `src/lib/crmProfiles.ts` añade resolución por `customer_key`, email y teléfono.
  - `/api/admin/crm/customers/[id]/profile` usa ya esa resolución ampliada tanto en GET como en recuperación tras conflicto.
  - Revalidación API: 12 casos QA devolvieron `200`, sin `Impossible de créer le profil client`.
- Stylists multi-centre:
  - `/api/admin/stylists/[id]` acepta editar perfil si cualquier `location_id` del styliste cae dentro del scope permitido.
  - Revalidación API: `PATCH` sobre `Lucas Martin` (Genève + Lausanne) con `center_manager` scoped a Lausanne devuelve `200`.
- Hardening SQL:
  - `ensure_service_write_permissions()` y `ensure_products_write_permissions()` ya aceptan `auth.role() = 'service_role'`.
  - Esto evita falsos `Permissions insuffisantes...` en endpoints server-side `boutique` / futuros endpoints `services`.
- Auditoría:
  - `audit_admin_change()` ya resuelve `id` / `user_id` dinámicamente vía `to_jsonb(old/new)`; deja de romper silenciosamente en tablas sin columna `user_id`.
  - Revalidaciones reales:
    - `productos`: `PUT /api/boutique/productos/1` con `catalog_content` -> `200`, con dos entradas `admin_audit_log` (`source = boutique_productos_api`) al cambiar/restaurar descripción.
    - `servicios`: `PATCH` directo PostgREST sobre `servicios.id = 19` -> entradas `admin_audit_log` con `actor_user_id = qa.staff.center`.
    - `time_off`: `POST /api/admin/schedule/time-off` -> entrada explícita `source = admin_schedule_time_off_api`.
    - `location_closures`: `POST /api/admin/schedule/location-closures` -> entrada explícita `source = admin_schedule_location_closures_api`.
    - `location_hours`: `POST /api/admin/schedule/location-hours` -> entrada explícita `source = admin_schedule_location_hours_api`.
    - `working_hours`: `POST /api/admin/schedule/working-hours` con payload válido -> entrada explícita `source = admin_schedule_working_hours_api`.
    - `user_profiles`: trigger revalidado con cambio/restauración controlado en SQL sobre usuario QA; se generan entradas `entity_type = user_profiles`.
- Restauraciones QA ejecutadas tras las pruebas:
  - `Lucas Martin` volvió a su bio original.
  - `qa.staff.center@example.com` quedó otra vez como `catalog_content` + `Centre Lausanne` + `Marie Lambert` + sin overrides.
  - se eliminaron las filas QA temporales de `time_off` y `location_closures`.


## QA manual Playwright ejecutada (2026-03-30, `http://localhost:3002`)

### Verificado y marcado en `qa-checklist.md`
- `user-management` admin: lista, panel lateral, permisos efectivos, auditoría reciente y nueva ayuda visual de herencia por perfil (`Hérité du profil ...`).
- `services` staff: modo lecture seule real, sin alta ni edición.
- `reservations` staff: filtros, calendario y CTA de nueva reserva visibles según permisos.
- `crm` staff: listado y búsqueda visibles.
- `stylists` staff: listado limitado al scope visible; pantalla carga correctamente.
- `locations` staff/admin: solo centro asignado visible para staff y modal admin ya normalizado a FR-only (`Supprimer la plage horaire`, `Supprimer`).
- `boutique` staff: solo tab `Commandes`, sin catálogo admin.
- `stylist-stats` / `location-stats` staff: render correcto y datos acotados al scope asignado.
- SQL/API revalidadas: roles `admin/staff`, tablas de permisos, `GET /api/admin/users` admin=200/staff=403, `GET /api/admin/access-context` sin token=401, boutique pública=200, pedidos staff=200.
- `npm run build` relanzado con `next dev` detenido: verde.

### Hallazgos abiertos de esta pasada
- No quedan bloqueos técnicos abiertos de build/copy.
- La cobertura por perfiles base ya incluye `staff_basic`, `reception`, `catalog_content` y `analyst`; quedan pendientes solo checks funcionales finos y/o cuentas dedicadas si se quiere separar cada perfil en un login distinto.
- Siguen pendientes varios checks funcionales finos del `qa-checklist.md` (overrides concretos, scopes `none/specific_locations`, edición CRM/servicios/boutique business, etc.).

## QA por perfiles base (2026-03-30, segunda tanda Playwright en `http://192.168.1.68:3004`)
- Preparación: se reutilizó `qa.staff.center@example.com` y se reconfiguró temporalmente por API admin (`/api/admin/users/:id`) para recorrer los perfiles `staff_basic`, `reception`, `catalog_content` y `analyst`; al final se restauró su configuración original (`center_manager` + overrides previos).
- `staff_basic`:
  - `/admin/home` OK (dashboard accesible)
  - `/admin/reservations` OK
  - `/admin/crm`, `/admin/stylist-stats` y `/admin?section=services` -> `Accès refusé`
- `reception`:
  - `/admin/reservations` OK
  - `/admin/crm` OK
  - `/admin/boutique` carga pedidos (`Commandes`)
  - `/admin?section=services` y `/admin/location-stats` -> `Accès refusé`
- `catalog_content`:
  - `/admin?section=services` OK
  - `/admin?section=gallery` OK
  - `/admin/boutique` OK en tab catálogo (`Produits`)
  - `/admin/reservations`, `/admin/crm` y `/admin/location-stats` -> `Accès refusé`
- `analyst`:
  - `/admin/stylist-stats` y `/admin/location-stats` OK
  - `/admin/reservations` -> `Accès refusé`
  - las pantallas de stats siguen siendo lecture seule (sin acciones de edición)
- Overrides verificados:
  - `allow crm.customers.view` sobre `catalog_content` habilita `/admin/crm`
  - `deny stats.view` sobre `analyst` bloquea `/admin/stylist-stats` y devuelve al dashboard
- Fail-closed verificado:
  - `profileKey = null` deja `/admin/home` en `Accès refusé` y `/admin/reservations` redirige a `/admin/home` mostrando el mismo bloqueo
- Observación útil:
  - negar solo `crm.customers.view` no oculta por sí solo `/admin/crm` si el perfil sigue heredando otros permisos CRM (`edit/notes`); el bloqueo fuerte probado en esta tanda se validó con `stats.view`.

## QA de permisos business y galería (2026-03-30, tercera tanda Playwright)
- `catalog_content` en `/admin/boutique`:
  - se abre el modal `Modifier` del producto
  - campos de contenido editables: `nombre`, `orden`, `imagen_url`, `destacado`
  - campos business deshabilitados sin `boutique.catalog.business.edit`: `precio`, `precio original`, `stock`, `activo`
- `catalog_content` en `/admin?section=gallery`:
  - botones visibles: `Ajouter nouvelle image`, `Modifier`, `Supprimer`
  - confirma `gallery.edit` + `gallery.delete`
- `staff_basic` en `/admin?section=gallery`:
  - cae en `Accès refusé`, sin acciones de alta/edición
- `center_manager`:
  - se da por consolidada la validación ya ejecutada en tandas anteriores sobre réservations, CRM, operativa stylists/centres y stats con scope `assigned_location`.


## QA de scopes, user-management y boutique (2026-03-30, cuarta tanda Playwright + SQL/API)
- SQL Supabase: sin duplicados invalidos en `user_permission_overrides` ni `user_location_assignments` (`0` grupos duplicados en ambos casos).
- Playwright admin en `/admin/location-stats`: el selector de centros muestra los 4 centros (`Centre Geneve`, `Centre Lausanne`, `Centre Montreux`, `Centre Vevey`), validando que `admin` no queda limitado por scopes.
- Playwright admin en `/admin/user-management` sobre `empleado@test.com` (restaurado al final):
  - guardado real de `profileKey = reception`,
  - cambio de styliste asociado a `Robert`,
  - asignacion de `Centre Geneve` + `Centre Lausanne`,
  - override `allow` de `stats.view` con `scopeMode = specific_locations`,
  - `effectiveAccess.permissions["stats.view"] => allowed=true, scope=specific_locations, source=override_allow`,
  - cambio adicional de `role = admin` persistido y comprobado por API,
  - guardado real de override `deny` sobre `reservations.view` con `source = override_deny`.
- Playwright staff (`qa.staff.center@example.com`, restaurado despues):
  - `/admin/stylist-stats` con `stats.view` forzado a `own_stylist` muestra solo `Marie Lambert` y no expone `Lucas Martin` ni `Jean Dupont`.
  - `/admin/location-stats` con `stats.view` forzado a `specific_locations` muestra en el selector solo `Centre Geneve` y `Centre Lausanne`.
- Boutique:
  - perfil `reception`: `GET /api/boutique/pedidos` + `PUT /api/boutique/pedidos/:id` permiten editar y restaurar el estado de un pedido (`200/200/200`).
  - perfil `catalog_content`: `/admin/boutique` muestra la pestaña/area `Produits` y el catalogo admin completo.
- Auth sin token:
  - `GET /api/admin/access-context`, `GET /api/admin/users`, `POST /api/admin/stylists`, `POST /api/admin/locations`, `POST /api/admin/schedule/working-hours`, `POST /api/admin/schedule/location-hours` devuelven `401`.


## QA adicional reservations / CRM / services / dashboard (2026-03-30, cinquième tanda Playwright + API/REST)
- Dashboard admin: render OK y quick actions coherentes con el set real actual (`Nouvelle réservation`, `En attente (jour)`, `Calendrier semaine`, `CRM clients`, `Panel en attente`).
- `staff_basic`: quick actions sin módulos extra; acceso manual a `/admin/reservations` redirige/bloquea correctamente cuando falta `reservations.view`.
- `scope none`: validado en `/admin/location-stats` como bloqueo de datos con mensaje explícito `Votre compte n'a pas accès aux statistiques de centres.`.
- Réservations:
  - `reception` -> `+ Nouvelle Réservation` visible y `/admin/reservations/nueva` accesible.
  - `GET /api/admin/bookings/pending` -> `200`.

## QA adicional stylists / locations / deletes / audit (2026-03-30, sixième tanda Playwright + API/REST)
- Réservations (`center_manager` con solo `Centre Lausanne`):
  - `/admin/reservations` sigue mostrando `Tous les centres`, `Centre Geneve`, `Centre Vevey` y `Centre Montreux` en el filtro `Centre`; queda como hallazgo abierto de scope visual.
- CRM admin:
  - `Détails client` abre correctamente en `/admin/crm`.
  - Hallazgo abierto: el subpanel editable puede seguir mostrando `Impossible de créer le profil client` según el cliente.
- Stylists (`center_manager`):
  - `/admin?section=stylists` muestra `Lucas Martin` y `Marie Lambert`; `Supprimer` sigue deshabilitado en UI sin `stylists.profile.delete`.
  - `PATCH /api/admin/stylists/:id` sobre `Marie Lambert` -> `200` tanto para actualización de `bio` como para cambio temporal de `serviceIds`, restaurado después.
  - `DELETE /api/admin/stylists/:id` sin permiso -> `403 insufficient_permission`.
  - `DELETE /api/admin/stylists/:id` como admin sobre un styliste temporal creado por API -> `200`; `admin_audit_log` registra `stylists:create/delete`.
  - Hallazgo abierto: `stylists.profile.edit` sobre stylists multi-centre no es robusto (`Lucas Martin`, `Geneve` + `Lausanne`, puede devolver `403` si `location_ids[0]` cae fuera de scope).
- Locations (`center_manager`):
  - `/admin?section=locations` muestra solo `Centre Lausanne`; `Supprimer` deshabilitado en UI.
  - El modal `Modifier un Centre` expone ficha + `Horaires du Centre`, confirmando visibilidad operativa.
  - `DELETE /api/admin/locations/:id` sin permiso -> `403 insufficient_permission`.
  - `admin_audit_log` sí contiene entradas `locations:update`, pero todavía no se ha validado un `locations:delete` exitoso (la creación temporal admin de centro sigue fallando con `500 location_create_failed`).
- Services / boutique:
  - `catalog_content`: en `/admin?section=services` no aparecen acciones `Supprimer ...` en snapshot Playwright, confirmando control UI del borrado sin `services.delete`.
  - `catalog_content`: en `/admin/boutique` no aparecen acciones `Supprimer` / `Désactiver` en snapshot Playwright, coherente con la ausencia de `boutique.catalog.delete`.
  - Hallazgo abierto: no se consiguió crear fixtures temporales de `productos`/`servicios` desde esta tanda para probar delete positivo admin; además `admin_audit_log` sigue vacío para `productos` y `services`.
- Auditoría:
  - `admin_audit_log` actual contiene `stylists:create/update/delete` y `locations:update`.
  - Sigue sin evidencia para `user_profiles`, `services`/`servicios`, `productos`, `working_hours`, `location_hours`, `time_off` y `location_closures`.
- Soft-delete:
  - En esta tanda todavía era hard delete; quedó como gap antes de la corrección final.

## QA adicional agenda (2026-03-30, septième tanda API/REST)
- `center_manager` con `Centre Lausanne` + `Marie Lambert`:
  - `POST /api/admin/schedule/time-off` -> `201` creando una indisponibilidad temporal válida.
  - `POST /api/admin/schedule/location-closures` -> `201` creando una fermeture temporal válida.
- Limpieza posterior:
  - borrado de las filas QA en `time_off` y `location_closures` mediante SQL service-role.
- Auditoría:
  - `admin_audit_log` sigue sin entradas `time_off` / `location_closures` tras estas mutaciones, confirmando el gap de trazabilidad en `schedule.*`.
  - cancelación in-scope por REST (`bookings`) -> OK y restaurada.
  - cancelación out-of-scope -> noop (`200 []`).
  - `center_manager` -> `GET /api/admin/bookings/replan` devuelve `200` con bookings `needs_replan` dentro de scope.
- CRM con `reception`:
  - `GET /api/admin/crm/customers/search` -> `200`.
  - `GET /api/admin/crm/customers/[id]/profile` -> `200`.
  - `PUT /api/admin/crm/customers/[id]/profile` -> `200` y restauración OK.
  - `GET /api/admin/crm/customers/[id]/notes` -> `200`.
  - `POST /api/admin/crm/customers/[id]/notes` -> `201`.
  - al restaurar `catalog_content`, `/admin/crm` vuelve a quedar bloqueado.
- Services con `catalog_content`:
  - PATCH REST de `descripcion` -> OK y restaurado.
  - PATCH REST de `precio/duration` sin `services.business.edit` -> error `P0001 Permissions insuffisantes...`.
  - con override `allow services.business.edit`, PATCH REST de `precio/duration` -> OK y restaurado.
- Auditoría:
  - se observan entradas automáticas para `stylist_users`, `user_location_assignments` y `user_permission_overrides`.
  - sigue sin evidencia de entradas `user_profiles` para cambio de perfil base.

## QA soft-delete / retirada segura (2026-03-30, neuvième tanda API/REST + SQL)
- Implementación aplicada:
  - `DELETE /api/admin/stylists/:id` desactiva `stylists.active=false`.
  - `DELETE /api/admin/locations/:id` desactiva `locations.active=false`.
  - `services.delete` retira servicios mediante `servicios.active=false`.
  - `DELETE /api/boutique/productos/:id` retira productos vía `productos.activo=false`.
  - `ensure_service_write_permissions()` permite el paso `active=true -> false` con permiso `services.delete`.
- Validación real:
  - `DELETE /api/admin/stylists/9b427f19-fbe3-4f8e-8197-13bddbd42a20` como `qa.staff.center@example.com` (perfil temporal `center_manager` + override `stylists.profile.delete`) -> `200`; SQL confirma `active=false`; `admin_audit_log` registra `stylists:deactivate`; restaurado a `active=true`.
  - `DELETE /api/admin/locations/4b4398c0-8b35-4774-8d3b-12e8992802cd` con override `locations.profile.delete` -> `200`; SQL confirma `active=false`; `admin_audit_log` registra `locations:deactivate`; restaurado a `active=true`.
  - PATCH REST sobre `servicios.id=19` con `{\"active\": false}` y permiso `services.delete` -> `200`; SQL confirma `active=false`; `admin_audit_log` registra `servicios:update` con `after.active=false`; restaurado con service role a `active=true`.
  - `DELETE /api/boutique/productos/1` con override `boutique.catalog.delete` -> `200`; SQL confirma `activo=false`; `admin_audit_log` registra `productos:deactivate`; restaurado a `activo=true`.
- Integridad histórica:
  - no se eliminaron relaciones de agenda, asignaciones, Stripe product ni referencias históricas de carrito/commande;
  - solo cambia el flag `active/activo`.
- Restauración final:
  - `qa.staff.center@example.com` vuelve a `catalog_content` sin overrides;
  - `Marie Lambert`, `Centre Lausanne`, `Coupe Homme` y `Gel pour Cheveux Premium` quedaron otra vez activos.
