import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
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

type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
};

const reply = (structuredContent: Record<string, unknown>, message?: string): ToolResult => ({
  content: message ? [{ type: "text", text: message }] : [],
  structuredContent,
});

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

const createReservationServer = (baseUrl: string) => {
  const server = new McpServer({
    name: "reservation-app",
    version: "0.1.0",
  }, {
    instructions:
      "Reponds en francais. Accueille l'utilisateur et demande comment aider. " +
      "N'appelle pas list_services pour un simple bonjour. " +
      "Utilise get_welcome pour afficher le widget d'accueil avec image. " +
      "N'appelle list_services que si l'utilisateur demande les services ou les prix. " +
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

      return reply({
        welcome: {
          title: "Bienvenue chez Steel & Blade",
          subtitle: "Que puis-je faire pour vous aujourd'hui ?",
          image_url: heroImageUrl,
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
        "openai/outputTemplate": UI_RESOURCE_URI,
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
        image_url: location.image ? getImageUrl(location.image) : "",
      }));

      return reply({ locations }, "Centres charges.");
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
        image_url: stylist.profile_img ? getImageUrl(stylist.profile_img) : "",
      }));

      return reply({ stylists }, "Stylistes charges.");
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
        "openai/outputTemplate": UI_RESOURCE_URI,
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
        "openai/outputTemplate": UI_RESOURCE_URI,
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
