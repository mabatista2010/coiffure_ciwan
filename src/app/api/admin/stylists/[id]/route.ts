import { NextResponse } from "next/server";

import { insertAdminAuditLog } from "@/lib/admin/audit";
import { requireStaffAuth } from "@/lib/apiAuth";
import { canAccessScopedResource, getStaffAccessContext, hasPermission } from "@/lib/permissions/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateStylistBody = {
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

function normalizeServiceIds(value: unknown): number[] | null {
  if (value === undefined) return null;
  if (Array.isArray(value) && value.every((entry) => Number.isInteger(entry))) {
    return Array.from(new Set(value as number[]));
  }
  if (isStringArray(value)) {
    return Array.from(new Set(value.map((entry) => Number(entry)).filter(Number.isInteger)));
  }
  return null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffAuth(request, {
    allowedRoles: ["admin", "staff"],
    feature: "admin_stylist_update",
  });

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const accessContext = await getStaffAccessContext(auth.userId);
  const body = (await request.json().catch(() => ({}))) as UpdateStylistBody;
  const supabase = getSupabaseAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("stylists")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    console.error("admin_stylist_fetch_error", existingError);
    return jsonError(500, "stylist_fetch_failed", "Impossible de charger ce styliste");
  }

  if (!existing) {
    return jsonError(404, "stylist_not_found", "Styliste introuvable");
  }

  const canEditProfile = hasPermission(accessContext, "stylists.profile.edit")
    && (
      canAccessScopedResource(accessContext, "stylists.profile.edit", {
        stylistId: existing.id,
        locationId: null,
      })
      || (existing.location_ids ?? []).some((locationId: string) => (
        canAccessScopedResource(accessContext, "stylists.profile.edit", {
          stylistId: existing.id,
          locationId,
        })
      ))
    );
  const canEditOperations = hasPermission(accessContext, "stylists.operations.edit")
    && (existing.location_ids ?? []).some((locationId: string) => (
      canAccessScopedResource(accessContext, "stylists.operations.edit", {
        stylistId: existing.id,
        locationId,
      })
    ));

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined || body.bio !== undefined || body.profileImg !== undefined || body.active !== undefined) {
    if (!canEditProfile) {
      return jsonError(403, "insufficient_permission", "Permissions insuffisantes pour modifier le profil du styliste");
    }

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return jsonError(400, "invalid_name", "Le nom du styliste est obligatoire");
      }
      updates.name = body.name.trim();
    }

    if (body.bio !== undefined) {
      if (typeof body.bio !== "string") {
        return jsonError(400, "invalid_bio", "La bio du styliste est invalide");
      }
      updates.bio = body.bio.trim();
    }

    if (body.profileImg !== undefined) {
      if (typeof body.profileImg !== "string") {
        return jsonError(400, "invalid_profile_img", "L’image du styliste est invalide");
      }
      updates.profile_img = body.profileImg || null;
    }

    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") {
        return jsonError(400, "invalid_active", "Le statut du styliste est invalide");
      }
      updates.active = body.active;
    }
  }

  const nextLocationIds = body.locationIds === undefined
    ? null
    : (isStringArray(body.locationIds) ? Array.from(new Set(body.locationIds)) : null);
  const nextServiceIds = normalizeServiceIds(body.serviceIds);

  if (body.locationIds !== undefined || body.serviceIds !== undefined) {
    if (!canEditOperations) {
      return jsonError(403, "insufficient_permission", "Permissions insuffisantes pour modifier l’opératif du styliste");
    }
  }

  if (body.locationIds !== undefined) {
    if (!nextLocationIds || nextLocationIds.length === 0) {
      return jsonError(400, "invalid_locations", "Le styliste doit être associé à au moins un centre");
    }

    const allScoped = nextLocationIds.every((locationId) => (
      canAccessScopedResource(accessContext, "stylists.operations.edit", {
        stylistId: existing.id,
        locationId,
      })
    ));

    if (!allScoped) {
      return jsonError(403, "insufficient_scope", "Scope insuffisant pour les centres demandés");
    }

    const { data: locations, error: locationsError } = await supabase
      .from("locations")
      .select("id")
      .in("id", nextLocationIds);

    if (locationsError) {
      console.error("admin_stylist_update_locations_error", locationsError);
      return jsonError(500, "location_lookup_failed", "Impossible de vérifier les centres sélectionnés");
    }

    if ((locations ?? []).length !== nextLocationIds.length) {
      return jsonError(400, "invalid_locations", "Un ou plusieurs centres sont introuvables");
    }

    updates.location_ids = nextLocationIds;
  }

  if (body.serviceIds !== undefined) {
    if (nextServiceIds === null) {
      return jsonError(400, "invalid_services", "La liste de services est invalide");
    }

    if (nextServiceIds.length > 0) {
      const { data: services, error: servicesError } = await supabase
        .from("servicios")
        .select("id")
        .in("id", nextServiceIds);

      if (servicesError) {
        console.error("admin_stylist_update_services_error", servicesError);
        return jsonError(500, "service_lookup_failed", "Impossible de vérifier les services sélectionnés");
      }

      if ((services ?? []).length !== nextServiceIds.length) {
        return jsonError(400, "invalid_services", "Un ou plusieurs services sont introuvables");
      }
    }
  }

  let updated = existing;
  if (Object.keys(updates).length > 0) {
    const { data, error } = await supabase
      .from("stylists")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("admin_stylist_update_error", error);
      return jsonError(500, "stylist_update_failed", "Impossible de mettre à jour ce styliste");
    }
    updated = data;
  }

  if (body.serviceIds !== undefined && nextServiceIds !== null) {
    const { error: deleteServicesError } = await supabase
      .from("stylist_services")
      .delete()
      .eq("stylist_id", id);

    if (deleteServicesError) {
      console.error("admin_stylist_service_reset_error", deleteServicesError);
      return jsonError(500, "stylist_services_reset_failed", "Impossible de mettre à jour les services du styliste");
    }

    if (nextServiceIds.length > 0) {
      const { error: insertServicesError } = await supabase.from("stylist_services").insert(
        nextServiceIds.map((serviceId) => ({
          stylist_id: id,
          service_id: serviceId,
        }))
      );

      if (insertServicesError) {
        console.error("admin_stylist_service_insert_error", insertServicesError);
        return jsonError(500, "stylist_services_insert_failed", "Impossible d’associer les services au styliste");
      }
    }
  }

  const { data: currentServices } = await supabase
    .from("stylist_services")
    .select("service_id")
    .eq("stylist_id", id)
    .order("service_id");

  await insertAdminAuditLog({
    actorUserId: auth.userId,
    entityType: "stylists",
    entityId: id,
    action: "update",
    before: {
      id: existing.id,
      name: existing.name,
      bio: existing.bio,
      profile_img: existing.profile_img,
      active: existing.active,
      location_ids: existing.location_ids,
    },
    after: {
      id: updated.id,
      name: updated.name,
      bio: updated.bio,
      profile_img: updated.profile_img,
      active: updated.active,
      location_ids: updated.location_ids,
      service_ids: (currentServices ?? []).map((row) => row.service_id),
    },
    meta: {
      source: "admin_stylists_api",
    },
  });

  return NextResponse.json({ stylist: updated }, { status: 200 });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireStaffAuth(request, {
    allowedRoles: ["admin", "staff"],
    feature: "admin_stylist_delete",
    requiredPermission: "stylists.profile.delete",
  });

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const accessContext = await getStaffAccessContext(auth.userId);
  const supabase = getSupabaseAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("stylists")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    console.error("admin_stylist_delete_fetch_error", existingError);
    return jsonError(500, "stylist_fetch_failed", "Impossible de charger ce styliste");
  }

  if (!existing) {
    return jsonError(404, "stylist_not_found", "Styliste introuvable");
  }

  const scoped = (existing.location_ids ?? []).some((locationId: string) => (
    canAccessScopedResource(accessContext, "stylists.profile.delete", {
      stylistId: existing.id,
      locationId,
    })
  ));

  if (!scoped) {
    return jsonError(403, "insufficient_scope", "Scope insuffisant pour retirer ce styliste");
  }

  if (existing.active === false) {
    return NextResponse.json({ ok: true, stylist: existing, alreadyInactive: true }, { status: 200 });
  }

  const { data: deactivated, error: deactivateError } = await supabase
    .from("stylists")
    .update({ active: false })
    .eq("id", id)
    .select("*")
    .single();

  if (deactivateError || !deactivated) {
    console.error("admin_stylist_deactivate_error", deactivateError);
    return jsonError(500, "stylist_deactivate_failed", "Impossible de retirer ce styliste");
  }

  await insertAdminAuditLog({
    actorUserId: auth.userId,
    entityType: "stylists",
    entityId: id,
    action: "deactivate",
    before: {
      id: existing.id,
      name: existing.name,
      bio: existing.bio,
      profile_img: existing.profile_img,
      active: existing.active,
      location_ids: existing.location_ids,
    },
    after: {
      id: deactivated.id,
      name: deactivated.name,
      bio: deactivated.bio,
      profile_img: deactivated.profile_img,
      active: deactivated.active,
      location_ids: deactivated.location_ids,
    },
    meta: {
      source: "admin_stylists_api",
    },
  });

  return NextResponse.json({ ok: true, stylist: deactivated }, { status: 200 });
}
