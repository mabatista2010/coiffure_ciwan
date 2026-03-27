# Implementación: jerarquía de servicios + landing con reserva directa

## Resumen
Este pack documenta la implementación completa y robusta del nuevo sistema de catálogo de servicios para el salón, sustituyendo el modelo plano actual por una estructura organizada, escalable y operativa para tres superficies críticas del producto:
- reserva pública,
- administración de servicios,
- sección de servicios de la landing page.

La solución acordada introduce una jerarquía de negocio con **grupos**, **subgrupos opcionales** y **servicios**, manteniendo `public.servicios` como base para no romper reservas, asignaciones a estilistas ni el motor actual de disponibilidad. Además, la landing dejará de mostrar automáticamente todos los servicios y pasará a mostrar una selección curada manualmente de hasta 6 servicios, con acceso directo a la reserva del servicio ya preseleccionado.

## Objetivo y alcance

### Objetivo
Dejar resuelto de forma robusta el problema actual de caos en catálogos grandes, con estas garantías:
- el salón puede organizar servicios por grupos y subgrupos cuando lo necesite,
- la reserva pública deja de mostrar listas planas gigantes,
- el admin pasa a tener una gestión jerárquica clara,
- la asignación de servicios a estilistas sigue siendo operativa y mejora su usabilidad,
- la landing puede destacar un conjunto pequeño y controlado de servicios con enlace directo a reservar,
- no se rompe la lógica actual de disponibilidad/reserva basada en `service_id`.

### Alcance
Incluye:
- nuevo modelo de datos para grupos y subgrupos,
- extensión de `public.servicios` para jerarquía, slug, orden y destacados de landing,
- migración automática inicial de los servicios existentes,
- rediseño de la UX pública de selección de servicio,
- rediseño de la sección admin de servicios,
- actualización de la selección de servicios en admin de estilistas,
- actualización de `list_services` / MCP a formato jerárquico,
- actualización de la sección `Services` de la landing,
- documentación y QA asociados.

### No-objetivos
No incluye en esta implementación:
- categorías infinitas o árbol libre sin límite,
- buscador en reserva pública,
- drag & drop para ordenar,
- borrado físico desde UI,
- promociones avanzadas, “destacados” comerciales más allá de landing,
- cambios en la semántica del motor de reservas más allá de la selección previa del servicio,
- SEO/URLs públicas jerárquicas completas para grupos/subgrupos.

## Decisiones tomadas en esta sesión

### Arquitectura y profundidad
1. La estructura objetivo es jerárquica y robusta, centrada en **Grupo / Subgrupo / Servicio**.
2. La jerarquía se limita funcionalmente a **3 niveles**.
3. Se descarta un árbol infinito o genérico por complejidad innecesaria.
4. Se mantiene `public.servicios` como tabla base y se extiende alrededor, sin rehacer todo desde cero.

### Modelo funcional real
5. **Grupo obligatorio**.
6. **Subgrupo opcional**.
7. Un servicio podrá colgar:
   - directamente de un grupo, o
   - de un subgrupo dentro de un grupo.
8. Cada grupo tiene un modo exclusivo:
   - modo servicios directos,
   - o modo subgrupos.
9. Un grupo **no puede mezclar** servicios directos y subgrupos a la vez.
10. El modo del grupo se define automáticamente por el **primer hijo** creado.
11. El grupo podrá cambiar de modo solo si antes queda vacío.
12. Cada servicio pertenece a un único padre lógico:
   - o grupo,
   - o subgrupo.
13. Servicio directo de grupo:
   - `group_id` informado,
   - `subgroup_id = null`.
14. Servicio dentro de subgrupo:
   - `subgroup_id` informado,
   - el grupo se deriva del subgrupo.
15. No se guardará doble referencia de dominio obligatoria si introduce inconsistencias; el grupo del servicio en subgrupo se trata como derivado.

### Reserva pública UX
16. La reserva pública se rediseña como flujo guiado.
17. Patrón público base: **3 pasos guiados** para selección del catálogo.
18. Paso Grupo:
   - nombre,
   - imagen opcional,
   - descripción corta,
   - contador visible efectivo.
19. Paso Subgrupo:
   - nombre,
   - descripción opcional,
   - contador,
   - sin imagen.
20. Paso Servicio:
   - cards completas,
   - nombre,
   - descripción,
   - precio,
   - duración,
   - imagen opcional con fallback.
21. Selección de grupo y subgrupo con **autoavance**.
22. La card completa del servicio será clicable.
23. El encabezado del paso público mostrará **contexto completo**.
24. No habrá buscador en reserva pública.
25. La barra de progreso se adaptará al flujo real y a los pasos realmente activos.
26. Contadores públicos calculados solo con contenido **visible efectivo**.
27. Grupos/subgrupos sin contenido reservable no aparecen públicamente.

### Regla de subgrupos y omisión de paso
28. Por defecto, si un grupo está en modo subgrupos, se muestra el paso de subgrupo.
29. Existirá una opción de admin para **omitir el paso de subgrupo**, pero solo aplicará cuando el grupo tenga exactamente **1 subgrupo visible**.
30. Si un grupo tiene 2 o más subgrupos visibles, el paso de subgrupos se fuerza siempre.
31. Si se omite el subgrupo, la vista siguiente muestra una **lista única de servicios**.
32. Si el grupo está en modo servicios directos, al pulsarlo se entra directamente al paso Servicio.

### Admin de servicios UX
33. El admin se rediseña como **árbol expandible + side panel reutilizable**.
34. Se usará el patrón ya existente en otras secciones como centros o estilistas.
35. Se mostrarán también elementos ocultos por defecto.
36. Habrá **búsqueda global** en admin sobre grupos, subgrupos y servicios.
37. El árbol recordará nodos abiertos/cerrados durante la sesión actual.
38. No habrá drag & drop.
39. El orden manual se gestionará con botones **subir / bajar**.
40. El orden se editará en el propio árbol, no en vista aparte.
41. Habrá acciones contextuales **crear aquí**.
42. Cada nodo tendrá menú `...` para acciones, no una fila llena de botones.
43. La visibilidad podrá cambiarse desde el árbol con toggle rápido y también desde el panel lateral.
44. El side panel será único y reutilizable para grupo, subgrupo y servicio.
45. En admin se mostrará:
   - visibilidad configurada,
   - visibilidad efectiva.
46. Si el movimiento o creación rompe reglas del modelo, se bloqueará con **mensaje claro**.

### Visibilidad y publicación
47. Grupos, subgrupos y servicios tienen visibilidad propia.
48. La visibilidad efectiva **hereda hacia abajo**.
49. Si un grupo está oculto, nada debajo aparece públicamente.
50. Si un subgrupo está oculto, sus servicios no aparecen públicamente.
51. Si un grupo/subgrupo visible queda sin contenido visible, se permite y simplemente no aparece en público.
52. Si se oculta un grupo o subgrupo con hijos visibles, se permite; los hijos quedan efectivamente ocultos por herencia.
53. Los servicios ocultos siguen pudiendo asignarse a estilistas en admin, con badge claro.

### Borrado y seguridad operativa
54. No habrá borrado duro desde UI para grupos, subgrupos ni servicios.
55. La operación segura será **ocultar/desactivar**.
56. No se permitirá borrar un nodo con hijos cuando la acción dependa de vaciar la estructura; debe mostrarse mensaje claro explicando por qué.
57. La gestión de esta jerarquía será **solo para rol admin**.

### Nombres, slugs y duplicados
58. Grupos, subgrupos y servicios tendrán `slug`.
59. El slug se autogenera desde el nombre.
60. El slug será editable manualmente.
61. Si el slug era automático y cambia el nombre, se regenera.
62. Si fue editado manualmente, se respeta.
63. El slug es único por tipo:
   - único entre grupos,
   - único entre subgrupos,
   - único entre servicios.
64. Si el slug manual colisiona, se bloquea y se pide corrección.
65. Si el slug automático colisiona, se añade sufijo automático (`-2`, `-3`, etc.).
66. No se permitirán nombres duplicados entre hermanos.

### Orden
67. Orden global para grupos.
68. Orden local al grupo para subgrupos.
69. Orden local al padre para servicios.
70. El orden visible público será manual.

### Landing page
71. La sección de servicios de la landing dejará de mostrar todos los servicios.
72. El salón seleccionará manualmente qué servicios mostrar en landing.
73. Máximo **6** servicios destacados en landing.
74. Esa selección se gestionará dentro del admin de servicios.
75. Cada servicio podrá tener:
   - toggle `destacar en landing`,
   - `landing_sort_order`.
76. Si ya hay 6 destacados y se intenta marcar un séptimo, se bloqueará con mensaje claro.
77. Si hay menos de 6 destacados, la landing mostrará solo esos.
78. Un servicio destacado solo aparecerá en landing si sigue siendo **visible y reservable**.
79. Las cards de landing enlazarán a `/reservation?service=<service-slug>`.
80. Ese enlace debe precargar el servicio y continuar desde el siguiente paso lógico.
81. Si el slug no es válido o el servicio ya no es reservable, habrá fallback al inicio de reserva con mensaje claro.

### MCP / API auxiliar
82. `list_services` debe pasar a devolver estructura jerárquica.
83. La respuesta debe incluir contadores y visibilidad efectiva ya calculados.
84. La lógica del booking posterior sigue usando `service_id`.

### Migración inicial
85. La migración inicial será automática.
86. Se creará:
   - grupo `Servicios`,
   - subgrupo `General`.
87. Todos los servicios actuales se moverán ahí.
88. Ese contenido quedará visible públicamente desde el primer momento porque el proyecto está en desarrollo.

## Arquitectura propuesta

### 1. Modelo de datos
Se propone añadir dos nuevas tablas:
- `public.service_groups`
- `public.service_subgroups`

Y extender `public.servicios` con columnas nuevas de jerarquía, orden y landing.

#### `public.service_groups`
Campos propuestos:
- `id` UUID o bigint según convención final elegida en ejecución.
- `name`
- `slug`
- `description` nullable
- `image_url` nullable
- `is_visible` boolean
- `skip_subgroup_step_when_single_visible_child` boolean
- `sort_order` integer
- `created_at`
- `updated_at`

#### `public.service_subgroups`
Campos propuestos:
- `id`
- `group_id`
- `name`
- `slug`
- `description` nullable
- `is_visible` boolean
- `sort_order` integer
- `created_at`
- `updated_at`

#### Extensión de `public.servicios`
Nuevas columnas:
- `slug`
- `group_id` nullable
- `subgroup_id` nullable
- `sort_order`
- `landing_featured`
- `landing_sort_order` nullable
- mantener `active` como visibilidad/publicación del servicio

### 2. Reglas de integridad
- un grupo no puede tener simultáneamente servicios directos y subgrupos,
- `subgroup_id` debe pertenecer al grupo correcto,
- nombre único entre hermanos,
- slug único por tipo,
- máximo 6 destacados landing activos,
- orden acotado al ámbito correcto.

La implementación podrá reforzarse con constraints, índices únicos parciales y/o validación de servidor, según dónde sea más seguro y mantenible.

### 3. Capa de consultas / composición
Conviene centralizar una capa que devuelva el árbol ya compuesto para evitar duplicar lógica en frontend:
- grupos visibles efectivos,
- subgrupos visibles efectivos,
- servicios visibles efectivos,
- contadores visibles efectivos,
- metadatos de landing,
- resolución de deep-link por `service.slug`.

Esto puede implementarse con una consulta server-side, una vista, RPC o helper backend; la decisión de detalle se tomará en ejecución según lo más robusto en el repo.

### 4. Reserva pública
El flujo público actual parte de una lista plana (`ServiceSelect`). Debe refactorizarse para soportar:
- selección jerárquica previa,
- progreso dinámico,
- preselección por slug desde query param,
- fallback robusto cuando la URL ya no es válida.

### 5. Admin de servicios
La sección actual `/admin?section=services` debe migrar de CRUD plano a un módulo jerárquico con:
- árbol principal,
- búsqueda,
- badges,
- toggles,
- side panel reutilizable,
- creación contextual,
- orden local y global,
- marcación de destacados landing.

### 6. Admin de estilistas
La asignación de servicios deberá consumir el árbol y renderizarse en formato jerárquico colapsable, manteniendo persistencia real en `stylist_services` por `service_id`.

### 7. Landing
`src/components/Services.tsx` debe pasar a consumir solo servicios destacados landing, ordenados manualmente, con acceso directo a reservar el servicio seleccionado.

## Plan por fases

## Fase 1 - Modelo de datos y migración base
### Entregables
- diseño final de tablas `service_groups` y `service_subgroups`,
- migración SQL versionada,
- extensión de `public.servicios`,
- backfill de slugs, orden y migración inicial a `Servicios > General`,
- índices y validaciones mínimas.

### Criterios de aceptación
- el esquema queda creado sin romper reservas existentes,
- todos los servicios existentes quedan clasificados,
- no hay servicios huérfanos,
- slugs y órdenes se generan correctamente,
- el modelo soporta grupo directo o subgrupo.

## Fase 2 - Capa de datos compuestos / contratos de lectura
### Entregables
- contrato jerárquico reutilizable para frontend/admin/MCP,
- cálculo centralizado de visibilidad efectiva,
- cálculo centralizado de contadores visibles,
- resolución de servicio por slug para deep-link.

### Criterios de aceptación
- el frontend no necesita recomputar jerarquía compleja,
- los contadores coinciden con el contenido visible efectivo,
- la resolución de slug funciona con servicios válidos e inválidos.

## Fase 3 - Reserva pública jerárquica
### Entregables
- nuevos pasos Grupo/Subgrupo/Servicio,
- progreso dinámico,
- encabezado contextual,
- autoavance en niveles previos,
- soporte `/reservation?service=<slug>`.

### Criterios de aceptación
- los usuarios no ven listas planas gigantes,
- los grupos en modo servicios van directo a servicios,
- la lógica de subgrupos y omisión funciona según lo acordado,
- el deep-link a servicio funciona y hace fallback correcto cuando aplica.

## Fase 4 - Admin de servicios jerárquico
### Entregables
- árbol expandible,
- side panel reutilizable,
- búsqueda global,
- badges de visibilidad configurada/efectiva,
- toggles rápidos,
- orden subir/bajar,
- acciones crear aquí,
- restricciones de modo de grupo,
- soporte de mover elementos con validación.

### Criterios de aceptación
- el admin puede crear y editar grupos, subgrupos y servicios,
- el sistema bloquea mezclas inválidas,
- la visibilidad efectiva se entiende sin ambigüedad,
- el orden se aplica en el ámbito correcto,
- no hay overflow horizontal en mobile/tablet.

## Fase 5 - Destacados landing
### Entregables
- campos de destacado landing en servicios,
- UI de marcado y orden en admin,
- límite de 6 con mensaje claro,
- `Services.tsx` actualizado para mostrar solo destacados válidos,
- click directo a reserva preseleccionada.

### Criterios de aceptación
- la landing muestra solo los servicios seleccionados manualmente,
- nunca muestra más de 6,
- respeta el orden landing,
- nunca muestra servicios no visibles/no reservables,
- el click abre reserva con servicio precargado.

## Fase 6 - Admin de estilistas y MCP/API
### Entregables
- selector jerárquico de servicios en estilistas,
- `list_services` jerárquico,
- metadatos de visibilidad efectiva y contadores en respuestas.

### Criterios de aceptación
- la asignación a estilistas sigue operativa,
- los servicios ocultos pueden prepararse sin perder contexto,
- MCP/listado auxiliar refleja el nuevo modelo real.

## Fase 7 - QA final y documentación
### Entregables
- `context.md` actualizado,
- lint/build/smokes ejecutados,
- evidencias funcionales documentadas,
- pack listo para ejecución por fases.

### Criterios de aceptación
- gates de fase pasados,
- sin bloqueos críticos abiertos,
- documentación alineada con el estado real.

## Riesgos y mitigaciones

### Riesgo 1: duplicar lógica jerárquica en múltiples frontends
- **Impacto:** inconsistencias entre admin, reserva y landing.
- **Mitigación:** centralizar composición del árbol y visibilidad efectiva.

### Riesgo 2: mezclar modos de grupo accidentalmente
- **Impacto:** UX pública ambigua y estructura inconsistente.
- **Mitigación:** validación estricta al crear, mover y editar; mensajes claros.

### Riesgo 3: sobresimplificar el deep-link de landing
- **Impacto:** enlaces rotos o pantallas en estados inválidos.
- **Mitigación:** resolver por slug válido y fallback con mensaje claro al paso inicial.

### Riesgo 4: exceso de complejidad visual en admin
- **Impacto:** árbol difícil de usar y regresiones responsive.
- **Mitigación:** menú `...`, toggles acotados, side panel único y clases defensivas (`overflow-x-hidden`, `min-w-0`).

### Riesgo 5: destacados landing incoherentes con publicación real
- **Impacto:** servicio clicable en landing pero no reservable.
- **Mitigación:** filtrar landing por visibilidad efectiva y reservabilidad real.

### Riesgo 6: migración con servicios huérfanos o sin padre
- **Impacto:** errores en reserva, admin o landing.
- **Mitigación:** migración automática inicial a `Servicios > General` y constraints/validaciones posteriores.

## Plan de despliegue / rollout
1. Diseñar y versionar la migración de datos.
2. Aplicar modelo y backfill.
3. Implementar capa de lectura jerárquica.
4. Refactorizar reserva pública.
5. Refactorizar admin de servicios.
6. Incorporar destacados landing.
7. Actualizar admin de estilistas y MCP.
8. Ejecutar lint/build/QA funcional.
9. Actualizar `context.md` y dejar pack listo para cierre.

## Definition of Done
Se considerará terminado solo si:
- existe estructura Grupo/Subgrupo/Servicio operativa,
- la reserva pública usa el flujo guiado acordado,
- el admin de servicios es jerárquico, usable y seguro,
- la landing muestra hasta 6 servicios destacados elegidos manualmente,
- el click desde landing abre la reserva con servicio preseleccionado,
- la asignación de servicios a estilistas sigue operativa en formato jerárquico,
- `list_services` refleja el nuevo modelo,
- `context.md` queda actualizado,
- QA técnico y funcional quedan registrados,
- no quedan decisiones estructurales abiertas sobre este alcance.


## Outcome summary

### Qué se implementó realmente
- Jerarquía completa de catálogo con `service_groups`, `service_subgroups` y extensión de `public.servicios` para `slug`, orden, jerarquía y destacados landing.
- Migración inicial automática de servicios legacy a `Services > General`, con soporte posterior para grupos con servicios directos o con subgrupos.
- Reserva pública jerárquica con soporte `Group / Subgroup / Service`, deep-link `/reservation?service=<slug>`, reglas de salto para grupo único y subgrupo único, y copy público neutral cuando no conviene exponer la estructura interna.
- Landing con selección manual de hasta 6 servicios destacados y acceso directo a la reserva del servicio preseleccionado.
- Admin de servicios en árbol expandible con side panel reutilizable, búsqueda global, toggles de visibilidad y destacados landing, orden manual, menús contextuales y acciones de creación contextual.
- Asignación jerárquica de servicios a estilistas y contrato `list_services` jerárquico con visibilidad efectiva y contadores precalculados.
- Acción de conversión de grupo con subgrupo único a `services directs`, moviendo servicios al grupo y eliminando el subgrupo vacío mediante función SQL atómica.
- Sustitución de `alert/confirm` nativos por diálogos estilizados en la gestión de servicios.
- Borrado real de servicios desde menú y panel lateral, manteniendo integridad con `bookings.service_id -> SET NULL` y `stylist_services.service_id -> CASCADE`.
- Borrado de grupos y subgrupos cuando están vacíos, con la acción visible siempre y un modal explicativo cuando no se puede eliminar por contenido asociado.
- Ajuste UX en reserva para eliminar la tarjeta `Parcours` y reutilizar el patrón de “volver” del resto de etapas.
- Integración experimental de un fondo 16:9 generado con Replicate (`google/nano-banana-pro`) en `/reservation`, aplicado con overlay cálido y opacidad baja.

### Qué cambió vs plan original
- El plan original descartaba borrado duro desde UI; finalmente se habilitó borrado real de servicios por ser operativo y seguro con las reglas actuales de base de datos.
- También se habilitó borrado de grupos y subgrupos vacíos, manteniendo bloqueo estilizado cuando tienen contenido.
- La acción de eliminar en grupos y subgrupos quedó siempre visible para mejorar descubribilidad, delegando la validación al modal explicativo.
- La UX pública se refinó más allá del plan inicial para ocultar referencias a `grupo/subgrupo` cuando solo existe una estructura única útil para el salón.
- La reserva recibió una iteración visual adicional con fondo fotográfico/texturizado sutil, no prevista en el plan inicial.
- Los menús `...` del árbol admin pasaron a renderizarse mediante portal para evitar clipping por contenedores y soportar cierre por click fuera / `Esc`.

### Pendientes
- QA manual/aceptación final del usuario sobre la estética del fondo experimental de `/reservation` y su nivel de opacidad.
- Decidir si el fondo experimental se mantiene tal cual, se suaviza más o se retira.
- Advertencias globales preexistentes de `next/image` y `metadataBase` siguen fuera del alcance de este pack.

### Riesgos conocidos post-release
- Borrar un servicio elimina automáticamente sus asignaciones en `stylist_services` y deja `bookings.service_id = null` en reservas históricas; es seguro pero cambia el comportamiento respecto al plan inicial.
- El fondo de `/reservation` depende de un asset generado externamente y puede requerir dirección de arte adicional para quedar definitivo.
- En local, `npm run build` puede requerir limpieza de `.next` por comportamiento intermitente del entorno, aunque el build final del pack quedó verificado en verde.
