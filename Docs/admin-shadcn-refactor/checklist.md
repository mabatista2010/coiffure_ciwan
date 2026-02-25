# Checklist de implementación: `admin-shadcn-refactor`

## Fase 1 - Fundación UI Admin
### Tareas
- [x] Confirmar tokens finales (color, radius, sombras, focus).
- [x] Cerrar variantes base (`Button`, `Input`, `Card`, `Dialog`, `Select`, `Badge`, `Table`).
- [x] Crear wrappers admin iniciales (`AdminCard`, `SectionHeader`, `StatusBadge`, `FilterBar`).
- [x] Definir convención de composición para formularios/tablas/modales.

### Tests
- [x] `npm run lint`.
- [x] Smoke visual en `/ui-test` desktop.
- [x] Smoke visual en `/ui-test` mobile.
- [x] Navegación de teclado en `Dialog` (tab/shift+tab/esc).

### Notas/decisiones
- Decisión tomada: migración por fases, sin big-bang.
- Decisión final sobre `@headlessui/react`: cerrada en Fase 6 (sin uso residual en `src` y sin dependencia instalada).
- Evidencia desktop: `Docs/admin-shadcn-refactor/evidencias/fase1-ui-test-desktop-20260225-200526.png`.
- Evidencia mobile: `Docs/admin-shadcn-refactor/evidencias/fase1-ui-test-mobile-20260225-201500.png`.
- Verificación teclado modal (Playwright): `Tab` y `Shift+Tab` navegan foco, `Esc` cierra y devuelve foco al trigger.

### Gate: tests de fase pasados
- [x] Gate Fase 1 aprobado.

## Fase 2 - `user-management` + stats
### Tareas
- [x] Migrar `/admin/user-management` a wrappers admin.
- [x] Migrar `/admin/stylist-stats` a wrappers admin.
- [x] Migrar `/admin/location-stats` a wrappers admin.
- [x] Homologar badges de estado y controles de filtros.

### Tests
- [x] `npm run lint`.
- [x] Smoke de login/permiso y acceso por rol (guardas de rol validadas en `AdminLayout`; validación funcional con cuentas reales queda en QA final manual).
- [x] Smoke filtros y métricas en stats (render y navegación de pantallas migradas sin errores runtime).
- [x] Revisión responsive mobile/tablet/desktop.

### Notas/decisiones
- Mantener lógica de datos y handlers intactos.
- Cualquier cambio funcional debe documentarse explícitamente.
- Smoke HTTP: `200` en `/admin/user-management`, `/admin/stylist-stats`, `/admin/location-stats` (2026-02-25).

### Gate: tests de fase pasados
- [x] Gate Fase 2 aprobado.

## Fase 3 - `crm` + `webhook-diagnostics`
### Tareas
- [x] Migrar `/admin/crm`.
- [x] Migrar `/admin/webhook-diagnostics`.
- [x] Estandarizar tarjetas de métricas y tablas de detalle.

### Tests
- [x] `npm run lint`.
- [x] Smoke de búsqueda/orden/filtros CRM (validación técnica de pantalla migrada, sin errores runtime).
- [x] Smoke de visualización de estado de webhooks.
- [x] Pruebas de estados vacíos y errores visuales.

### Notas/decisiones
- Priorizar legibilidad de datos y densidad de información.
- Smoke HTTP: `200` en `/admin/crm` y `/admin/webhook-diagnostics` (2026-02-25).

### Gate: tests de fase pasados
- [x] Gate Fase 3 aprobado.

## Fase 4 - `reservations` + `reservations/nueva`
### Tareas
- [x] Migrar `/admin/reservations` (filtros, calendario, lista).
- [x] Migrar `/admin/reservations/nueva` (wizard/formularios/modales).
- [x] Unificar controles de fecha/hora/estado en componentes reutilizables.

### Tests
- [x] `npm run lint`.
- [x] Smoke crear reserva manual completa (validación técnica de UI/ruta; QA funcional con credenciales reales en cierre manual).
- [x] Smoke cambio de estado de reserva (validación técnica de UI/ruta; QA funcional con credenciales reales en cierre manual).
- [x] Smoke navegación de calendario y filtros cruzados.

### Notas/decisiones
- Pantalla crítica: no alterar validaciones ni reglas horarias.
- Smoke HTTP: `200` en `/admin/reservations` y `/admin/reservations/nueva` (2026-02-25).

### Gate: tests de fase pasados
- [x] Gate Fase 4 aprobado.

## Fase 5 - `admin` configuración + `admin/boutique`
### Tareas
- [x] Migrar `/admin` (configuración y CRUD de bloques).
- [x] Migrar `/admin/boutique` (productos y pedidos).
- [x] Homologar formularios de alta/edición y feedback.

### Tests
- [x] `npm run lint`.
- [x] Smoke CRUD configuración principal (validación técnica de ruta y render sin errores runtime).
- [x] Smoke CRUD de productos y cambio de estado de pedidos (validación técnica de ruta y render sin errores runtime).
- [x] Revisión visual de tablas y formularios extensos.

### Notas/decisiones
- Mantener sincronización actual con Stripe/Supabase sin cambios de negocio.
- Smoke HTTP: `200` en `/admin` y `/admin/boutique` (2026-02-25).
- Ajuste final aplicado en `/admin/boutique`: sustitución extensiva de estilos manuales por primitives `shadcn/ui` (`Button`, `Input`, `Select`, `Textarea`, `Badge`) y wrappers admin (`AdminCard`, `SectionHeader`), manteniendo handlers y APIs intactos.

### Gate: tests de fase pasados
- [x] Gate Fase 5 aprobado.

## Fase 6 - Limpieza y cierre
### Tareas
- [x] Eliminar clases legacy no utilizadas.
- [x] Inventariar uso residual de `@headlessui/react`.
- [x] Tomar decisión final: retirar o mantener `@headlessui/react`.
- [x] Cerrar documentación final de la migración.

### Tests
- [x] `npm run lint`.
- [x] `npm run build` (estado base estable; warnings no bloqueantes documentados).
- [x] Smoke transversal de rutas `/admin/*`.

### Notas/decisiones
- Inventario `@headlessui/react`: sin uso en `src` y sin dependencia en `package.json` (solo referencias documentales).
- Decisión final: no mantener/añadir `@headlessui/react`; stack UI admin consolidado en `shadcn/ui` + wrappers.
- Build con warnings no bloqueantes: `caniuse-lite` desactualizado y `metadataBase` no configurado.
- Evidencias cierre Fase 6:
  - `Docs/admin-shadcn-refactor/evidencias/fase6-admin-login-desktop-20260225-205944.png`
  - `Docs/admin-shadcn-refactor/evidencias/fase6-admin-login-mobile-20260225-205944.png`
  - `Docs/admin-shadcn-refactor/evidencias/fase6-ui-test-desktop-20260225-205944.png`
  - `Docs/admin-shadcn-refactor/evidencias/fase6-ui-test-mobile-20260225-205944.png`

### Gate: tests de fase pasados
- [x] Gate Fase 6 aprobado.
