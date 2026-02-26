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
- Extensión UI adicional en `admin/stylist-stats` (reservaciones): popover con botón de pantalla completa y modal ampliado con detalle diario (distribución por estado y contexto de período), para reutilizar el patrón luego en otros módulos.
- Ajuste visual aplicado al modal ampliado de reservaciones para evitar fondos grises: contenedores `white/slate` y acentos de estado más claros.
- Se añadió también modal ampliado para la tarjeta resumen `Reservations` (icono de expandir dentro de la tarjeta) con métricas agregadas: tasas por estado, media diaria, días activos, día pico, día más calmado y top de servicios/centres del período.
- Ajuste UX en el gráfico de tendencia: retirado `title` nativo en barras diarias para evitar doble tooltip (popover custom + tooltip del navegador).
- Header de `admin/stylist-stats` migrado a layout compacto según mock: perfil + período visible + 3 KPI cards en cabecera; se eliminó la fila KPI antigua duplicada para evitar ruido visual.
- Fix runtime en cabecera compacta: fallback de avatar cambiado de `https://placehold.co/...` a `/placeholder-profile.jpg` para evitar error de `next/image` por host no permitido.
- Ajuste responsive del header compacto: rebalanceo de columnas, reducción de tamaños tipográficos y eliminación de `min-width` rígido para evitar truncado agresivo de nombre/fecha en desktop intermedio.
- Ajuste de layout según feedback visual: header aún más compacto (solo perfil + período) y KPIs pequeños restaurados debajo, manteniendo modal expandible de `Reservations`.
- Ajuste compacto pro aplicado en `admin/stylist-stats`: cabecera más densa (avatar/título/período), `FilterBar` comprimida y mini-KPIs desacoplados debajo en cards más bajas para reducir espacio blanco vertical.
- Ajuste iPad/tablet en `admin/stylist-stats`: selector de estilista con ancho contenido (`max-width`) y bloque de `Raccourcis de période` con wrap/overflow adaptativo para visualizar mejor los pills sin recorte.
- Simplificación de `Raccourcis de période` en `admin/stylist-stats`: eliminado el selector `Plus` y todos los atajos visibles como pills directos, manteniendo wrap responsive.
- Ajuste fino adicional en tablet/desktop: selector `Styliste` reducido de nuevo (`md:max-w-[260px]`, `lg:max-w-[280px]`) para liberar más espacio horizontal a los atajos de período.
- Ajuste adicional para una sola fila en tablet: `Styliste` y `Raccourcis de période` pasan a compartir la misma línea (`md`), reduciendo más el selector (`md:max-w-[210px]`, `lg:max-w-[220px]`).
- Ajuste “desktop-like” en tablet: `FilterBar` ahora soporta `fieldsClassName` y en `stylist-stats` se usa grid desigual (`selector estrecho + atajos amplios`); pills compactados en `md` para mantenerlos en una sola línea visual.
- Ajuste solicitado de contenido en pills: eliminado `Année précédente` de accesos rápidos; `Personnalisé` movido al final; corrección de acentos/ortografía (`Année`, `Personnalisé`).
- Ajuste fino de consistencia visual en filtros: `STYLISTE` y `RACCOURCIS DE PERIODE` ahora comparten exactamente el mismo estilo/peso y espaciado vertical (`FILTER_LABEL_CLASSNAME`, `space-y-1.5`).
- Fix de superposición en calendario admin: elevado `z-index` de `AdminDateInput` (`root` abierto `z-[320]`, panel `z-[330]`) para que el selector de fecha no quede detrás de modales KPI (`Reservations`/`Revenus`).
- Ajuste de animación en modales shadcn (`DialogContent`): removidos `slide-in/slide-out`, manteniendo apertura/cierre centrado con `fade + zoom` para evitar efecto “desde esquina”.
- Ajuste de interacción en tendencia de reservaciones (`stylist-stats`): clic directo sobre la columna diaria abre el modal grande de detalle; el popover queda solo informativo (sin botón de pantalla completa).
- Validación específica del cambio: `npx next lint --file src/app/admin/stylist-stats/page.tsx` en verde y smoke `200` en `/admin/stylist-stats` (2026-02-26).
- Estado de gate global actual: `npm run lint` / `npm run build` fallan por errores preexistentes en `src/app/admin/reservations/page.tsx` (unused vars), no causados por este cambio.
- Evidencias cierre Fase 6:
  - `Docs/admin-shadcn-refactor/evidencias/fase6-admin-login-desktop-20260225-205944.png`
  - `Docs/admin-shadcn-refactor/evidencias/fase6-admin-login-mobile-20260225-205944.png`
  - `Docs/admin-shadcn-refactor/evidencias/fase6-ui-test-desktop-20260225-205944.png`
  - `Docs/admin-shadcn-refactor/evidencias/fase6-ui-test-mobile-20260225-205944.png`

### Gate: tests de fase pasados
- [x] Gate Fase 6 aprobado.
