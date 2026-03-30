# QA checklist manual completo - admin permisos granulares v1

> Dernière exécution manuelle: 2026-03-30 (Playwright + vérifications SQL/API).
>
> Hallazgos abiertos de esta pasada:
> - Ningún hallazgo bloqueante abierto; queda solo la revisión final antes del cierre documental del pack.

## 0. Preparación
- [x] `npm run lint` en verde
- [x] `npm run build` en verde
- [x] servidor local levantado (`npm run dev`)
- [x] proyecto Supabase correcto: `tvdwepumtrrjpkvnitpw`
- [ ] cuentas QA disponibles:
  - [x] admin
  - [ ] staff_basic
  - [ ] reception
  - [x] center_manager
  - [ ] catalog_content
  - [ ] analyst
  - [x] staff custom con overrides
- [ ] datos base listos:
  - [x] al menos 2 centros
  - [x] al menos 2 stylists
  - [x] servicios con precio y duración
  - [x] galería con varias imágenes
  - [x] productos boutique + pedidos
  - [x] reservas en distintos estados

## 1. Verificación técnica / SQL
### Roles y migración
- [x] `user_roles` solo contiene `admin` y `staff`
- [x] no quedan filas `employee`
- [x] default de `user_roles.role` = `staff`

### Tablas nuevas
- [x] existe `permission_profiles`
- [x] existe `profile_permissions`
- [x] existe `user_profiles`
- [x] existe `user_permission_overrides`
- [x] existe `user_location_assignments`
- [x] existe `admin_audit_log`

### Seeds / integridad
- [x] perfil `staff_basic` sembrado
- [x] perfil `reception` sembrado
- [x] perfil `center_manager` sembrado
- [x] perfil `catalog_content` sembrado
- [x] perfil `analyst` sembrado
- [x] `user_profiles` con backfill correcto
- [x] `profile_permissions` con datos coherentes
- [x] `user_permission_overrides` sin duplicados inválidos
- [x] `user_location_assignments` sin duplicados inválidos

## 2. Resolver central de permisos
### Admin
- [x] `admin` tiene acceso total
- [x] `admin` ignora restricciones de scope

### Staff base
- [x] `staff` con perfil hereda permisos correctamente
- [x] `staff` sin perfil queda fail-closed
- [x] `staff` mal configurado muestra UX clara de bloqueo

### Overrides
- [x] override `allow` añade permiso no heredado
- [x] override `deny` bloquea permiso heredado
- [x] permisos efectivos muestran origen correcto

### Scope
- [x] scope `all` funciona
- [x] scope `none` bloquea acceso
- [x] scope `own_stylist` funciona
- [x] scope `assigned_location` funciona
- [x] scope `specific_locations` funciona

## 3. Layout / navegación / dashboard
### Admin
- [x] ve todos los módulos
- [x] dashboard completo renderiza correctamente
- [x] quick actions visibles/coherentes

### Staff
- [x] solo ve módulos permitidos en la navegación
- [x] no ve módulos no permitidos
- [x] acceso manual por URL a módulo prohibido redirige o bloquea correctamente
- [x] módulos `view-only` entran realmente en modo lectura

## 4. User management (solo admin)
### Lista
- [x] lista de usuarios carga
- [x] muestra rol global
- [x] muestra perfil base
- [x] muestra styliste asociado
- [x] muestra centros asignados

### Panel lateral
- [x] abre correctamente
- [x] cambio de rol global funciona
- [x] cambio de perfil base funciona
- [x] asociación de styliste funciona
- [x] asignación de centros funciona
- [x] scopes por módulo se guardan
- [x] overrides allow se guardan
- [x] overrides deny se guardan
- [x] permisos efectivos se recalculan
- [x] auditoría reciente se muestra

### Seguridad
- [x] staff no puede entrar a `/admin/user-management`
- [x] staff no puede llamar APIs de user-management

## 5. Reservas
### UI
- [x] `/admin/reservations` carga sin errores
- [x] filtros visibles y operativos
- [x] calendario visible
- [x] botón `+ Nouvelle Réservation` visible solo si corresponde

### Permisos
- [x] `reservations.view` permite ver calendario/listado
- [x] sin `reservations.view` queda bloqueado
- [x] `reservations.create` controla creación manual
- [x] `reservations.replan` controla reprogramación
- [x] `reservations.manage_pending` controla pendientes
- [x] `reservations.cancel` controla cancelación

### Scope
- [x] staff solo ve reservas dentro de su scope
- [x] intento de operar fuera de scope falla

## 6. CRM
### UI
- [x] `/admin/crm` carga sin errores
- [x] búsqueda funciona
- [x] detalle de cliente abre

### Permisos
- [x] `crm.customers.view` permite ver fichas
- [x] `crm.customers.edit` permite editar ficha
- [x] `crm.notes.view` permite ver notas
- [x] `crm.notes.create` permite crear notas
- [x] sin permisos suficientes la UI queda bloqueada correctamente

### Scope
- [x] acceso CRM respeta scope cuando aplique

## 7. Servicios
### Lectura
- [x] `/admin?section=services` carga sin errores
- [x] árbol grupos/subgrupos/servicios renderiza
- [x] badges/landing/visibilidad se muestran bien

### Permisos
- [x] `services.view` permite entrar
- [x] `services.content.edit` permite alta/edición de contenido
- [x] sin `services.content.edit` hay modo lecture seule real
- [x] `services.business.edit` controla precio/duración
- [x] sin `services.business.edit` no se puede tocar precio/duración
- [x] `services.delete` controla retirada segura (`active=false`)

### Casos borde
- [x] usuario con `view` pero sin `content.edit` no ve alta
- [x] usuario con `content.edit` pero sin `business.edit` no puede tocar precio/duración

## 8. Stylists
### Perfil
- [x] `/admin?section=stylists` carga sin errores
- [x] listado renderiza correctamente
- [x] edición abre correctamente
- [x] `stylists.profile.view` permite ver
- [x] `stylists.profile.edit` permite editar perfil
- [x] `stylists.profile.delete` controla borrado/desactivación

### Operativa
- [x] `stylists.operations.view` permite ver centros/servicios/operativa
- [x] `stylists.operations.edit` permite modificar servicios/centros/operativa

### Agenda
- [x] `schedule.working_hours.manage` controla horarios base
- [x] `schedule.time_off.manage` controla indisponibilidades
- [x] `schedule.location_closures.manage` controla cierres desde stylists

### Scope
- [x] staff solo ve stylists dentro de su scope
- [x] edición fuera de scope falla

## 9. Centres
### Perfil
- [x] `/admin?section=locations` carga sin errores
- [x] listado renderiza correctamente
- [x] edición abre correctamente
- [x] `locations.profile.view` permite ver
- [x] `locations.profile.edit` permite editar ficha
- [x] `locations.profile.delete` controla borrado/desactivación

### Operativa
- [x] `locations.operations.view` permite ver horarios/operativa
- [x] `locations.operations.edit` permite modificar horarios/operativa
- [x] `schedule.location_hours.manage` controla horarios del centro

### Scope
- [x] staff solo ve centros dentro de su scope
- [x] crear centro fuera de reglas permitidas falla
- [x] editar centro fuera de scope falla

### Copy / idioma
- [x] todos los textos del modal están en francés
- [x] no quedan restos ES/EN (`Eliminar franja horaria`, etc.)

## 10. Galería
### Lectura
- [x] `/admin?section=gallery` carga sin errores
- [x] cards/imágenes renderizan bien

### Permisos
- [x] `gallery.view` permite ver
- [x] `gallery.edit` permite alta/edición
- [x] sin `gallery.edit` no hay alta ni edición
- [x] `gallery.delete` controla borrado

## 11. Boutique
### Pedidos
- [x] `/admin/boutique` carga sin errores
- [x] `boutique.orders.view` permite ver pedidos
- [x] `boutique.orders.edit` permite cambiar estado/operar pedido

### Catálogo
- [x] `boutique.catalog.view` permite ver catálogo admin
- [x] `boutique.catalog.content.edit` permite editar contenido de producto
- [x] `boutique.catalog.business.edit` permite tocar precio/stock/activación
- [x] `boutique.catalog.delete` controla retirada segura (`activo=false`)

### Casos borde
- [x] usuario con acceso solo a pedidos no ve catálogo
- [x] usuario con catálogo sin `business.edit` no puede tocar precio/stock

## 12. Stats
### Stylist stats
- [x] `/admin/stylist-stats` carga sin errores
- [x] `stats.view` controla acceso
- [x] respeta scope `own_stylist`
- [x] respeta scope `assigned_location`
- [x] respeta scope `specific_locations`
- [x] no expone datos globales cuando no toca

### Location stats
- [x] `/admin/location-stats` carga sin errores
- [x] `stats.view` controla acceso
- [x] respeta scope `assigned_location`
- [x] respeta scope `specific_locations`
- [x] no expone centros fuera de scope

## 13. APIs / auth / seguridad
### Auth base
- [x] `/api/admin/access-context` sin token devuelve `401`
- [x] endpoints admin sin token devuelven `401`

### User management APIs
- [x] admin `GET /api/admin/users` -> `200`
- [x] staff `GET /api/admin/users` -> `403`
- [x] patch de usuario genera auditoría

### Schedule APIs
- [x] `working-hours` dentro de scope pasa auth
- [x] `working-hours` fuera de scope devuelve `403`
- [x] `location-hours` dentro de scope pasa auth
- [x] `location-hours` fuera de scope devuelve `403`

### Stylists / locations APIs dedicadas
- [x] `PATCH /api/admin/stylists/:id` dentro de scope -> OK
- [x] `PATCH /api/admin/stylists/:id` fuera de scope -> `403`
- [x] `PATCH /api/admin/locations/:id` dentro de scope -> OK
- [x] `PATCH /api/admin/locations/:id` fuera de scope -> `403`

### Boutique APIs
- [x] catálogo público sigue funcionando
- [x] staff sin permiso de catálogo recibe `403`
- [x] pedidos con permiso responden `200`

## 14. Auditoría
- [x] cambio de perfil genera entrada en `admin_audit_log`
- [x] cambio de override genera entrada en `admin_audit_log`
- [x] cambio de styliste asignado genera entrada
- [x] cambio de centros asignados genera entrada
- [x] cambios sensibles de servicios generan entrada
- [x] cambios sensibles de boutique generan entrada
- [x] cambios de horarios/cierres generan entrada
- [x] se registra actor, target, before, after, timestamp

## 15. Soft delete / acciones destructivas
- [x] revisar qué módulos usan borrado duro
- [x] confirmar que donde proceda se usa desactivación/retirada
- [x] validar que `delete` no rompe integridad histórica

## 16. QA por perfiles base
### Staff básico
- [x] dashboard según permiso
- [x] sin módulos extra visibles
- [x] fail-closed si configuración incompleta

### Reception
- [x] reservas según scope
- [x] CRM según permisos
- [x] sin configuración estructural no concedida

### Center manager
- [x] reservas OK
- [x] CRM OK
- [x] stylists/centres operativa según permisos
- [x] stats según scope

### Catalog content
- [x] servicios OK
- [x] galería OK
- [x] boutique catálogo OK
- [x] sin reservas/CRM/stats si no procede

### Analyst
- [x] stats view OK
- [x] lectura sin edición

## 17. Cierre
- [x] sin hallazgos bloqueantes
- [x] hallazgos menores documentados
- [x] `Docs/admin-permisos-granulares-v1/tests.md` actualizado
- [x] `Docs/admin-permisos-granulares-v1/status.md` actualizado
- [x] `Docs/admin-permisos-granulares-v1/checklist.md` actualizado
- [x] pack listo para cierre

## Notas de esta pasada
- `npm run build` ya vuelve a pasar si se ejecuta fuera de una sesión `next dev` concurrente sobre el mismo `.next`.
- El modal de centros ya quedó normalizado a FR-only (`Supprimer la plage horaire`, `Supprimer`).
- Los checks no marcados siguen pendientes o no verificados manualmente en esta ejecución.
- 2026-03-30 (segunda tanda Playwright sobre `http://192.168.1.68:3004`):
  - `qa.staff.center@example.com` se reconfiguró temporalmente por API admin para cubrir `staff_basic`, `reception`, `catalog_content`, `analyst` y luego se restauró.
  - `staff_basic`: dashboard y réservations OK; CRM/stats/services bloqueados con pantalla `Accès refusé`.
  - `reception`: réservations + CRM OK; services/stats bloqueados; boutique pedidos accesible.
  - `catalog_content`: services + galerie + boutique catálogo OK; réservations/CRM/stats bloqueados.
  - `analyst`: stats OK en lecture seule; réservations bloqueadas.
  - overrides: `allow crm.customers.view` sobre `catalog_content` habilita `/admin/crm`; `deny stats.view` sobre `analyst` bloquea `/admin/stylist-stats`.
  - `profileKey = null`: fail-closed con mensaje claro `Accès refusé`.
- 2026-03-30 (tercera tanda Playwright sobre `http://192.168.1.68:3004`):
  - `catalog_content`: en boutique catálogo se abrió `Modifier` y se comprobó que los campos de contenido (`nombre`, `orden`, `imagen_url`, `destacado`) siguen editables mientras `precio`, `precio original`, `stock` y `activo` quedan deshabilitados sin `boutique.catalog.business.edit`.
  - `catalog_content`: en galería aparecen `Ajouter nouvelle image`, `Modifier` y `Supprimer`; con `staff_basic` la misma sección cae en `Accès refusé`.
  - `center_manager`: se consolidan como válidos los checks ya probados en QA previa sobre réservations, CRM, operativa de stylists/centres y stats scope `assigned_location`.


## Notas de esta pasada (2026-03-30, cuarta tanda Playwright + SQL/API)
- Verificado por SQL en Supabase: `user_permission_overrides` y `user_location_assignments` sin grupos duplicados invalidos (`0`).
- Verificado con Playwright admin que `/admin/location-stats` expone los 4 centros en el selector (`Centre Geneve`, `Centre Lausanne`, `Centre Montreux`, `Centre Vevey`), confirmando que `admin` ignora restricciones de scope.
- Verificado por Playwright + guardado real en `/admin/user-management` sobre `empleado@test.com`:
  - cambio de perfil base a `Reception`,
  - cambio de styliste asociado a `Robert`,
  - asignacion de `Centre Geneve` + `Centre Lausanne`,
  - override `allow` sobre `stats.view` con scope `specific_locations`,
  - recalculo correcto de permisos efectivos (`override_allow`, `specific_locations`),
  - cambio posterior de rol global a `admin` con persistencia real,
  - guardado posterior de override `deny` sobre `reservations.view` con persistencia real (`override_deny`).
- Verificado con `qa.staff.center@example.com` reconfigurado temporalmente y restaurado despues:
  - `stats.view` con scope `own_stylist` en `/admin/stylist-stats`: solo aparece `Marie Lambert`, sin otros stylistes.
  - `stats.view` con scope `specific_locations` en `/admin/location-stats`: el selector solo ofrece `Centre Geneve` y `Centre Lausanne`.
  - `boutique.orders.edit`: `GET /api/boutique/pedidos` + `PUT /api/boutique/pedidos/:id` cambian y restauran el estado correctamente.
  - `boutique.catalog.view`: `/admin/boutique` muestra `Produits` y el catalogo admin sin `Accès refusé` bajo perfil `catalog_content`.
- Verificado por HTTP sin token en endpoints admin mutadores/lectura soportados:
  - `GET /api/admin/access-context` -> `401`
  - `GET /api/admin/users` -> `401`
  - `POST /api/admin/stylists` -> `401`
  - `POST /api/admin/locations` -> `401`
  - `POST /api/admin/schedule/working-hours` -> `401`
  - `POST /api/admin/schedule/location-hours` -> `401`

- 2026-03-30 (cinquième tanda Playwright + API/REST):
  - `scope none` queda ya validado como **bloqueo de datos con mensaje explícito** (no redirection) en `/admin/location-stats`.
  - dashboard admin validado con el set real de quick actions actual (`Nouvelle réservation`, `En attente (jour)`, `Calendrier semaine`, `CRM clients`, `Panel en attente`).
  - `staff_basic` validado sin módulos extra en quick actions; `/admin/reservations` bloquea por URL cuando falta `reservations.view`.
  - `reception` validado en réservations: botón `+ Nouvelle Réservation`, accès a `/admin/reservations/nueva`, `GET /api/admin/bookings/pending` = `200`, cancelación in-scope por REST sobre `bookings` = OK, cancelación out-of-scope = noop (`200 []`).
  - `center_manager` validado en `GET /api/admin/bookings/replan` = `200` con bookings `needs_replan` dentro del scope.
  - CRM validado por API con `reception`: search, GET/PUT profile, GET notes, POST note; `/admin/crm` queda bloqueado al volver a `catalog_content`.
  - Services validados por REST con `catalog_content`: edición de `descripcion` OK; edición de `precio/duration` denegada sin `services.business.edit`; con override `allow services.business.edit` la mutation pasa y luego se restaura.
  - Auditoría: sí aparecen entradas para `stylist_users` y `user_location_assignments`; **no se han encontrado entradas `user_profiles`**, así que el check de changement de profil sigue pendiente/abierto.
- 2026-03-30 (sixième tanda Playwright + API/REST):
  - `center_manager` con solo `Centre Lausanne`: `/admin/reservations` sigue mostrando en el filtro `Centre` las opciones `Tous les centres`, `Centre Geneve`, `Centre Vevey` y `Centre Montreux`; el scope visual de reservas sigue abierto.
  - CRM admin: `Détails client` abre correctamente, pero el subpanel editable puede seguir mostrando `Impossible de créer le profil client` según el cliente.
  - `center_manager`: en `/admin?section=stylists`, `Modifier` sobre `Marie Lambert` abre la operativa completa; `PATCH /api/admin/stylists/:id` sobre `Marie` actualiza `bio` y `serviceIds` con `200`.
  - `center_manager`: `DELETE /api/admin/stylists/:id` sin `stylists.profile.delete` devuelve `403 insufficient_permission`; el botón `Supprimer` queda deshabilitado en UI.
  - `center_manager`: `DELETE /api/admin/locations/:id` sin `locations.profile.delete` devuelve `403 insufficient_permission`; el botón `Supprimer` queda deshabilitado en UI.
  - `locations`: el modal muestra ficha + `Horaires du Centre`, confirmando `locations.operations.view`; `schedule.location_hours.manage` sigue validado por API con `200/403` in-scope/out-of-scope.
  - Revisión de código destructivo: `stylists`, `locations`, `services` y `boutique` siguen usando borrado duro real; la parte de soft-delete queda pendiente.
  - Auditoría: aparecen entradas `stylists` (`create/update/delete`) y `locations` (`update`), pero siguen vacías para `user_profiles`, `services`, `productos` y `schedule.*`.
- 2026-03-30 (septième tanda API/REST sobre agenda):
  - `center_manager` con `Centre Lausanne` + `Marie Lambert`: `POST /api/admin/schedule/time-off` -> `201` creando una indisponibilidad temporal válida.
  - `center_manager` con `Centre Lausanne`: `POST /api/admin/schedule/location-closures` -> `201` creando una fermeture temporal válida.
  - Limpieza posterior hecha por SQL service-role (`DELETE` sobre `time_off` y `location_closures`).
  - `admin_audit_log` sigue sin entradas `time_off` / `location_closures` después de estas mutaciones, así que el check de auditoría para horarios/cierres continúa abierto.
- 2026-03-30 (octava tanda correcciones de robustez + revalidación):
  - `DELETE /api/admin/stylists/:id` sobre `Marie Lambert` con `center_manager` + override `stylists.profile.delete` -> `200`, `stylists.active=false`, `admin_audit_log` registra `action=deactivate`; restaurado luego a `active=true`.
  - `DELETE /api/admin/locations/:id` sobre `Centre Lausanne` con override `locations.profile.delete` -> `200`, `locations.active=false`, `admin_audit_log` registra `action=deactivate`; restaurado luego.
  - `services.delete`: retirada validada por REST sobre `servicios.id=19` con `{"active": false}` y permiso `services.delete`; `200`, `admin_audit_log` registra `servicios:update` con `after.active=false`; restaurado después.
  - `boutique.catalog.delete`: `DELETE /api/boutique/productos/1` -> `200`, `productos.activo=false`, `admin_audit_log` registra `action=deactivate`; restaurado a `activo=true`.
  - La retirada segura ya no elimina Stripe, carritos, commandes, agenda ni asociaciones históricas; solo cambia el flag `active/activo`.
  - `/admin/reservations` ya filtra centros/stylistes y queries `bookings` con `reservations.view`; revalidado visualmente con `qa.staff.center@example.com` scoped a Lausanne, mostrando solo `Tous les centres` + `Centre Lausanne`.
  - CRM: `/api/admin/crm/customers/[id]/profile` resuelve ahora por `customer_key`, email y teléfono; 12 casos QA reprobados previamente devolvieron `200` sin reproducir `Impossible de créer le profil client`.
  - `stylists.profile.edit` multi-centre revalidado por API: `PATCH /api/admin/stylists/[id]` sobre `Lucas Martin` (`Genève + Lausanne`) devuelve `200` para `center_manager` scoped a Lausanne; el `bio` quedó restaurado inmediatamente después.
  - `audit_admin_change()` ya no rompe en tablas sin `user_id`; se revalidaron entradas reales en `admin_audit_log` para:
    - `user_profiles` (toggle controlado de perfil QA y restauración),
    - `servicios` (`PATCH` PostgREST sobre `servicios.id = 19`, cambio/restauración de `descripcion`),
    - `productos` (`PUT /api/boutique/productos/1`, cambio/restauración de `descripcion`, `source = boutique_productos_api`),
    - `time_off`, `location_closures`, `working_hours`, `location_hours` (entradas explícitas `source = admin_schedule_*`).
  - Hardening DB revalidado:
    - `ensure_service_write_permissions()` y `ensure_products_write_permissions()` ya aceptan `auth.role() = 'service_role'`, evitando falsos `Permissions insuffisantes...` en endpoints server-side.
  - Restauraciones QA confirmadas:
    - `qa.staff.center@example.com` volvió a `catalog_content` + `Centre Lausanne` + `Marie Lambert` + sin overrides.
    - filas temporales de `time_off` / `location_closures` eliminadas.


### Cierre de QA final (2026-03-30, décima tanda Playwright + SQL/API)
- `qa.staff.center@example.com` se reconfiguró temporalmente a `reception` con `Centre Lausanne` y sin overrides; en `http://127.0.0.1:3014/admin/reservations` el combobox `Centre` mostró únicamente `Tous les centres` + `Centre Lausanne`.
- `qa.staff.center@example.com` se reconfiguró temporalmente a `catalog_content` con overrides `locations.operations.view/edit`; en `http://127.0.0.1:3014/admin?section=locations` el panel `Modifier un Centre` dejó el bloque `Horaires du Centre` habilitado mientras la fiche perfil seguía en lecture seule.
- `POST /api/admin/schedule/location-hours` sobre `Centre Lausanne` devolvió `200` con `locations.operations.edit` sin requerir `schedule.location_hours.manage`; los horarios y la configuración QA del usuario quedaron restaurados al final.
- Estado final tras restauración: `qa.staff.center@example.com` vuelve a `catalog_content` + `Centre Lausanne` + sin overrides; `Centre Lausanne` mantiene su horario base restaurado.
