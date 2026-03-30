import { NextResponse } from "next/server";

import { insertAdminAuditLog } from "@/lib/admin/audit";
import { requireStaffAuth } from "@/lib/apiAuth";
import { getPermissionScope, getStaffAccessContext, hasPermission } from "@/lib/permissions/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type CreateLocationBody = {
  id?: unknown;
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

export async function POST(request: Request) {
  const auth = await requireStaffAuth(request, {
    allowedRoles: ["admin", "staff"],
    feature: "admin_locations_create",
  });

  if ("response" in auth) {
    return auth.response;
  }

  const accessContext = await getStaffAccessContext(auth.userId);
  const canCreate =
    accessContext?.role === "admin" ||
    (hasPermission(accessContext, "locations.profile.edit")
      && hasPermission(accessContext, "schedule.location_hours.manage")
      && getPermissionScope(accessContext, "locations.profile.edit") === "all"
      && getPermissionScope(accessContext, "schedule.location_hours.manage") === "all");

  if (!canCreate) {
    return jsonError(403, "insufficient_scope", "Seul un administrateur ou un profil avec scope global peut créer un centre");
  }

  const body = (await request.json().catch(() => ({}))) as CreateLocationBody;
  const id = typeof body.id === "string" ? body.id : null;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";

  if (!id) {
    return jsonError(400, "invalid_id", "Identifiant de centre invalide");
  }

  if (!name) {
    return jsonError(400, "invalid_name", "Le nom du centre est obligatoire");
  }

  if (!address) {
    return jsonError(400, "invalid_address", "L’adresse du centre est obligatoire");
  }

  const supabase = getSupabaseAdminClient();
  const payload = {
    id,
    name,
    address,
    description: typeof body.description === "string" ? body.description : null,
    phone: typeof body.phone === "string" ? body.phone : null,
    email: typeof body.email === "string" ? body.email : null,
    image: typeof body.image === "string" ? body.image : null,
    active: typeof body.active === "boolean" ? body.active : true,
  };

  const { data: location, error } = await supabase
    .from("locations")
    .insert(payload)
    .select("*")
    .single();

  if (error || !location) {
    console.error("admin_location_create_error", error);
    return jsonError(500, "location_create_failed", "Impossible de créer ce centre");
  }

  await insertAdminAuditLog({
    actorUserId: auth.userId,
    entityType: "locations",
    entityId: location.id,
    action: "create",
    before: null,
    after: location as unknown as Record<string, unknown>,
    meta: {
      source: "admin_locations_api",
    },
  });

  return NextResponse.json({ location }, { status: 200 });
}
