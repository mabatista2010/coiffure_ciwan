# Implementacion ChatGPT Apps SDK (MCP) + Widget

Este documento describe una implementacion completa para integrar el sitio con **ChatGPT Apps SDK** usando un **MCP server** y un **widget UI** dentro de ChatGPT.

Objetivo:
- Ver servicios y precios.
- Consultar disponibilidad.
- (Intentar) crear reservas desde ChatGPT.

Notas clave:
- ChatGPT **solo se conecta a MCP remotos** (HTTPS). Local solo sirve si se expone con un tunel o se despliega a Vercel.
- Con plan Pro, **acciones de escritura pueden estar limitadas**. Igual implementamos `create_booking` y probamos.
- Todo texto visible en la UI debe ser **solo frances** (FR-only).

---

## 1) Arquitectura

Componentes:
1) **MCP server** (Node) expuesto en `/mcp`.
2) **Widget HTML** (web component) servido desde `public/` y registrado como resource UI.
3) **API interna** (ya existe en el repo):
   - `GET /api/reservation/availability`
   - `POST /api/reservation/create`
   - Servicios, centros y estilistas se leen desde Supabase.

Flujo:
- ChatGPT llama tools MCP (list_services, get_availability, create_booking).
- El MCP server devuelve `structuredContent` con los datos.
- El widget lee `window.openai.toolOutput` y refresca con `window.openai.callTool`.

---

## 2) Tools (MCP) a exponer

MVP recomendado:
- `list_services`
- `list_locations`
- `list_stylists`
- `get_availability`
- `create_booking` (probar en Pro, puede quedar bloqueado)

Formato de respuestas:
- Siempre devolver `structuredContent` para que el widget se sincronice.
- Respuesta de texto opcional en `content`.

### 2.1 list_services
Entrada:
```json
{}
```
Salida (structuredContent):
```json
{
  "services": [
    {
      "id": "int8",
      "name": "string",
      "description": "string",
      "price": "number",
      "duration": "number",
      "image_url": "string"
    }
  ]
}
```

### 2.2 list_locations
Salida (structuredContent):
```json
{
  "locations": [
    { "id": "uuid", "name": "string", "address": "string", "phone": "string" }
  ]
}
```

### 2.3 list_stylists
Entrada (opcional):
```json
{ "location_id": "uuid" }
```
Salida:
```json
{ "stylists": [ { "id": "uuid", "name": "string", "image_url": "string" } ] }
```

### 2.4 get_availability
Entrada:
```json
{
  "date": "YYYY-MM-DD",
  "location_id": "uuid",
  "service_id": "int8",
  "stylist_id": "uuid"
}
```
Salida:
```json
{ "slots": ["HH:MM", "HH:MM"] }
```

### 2.5 create_booking (write)
Entrada:
```json
{
  "customer_name": "string",
  "customer_email": "string",
  "customer_phone": "string",
  "service_id": "int8",
  "location_id": "uuid",
  "stylist_id": "uuid",
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "notes": "string"
}
```
Salida:
```json
{
  "booking": {
    "id": "uuid",
    "status": "pending|confirmed"
  }
}
```

---

## 3) Widget UI (ChatGPT)

Basado en el Quickstart de Apps SDK:
- El HTML se sirve desde `public/`.
- ChatGPT inyecta `window.openai.toolOutput`.
- Se actualiza con `window.openai.callTool`.
- Se puede escuchar el evento `openai:set_globals` para refrescar estados.

### 3.1 Archivo del widget
Crear:
- `public/chatgpt-reserva-widget.html`

Contenido recomendado (esqueleto):
```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Reservation</title>
    <style>
      :root { font-family: system-ui, -apple-system, sans-serif; color: #111; }
      body { margin: 0; padding: 16px; background: #f7f7f7; }
      main { background: #fff; border-radius: 12px; padding: 16px; }
      h2 { margin: 0 0 12px; font-size: 18px; }
      label { display: block; margin-top: 10px; font-size: 13px; }
      select, input, button { width: 100%; padding: 10px; margin-top: 6px; }
      button { background: #c8981d; color: #111; border: 0; font-weight: 600; }
      .muted { color: #666; font-size: 12px; }
    </style>
  </head>
  <body>
    <main>
      <h2>Reservation</h2>
      <div class="muted">Selectionnez un service, un centre, un styliste et un horaire.</div>

      <label>Service</label>
      <select id="service"></select>

      <label>Centre</label>
      <select id="location"></select>

      <label>Styliste</label>
      <select id="stylist"></select>

      <label>Date</label>
      <input id="date" type="date" />

      <label>Horaire</label>
      <select id="slot"></select>

      <label>Nom</label>
      <input id="name" type="text" />

      <label>Email</label>
      <input id="email" type="email" />

      <label>Telephone</label>
      <input id="phone" type="tel" />

      <label>Notes</label>
      <input id="notes" type="text" />

      <button id="book">Reserver</button>
      <div id="status" class="muted"></div>
    </main>

    <script type="module">
      const ui = {
        service: document.querySelector("#service"),
        location: document.querySelector("#location"),
        stylist: document.querySelector("#stylist"),
        date: document.querySelector("#date"),
        slot: document.querySelector("#slot"),
        name: document.querySelector("#name"),
        email: document.querySelector("#email"),
        phone: document.querySelector("#phone"),
        notes: document.querySelector("#notes"),
        book: document.querySelector("#book"),
        status: document.querySelector("#status"),
      };

      let state = {
        services: [],
        locations: [],
        stylists: [],
        slots: [],
      };

      const renderOptions = (el, items, getLabel) => {
        el.innerHTML = "";
        items.forEach((item) => {
          const opt = document.createElement("option");
          opt.value = item.id;
          opt.textContent = getLabel(item);
          el.appendChild(opt);
        });
      };

      const applyToolOutput = (toolOutput) => {
        if (!toolOutput) return;
        if (toolOutput.services) state.services = toolOutput.services;
        if (toolOutput.locations) state.locations = toolOutput.locations;
        if (toolOutput.stylists) state.stylists = toolOutput.stylists;
        if (toolOutput.slots) state.slots = toolOutput.slots;

        if (state.services.length) renderOptions(ui.service, state.services, (s) => `${s.name} - ${s.price} EUR`);
        if (state.locations.length) renderOptions(ui.location, state.locations, (l) => l.name);
        if (state.stylists.length) renderOptions(ui.stylist, state.stylists, (s) => s.name);
        if (state.slots.length) {
          ui.slot.innerHTML = "";
          state.slots.forEach((s) => {
            const opt = document.createElement("option");
            opt.value = s;
            opt.textContent = s;
            ui.slot.appendChild(opt);
          });
        }
      };

      const callTool = async (name, payload) => {
        if (!window.openai?.callTool) return null;
        return await window.openai.callTool(name, payload);
      };

      const bootstrap = async () => {
        applyToolOutput(window.openai?.toolOutput);
        await callTool("list_services", {});
        await callTool("list_locations", {});
      };

      window.addEventListener("openai:set_globals", (event) => {
        const globals = event.detail?.globals;
        applyToolOutput(globals?.toolOutput);
      }, { passive: true });

      ui.location.addEventListener("change", async () => {
        const location_id = ui.location.value || null;
        await callTool("list_stylists", { location_id });
      });

      const refreshAvailability = async () => {
        if (!ui.date.value) return;
        const payload = {
          date: ui.date.value,
          location_id: ui.location.value,
          stylist_id: ui.stylist.value,
          service_id: Number(ui.service.value),
        };
        await callTool("get_availability", payload);
      };

      ui.date.addEventListener("change", refreshAvailability);
      ui.stylist.addEventListener("change", refreshAvailability);
      ui.service.addEventListener("change", refreshAvailability);

      ui.book.addEventListener("click", async () => {
        ui.status.textContent = "Traitement...";
        const payload = {
          customer_name: ui.name.value,
          customer_email: ui.email.value,
          customer_phone: ui.phone.value,
          service_id: Number(ui.service.value),
          location_id: ui.location.value,
          stylist_id: ui.stylist.value,
          date: ui.date.value,
          start_time: ui.slot.value,
          notes: ui.notes.value,
        };
        const res = await callTool("create_booking", payload);
        if (res?.structuredContent?.booking?.id) {
          ui.status.textContent = `Reservation creee: ${res.structuredContent.booking.id}`;
        } else {
          ui.status.textContent = "Impossible de creer la reservation.";
        }
      });

      bootstrap();
    </script>
  </body>
</html>
```

Notas:
- Textos **FR-only**.
- `window.openai.callTool` devuelve la respuesta de la tool con `structuredContent`.

---

## 4) MCP Server (Node)

Basado en el Quickstart oficial. Recomendado usar `@modelcontextprotocol/sdk` + `zod`.

### 4.1 Dependencias
```bash
npm install @modelcontextprotocol/sdk zod
```

### 4.2 Archivo server (standalone)
Crear `mcp/server.js` (si se usa un servidor dedicado) con el ejemplo adaptado del Quickstart. Debe:
- Registrar resource del widget:
  - `ui://widget/reserva.html`
  - `mimeType: text/html+skybridge`
- Registrar tools con `_meta`:
  - `openai/outputTemplate` apuntando al widget
  - `openai/toolInvocation/...` para estados
- Usar `StreamableHTTPServerTransport` en `/mcp`

Referencia del Quickstart (usar como base):
- Registro de resource UI y tools
- Manejo de `/mcp` con CORS

### 4.3 Adaptacion para Vercel (App Router)
En Vercel, lo mas simple es exponer el endpoint MCP con App Router en
`src/app/mcp/route.ts` (runtime Node). Pasos:

1) Crear `src/app/mcp/route.ts` con `WebStandardStreamableHTTPServerTransport`.
2) Exponerlo en `https://TU-DOMINIO.vercel.app/mcp`.
3) (Opcional) Configurar `vercel.json` si quieres subir `maxDuration`.
   El key depende de la ruta generada por Vercel para el handler.

4) Asegurar CORS para `/mcp` como en el ejemplo oficial.

---

## 5) Implementacion de tools (logica)

### 5.1 list_services
- Conectar a Supabase.
- Tabla `servicios` con `active = true`.
- Mapear a estructura esperada.

### 5.2 list_locations
- Tabla `locations` con `active = true`.

### 5.3 list_stylists
- Tabla `stylists` con `active = true`.
- Si hay `location_id`, filtrar por `location_ids`.

### 5.4 get_availability
- Reutilizar `GET /api/reservation/availability`.
- Validar parametros.

### 5.5 create_booking
- Reutilizar `POST /api/reservation/create`.
- Si MCP write no esta permitido en Pro, devolver respuesta explicita y sugerir reservar en el sitio.

---

## 6) Seguridad y auth

Para dev:
- `No Auth` en el conector (Developer Mode).

Para prod:
- Implementar API key simple (header) o OAuth.
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` en cliente.

---

## 7) Pasos para conectar en ChatGPT (Developer Mode)

1) Deploy del MCP server (Vercel).
2) Obtener URL publica: `https://TU-DOMINIO.vercel.app/mcp`.
3) En ChatGPT -> Settings -> Apps & Connectors -> Developer Mode -> Create App.
4) Pegar URL del MCP server.
5) Seleccionar tools disponibles.
6) Probar en un chat: pedir servicios, precios y disponibilidad.

---

## 8) Checklist de pruebas

Lectura:
- `list_services` devuelve servicios activos.
- `list_locations` devuelve centros.
- `list_stylists` filtra por centro.
- `get_availability` devuelve slots.

Escritura:
- `create_booking` crea reserva en DB.
- Si la accion write esta bloqueada, el tool devuelve mensaje claro.

Widget:
- El widget carga datos iniciales.
- Cambiar centro actualiza estilistas.
- Seleccionar fecha refresca slots.
- Boton reservar llama tool.

---

## 9) Nota sobre limites de plan Pro

Si `create_booking` no se permite:
- Dejar el tool implementado, pero responder con un mensaje FR-only indicando que la reserva debe finalizarse en el sitio.
- El widget puede mostrar un CTA con link al sitio (si ChatGPT permite enlaces).

---

## 10) Estructura sugerida en este repo

```
/IMPLEMENTACION_CHATGPT_APPS_SDK.md
/mcp/server.js
/public/chatgpt-reserva-widget.html
src/app/mcp/route.ts
```

---

## 11) Siguiente paso recomendado

1) Implementar `src/app/mcp/route.ts` con MCP SDK.
2) Crear `public/chatgpt-reserva-widget.html`.
3) Desplegar en Vercel.
4) Conectar en Developer Mode y probar.
