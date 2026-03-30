import { NextResponse } from "next/server";

import { insertAdminAuditLog } from "@/lib/admin/audit";
import { requireStaffAuth } from "@/lib/apiAuth";
import { canAccessScopedResource, getStaffAccessContext } from "@/lib/permissions/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateLocationBody = {
  name?: unknown;
  address?: unknown;
  description?: unknown;
  phone?: unknown;
  email?: unknown;
  image?: unknown;
  active?: unknown;
};

function jsonError(status: number, code: string, error: string) {
  return NextResponse.json({ code, error }, { status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffAuth(request, {
    allowedRoles: ["admin", "staff"],
    feature: "admin_locations_update",
    requiredPermission: "locations.profile.edit",
  });

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const accessContext = await getStaffAccessContext(auth.userId);
  if (!canAccessScopedResource(accessContext, "locations.profile.edit", { locationId: id })) {
    return jsonError(403, "insufficient_scope", "Scope insuffisant pour modifier ce centre");
  }

  const body = (await request.json().catch(() => ({}))) as UpdateLocationBody;
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return jsonError(400, "invalid_name", "Le nom du centre est obligatoire");
    }
    updates.name = body.name.trim();
  }

  if (body.address !== undefined) {
    if (typeof body.address !== "string" || !body.address.trim()) {
      return jsonError(400, "invalid_address", "L’adresse du centre est obligatoire");
    }
    updates.address = body.address.trim();
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== "string") {
      return jsonError(400, "invalid_description", "La description du centre est invalide");
    }
    updates.description = body.description;
  }

  if (body.phone !== undefined) {
    if (body.phone !== null && typeof body.phone !== "string") {
      return jsonError(400, "invalid_phone", "Le téléphone du centre est invalide");
    }
    updates.phone = body.phone;
  }

  if (body.email !== undefined) {
    if (body.email !== null && typeof body.email !== "string") {
      return jsonError(400, "invalid_email", "L’email du centre est invalide");
    }
    updates.email = body.email;
  }

  if (body.image !== undefined) {
    if (body.image !== null && typeof body.image !== "string") {
      return jsonError(400, "invalid_image", "L’image du centre est invalide");
    }
    updates.image = body.image;
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return jsonError(400, "invalid_active", "Le statut du centre est invalide");
    }
    updates.active = body.active;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError(400, "empty_update", "Aucune donnée à mettre à jour");
  }

  const supabase = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("locations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    console.error("admin_location_fetch_error", existingError);
    return jsonError(500, "location_fetch_failed", "Impossible de charger ce centre");
  }

  if (!existing) {
    return jsonError(404, "location_not_found", "Centre introuvable");
  }

  const { data: updated, error: updateError } = await supabase
    .from("locations")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("admin_location_update_error", updateError);
    return jsonError(500, "location_update_failed", "Impossible de mettre à jour ce centre");
  }

  await insertAdminAuditLog({
    actorUserId: auth.userId,
    entityType: "locations",
    entityId: id,
    action: "update",
    before: existing as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    meta: {
      source: "admin_locations_api",
    },
  });

  return NextResponse.json({ location: updated }, { status: 200 });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireStaffAuth(request, {
    allowedRoles: ["admin", "staff"],
    feature: "admin_locations_delete",
    requiredPermission: "locations.profile.delete",
  });

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const accessContext = await getStaffAccessContext(auth.userId);
  if (!canAccessScopedResource(accessContext, "locations.profile.delete", { locationId: id })) {
    return jsonError(403, "insufficient_scope", "Scope insuffisant pour retirer ce centre");
  }

  const supabase = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("locations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    console.error("admin_location_delete_fetch_error", existingError);
    return jsonError(500, "location_fetch_failed", "Impossible de charger ce centre");
  }

  if (!existing) {
    return jsonError(404, "location_not_found", "Centre introuvable");
  }

  if (existing.active === false) {
    return NextResponse.json({ ok: true, location: existing, alreadyInactive: true }, { status: 200 });
  }

  const { data: deactivated, error: deactivateError } = await supabase
    .from("locations")
    .update({ active: false })
    .eq("id", id)
    .select("*")
    .single();

  if (deactivateError || !deactivated) {
    console.error("admin_location_deactivate_error", deactivateError);
    return jsonError(500, "location_deactivate_failed", "Impossible de retirer ce centre");
  }

  await insertAdminAuditLog({
    actorUserId: auth.userId,
    entityType: "locations",
    entityId: id,
    action: "deactivate",
    before: existing as unknown as Record<string, unknown>,
    after: deactivated as unknown as Record<string, unknown>,
    meta: {
      source: "admin_locations_api",
    },
  });

  return NextResponse.json({ ok: true, location: deactivated }, { status: 200 });
}
