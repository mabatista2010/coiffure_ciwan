# Documentacion de ChatGPT Apps (Steel & Blade)

Este documento resume lo aprendido e implementado durante la integracion de ChatGPT Apps SDK + MCP.

## Objetivo
- Permitir que ChatGPT muestre widgets bajo demanda (bienvenida, centros, equipo).
- Evitar widgets constantes en cada turno.
- Usar datos reales desde Supabase (centros, estilistas, hero).
- Dejar la reserva en chat (sin formulario embebido).

## Arquitectura
- **MCP server**: `src/app/mcp/route.ts` (Next.js Route Handler).
- **Widget UI**: `public/chatgpt-reserva-widget.html` (sandboxed iframe).
- **Preview local**: `/chatgpt-preview` + API `/api/chatgpt-preview/locations`.
- **Supabase**: tablas `configuracion`, `locations`, `stylists`, `servicios`.

## Herramientas MCP (tools)
- `get_welcome`
  - Devuelve: `welcome` (title, subtitle, image_url, logo_url) + `view: "welcome"`.
  - **Muestra widget**.
- `list_locations`
  - Devuelve: `locations` (id, name, address, image_url, ... ) + `view: "locations"`.
  - **Muestra widget**.
- `list_stylists`
  - Devuelve: `stylists` (id, name, image_url) + `view: "stylists"`.
  - **Muestra widget**.
- `list_services`
  - Devuelve servicios **sin widget**.
- `get_availability`
  - Devuelve slots **sin widget**.
- `create_booking`
  - Crea reserva **sin widget**.

> Nota: modificar o cancelar reservas **NO esta disponible** por ahora. Se indica en las instrucciones del MCP.

## Control de cuando aparece el widget
- El widget **solo aparece** si el tool devuelve `_meta.openai/outputTemplate`.
- Por eso, solo `get_welcome`, `list_locations`, `list_stylists` muestran UI.
- El resto de tools responden solo texto/structuredContent (sin widget).

## Logica de vistas del widget
El widget usa la propiedad `view` para mostrar una sola seccion:
- `view: "welcome"` -> hero + logo + texto.
- `view: "locations"` -> grid de centros.
- `view: "stylists"` -> grid de estilistas.

## Imagenes y URLs absolutas
- En ChatGPT, rutas relativas pueden fallar.
- Por eso se fuerzan **URLs absolutas** en el MCP:
  - `get_welcome`: hero + logo.
  - `list_locations`: images de centros.
  - `list_stylists`: images de estilistas.
- La funcion `toAbsoluteUrl()` en `src/app/mcp/route.ts` convierte rutas relativas al dominio actual.

## Configuracion de hero
- La imagen del hero viene de la tabla `configuracion`:
  - `hero_image_desktop`
  - `hero_image_mobile`
- El admin (`/admin`, seccion Hero) actualiza estas claves.
- `get_welcome` usa `hero_image_desktop` y la convierte a URL absoluta.

## Preview local
- Ruta: `http://localhost:3000/chatgpt-preview`
- Inyecta `window.openai` mock.
- Carga centros reales via `/api/chatgpt-preview/locations`.

## Notas de UI
- El widget actual muestra solo:
  - Hero con overlay + logo.
  - Centros (grid con fotos).
  - Equipo (grid con foto circular + nombre).
- No hay formulario de reserva embebido.
- Todo texto visible del widget esta en **frances** (requisito de proyecto).

## Troubleshooting
- **406 Not Acceptable en /mcp**: ocurre si el cliente no acepta `text/event-stream`.
- **Logo/hero roto en ChatGPT**: casi siempre es por URL relativa.
- **Widgets repetidos en cada turno**: revisa que tools sin UI no tengan `_meta.openai/outputTemplate`.

## Limites actuales
- No hay tool para **modificar/cancelar** reservas.
- Si el usuario pide cambiar una cita, el sistema debe responder que no esta disponible.
- Implementar cambios requeriria un tool `update_booking` y un endpoint `/api/reservation/update`.

## Autenticacion (propietario)
- Para que el propietario consulte citas desde ChatGPT se necesita OAuth 2.1.
- Supabase puede servir como OAuth server **si se activa su OAuth 2.1 Server**.
- ChatGPT requiere PKCE + DCR + `/.well-known/oauth-protected-resource`.

## Checklist de despliegue
1. `npm run build` en local.
2. Deploy a Vercel.
3. Probar en ChatGPT:
   - "Hola" -> widget de bienvenida.
   - "Quiero ver los centros" -> widget de centros.
   - "Quiero ver el personal" -> widget de equipo.

