# Plan de pruebas: `admin-shadcn-refactor`

## Estrategia por fase
## Fase 1 - Fundación UI Admin
- Validar consistencia visual de componentes base en `/ui-test`.
- Validar accesibilidad mínima (foco visible, teclado en modal, contraste).
- Confirmar que los wrappers admin no rompen tipado ni lint.

## Fase 2 - `user-management` + stats
- Pruebas funcionales manuales de filtros y navegación por bloques.
- Pruebas por rol (admin/employee) para asegurar que UI no altera restricciones.
- Verificación responsive para tablas y tarjetas de métricas.

## Fase 3 - `crm` + `webhook-diagnostics`
- Pruebas de estados cargando/vacío/error.
- Pruebas de búsqueda, orden y detalle de cliente en CRM.
- Pruebas de visualización de eventos/estados en webhooks.

## Fase 4 - `reservations` + `reservations/nueva`
- Pruebas end-to-end de creación manual de reservas.
- Pruebas de filtros cruzados por fecha/centro/stylist.
- Pruebas de interacción de calendario (desktop y mobile).

## Fase 5 - `admin` + `admin/boutique`
- Pruebas CRUD de configuración y contenidos.
- Pruebas CRUD productos y actualización de estado de pedidos.
- Pruebas de formularios largos y componentes de feedback (toasts/modales).

## Fase 6 - Limpieza y cierre
- Pruebas transversales sobre todas las rutas `/admin/*`.
- Verificación de eliminación de estilos legacy sin efectos colaterales.
- Verificación final de dependencias UI.

## Casos borde
- Modal abierto con navegación completa por teclado.
- Estados vacíos en listados (sin resultados).
- Datos largos en tablas/cards (overflow/line-clamp).
- Errores de red simulados con mensajes visuales correctos.
- Permisos de employee intentando rutas fuera de alcance.
- Mobile estrecho con filtros múltiples y botones de acción.

## Datos de prueba
- Usuario admin con acceso completo.
- Usuario employee con permisos limitados.
- Reservas en múltiples estados (`pending`, `confirmed`, `cancelled`, `completed`).
- Clientes con historial extenso y sin historial.
- Productos boutique con y sin stock.
- Entradas de webhook válidas y fallidas.

## Comandos para ejecutar tests
```bash
npm run lint
npm run dev
npm run build
```

## Criterio para avanzar de fase
- Lint en verde.
- Smoke tests de la fase ejecutados y documentados en `checklist.md`.
- Gate de fase marcado como aprobado.
- Cualquier incidencia conocida queda registrada en `status.md` y/o notas de fase.
