# Implementación: duración de servicios end-to-end

## Resumen
Este pack documenta la corrección integral del campo `duration` en `public.servicios` para que la duración de los servicios sea gestionable, validable y fiable de punta a punta: panel admin, UI pública de reserva, reserva admin, MCP/ChatGPT Apps, tipado TypeScript y reglas de base de datos.

Actualmente el sistema tiene una inconsistencia estructural: la base de datos y el motor de reservas usan `duration`, pero el CRUD admin de servicios no permite editarla ni la persiste. El objetivo es cerrar esa brecha sin dejar deuda técnica ni huecos de consistencia.

## Objetivo y alcance

### Objetivo
Dejar la duración de servicios como un contrato robusto del sistema, con estas garantías:
- siempre existe un valor válido a nivel de datos,
- el admin puede crear/editar la duración sin ambigüedad,
- todos los consumidores del dato leen el mismo contrato,
- las validaciones impiden estados inválidos,
- el sistema queda preparado para escalar a más servicios, más centros y más superficies consumidoras.

### Alcance
Incluye:
- endurecimiento del modelo de datos de `public.servicios.duration`,
- saneamiento/backfill si hiciera falta,
- UI admin de creación/edición de servicios,
- listado admin con visibilidad de duración,
- contrato TypeScript de `Service`,
- coherencia en reserva pública, reserva admin y MCP,
- documentación/contexto asociado,
- QA técnico y funcional.

### No-objetivos
- rediseñar por completo la pantalla admin de servicios,
- introducir precios dinámicos por centro o por estilista,
- soportar duraciones variables por empleado/slot,
- reescribir el flujo completo de reservas,
- cambiar la semántica funcional de cómo el motor SQL calcula disponibilidad más allá de reforzar el contrato de entrada.

## Decisiones tomadas en esta sesión
- `duration` pasa a tratarse como dato de negocio de primer nivel, no como campo opcional accidental.
- La fuente de verdad del valor seguirá siendo `public.servicios.duration`.
- La robustez deseada exige cubrir las 3 capas: BD, backend/consumidores y admin UI.
- La estrategia preferida es "hardening + compatibilidad controlada": primero asegurar datos válidos, luego endurecer tipos/validaciones y por último retirar opcionalidad innecesaria.
- Rango recomendado para este proyecto: `1..240` minutos a nivel técnico, con UX orientada a valores habituales de peluquería. Recomendación operativa: mantener `30` como default inicial y permitir cualquier entero válido dentro del rango técnico.

## Pendientes de decisión
- **Pendiente de decisión:** si la UI admin debe restringir la entrada a saltos de 5 minutos o permitir cualquier entero.
- **Recomendación:** permitir cualquier entero válido en BD (`1..240`) y, en UI, usar `step=5` solo como ayuda ergonómica, no como limitación dura del sistema.

## Arquitectura propuesta

### 1. Capa de datos
Contrato objetivo para `public.servicios`:
- `duration` no nulo,
- `default 30`,
- `check (duration > 0 and duration <= 240)`.

Secuencia robusta:
1. Auditar datos actuales.
2. Backfill de `null` o valores inválidos a `30` si existieran.
3. Aplicar default.
4. Aplicar constraint de rango.
5. Aplicar `NOT NULL`.

Esto evita que futuras escrituras externas vuelvan a introducir estados inválidos.

### 2. Capa TypeScript / contrato local
El tipo `Service` debe reflejar el contrato real final:
- transición de `duration?: number` a `duration: number` una vez endurecida la BD.
- revisar consumidores que hoy usan `service.duration || 30` y decidir si se mantienen como fallback defensivo temporal o se simplifican cuando el contrato quede blindado.

### 3. Capa admin
En `src/app/admin/page.tsx`:
- incluir campo `duration` en estado inicial,
- mostrar input específico en crear/editar,
- persistirlo en `insert` y `update`,
- precargarlo al editar,
- resetearlo correctamente al cancelar,
- mostrar duración en el listado para verificación visual.

### 4. Consumidores funcionales
Superficies a revisar/confirmar:
- reserva pública (`ServiceSelect`, `Confirmation`),
- reserva admin (`admin/reservations/nueva`),
- MCP (`list_services`),
- cualquier query/admin screen que consuma `servicios`.

### 5. Documentación
Actualizar `context.md` solo si el contrato final cambia de forma relevante respecto al comportamiento descrito (por ejemplo, `duration` ya no opcional y BD blindada). También dejar trazabilidad en este pack.

## Plan por fases

## Fase 1 - Auditoría y diseño de contrato
### Entregables
- inventario de todos los consumidores de `duration`,
- decisión final del contrato técnico/UX,
- plan de migración y compatibilidad.

### Criterios de aceptación
- existe mapa completo de impacto,
- se han detectado escrituras, lecturas y riesgos,
- quedan definidas reglas de validación y rollout.

## Fase 2 - Hardening de base de datos
### Entregables
- migración SQL versionada para backfill + default + constraint + not null,
- verificación real en Supabase proyecto `tvdwepumtrrjpkvnitpw`.

### Criterios de aceptación
- `duration` nunca puede quedar nulo o fuera de rango,
- los datos existentes cumplen el contrato,
- no hay regresión en funciones SQL que calculan disponibilidad/reserva.

## Fase 3 - Admin CRUD robusto
### Entregables
- formulario admin con duración editable,
- persistencia create/edit,
- listado admin con duración visible,
- validaciones UX y mensajes claros.

### Criterios de aceptación
- se puede crear servicio con duración válida,
- se puede editar una duración existente,
- al reabrir el formulario se persiste correctamente,
- no se puede guardar un valor inválido.

## Fase 4 - Coherencia end-to-end de consumidores
### Entregables
- revisión/ajuste de tipado `Service`,
- simplificación o mantenimiento deliberado de fallbacks,
- confirmación de compatibilidad en reserva pública, reserva admin y MCP.

### Criterios de aceptación
- todos los consumidores leen el mismo contrato,
- no hay divergencia entre UI y motor de reservas,
- el uso de fallback está justificado o eliminado.

## Fase 5 - QA, documentación y cierre
### Entregables
- lint verde,
- smoke tests funcionales,
- evidencia de comportamiento correcto,
- `context.md` actualizado si aplica,
- pack listo para cierre.

### Criterios de aceptación
- gates de pruebas superados,
- sin bloqueos abiertos,
- documentación alineada con el estado real.

## Riesgos y mitigaciones

### Riesgo 1: endurecer tipos antes que la BD
- **Impacto:** errores runtime si aún entra un `null` desde datos viejos.
- **Mitigación:** primero migración y verificación real, luego endurecimiento TypeScript.

### Riesgo 2: UI admin valida distinto que BD
- **Impacto:** frustración de usuario o rechazo inesperado al guardar.
- **Mitigación:** alinear reglas: mismo rango técnico y mensajes explícitos.

### Riesgo 3: consumidores mantienen fallbacks opacos
- **Impacto:** se esconden bugs de datos futuros.
- **Mitigación:** documentar qué fallback es temporal y retirar el innecesario una vez blindada la BD.

### Riesgo 4: regresión silenciosa en reserva
- **Impacto:** cálculo incorrecto de hora fin o disponibilidad.
- **Mitigación:** smoke tests con servicios de distintas duraciones (20/30/45/60 si se crean datos QA).

### Riesgo 5: deuda técnica documental
- **Impacto:** futuros cambios vuelven a tratar `duration` como opcional accidental.
- **Mitigación:** actualizar contexto y dejar este pack como referencia operativa.

## Plan de despliegue / rollout
1. Confirmar contrato final y preparar migración.
2. Aplicar migración en entorno real con verificación posterior.
3. Implementar cambios UI/admin y tipado.
4. Ejecutar lint y smoke tests locales.
5. Verificar manualmente flujos clave:
   - crear servicio,
   - editar duración,
   - comprobar visibilidad en reserva pública,
   - comprobar visibilidad en reserva admin,
   - comprobar MCP/listado de servicios si aplica.
6. Actualizar documentación y cerrar pack.

## Definition of Done
Se considerará terminado solo si:
- `public.servicios.duration` queda blindado por BD,
- el admin permite crear/editar duración correctamente,
- el listado admin muestra duración,
- los consumidores clave siguen funcionando con el contrato final,
- el tipado local está alineado con la realidad del dato,
- `npm run lint` pasa,
- hay smoke tests manuales documentados,
- no quedan decisiones estructurales abiertas ni fallbacks ambiguos sin justificar.

## Outcome summary

### Qué se implementó
- Hardening completo del contrato de `public.servicios.duration` en base de datos:
  - `default 30`
  - `NOT NULL`
  - `CHECK duration > 0 AND duration <= 240`
- CRUD admin de servicios completado para gestionar duración de forma real:
  - alta
  - edición
  - persistencia
  - visibilidad en listado
  - validación UX
- Alineación end-to-end de consumidores:
  - reserva pública
  - confirmación de reserva
  - reserva admin
  - MCP `list_services`
  - tipado local de `Service`
- Centralización de la lógica defensiva en `src/lib/serviceDuration.ts`.
- Corrección de una deuda lateral descubierta durante QA: fallback visual para servicios sin imagen en listados públicos.

### Qué se cambió vs plan original
- El plan original contemplaba evaluar `step=5` como ayuda de UX; durante la ejecución se verificó que esa decisión rompía valores válidos como `45` por la combinación con `min=1`. Se descartó y se dejó aceptación de cualquier entero válido.
- Además del alcance inicial sobre `duration`, se corrigió un problema colateral real de `next/image` con `src` vacío en servicios sin imagen, porque afectaba directamente a la robustez del flujo de QA end-to-end.
- La DDL no pudo aplicarse con `mcp__supabase__apply_migration` y se ejecutó mediante `mcp__supabase__execute_sql`, dejando igualmente la migración versionada en el repo.

### Pendientes
- QA manual final del usuario.
- Si se desea endurecer aún más el release hygiene, queda fuera de este pack actualizar warnings no bloqueantes globales:
  - `Browserslist` desactualizado
  - `metadataBase` no configurado

### Riesgos conocidos post-release
- No quedan riesgos estructurales abiertos sobre `duration` dentro del alcance de este pack.
- Persisten warnings globales no bloqueantes de build que no afectan a la funcionalidad de duración.
- Si en el futuro aparece otra superficie que escriba en `servicios` fuera del CRUD actual, deberá respetar el contrato BD ya blindado; la base de datos evitará estados inválidos, pero la UX de esa nueva superficie tendría que alinearse explícitamente.
