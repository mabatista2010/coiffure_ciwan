import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createClient } from "@supabase/supabase-js";
import { normalizeObjectSchema } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { toJsonSchemaCompat } from "@modelcontextprotocol/sdk/server/zod-json-schema-compat.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { supabase } from "@/lib/supabase";
import { getImageUrl } from "@/lib/getImageUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UI_RESOURCE_URI = "ui://widget/reserva.html";
const WIDGET_HTML_PATH = path.join(
  process.cwd(),
  "public",
  "chatgpt-reserva-widget.html"
);
const widgetHtml = readFileSync(WIDGET_HTML_PATH, "utf8");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, mcp-session-id",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

const EMPTY_OBJECT_JSON_SCHEMA = {
  type: "object",
  properties: {},
};

type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
  isError?: boolean;
};

type SecurityScheme = { type: "noauth" | "oauth2"; scopes?: string[] };

type RegisteredTool = {
  title?: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  annotations?: Record<string, unknown>;
  execution?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
  enabled?: boolean;
};

const reply = (structuredContent: Record<string, unknown>, message?: string): ToolResult => ({
  content: message ? [{ type: "text", text: message }] : [],
  structuredContent,
});

const replyError = (message: string, meta?: Record<string, unknown>): ToolResult => ({
  content: [{ type: "text", text: message }],
  _meta: meta,
  isError: true,
});

const toAbsoluteUrl = (url: string, baseUrl: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
};

const getBearerToken = (extra: { requestInfo?: { headers?: { get?: (name: string) => string | null } } }) => {
  const header = extra.requestInfo?.headers?.get?.("authorization") || "";
  const match = header.match(/^Bearer\\s+(.+)$/i);
  return match ? match[1] : null;
};

const authChallenge = (baseUrl: string, description: string) =>
  replyError("Authentification requise.", {
    "mcp/www_authenticate": [
      `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", error="insufficient_scope", error_description="${description}"`,
    ],
  });

const createAuthedSupabase = (token: string) =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
      },
    }
  );

const getBaseUrl = (request: NextRequest) => {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
};

const listStylistsInputSchema = z.object({
  location_id: z.string().uuid().optional(),
});

const availabilityInputSchema = z.object({
  date: z.string().min(1),
  location_id: z.string().min(1),
  stylist_id: z.string().min(1),
  service_id: z.coerce.number().int(),
});

const createBookingInputSchema = z.object({
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().min(3),
  service_id: z.coerce.number().int(),
  location_id: z.string().min(1),
  stylist_id: z.string().min(1),
  date: z.string().min(1),
  start_time: z.string().min(1),
  notes: z.string().optional(),
});

const adminBookingsInputSchema = z.object({
  date: z.string().optional(),
});

const registerToolListHandler = (
  server: McpServer,
  securitySchemes: Record<string, SecurityScheme[]>
) => {
  const getRegisteredTools = () =>
    (server as unknown as { _registeredTools: Record<string, RegisteredTool> })
      ._registeredTools;

  server.server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: Object.entries(getRegisteredTools())
      .filter(([, tool]) => tool.enabled)
      .map(([name, tool]) => {
        const obj = normalizeObjectSchema(tool.inputSchema as never);
        const inputSchema = obj
          ? toJsonSchemaCompat(obj, {
              strictUnions: true,
              pipeStrategy: "input",
            })
          : EMPTY_OBJECT_JSON_SCHEMA;

        const toolDefinition: Record<string, unknown> = {
          name,
          title: tool.title,
          description: tool.description,
          inputSchema,
          annotations: tool.annotations,
          execution: tool.execution,
          _meta: tool._meta,
        };

        if (tool.outputSchema) {
          const outputObj = normalizeObjectSchema(tool.outputSchema as never);
          if (outputObj) {
            toolDefinition.outputSchema = toJsonSchemaCompat(outputObj, {
              strictUnions: true,
              pipeStrategy: "output",
            });
          }
        }

        const schemes = securitySchemes[name];
        if (schemes) {
          toolDefinition.securitySchemes = schemes;
        }

        return toolDefinition;
      }),
  }));
};

const createReservationServer = (baseUrl: string) => {
  const server = new McpServer({
    name: "reservation-app",
    version: "0.1.0",
  }, {
    instructions:
      "Reponds en francais. Accueille l'utilisateur et demande comment aider. " +
      "N'appelle pas list_services pour un simple bonjour. " +
      "Utilise get_welcome uniquement pour l'accueil ou si l'utilisateur demande d'ouvrir le widget. " +
      "N'appelle list_locations que si l'utilisateur demande a voir les centres. " +
      "N'appelle list_stylists que si l'utilisateur demande a voir l'equipe. " +
      "N'appelle list_services que si l'utilisateur demande les services ou les prix. " +
      "Ne propose pas de modifier ou annuler une reservation. Si l'utilisateur le demande, dis que ce n'est pas disponible pour l'instant. " +
      "Utilise get_availability uniquement apres que la date, le centre, le styliste et le service soient connus.",
  });

  server.registerResource(
    "reservation-widget",
    UI_RESOURCE_URI,
    {},
    async () => ({
      contents: [
        {
          uri: UI_RESOURCE_URI,
          mimeType: "text/html+skybridge",
          text: widgetHtml,
          _meta: {
            "openai/widgetPrefersBorder": true,
          },
        },
      ],
    })
  );

  server.registerTool(
    "get_welcome",
    {
      title: "Afficher l'accueil",
      description: "Affiche un message d'accueil et une image de la boutique.",
      inputSchema: z.object({}),
      annotations: {
        title: "Accueil",
        readOnlyHint: true,
      },
      _meta: {
        "openai/outputTemplate": UI_RESOURCE_URI,
        "openai/toolInvocation/invoking": "Chargement de l'accueil...",
        "openai/toolInvocation/invoked": "Accueil charge",
      },
    },
    async () => {
      const { data, error } = await supabase
        .from("configuracion")
        .select("valor")
        .eq("clave", "hero_image_desktop")
        .single();

      const heroImageUrl = !error && data?.valor ? getImageUrl(data.valor) : "";
      const resolvedHeroUrl = toAbsoluteUrl(heroImageUrl, baseUrl);
      const logoUrl = toAbsoluteUrl("/logo.png", baseUrl);

      return reply({
        view: "welcome",
        welcome: {
          title: "Bienvenue chez Steel & Blade",
          subtitle: "Que puis-je faire pour vous aujourd'hui ?",
          image_url: resolvedHeroUrl,
          logo_url: logoUrl,
        },
      });
    }
  );

  server.registerTool(
    "list_services",
    {
      title: "Lister les services",
      description:
        "Retourne la liste des services et des prix. Utiliser uniquement si l'utilisateur demande les services ou les prix.",
      inputSchema: z.object({}),
      annotations: {
        title: "Liste des services",
        readOnlyHint: true,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Chargement des services...",
        "openai/toolInvocation/invoked": "Services charges",
      },
    },
    async () => {
      const { data, error } = await supabase
        .from("servicios")
        .select("id,nombre,descripcion,precio,imagen_url,duration,active")
        .eq("active", true)
        .order("id");

      if (error) {
        return reply({ services: [] }, "Erreur lors du chargement des services.");
      }

      const services = (data || []).map((service) => ({
        id: service.id,
        name: service.nombre,
        description: service.descripcion || "",
        price: service.precio,
        duration: service.duration || 30,
        image_url: service.imagen_url ? getImageUrl(service.imagen_url) : "",
      }));

      return reply({ services }, "Services charges.");
    }
  );

  server.registerTool(
    "list_locations",
    {
      title: "Lister les centres",
      description:
        "Retourne la liste des centres disponibles pour une reservation.",
      inputSchema: z.object({}),
      annotations: {
        title: "Liste des centres",
        readOnlyHint: true,
      },
      _meta: {
        "openai/outputTemplate": UI_RESOURCE_URI,
        "openai/toolInvocation/invoking": "Chargement des centres...",
        "openai/toolInvocation/invoked": "Centres charges",
      },
    },
    async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id,name,address,phone,description,image,active")
        .eq("active", true)
        .order("name");

      if (error) {
        return reply({ locations: [] }, "Erreur lors du chargement des centres.");
      }

      const locations = (data || []).map((location) => ({
        id: location.id,
        name: location.name,
        address: location.address,
        phone: location.phone,
        description: location.description || "",
        image_url: location.image
          ? toAbsoluteUrl(getImageUrl(location.image), baseUrl)
          : "",
      }));

      return reply({ view: "locations", locations }, "Centres charges.");
    }
  );

  server.registerTool(
    "list_stylists",
    {
      title: "Lister les stylistes",
      description:
        "Retourne les stylistes pour un centre donne. Utiliser apres avoir choisi un centre.",
      inputSchema: listStylistsInputSchema,
      annotations: {
        title: "Liste des stylistes",
        readOnlyHint: true,
      },
      _meta: {
        "openai/outputTemplate": UI_RESOURCE_URI,
        "openai/toolInvocation/invoking": "Chargement des stylistes...",
        "openai/toolInvocation/invoked": "Stylistes charges",
      },
    },
    async (args) => {
      const locationId = args?.location_id;
      let query = supabase
        .from("stylists")
        .select("id,name,profile_img,location_ids,active")
        .eq("active", true)
        .order("name");

      if (locationId) {
        query = query.contains("location_ids", [locationId]);
      }

      const { data, error } = await query;

      if (error) {
        return reply({ stylists: [] }, "Erreur lors du chargement des stylistes.");
      }

      const stylists = (data || []).map((stylist) => ({
        id: stylist.id,
        name: stylist.name,
        image_url: stylist.profile_img
          ? toAbsoluteUrl(getImageUrl(stylist.profile_img), baseUrl)
          : "",
      }));

      return reply({ view: "stylists", stylists }, "Stylistes charges.");
    }
  );

  server.registerTool(
    "admin_bookings_day",
    {
      title: "Agenda du jour (admin)",
      description:
        "Retourne les reservations pour une date donnee. Utiliser pour l'administration.",
      inputSchema: adminBookingsInputSchema,
      annotations: {
        title: "Agenda admin",
        readOnlyHint: true,
      },
    },
    async ({ date }, extra) => {
      const token = getBearerToken(extra);
      if (!token) {
        return authChallenge(baseUrl, "Vous devez vous connecter pour continuer.");
      }

      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData?.user) {
        return authChallenge(baseUrl, "Session invalide ou expiree.");
      }

      const authedSupabase = createAuthedSupabase(token);
      const { data: roleData, error: roleError } = await authedSupabase
        .from("user_roles")
        .select("role")
        .eq("id", userData.user.id)
        .single();

      if (roleError || roleData?.role !== "admin") {
        return replyError("Acces reserve au proprietaire.");
      }

      const targetDate = date || new Date().toISOString().slice(0, 10);
      const { data, error } = await authedSupabase
        .from("bookings")
        .select(
          `
          id,
          booking_date,
          start_time,
          end_time,
          status,
          customer_name,
          customer_email,
          customer_phone,
          service:servicios(nombre),
          stylist:stylists(name),
          location:locations(name)
        `
        )
        .eq("booking_date", targetDate)
        .order("start_time");

      if (error) {
        return replyError("Erreur lors du chargement des reservations.");
      }

      const bookings = (data || []).map((booking) => {
        const readField = (value: unknown, field: string) => {
          if (!value) return "";
          if (Array.isArray(value)) {
            return (value[0] as Record<string, unknown>)?.[field] ?? "";
          }
          if (typeof value === "object") {
            return (value as Record<string, unknown>)[field] ?? "";
          }
          return "";
        };

        const serviceName = readField(booking.service, "nombre");
        const stylistName = readField(booking.stylist, "name");
        const locationName = readField(booking.location, "name");

        return {
          id: booking.id,
          date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status,
        customer: {
          name: booking.customer_name,
          email: booking.customer_email,
          phone: booking.customer_phone,
        },
        service: serviceName || "",
        stylist: stylistName || "",
        location: locationName || "",
        };
      });

      const counts = bookings.reduce(
        (acc, booking) => {
          acc.total += 1;
          const status = (booking.status || "pending") as
            | "pending"
            | "confirmed"
            | "completed"
            | "cancelled";
          acc[status] += 1;
          return acc;
        },
        {
          total: 0,
          pending: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0,
        }
      );

      return reply(
        {
          date: targetDate,
          counts,
          bookings,
        },
        `Reservations chargees pour ${targetDate}.`
      );
    }
  );

  server.registerTool(
    "get_availability",
    {
      title: "Verifier la disponibilite",
      description:
        "Retourne les creneaux disponibles pour une date. Utiliser apres avoir choisi centre, styliste et service.",
      inputSchema: availabilityInputSchema,
      annotations: {
        title: "Disponibilite",
        readOnlyHint: true,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Recherche des creneaux...",
        "openai/toolInvocation/invoked": "Creneaux charges",
      },
    },
    async ({ date, location_id, stylist_id, service_id }) => {
      const url = new URL("/api/reservation/availability", baseUrl);
      url.searchParams.set("date", date);
      url.searchParams.set("locationId", location_id);
      url.searchParams.set("stylistId", stylist_id);
      url.searchParams.set("serviceId", String(service_id));

      const response = await fetch(url.toString());
      if (!response.ok) {
        return reply({ slots: [] }, "Erreur lors du chargement des creneaux.");
      }

      const data = await response.json();
      const slots = (data?.availableSlots || [])
        .filter((slot: { available: boolean }) => slot.available)
        .map((slot: { time: string }) => slot.time);

      return reply({ slots }, "Creneaux charges.");
    }
  );

  server.registerTool(
    "create_booking",
    {
      title: "Creer une reservation",
      description: "Cree une reservation avec les informations client.",
      inputSchema: createBookingInputSchema,
      annotations: {
        title: "Creation reservation",
        readOnlyHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Creation de la reservation...",
        "openai/toolInvocation/invoked": "Reservation terminee",
      },
    },
    async ({
      customer_name,
      customer_email,
      customer_phone,
      service_id,
      location_id,
      stylist_id,
      date,
      start_time,
      notes,
    }) => {
      const response = await fetch(`${baseUrl}/api/reservation/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: customer_name,
          customerEmail: customer_email,
          customerPhone: customer_phone,
          notes: notes || "",
          serviceId: service_id,
          locationId: location_id,
          stylistId: stylist_id,
          bookingDate: date,
          startTime: start_time,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage =
          data?.error ||
          "Impossible de creer la reservation. Veuillez essayer sur le site.";
        return reply({ booking: null }, errorMessage);
      }

      if (!data?.bookingId) {
        return reply(
          { booking: null },
          "Impossible de creer la reservation. Veuillez essayer sur le site."
        );
      }

      return reply(
        {
          booking: {
            id: data.bookingId,
            status: "pending",
          },
        },
        "Reservation creee avec succes."
      );
    }
  );

  registerToolListHandler(server, {
    get_welcome: [{ type: "noauth" }],
    list_services: [{ type: "noauth" }],
    list_locations: [{ type: "noauth" }],
    list_stylists: [{ type: "noauth" }],
    get_availability: [{ type: "noauth" }],
    create_booking: [{ type: "noauth" }],
    admin_bookings_day: [{ type: "oauth2", scopes: ["email"] }],
  });

  return server;
};

const withCors = (response: Response) => {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const handleRequest = async (request: NextRequest) => {
  const acceptHeader = request.headers.get("accept") || "";
  const acceptsEventStream = acceptHeader.includes("text/event-stream");
  const acceptsJson = acceptHeader.includes("application/json");

  if (request.method === "GET" && !acceptsEventStream && !acceptsJson) {
    return withCors(
      new Response("MCP endpoint is running.", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }

  const baseUrl = getBaseUrl(request);
  const server = createReservationServer(baseUrl);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  transport.onclose = () => {
    void server.close();
  };

  await server.connect(transport);
  const response = await transport.handleRequest(request);
  return withCors(response);
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request);
}
