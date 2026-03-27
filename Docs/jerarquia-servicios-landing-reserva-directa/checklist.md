# Checklist de implementación

## Fase 1 - Modelo de datos y migración base

### Tareas
- [x] Diseñar esquema final de `service_groups`.
- [x] Diseñar esquema final de `service_subgroups`.
- [x] Diseñar extensión de `public.servicios` (`slug`, `group_id`, `subgroup_id`, `sort_order`, `landing_featured`, `landing_sort_order`).
- [x] Definir índices únicos por slug y nombre entre hermanos.
- [x] Definir validaciones para máximo 6 destacados landing.
- [x] Versionar migración SQL en `migrations/`.
- [x] Crear grupo inicial `Servicios` y subgrupo inicial `General`.
- [x] Migrar todos los servicios actuels à `Services > General`.
- [x] Backfill de slugs y órdenes iniciales.

### Tests
- [x] Migración ejecuta sin errores.
- [x] No quedan servicios huérfanos.
- [x] Todos los servicios actuales quedan clasificados.
- [x] Slugs generados correctamente.
- [x] Datos legacy siguen siendo reservables por `service_id`.

### Notas/decisiones
- Grupo obligatorio; subgrupo opcional.
- El modo del grupo se define por el primer hijo.
- Un grupo no puede mezclar servicios directos y subgrupos.
- Servicios con borrado real permitido; grupos y subgrupos eliminables solo si están vacíos.

### Gate: tests de fase pasados
- [x] Gate Fase 1 aprobado.

---

## Fase 2 - Capa de lectura jerárquica y contratos

### Tareas
- [x] Definir shape jerárquico reutilizable para reserva/admin/MCP.
- [x] Centralizar cálculo de visibilidad efectiva.
- [x] Centralizar contadores visibles efectivos.
- [x] Implementar resolución por `service.slug` para deep-link.
- [x] Definir contrato de servicios destacados para landing.

### Tests
- [x] El árbol compuesto refleja grupos, subgrupos y servicios correctamente.
- [x] Los contadores públicos coinciden con contenido visible efectivo.
- [x] La visibilidad efectiva hereda correctamente.
- [x] La resolución por slug funciona para caso válido e inválido.

### Notas/decisiones
- El frontend no debe duplicar lógica de visibilidad ni composición jerárquica.
- `list_services` debe salir ya jerárquico desde backend/helper central.

### Gate: tests de fase pasados
- [x] Gate Fase 2 aprobado.

---

## Fase 3 - Reserva pública jerárquica

### Tareas
- [x] Sustituir lista plana inicial por pasos Grupo/Subgrupo/Servicio.
- [x] Implementar paso Grupo con imagen opcional, descripción y contador.
- [x] Implementar paso Subgrupo con descripción opcional y contador.
- [x] Implementar paso Servicio con cards completas.
- [x] Implementar autoavance en selección de grupo/subgrupo.
- [x] Implementar encabezado contextual + volver.
- [x] Adaptar barra de progreso al flujo real.
- [x] Implementar lógica “grupo modo servicios → va directo à services”.
- [x] Implementar lógica “omitir subgrupo solo con 1 subgrupo visible y flag activo”.
- [x] Implementar soporte `/reservation?service=<slug>`.
- [x] Implementar fallback al paso inicial con mensaje claro para slug inválido/no reservable.

### Tests
- [x] Grupo en modo servicios entra directo a servicios.
- [x] Grupo en modo subgrupos entra a subgrupos.
- [x] Omisión de subgrupo funciona solo cuando toca.
- [x] Card de servicio selecciona y avanza.
- [x] Progreso refleja pasos reales.
- [x] Deep-link válido precarga servicio.
- [x] Deep-link inválido hace fallback con mensaje.
- [x] Móvil sin overflow horizontal.

### Notas/decisiones
- Sin buscador público.
- Contadores públicos solo sobre visible efectivo.
- Grupos/subgrupos sin contenido visible no se muestran.

### Gate: tests de fase pasados
- [x] Gate Fase 3 aprobado.

---

## Fase 4 - Admin de servicios jerárquico

### Tareas
- [x] Refactorizar `/admin?section=services` a árbol expandible.
- [x] Añadir búsqueda global sobre grupos/subgrupos/servicios.
- [x] Añadir badges de tipo, visibilidad configurada y efectiva.
- [x] Añadir side panel reutilizable para grupo/subgrupo/servicio.
- [x] Añadir acciones contextuales “crear aquí”.
- [x] Añadir orden manual `subir / bajar` en el árbol.
- [x] Añadir toggle rápido de visibilidad en el árbol.
- [x] Añadir menús `...` por nodo.
- [x] Implementar validaciones de modo exclusivo del grupo.
- [x] Implementar mover elementos con bloqueo y mensaje claro si el destino es incompatible.
- [x] Recordar estado abierto/cerrado del árbol durante la sesión.

### Tests
- [x] Crear primer hijo define modo del grupo correctamente.
- [x] No permite mezclar servicios directos y subgrupos.
- [x] Mover a destino válido funciona.
- [x] Mover a destino inválido bloquea con mensaje claro.
- [x] Toggle de visibilidad actualiza visibilidad efectiva correctamente.
- [x] Orden por ámbito correcto funciona.
- [x] El árbol muestra ocultos por defecto.
- [x] Responsive admin sin overflow horizontal.

### Notas/decisiones
- Solo rol `admin`.
- Sin borrado duro.
- Side panel siguiendo patrón de centros/estilistas.

### Gate: tests de fase pasados
- [x] Gate Fase 4 aprobado.

---

## Fase 5 - Landing destacados

### Tareas
- [x] Añadir campos/estado de destacados landing al modelo de servicio.
- [x] Añadir toggle `destacar en landing` en admin.
- [x] Añadir `landing_sort_order` en admin.
- [x] Bloquear selección de más de 6 destacados con mensaje claro.
- [x] Actualizar `src/components/Services.tsx` para mostrar solo destacados válidos.
- [x] Ordenar landing por `landing_sort_order`.
- [x] Convertir card de landing en acceso directo a `/reservation?service=<slug>`.
- [x] Filtrar landing para no mostrar destacados ocultos/no reservables.

### Tests
- [x] La landing muestra solo destacados seleccionados manualmente.
- [x] Nunca muestra más de 6.
- [x] Si hay menos de 6, muestra solo los existentes.
- [x] Click en card abre reserva con servicio preseleccionado.
- [x] Destacado oculto/no reservable desaparece de landing.
- [x] El séptimo destacado se bloquea con mensaje claro.

### Notas/decisiones
- Gestión de destacados dentro del admin de servicios.
- No rellenar automáticamente hasta 6.

### Gate: tests de fase pasados
- [x] Gate Fase 5 aprobado.

---

## Fase 6 - Admin estilistas y MCP/API

### Tareas
- [x] Refactorizar asignación de servicios a estilistas a vista jerárquica.
- [x] Hacer grupos y subgrupos colapsables en esa vista.
- [x] Mostrar badge en servicios ocultos asignables.
- [x] Actualizar `list_services` a formato jerárquico.
- [x] Incluir contadores y visibilidad efectiva precalculados.
- [x] Incluir metadatos de destacados landing si aplica al contrato.

### Tests
- [x] La asignación de servicios a estilistas sigue funcionando.
- [x] Servicios ocultos siguen siendo asignables con badge.
- [x] `list_services` devuelve jerarquía correcta.
- [x] Respuestas incluyen visibilidad efectiva y contadores.

### Notas/decisiones
- El booking posterior sigue por `service_id`.
- MCP/listado auxiliar alineado con modelo real.

### Gate: tests de fase pasados
- [x] Gate Fase 6 aprobado.

---

## Fase 7 - QA final y documentación

### Tareas
- [x] Ejecutar `npm run lint`.
- [x] Reemplazar alerts/confirms nativos por modales estilizados en gestión de servicios.
- [x] Permitir borrado real de servicios desde menú y panel lateral de edición.
- [x] Permitir borrado de grupos y subgrupos vacíos.
- [x] Mantener acción de eliminar visible en grupos/subgrupos con modal explicativo si no están vacíos.
- [x] Añadir acción de conversión de subgrupo único a servicios directos.
- [x] Simplificar navegación pública quitando la tarjeta `Parcours`.
- [x] Integrar fondo experimental 16:9 en `/reservation`.
- [x] Ejecutar `npm run build`.
- [x] Hacer smoke tests de reserva pública.
- [x] Hacer smoke tests de admin de servicios.
- [x] Hacer smoke tests de landing destacados.
- [x] Hacer smoke tests de admin de estilistas.
- [x] Verificar deep-links `/reservation?service=<slug>`.
- [x] Actualizar `context.md` con el nuevo modelo.
- [x] Registrar evidencias y resultados en `tests.md` y `status.md`.

### Tests
- [x] Lint en verde.
- [x] Build en verde.
- [x] QA manual de grupos/subgrupos/servicios.
- [x] QA manual de destacados landing.
- [x] QA manual de enlace directo a reserva.
- [x] QA manual de asignación de estilistas.

### Notas/decisiones
- QA manual completado con Playwright el 2026-03-27.
- La funcionalidad principal de jerarquía, landing destacados y deep-link de reserva funciona.
- Incidencias bloqueantes resueltas durante la revalidación final:
  - la búsqueda del árbol de servicios ya filtra correctamente,
  - editar un estilista ya no lanza `401 Unauthorized` en cargas auxiliares ni muestra `Authentification requise`.

### Gate: tests de fase pasados
- [x] Gate Fase 7 aprobado.
