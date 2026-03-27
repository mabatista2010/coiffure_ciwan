# Plan de tests

## Estrategia por fase

### Fase 1 - Modelo de datos y migración
- Verificar creación correcta de tablas nuevas.
- Verificar extensión de `public.servicios`.
- Verificar backfill de slugs, orden y migración inicial.
- Confirmar que reservas existentes siguen operando por `service_id`.

### Fase 2 - Contratos jerárquicos
- Validar composición del árbol para grupos/subgrupos/servicios.
- Validar contadores visibles efectivos.
- Validar herencia de visibilidad.
- Validar lookup por slug de servicio.

### Fase 3 - Reserva pública
- Verificar navegación Grupo → Subgrupo → Servicio.
- Verificar grupo en modo servicios directos.
- Verificar omisión de subgrupo cuando aplique.
- Verificar fallback de URL inválida.
- Verificar progreso dinámico.

### Fase 4 - Admin servicios
- Verificar creación/edición de grupo, subgrupo y servicio.
- Verificar restricciones del modo exclusivo del grupo.
- Verificar mover, ordenar y ocultar.
- Verificar búsqueda global y side panel.

### Fase 5 - Landing destacados
- Verificar selección manual de destacados.
- Verificar límite máximo 6.
- Verificar orden landing.
- Verificar click directo a reserva preseleccionada.

### Fase 6 - Estilistas y MCP/API
- Verificar selector jerárquico de servicios en estilistas.
- Verificar `list_services` jerárquico.
- Verificar visibilidad efectiva y contadores devueltos.

### Fase 7 - QA final
- Ejecutar lint y build.
- Ejecutar smoke tests end-to-end de reserva, admin, landing y estilistas.
- Confirmar documentación final alineada.

## Casos borde
- Grupo visible sin contenido visible efectivo.
- Grupo con un solo subgrupo visible y flag de omitir paso activado.
- Grupo con más de un subgrupo visible y flag de omitir activado: debe ignorarse el salto.
- Grupo en modo servicios que intenta recibir un subgrupo.
- Grupo en modo subgrupos que intenta recibir un servicio directo.
- Servicio oculto bajo grupo visible.
- Servicio visible bajo grupo oculto.
- Subgrupo oculto con servicios visibles configurados.
- Servicio con slug cambiado manualmente y luego cambio de nombre.
- Colisión de slug automático (`slug`, `slug-2`, `slug-3`).
- Intento de slug manual duplicado.
- Intento de nombre duplicado entre hermanos.
- Servicio destacado en landing pero luego oculto.
- Servicio destacado en landing pero ya no reservable.
- Intento de marcar séptimo destacado.
- URL `/reservation?service=<slug>` válida.
- URL `/reservation?service=<slug>` inválida.
- Servicio sin imagen en reserva y en landing.
- Catálogo grande en admin sin overflow horizontal.

## Datos de prueba
- Grupo A en modo servicios directos con 3 servicios.
- Grupo B en modo subgrupos con 2 subgrupos y varios servicios.
- Grupo C visible pero sin contenido visible efectivo.
- Subgrupo único visible con flag de omitir paso activo en su grupo.
- Servicio con imagen.
- Servicio sin imagen.
- Servicio destacado landing 1..6.
- Servicio candidato a séptimo destacado.
- Servicio oculto asignado a estilista.
- Servicio con slug manual personalizado.

## Comandos
- `npm run lint`
- `npm run build`
- `npm run dev`
- pruebas manuales en:
  - `/`
  - `/reservation`
  - `/reservation?service=<slug>`
  - `/admin?section=services`
  - `/admin` secciones relacionadas
  - `/admin/stylists` o flujo equivalente del repo para gestión de estilistas
- consultas SQL de verificación en Supabase sobre nuevas tablas y `public.servicios`

## Verificaciones sugeridas por superficie

### Reserva pública
- Seleccionar grupo con servicios directos.
- Seleccionar grupo con subgrupos.
- Verificar contexto, volver y progreso.
- Verificar cards de servicio completas.
- Verificar deep-link con slug válido.
- Verificar fallback con slug inválido.

### Landing
- Confirmar que solo salen destacados válidos.
- Confirmar orden correcto de cards.
- Confirmar click directo a reserva del servicio.
- Confirmar que un destacado oculto desaparece.

### Admin servicios
- Crear grupo vacío.
- Definir su modo creando primer hijo.
- Intentar romper el modo con creación/movimiento incompatible.
- Ordenar grupos, subgrupos y servicios.
- Alternar visibilidad y comprobar visibilidad efectiva.
- Buscar por nombre grupo/subgrupo/servicio.
- Marcar/desmarcar destacados landing.

### Admin estilistas
- Expandir/colapsar grupos y subgrupos.
- Asignar servicio visible.
- Asignar servicio oculto.
- Persistencia correcta de `stylist_services`.

### MCP/API
- `list_services` devuelve jerarquía completa.
- Incluye slugs, contadores y visibilidad efectiva.
- Contrato no pierde compatibilidad funcional con consumo esperado.

## Criterio para avanzar de fase
- Todas las tareas de la fase completadas.
- Gate de tests de fase aprobado.
- Sin bloqueos críticos abiertos para la fase siguiente.
- Sin contradicción entre modelo de datos, UX y reglas de negocio.

## Evidencias esperadas
- migración SQL versionada,
- evidencia de backfill y consultas post-migración,
- evidencia visual o notas de QA de árbol admin,
- evidencia visual o notas de QA de landing destacados,
- evidencia funcional de deep-link a reserva,
- evidencia de `list_services` jerárquico,
- evidencia de asignación jerárquica a estilistas,
- `context.md` actualizado.

## Evidencias recogidas en esta ejecución
- Migración versionada creada en `migrations/20260327_service_hierarchy_landing_featured.sql`.
- DDL aplicado en Supabase vía `execute_sql` (el endpoint `apply_migration` devolvió `UnauthorizedException` en este entorno).
- Verificación SQL post-migración:
  - `service_groups`: `[{ id: 1, name: "Services", slug: "services", is_visible: true, sort_order: 0 }]`
  - `servicios`: `Coupe Homme`, `Coupe enfant`, `Barbe`, `Etudiant` con `slug`, `group_id = 1`, `subgroup_id = 1`, `sort_order` estable y `landing_featured = false`
- Gate técnico local:
  - `npm run lint` ✅
  - `npm run build` ✅
- Smoke local con `npm run dev`:
  - `GET /reservation` 200
  - `GET /` 200
  - `GET /reservation?service=coupe-homme` 200
- Smoke HTML/cURL:
  - `/reservation` contiene `Réserver un service`
  - `/reservation` contiene `Choisissez votre groupe`
- Estado QA restante:
  - falta QA manual autenticado del árbol admin,
  - falta QA visual de landing con servicios realmente marcados como destacados,
  - falta QA manual autenticado de la asignación jerárquica en estilistas.

## Evidencias QA manual Playwright - 2026-03-27
- Entorno:
  - `npm run dev` activo en `http://127.0.0.1:3000`
  - login admin real con usuario QA `qa-admin@steelandblade.local`
- `/admin?section=services`
  - carga correcta del árbol jerárquico con grupo `Services`, sous-groupe `General` y 4 servicios
  - toggle landing validado sobre `Coupe Homme`; la tarjeta de resumen “Services mis en avant sur la landing” se actualiza
  - toggle de visibilidad validado sobre `Barbe`; al ocultar pasa a badges `Masqué` + `Hors public`, y al restaurar vuelve a `Visible` + `Effectif`
  - incidencia detectada: el input `Rechercher groupe, sous-groupe ou service` actualiza su valor (`barbe`) pero el árbol no filtra los nodos visibles
- `/`
  - la sección “Services à réserver rapidement” aparece tras marcar `Coupe Homme` como destacado
  - la card destacada apunta a `/reservation?service=coupe-homme`
  - click Playwright real validado con navegación efectiva a `/reservation?service=coupe-homme`
- `/reservation`
  - flujo jerárquico validado manualmente:
    - Étape 1: grupo `Services`
    - Étape 2: sous-groupe `General`
    - Étape 3: cards completas de servicios
    - selección de `Barbe` → avance a `Sélection du Centre`
  - deep-link válido `?service=coupe-homme` salta directamente al paso centro (`Étape 4 de 7`)
  - deep-link inválido `?service=no-existe` hace fallback al paso inicial y muestra `Ce service n'est plus disponible. Veuillez choisir un autre service.`
- `/admin?section=stylists`
  - la lista de stylistes carga y el panel “Éditer le styliste” muestra la jerarquía `Services > General`
  - los servicios siguen apareciendo como asignables dentro del panel
  - al ocultar temporalmente `Barbe` desde admin servicios, el panel de estilistas lo muestra con badge `Masqué`
  - incidencia detectada al abrir edición:
    - `GET /api/admin/schedule/time-off?...` → `401 Unauthorized`
    - `GET /api/admin/schedule/location-closures?...` → `401 Unauthorized`
    - consola con `time_off_load_error`, `closure_load_error`
    - banner visible en el panel: `Authentification requise`

## Veredicto QA inicial (antes de los fixes finales)
- Funciona:
  - jerarquía pública grupo/subgrupo/servicio
  - cards completas de servicio
  - landing destacados manuales
  - acceso directo desde landing a reserva por slug
  - fallback de slug inválido
  - árbol admin de servicios
  - toggles de visibilidad y landing
  - visibilidad de servicios ocultos en asignación a estilistas
- No estaba listo para cierre en esa pasada:
  - búsqueda del árbol admin no filtra
  - edición de estilistas tiene errores `401 Unauthorized` en cargas auxiliares y muestra error de autenticación

## Evidencias QA manual Playwright - revalidación final 2026-03-27
- Entorno:
  - `npm run dev` validado en `http://127.0.0.1:3002`
  - acceso directo `curl -I 'http://127.0.0.1:3002/admin?section=services'` estable tras fix de `Suspense`
- `/admin?section=services`
  - búsqueda global revalidada con término `barbe`
  - resultado observado en Playwright: solo queda visible el servicio `Barbe`; `Coupe Homme` deja de aparecer en el árbol filtrado
  - bloque “Services mis en avant sur la landing” sigue operativo
- `/admin?section=stylists`
  - apertura del panel “Éditer le styliste” de `Jean Dupont` sin banner `Authentification requise`
  - consola Playwright al abrir el panel: `0 errors`
  - se cargan correctamente:
    - jerarquía `Services > General`
    - checkboxes de servicios
    - sección de indisponibilités con entrada `Vacances`
    - sección de fermetures sin errores
- `/reservation?service=coupe-homme`
  - tras la carga asíncrona pasa a `Étape 4 de 7`
  - encabezado: `Sélection du Centre`
  - servicio `Coupe Homme` preseleccionado correctamente
- `/reservation?service=no-existe`
  - fallback correcto al inicio del flujo
  - mensaje visible: `Ce service n'est plus disponible. Veuillez choisir un autre service.`
- Restauración de entorno QA:
  - el servicio `Coupe Homme` usado temporalmente para validar landing destacados fue desmarcado de nuevo (`landing_featured = false`) al finalizar la comprobación

## Veredicto QA final
- Búsqueda admin servicios: ✅
- Panel de estilistas sin 401: ✅
- Deep-link de reserva válido: ✅
- Fallback de slug inválido: ✅
- Lint: ✅
- Build: ✅

## Evidencias QA manual Playwright - extensión groupe unique 2026-03-27
- Caso base actual del proyecto (`1` grupo visible efectivo, `skip_subgroup_step_when_single_visible_child = false`):
  - `/reservation` deja de mostrar el paso de grupo tras hidratar
  - la UI entra directamente en selección de sous-groupe
  - evidencia visible: `Étape 1 de 6` + texto `Choisissez le sous-groupe, puis le service qui vous convient.`
- Caso combinado probado temporalmente (`1` grupo visible efectivo + `skip_subgroup_step_when_single_visible_child = true`):
  - `/reservation` llega directamente a la lista de servicios
  - evidencia visible: `Étape 1 de 5` + texto `Choisissez le service qui vous convient.`
  - cards visibles directamente: `Coupe Homme`, `Coupe enfant`, `Barbe`, `Etudiant`
- Restauración de entorno:
  - el grupo `services` volvió a quedar con `skip_subgroup_step_when_single_visible_child = false` al finalizar la validación

## Evidencias QA manual Playwright - conversion sous-groupe vers services directs 2026-03-27
- Acción nueva visible en el menú del subgrupo único: `Convertir en services directs`.
- Flujo validado con confirm dialog en Playwright.
- Resultado observado tras confirmar:
  - el grupo `Homme` pasa de `Sous-groupes` a `Services directs`
  - el subgrupo `General` desaparece
  - los servicios `Coupe Homme`, `Coleur`, `Barbe` quedan colgados directamente de `Homme`
  - las fichas muestran ya la ruta corta `Homme`


## Evidencias UX/admin adicionales - cierre documental 2026-03-27
- Gestión de servicios:
  - los `alert/confirm` nativos del navegador fueron sustituidos por diálogos estilizados consistentes con el resto del admin.
  - el botón de confirmar en modales informativos usa `Compris`.
  - la eliminación de servicios está disponible desde el menú `...` y desde el panel lateral de edición.
  - la eliminación de grupos y subgrupos queda visible siempre; si contienen elementos, un modal explica que primero hay que eliminar o reubicar servicios.
  - los menús `...` se renderizan mediante portal/fixed positioning, con cierre por click fuera y tecla `Esc`, y abren hacia arriba cuando no hay espacio suficiente.
- Verificación de integridad real en base de datos:
  - `bookings.service_id` mantiene histórico con `ON DELETE SET NULL`.
  - `stylist_services.service_id` limpia asignaciones con `ON DELETE CASCADE`.
- Reserva pública:
  - se eliminó la tarjeta `Parcours` / `Homme / Service` y se sustituyó por el mismo patrón de botón “volver” usado en etapas posteriores.
  - la lógica de grupo único + subgrupo único llega directamente a la lista de servicios.
- Fondo experimental de `/reservation`:
  - asset descargado a `public/reservation/booking-bg-16x9.jpeg` desde una generación 16:9 de Replicate (`google/nano-banana-pro`).
  - integración realizada en `src/app/reservation/page.tsx` con imagen de fondo sutil + overlay cálido.
  - QA visual manual realizado en `http://127.0.0.1:3001/reservation`.
  - screenshot de referencia: `reservation-background-preview.png`.
- Comandos verificados en esta iteración final:
  - `npm run lint -- --file src/components/admin/services/ServiceManagement.tsx` ✅
  - `npm run lint -- --file src/components/reservation/ServiceSelect.tsx` ✅
  - `npm run lint -- --file src/app/reservation/page.tsx` ✅
  - `npm run build` ✅ tras limpiar `.next` (`python3 -c "import shutil; shutil.rmtree('.next', ignore_errors=True)"`).
