# Guia de tips universales para ChatGPT Apps (MCP + Widgets)

Esta guia es **general** (no depende de un proyecto concreto). Recoge buenas practicas y errores comunes al crear apps con ChatGPT Apps SDK.

## 1) Control de cuando aparece el widget
- Un widget solo aparece cuando el tool incluye `openai/outputTemplate`.
- **Consejo**: muestra UI **solo bajo demanda** (cuando el usuario la pide).
- Evita poner UI en todos los tools para no saturar el chat.

## 2) Evita re-renderes y “saltos”
- Los widgets suelen renderizarse en 2 fases (placeholder -> datos reales).
- **Consejo**: reserva alturas fijas (hero, cards) y notifica el tamaño.
- Usa `window.openai.notifyIntrinsicHeight()` al cambiar contenido.

## 3) URLs absolutas siempre
- En el sandbox de ChatGPT las rutas relativas pueden fallar.
- **Consejo**: convierte siempre a URLs absolutas (hero, logos, tarjetas).

## 4) UI simple y enfocada
- Un widget es un **resumen visual**, no un panel completo.
- **Consejo**: muestra 1 accion principal por vista (ej. centros, equipo, servicios).
- Deja los flujos complejos en el chat o en un enlace externo.

## 5) Usa “views” en el structuredContent
- Define un campo `view` para que el widget muestre una sola seccion.
- Ejemplo: `welcome | locations | stylists | services`.

## 6) No prometas cosas que no existen
- Si no hay tool para **update/cancel**, el bot no debe prometerlo.
- **Consejo**: pon reglas claras en `instructions` del MCP.

## 7) Autenticacion para datos privados
- Para acciones de propietario se requiere OAuth 2.1.
- **Consejo**: implementa `/.well-known/oauth-protected-resource` y scopes.
- Si no hay token, responde 401 con challenge -> ChatGPT abre login.

## 8) Evita guardar secretos en el widget
- `widgetState` y `structuredContent` son visibles.
- **Consejo**: nunca pongas tokens o datos sensibles en el UI.

## 9) Piensa en el modo de display
- `requestDisplayMode` permite inline, PiP, fullscreen.
- **Consejo**: para flujos largos, pide fullscreen en lugar de hacer scroll infinito.

## 10) Cambios sin romper conversacion
- El estado del widget se queda en la conversacion.
- **Consejo**: al hacer cambios grandes, prueba en conversacion nueva.

## 11) Previsualizacion local
- Monta un preview local que inyecte `window.openai` mock.
- **Consejo**: usa datos reales para detectar problemas de URLs.

## 12) Capa de herramientas separada
- Divide tools: UI (con outputTemplate) vs datos (sin UI).
- **Consejo**: los tools de datos deben ser reutilizables por el modelo sin widget.

## 13) Mensajes claros para el usuario
- Si algo no esta soportado, dilo directo: “Aun no disponible”.
- **Consejo**: evita ambiguedades que provoquen acciones incorrectas.

## 14) Errores tipicos
- 406 en /mcp: falta `text/event-stream`.
- Widgets repetidos: demasiados tools con UI.
- Imagenes rotas: rutas relativas.

---

Si quieres, puedo adaptar esta guia con ejemplos concretos (pero sin mencionar tu app).
