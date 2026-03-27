# Checklist de implementación

## Fase 1 - Auditoría y diseño de contrato

### Tareas
- [x] Inventariar todas las lecturas/escrituras de `duration` en frontend, admin, MCP y SQL.
- [x] Confirmar contrato objetivo de BD: `default`, `range check`, `not null`.
- [x] Decidir estrategia de fallback transitorio y retirada.
- [x] Definir validaciones UX del campo duración en admin.

### Tests
- [x] Revisión técnica de impacto completada y trazada.
- [x] Validación de que no hay consumidores ocultos sin revisar.

### Notas/decisiones
- Recomendación actual: contrato final no opcional, con BD blindada y UI alineada.
- Decisión aplicada: aceptar cualquier entero válido (`1..240`) y no forzar escalones en HTML; se detectó en QA que `step=5` con `min=1` invalidaba valores como `45`.

### Gate: tests de fase pasados
- [x] Gate Fase 1 aprobado.

---

## Fase 2 - Hardening de base de datos

### Tareas
- [x] Auditar `public.servicios.duration` en proyecto real.
- [x] Versionar migración SQL con backfill de valores inválidos/nulos si hiciera falta.
- [x] Aplicar `default 30`.
- [x] Aplicar constraint de rango (`>0` y `<=240`).
- [x] Aplicar `NOT NULL`.
- [x] Verificar que las funciones SQL de reservas siguen operativas.

### Tests
- [x] SQL de verificación post-migración ejecutado.
- [x] Comprobación de ausencia de `null` y valores inválidos.
- [x] Comprobación de integridad con funciones de booking/availability.

### Notas/decisiones
- La BD es la barrera final anti-deuda técnica.
- No endurecer tipos TS definitivos antes de esta fase.
- `mcp__supabase__apply_migration` no estuvo disponible; la DDL se aplicó con `execute_sql` y quedó versionada en `migrations/20260327_servicios_duration_hardening.sql`.

### Gate: tests de fase pasados
- [x] Gate Fase 2 aprobado.

---

## Fase 3 - Admin CRUD robusto

### Tareas
- [x] Añadir `duration` al estado inicial del formulario de servicios.
- [x] Añadir input de duración en crear/editar servicio.
- [x] Añadir validación cliente y mensajes claros.
- [x] Persistir `duration` en `insert`.
- [x] Persistir `duration` en `update`.
- [x] Precargar `duration` al editar.
- [x] Resetear `duration` correctamente al cancelar/cerrar.
- [x] Mostrar duración en la lista de servicios del admin.

### Tests
- [x] Crear servicio con duración válida.
- [x] Editar servicio existente cambiando duración.
- [x] Reabrir formulario y verificar persistencia.
- [x] Bloquear guardado de duración inválida.

### Notas/decisiones
- Mostrar la duración en el listado reduce QA ciega y evita deuda operativa.
- Mantener copy visible en francés.

### Gate: tests de fase pasados
- [x] Gate Fase 3 aprobado.

---

## Fase 4 - Coherencia end-to-end de consumidores

### Tareas
- [x] Revisar y ajustar `src/lib/supabase.ts` para reflejar el contrato final.
- [x] Revisar `ServiceSelect` y `Confirmation`.
- [x] Revisar `admin/reservations/nueva`.
- [x] Revisar MCP `list_services`.
- [x] Decidir y aplicar retirada o conservación explícita de fallbacks.

### Tests
- [x] Reserva pública muestra duración correcta.
- [x] Confirmación calcula hora fin correcta.
- [x] Reserva admin muestra duración correcta.
- [x] MCP devuelve duración correcta.

### Notas/decisiones
- Esta fase evita cerrar en falso con un fix solo visual en admin.
- Si se mantiene algún fallback, debe quedar documentado y justificado.
- Se centralizó la defensa en `src/lib/serviceDuration.ts`.
- El smoke test descubrió una deuda lateral previa: crear servicios sin imagen rompía listados públicos con `next/image`; se corrigió añadiendo fallback visual sin imagen en `Services` y `reservation/ServiceSelect`.

### Gate: tests de fase pasados
- [x] Gate Fase 4 aprobado.

---

## Fase 5 - QA final, documentación y cierre

### Tareas
- [x] Ejecutar `npm run lint`.
- [x] Ejecutar smoke tests funcionales de admin y reserva.
- [x] Actualizar `context.md` si el contrato final cambia de forma relevante.
- [x] Registrar evidencias y resultados en `tests.md`/`status.md`.
- [x] Dejar el pack listo para cierre.

### Tests
- [x] Lint en verde.
- [x] QA manual de crear/editar duración.
- [x] QA manual de reserva pública/admin.
- [x] Verificación final sin bloqueos.

### Notas/decisiones
- No cerrar el pack si el contrato queda a medias o con validaciones divergentes.

### Gate: tests de fase pasados
- [x] Gate Fase 5 aprobado.
