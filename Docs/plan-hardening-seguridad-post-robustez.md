# Plan de Hardening de Seguridad Post-Robustez (Actualizado)

## Estado
- Documento de planificacion (no aplica cambios por si mismo).
- Fecha de actualizacion: 2026-02-27.
- Proyecto objetivo de Supabase: `tvdwepumtrrjpkvnitpw`.

## Estado de ejecucion (2026-02-27)
- Fase A: completada (guards auth/rol en endpoints internos boutique + frontend admin con bearer token).
- Fase B/C: completadas (migracion `security_postrobustez_phase_bcd_20260227` aplicada).
- Fase D: completada parcialmente (search_path y grants de funciones propias ajustados).
- Fase E: completada en repositorio (script de checks + checklist + runbook).
- Pendiente manual fuera de codigo:
  - activar leaked password protection en Supabase Auth.
  - planificar/aplicar upgrade de Postgres.
  - decidir si mover o aceptar `btree_gist` en `public`.

## Estado real verificado (ya resuelto)
1. `bookings` ya no tiene `INSERT public WITH CHECK true` ni `SELECT public`.
2. Creacion de reserva centralizada en servidor (`/api/reservation/create`) con RPC atomica.
3. Anti-solape en BD activo (`bookings_no_overlap`) + checks + indices.
4. Idempotencia implementada en `/api/reservation/create` con `Idempotency-Key` + tabla `booking_requests`.
5. Tablas boutique con PII (`pedidos`, `items_pedido`, `carrito_sesiones`, `items_carrito`) tienen RLS activada con deny-by-default.

## Objetivo pendiente
Cerrar los riesgos que aun quedan abiertos en autorizacion por rol, endpoints `service_role`, tablas publicas sin RLS y hygiene de funciones/plataforma.

## Gaps pendientes (exactos)

### Critico
1. Endpoints de pedidos boutique usan `service_role` sin guard de auth/rol:
   - `src/app/api/boutique/pedidos/route.ts`
   - `src/app/api/boutique/pedidos/[id]/route.ts`
   - `src/app/api/boutique/pedidos/session/[sessionId]/route.ts`
2. Endpoints de administracion de catalogo (mutaciones) sin guard de auth/rol:
   - `src/app/api/boutique/productos/route.ts` (`POST`)
   - `src/app/api/boutique/productos/[id]/route.ts` (`PUT`, `DELETE`)

### Alto
1. Endpoint de diagnostico de Stripe sin auth:
   - `src/app/api/boutique/webhook-status/route.ts` (`GET`)
2. Siguen tablas expuestas en `public` con RLS desactivada:
   - `location_hours`
   - `productos`
   - `categorias_productos`
3. Persisten policies `FOR ALL ... USING true` para `authenticated` en tablas admin:
   - `configuracion`, `imagenes_galeria`, `locations`, `servicios`, `stylist_services`, `stylists`, `time_off`, `working_hours`.
4. Politicas duplicadas en `imagenes_galeria`.

### Medio
1. `public.handle_new_user` con `search_path` mutable (advisor warning).
2. Leaked password protection desactivada en Auth.
3. Version de Postgres con parches de seguridad pendientes.

### Bajo / decision
1. Extension `btree_gist` en `public` (warning de advisor). Decidir si se acepta o se mueve de esquema.

## Decisiones requeridas antes de ejecutar
1. `productos`/`categorias_productos`:
   - Opcion A: mantener lectura publica (anon SELECT), bloquear escrituras.
   - Opcion B: cerrar totalmente Data API y servir solo por endpoints.
2. `location_hours`:
   - Opcion A: anon SELECT permitido (si lo necesita reserva publica).
   - Opcion B: solo staff + endpoints.
3. Endpoint `pedidos/session/[sessionId]`:
   - Opcion A: acceso con token firmado de corta vida.
   - Opcion B: endpoint solo admin autenticado.

## Plan ejecutable por fases

### Fase A - Cierre critico en endpoints `service_role` (AMPLIADA)
Objetivo: evitar exfiltracion y mutaciones no autorizadas via endpoints server.

Acciones:
1. Crear guard reutilizable de auth+rol admin/employee para APIs internas.
2. Proteger pedidos:
   - `GET /api/boutique/pedidos`
   - `GET/PUT /api/boutique/pedidos/[id]`
   - `GET /api/boutique/pedidos/session/[sessionId]` (segun decision previa)
3. Proteger mutaciones de catalogo:
   - `POST /api/boutique/productos`
   - `PUT/DELETE /api/boutique/productos/[id]`
4. Proteger endpoint de diagnostico:
   - `GET /api/boutique/webhook-status` (solo admin).
5. Verificar explicitamente que endpoints publicos que SI deben quedar abiertos siguen operativos:
   - `GET /api/boutique/productos`
   - `POST /api/boutique/stripe`
   - `POST /api/boutique/checkout` (si sigue en uso).
6. Devolver `401/403` tipados y logging estructurado minimo.

Criterio de salida:
1. Sin token o sin rol: acceso denegado en todos los endpoints internos.
2. Solo endpoints publicos permitidos quedan abiertos.
3. Panel admin boutique sigue operativo sin regresion.

---

### Fase B - Modelo de autorizacion real por rol (RLS)
Objetivo: eliminar politicas amplias `USING true` en tablas criticas.

Acciones BD:
1. Crear helper de rol robusto (ej. `public.current_user_role()`) con `search_path` fijo.
2. Reemplazar `FOR ALL ... USING true` por politicas por operacion y rol:
   - `SELECT` publico solo donde aplique negocio.
   - `INSERT/UPDATE/DELETE` solo `admin` (y `employee` donde proceda).
3. Limpiar duplicados en `imagenes_galeria`.

Criterio de salida:
1. No queda `FOR ALL ... USING true` en tablas admin criticas.
2. `employee` y `admin` respetan scope real.

---

### Fase C - Tablas publicas sin RLS (`productos`, `categorias_productos`, `location_hours`)
Objetivo: resolver errores `rls_disabled_in_public` del advisor.

Acciones:
1. Activar RLS en las 3 tablas.
2. Crear politicas minimas segun decision de negocio:
   - Si son publicas: `anon SELECT` explicito.
   - Escrituras siempre restringidas a staff/server.

Criterio de salida:
1. Advisor sin `rls_disabled_in_public` para estas tablas.
2. Flujo publico de catalogo/reserva sigue funcionando.

---

### Fase D - Hygiene de funciones y plataforma
Objetivo: reducir warnings de seguridad residual.

Acciones:
1. Corregir `handle_new_user` para fijar `search_path`.
2. Revisar grants `EXECUTE` de funciones `SECURITY DEFINER`.
3. Activar leaked password protection en Supabase Auth.
4. Planificar upgrade de Postgres.
5. Decidir `btree_gist` en `public` (aceptar riesgo documentado o migrar).

Criterio de salida:
1. Sin warning `function_search_path_mutable` en funciones propias.
2. Plataforma con medidas base activadas.

---

### Fase E - Verificacion continua
Objetivo: evitar regresiones.

Acciones:
1. Script SQL de comprobacion automatizable:
   - tablas `public` sin RLS,
   - policies permisivas,
   - exposicion de columnas PII.
2. Checklist de release obligatorio para cambios BD/API.
3. Runbook de rollback de policies.

Criterio de salida:
1. Seguridad integrada en Definition of Done.

## Matriz minima de pruebas
1. `anon` no puede leer PII en `bookings`, `pedidos`, `carrito_sesiones`.
2. `anon` no puede escribir en tablas sensibles.
3. Reserva publica sigue funcionando via endpoint.
4. Admin puede operar reservas y boutique segun rol.
5. Endpoints internos (`pedidos`, mutaciones `productos`, `webhook-status`) rechazan acceso no autenticado.
6. `supabase advisors (security)` sin errores criticos activos o con excepcion documentada.

## Estrategia de migraciones recomendada
- `migrations/<ts>_security_postrobustez_phaseB_role_policies.sql`
- `migrations/<ts>_security_postrobustez_phaseC_public_tables_rls.sql`
- `migrations/<ts>_security_postrobustez_phaseD_function_hygiene.sql`

Nota: Fase A es principalmente codigo server; si requiere SQL de soporte (funciones/claims), añadir migracion especifica.

## Definicion de listo
1. No existe lectura anon de PII en `public`.
2. No existe escritura anon directa en tablas sensibles.
3. No hay endpoints `service_role` sensibles sin auth/rol.
4. No quedan `FOR ALL ... USING true` en tablas criticas.
5. Advisors de seguridad sin errores criticos abiertos, o excepciones justificadas por escrito.

## Anexo - Cambios ya aplicados (referencia)
- `bookings_hardening_phase1_20260227`
- `create_booking_atomic_phase1_20260227`
- `bookings_rls_hardening_phase2_20260227`
- `boutique_pii_rls_hardening_phase2_20260227`
- `booking_requests_idempotency_phase3_20260227`
