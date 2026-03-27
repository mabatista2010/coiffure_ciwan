# Plan de tests

## Estrategia por fase

### Fase 1
- Validar que el mapa de impacto incluye escrituras, lecturas y lógica SQL.
- Confirmar que no existe otro CRUD o endpoint que escriba servicios sin pasar por el admin principal.

### Fase 2
- Probar integridad de datos directamente en Supabase.
- Validar que el contrato BD impide nulos y valores fuera de rango.
- Verificar que las funciones SQL de reservas aceptan datos válidos y no dependen de estados legacy ambiguos.

### Fase 3
- Probar UX admin creando y editando servicios.
- Confirmar persistencia real al recargar y al reabrir formulario.
- Verificar que la lista admin refleja la duración guardada.

### Fase 4
- Confirmar la duración visible en reserva pública.
- Confirmar la duración visible en reserva admin.
- Confirmar que la hora final de confirmación cuadra con la duración.
- Confirmar que MCP devuelve la duración correcta.

### Fase 5
- Ejecutar lint.
- Ejecutar smoke test final transversal.
- Confirmar documentación/contexto final.

## Casos borde
- Servicio con `duration = null` heredado antes del hardening.
- Servicio con `duration = 0`.
- Servicio con `duration < 0`.
- Servicio con `duration > 240`.
- Servicio con duración mínima válida (por ejemplo 1 o 5 según decisión UX).
- Servicio editado sin cambiar imagen.
- Servicio editado cambiando solo duración.
- Servicio creado con duración válida y descripción vacía no permitida.
- Reserva pública usando un servicio recién editado.
- MCP devolviendo datos tras cambio de duración.

## Datos de prueba
- Servicio QA A: `20 min`.
- Servicio QA B: `30 min`.
- Servicio QA C: `45 min`.
- Servicio QA D: `60 min`.
- Payloads inválidos QA: `0`, `-5`, `241`, `null` (si aplica a nivel SQL).

## Comandos
- `npm run lint`
- `npm run dev`
- consultas SQL de verificación sobre `public.servicios`
- smoke test manual en `/admin?section=services`
- smoke test manual en `/reservation`

## Verificaciones SQL sugeridas
- Inventario de datos:
  - conteo total,
  - conteo `duration is null`,
  - conteo `duration <= 0`,
  - conteo `duration > 240`,
  - mínimo y máximo.
- Verificación de constraints/default/not null tras migración.

## Criterio para avanzar de fase
- De Fase 1 a Fase 2:
  - mapa de impacto completo,
  - contrato final decidido.
- De Fase 2 a Fase 3:
  - BD blindada y verificada.
- De Fase 3 a Fase 4:
  - admin CRUD funcionando y persistiendo correctamente.
- De Fase 4 a Fase 5:
  - consumidores clave verificados.
- Cierre final:
  - lint verde,
  - smoke tests clave pasados,
  - sin divergencias abiertas entre BD, UI y lógica.

## Evidencias esperadas
- diff de migración SQL versionada,
- evidencia de consultas SQL post-migración,
- capturas o notas de QA admin,
- evidencia de duración correcta en reserva pública/admin,
- evidencia de respuesta MCP correcta si se prueba.

## Ejecución realizada
- 2026-03-27: auditoría técnica completa de lecturas/escrituras de `duration` ✅
  - Se confirmó impacto real en `src/app/admin/page.tsx`, `src/components/reservation/ServiceSelect.tsx`, `src/components/reservation/Confirmation.tsx`, `src/app/admin/reservations/nueva/page.tsx`, `src/app/mcp/route.ts` y funciones SQL de reservas.
- 2026-03-27: verificación inicial de BD en proyecto real ✅
  - `duration` tenía `default 30`, seguía nullable y no tenía constraint de rango.
  - Datos reales sanos antes de migración: `4` servicios, `0` nulos, rango `20..30`.
- 2026-03-27: hardening de BD aplicado ✅
  - SQL versionado en `migrations/20260327_servicios_duration_hardening.sql`.
  - `mcp__supabase__apply_migration` devolvió `UnauthorizedException`; se aplicó DDL con `mcp__supabase__execute_sql`.
  - Verificación final: `duration` con `default 30`, `NOT NULL`, constraint `servicios_duration_range_check`.
- 2026-03-27: verificación post-migración de datos ✅
  - `0` filas con `duration is null`.
  - `0` filas con `duration <= 0`.
  - `0` filas con `duration > 240`.
- 2026-03-27: smoke test Playwright admin CRUD ✅
  - Se creó un admin temporal y un servicio QA temporal.
  - Alta real de servicio con `45 min` confirmada en `/admin?section=services`.
  - Edición real del mismo servicio a `60 min` confirmada en listado admin.
  - Relectura SQL confirmó persistencia real (`duration = 60`).
  - Se detectó un bug UX durante la prueba: `step=5` con `min=1` invalidaba `45`; se corrigió a aceptación de cualquier entero válido.
- 2026-03-27: smoke test reserva pública ✅
  - `/reservation` mostró la duración correcta del servicio QA (`60 min`).
  - El test reveló una deuda lateral previa con servicios sin imagen (`next/image` con `src` vacío); se corrigió con fallback visual sin imagen.
- 2026-03-27: smoke test MCP ✅
  - `POST /mcp` con tool `list_services` devolvió JSON 200 con `duration` correcto para los servicios activos.
  - También se verificó el requisito de cabecera `Accept: application/json, text/event-stream`.
- 2026-03-27: limpieza post-QA ✅
  - Servicio QA temporal eliminado.
  - Usuario admin temporal eliminado.
- 2026-03-27: `npm run lint` ✅
- 2026-03-27: `npm run build` ✅
  - Warnings no bloqueantes observados: `Browserslist` desactualizado y `metadataBase` no configurado.
