# Status

- Current phase: Ready for QA
- Last completed task: Cierre documental del pack con ajuste final de UX de reserva, diálogos estilizados y reglas de borrado/convertir grupo
- Next task: QA manual del usuario
- Tests pending:
  - validación manual del usuario del fondo experimental de `/reservation`
  - aceptación final del flujo de borrado y modales de grupos/subgrupos/servicios
- Bloqueos: Ninguno funcional; pendiente únicamente aceptación manual del usuario
- Last update: 2026-03-27 16:35 Europe/Zurich

## Resumen del cierre
- El pack queda implementado y documentado con la jerarquía completa de servicios, destacados de landing y deep-links de reserva funcionando.
- La reserva pública incluye además los refinamientos posteriores acordados: ocultación de estructura interna cuando solo hay una rama útil, simplificación del botón de volver y fondo experimental 16:9 con overlay cálido.
- La gestión admin de servicios queda endurecida con modales estilizados, menús contextuales por portal, borrado de servicios, borrado condicionado de grupos/subgrupos y conversión de subgrupo único a servicios directos.

## QA ya validado en esta iteración
- `npm run lint`: ✅
- `npm run build`: ✅
- QA manual Playwright de reserva pública, admin de servicios, landing y estilistas: ✅
- Revalidación posterior de UX/admin (menús, borrado, conversión, copy público): ✅

## Pendiente para cierre total
- Confirmación manual del usuario sobre el estado final y, en particular, sobre la dirección visual del fondo experimental de `/reservation`.
- Tras ese OK manual, solo faltará limpiar el puntero `Docs/_active.md`.
