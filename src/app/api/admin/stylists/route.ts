import { NextResponse } from "next/server";

import { insertAdminAuditLog } from "@/lib/admin/audit";
import { requireStaffAuth } from "@/lib/apiAuth";
import { canAccessScopedResource, getStaffAccessContext, hasPermission } from "@/lib/permissions/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type CreateStylistBody = {
  name?: unknown;
  bio?: unknown;
  profileImg?: unknown;
  locationIds?: unknown;
  serviceIds?: unknown;
  active?: unknown;
};

function jsonError(status: number, code: string, error: string) {
  return NextResponse.json({ code, error }, { status });
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isNumericArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((entry) => Number.isInteger(entry));
}

function canCreateScopedStylist(locationIds: string[], accessContext: Awaited<ReturnType<typeof getStaffAccessContext>>) {
  if (!accessContext) return false;
  if (accessContext.role === "admin") return true;
  if (!hasPermission(accessContext, "stylists.profile.edit") || !hasPermission(accessContext, "stylists.operations.edit")) {
    return false;
  }

  return locationIds.length > 0 && locationIds.every((locationId) => (
    canAccessScopedResource(accessContext, "stylists.profile.edit", { locationId })
    && canAccessScopedResource(accessContext, "stylists.operations.edit", { locationId })
  ));
}

export async function POST(request: Request) {
  const auth = await requireStaffAuth(request, {
    allowedRoles: ["admin", "staff"],
    feature: "admin_stylists_create",
  });

  if ("response" in auth) {
    return auth.response;
  }

  const accessContext = await getStaffAccessContext(auth.userId);
  const body = (await request.json().catch(() => ({}))) as CreateStylistBody;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const bio = typeof body.bio === "string" ? body.bio.trim() : "";
  const profileImg = typeof body.profileImg === "string" ? body.profileImg : "";
  const active = typeof body.active === "boolean" ? body.active : true;
  const locationIds = isStringArray(body.locationIds) ? Array.from(new Set(body.locationIds)) : [];
  const serviceIds = isNumericArray(body.serviceIds)
    ? Array.from(new Set(body.serviceIds))
    : isStringArray(body.serviceIds)
      ? Array.from(new Set(body.serviceIds.map((entry) => Number(entry)).filter(Number.isInteger)))
      : [];

  if (!name) {
    return jsonError(400, "invalid_name", "Le nom du styliste est obligatoire");
  }

  if (locationIds.length === 0) {
    return jsonError(400, "invalid_locations", "Le styliste doit être associé à au moins un centre");
  }

  if (!canCreateScopedStylist(locationIds, accessContext)) {
    return jsonError(403, "insufficient_scope", "Scope insuffisant pour créer ce styliste");
  }

  const supabase = getSupabaseAdminClient();
  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("id")
    .in("id", locationIds);

  if (locationsError) {
    console.error("admin_stylist_create_locations_error", locationsError);
    return jsonError(500, "location_lookup_failed", "Impossible de vérifier les centres sélectionnés");
  }

  if ((locations ?? []).length !== locationIds.length) {
    return jsonError(400, "invalid_locations", "Un ou plusieurs centres sont introuvables");
  }

  if (serviceIds.length > 0) {
    const { data: services, error: servicesError } = await supabase
      .from("servicios")
      .select("id")
      .in("id", serviceIds);

    if (servicesError) {
      console.error("admin_stylist_create_services_error", servicesError);
      return jsonError(500, "service_lookup_failed", "Impossible de vérifier les services sélectionnés");
    }

    if ((services ?? []).length !== serviceIds.length) {
      return jsonError(400, "invalid_services", "Un ou plusieurs services sont introuvables");
    }
  }

  const { data: stylist, error: stylistError } = await supabase
    .from("stylists")
    .insert([
      {
        name,
        bio,
        profile_img: profileImg || null,
        location_ids: locationIds,
        active,
      },
    ])
    .select("*")
    .single();

  if (stylistError || !stylist) {
    console.error("admin_stylist_create_error", stylistError);
    return jsonError(500, "stylist_create_failed", "Impossible de créer ce styliste");
  }

  if (serviceIds.length > 0) {
    const { error: serviceLinkError } = await supabase.from("stylist_services").insert(
      serviceIds.map((serviceId) => ({
        stylist_id: stylist.id,
        service_id: serviceId,
      }))
    );

    if (serviceLinkError) {
      console.error("admin_stylist_create_service_links_error", serviceLinkError);
      await supabase.from("stylists").delete().eq("id", stylist.id);
      return jsonError(500, "stylist_service_link_failed", "Impossible d’associer les services au styliste");
    }
  }

  await insertAdminAuditLog({
    actorUserId: auth.userId,
    entityType: "stylists",
    entityId: stylist.id,
    action: "create",
    before: null,
    after: {
      id: stylist.id,
      name: stylist.name,
      bio: stylist.bio,
      profile_img: stylist.profile_img,
      active: stylist.active,
      location_ids: stylist.location_ids,
      service_ids: serviceIds,
    },
    meta: {
      source: "admin_stylists_api",
    },
  });

  return NextResponse.json({ stylist }, { status: 200 });
}
