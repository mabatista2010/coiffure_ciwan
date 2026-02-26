# Implementación: Refactor completo de `/admin` a `shadcn/ui`

## Resumen
Se define una migración completa y por fases del área `/admin` para reemplazar la capa de UI actual por componentes basados en `shadcn/ui`, manteniendo la lógica de negocio existente.

## Objetivo y alcance
### Objetivo
Estandarizar toda la interfaz de `/admin` con un sistema de componentes reusable, accesible y consistente visualmente, reduciendo deuda de estilos ad-hoc y acelerando futuras iteraciones.

### Alcance
- Rutas objetivo:
  - `/admin`
  - `/admin/reservations`
  - `/admin/reservations/nueva`
  - `/admin/crm`
  - `/admin/stylist-stats`
  - `/admin/location-stats`
  - `/admin/user-management`
  - `/admin/boutique`
  - `/admin/webhook-diagnostics`
- Sustitución de componentes visuales por equivalentes `shadcn/ui`.
- Creación de un kit admin reusable encima de `shadcn/ui`.
- Normalización de variantes de estado (info, warning, success, error).
- Ajustes responsive y accesibilidad (teclado, foco, semántica).

### No-objetivos
- Cambiar reglas de negocio, permisos o lógica de datos de Supabase/Stripe.
- Rediseñar flujos funcionales (solo capa UI/UX).
- Refactor completo de áreas públicas (`/`, `/reservation`, `/boutique`), salvo utilidades compartidas estrictamente necesarias.

## Decisiones tomadas en esta sesión
- Se adopta una estrategia por fases, sin migración big-bang.
- Se empezará por admin para capturar el mayor beneficio de consistencia.
- Se mantendrá intacta la lógica de negocio en cada pantalla durante la migración visual.
- Se utilizará un laboratorio (`/ui-test`) para validar componentes antes de integrarlos.
- Se documentará y gateará cada fase con checklist y pruebas.
- Pendiente de decisión: mantener o retirar `@headlessui/react` al finalizar la migración admin.
  - Recomendación: mantener temporalmente durante la transición y retirarlo al cerrar la última fase con inventario de uso en `rg`.

## Arquitectura propuesta
- Base de diseño:
  - Tokens en `src/app/globals.css` alineados con marca.
  - Variantes de componentes base (`Button`, `Input`, `Card`, `Dialog`).
- Capa de componentes:
  - Componentes `shadcn/ui` base en `src/components/ui/*`.
  - Wrappers admin semánticos (por ejemplo `AdminCard`, `FilterBar`, `StatusBadge`, `MetricCard`) en `src/components/admin/ui/*`.
- Capa de página:
  - Cada pantalla `/admin/*` consume wrappers y evita clases repetidas.
- Convención:
  - No tocar fetch/estado/handlers salvo correcciones puntuales de integración visual.
  - PR lógico por fase o subfase.

## Plan por fases
## Fase 1: Fundación UI Admin
### Entregables
- Definición final de tokens y variantes base.
- Creación del kit admin reusable mínimo.
- Guía de uso corta para equipos (`Docs/admin-shadcn-refactor`).

### Criterios de aceptación
- Componentes base validados en `/ui-test`.
- Cero errores de lint.
- Reglas visuales y de accesibilidad documentadas.

## Fase 2: Migración `user-management` + stats
### Entregables
- Migración completa de:
  - `/admin/user-management`
  - `/admin/stylist-stats`
  - `/admin/location-stats`

### Criterios de aceptación
- Flujos actuales sin regresión funcional.
- Consistencia visual con kit admin.
- Smoke test manual completo en desktop/mobile.

## Fase 3: Migración `crm` y `webhook-diagnostics`
### Entregables
- Migración completa de:
  - `/admin/crm`
  - `/admin/webhook-diagnostics`

### Criterios de aceptación
- Búsqueda, filtros y visualización de métricas funcionando.
- Diálogos/acciones con accesibilidad de teclado correcta.

## Fase 4: Migración `reservations` y `reservations/nueva`
### Entregables
- Migración de las dos pantallas más críticas de reservas.
- Homologación de tablas, filtros, badges de estado y modales.

### Criterios de aceptación
- Creación/edición visual sin romper validaciones actuales.
- Navegación y estados de calendario sin regresiones.

## Fase 5: Migración `admin` (configuración) y `admin/boutique`
### Entregables
- Migración de configuración general y panel boutique.
- Consolidación de formularios complejos y uploads visuales.

### Criterios de aceptación
- CRUD visual consistente.
- Feedback de error/éxito unificado.

## Fase 6: Limpieza y cierre
### Entregables
- Eliminación de estilos legacy duplicados no usados.
- Revisión de dependencias UI y posible retiro de `@headlessui/react`.
- Checklist final y documentación de operación.

### Criterios de aceptación
- Sin referencias huérfanas a clases legacy retiradas.
- Build/lint sin errores (considerando el estado base del proyecto).

## Riesgos y mitigaciones
- Riesgo: regresión visual por coexistencia de estilos globales y `shadcn`.
  - Mitigación: migración por pantalla + validación visual por fase.
- Riesgo: regressions de interacción en modales/tablas.
  - Mitigación: checklist de accesibilidad y navegación teclado en cada fase.
- Riesgo: incremento temporal de deuda por componentes duplicados.
  - Mitigación: fase explícita de limpieza al final (Fase 6).
- Riesgo: timebox grande para pantallas complejas.
  - Mitigación: dividir fases críticas (`reservations`) en subfases si es necesario.

## Plan de despliegue / rollout
1. Activar cambios por pantalla al completar su fase.
2. Ejecutar smoke test manual antes de marcar gate de fase.
3. Mantener cambios acotados por ruta para rollback rápido.
4. Al cierre de Fase 6, publicar checklist final y remover legacy validado.

## Definition of Done
- Todas las rutas `/admin/*` en alcance usan componentes `shadcn/ui` o wrappers admin.
- No existen regresiones funcionales detectadas en smoke tests definidos.
- `checklist.md` y `status.md` reflejan cierre de todas las fases con gates aprobados.
- Se documenta decisión final sobre `@headlessui/react` (retener o eliminar).
- Lint sin errores y build evaluado según estado base del proyecto.

## Outcome summary
### Qué se implementó
- Migración visual completa del alcance `/admin/*` a primitives `shadcn/ui` + wrappers admin (`AdminCard`, `SectionHeader`, `FilterBar`, `StatusBadge`, `AdminDateInput`).
- Homologación de layouts, formularios, tablas, badges y modales en todas las rutas planificadas.
- Iteración intensiva en `/admin/stylist-stats`:
  - Header compacto y filtros optimizados para desktop/tablet.
  - KPIs compactos, mejoras de legibilidad y ajustes de copy/acentos en FR.
  - Patrón de modal ampliado para detalle de `Reservations`.
  - Corrección de doble tooltip, fallback de imagen y ajustes responsive.
  - Corrección de capas (`z-index`) para calendarios sobre modales.
  - Animación de modales centrada (`fade + zoom`) sin entrada desde esquina.

### Qué se cambió vs plan original
- Se añadió una sub-iteración UX no prevista inicialmente en la Fase 6 para pulir `stylist-stats` con múltiples ciclos de feedback visual.
- Se extendió la limpieza final para incluir mejoras de microinteracción (tooltips, animaciones, overlay stacking), además de la limpieza de estilos/dependencias.
- La validación técnica se hizo principalmente por archivo/ruta (lint focalizado + smoke HTTP), manteniendo el cierre global condicionado por issues preexistentes fuera del scope.

### Pendientes
- QA manual del usuario en entorno real (desktop/tablet/mobile), con foco en:
  - Interacciones de modales expandidos.
  - Comportamiento de calendarios y filtros en `stylist-stats` y `location-stats`.
  - Flujos con cuentas reales `admin/employee`.
- Si el QA valida OK: limpiar puntero activo (`Docs/_active.md`) con `impl-pack-clear`.

### Riesgos conocidos post-release
- Persisten fallos globales de `npm run lint` y `npm run build` por errores preexistentes en `src/app/admin/reservations/page.tsx` (variables no usadas), no introducidos por este paquete.
- El layout de pills en tablet depende del ancho disponible y densidad de etiquetas; cambios de copy podrían requerir nuevo ajuste fino.
- El incremento de `z-index` en `AdminDateInput` es intencional para resolver solapes; cualquier nuevo overlay global con z superior podría requerir armonización.
