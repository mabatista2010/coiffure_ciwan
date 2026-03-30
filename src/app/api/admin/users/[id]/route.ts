import { NextResponse } from "next/server";

import { requireStaffAuth } from "@/lib/apiAuth";
import {
  deleteAdminUser,
  getAdminUserDetail,
  updateAdminUser,
  type ManagedUserUpdateInput,
} from "@/lib/permissions/adminUsers";
import { SCOPE_MODES } from "@/lib/permissions/catalog";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isValidOverride(value: unknown): value is ManagedUserUpdateInput["overrides"][number] {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.permissionKey === "string" &&
    (candidate.effect === "allow" || candidate.effect === "deny") &&
    (candidate.scopeMode === null ||
      candidate.scopeMode === undefined ||
      (typeof candidate.scopeMode === "string" && SCOPE_MODES.includes(candidate.scopeMode as typeof SCOPE_MODES[number])))
  );
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireStaffAuth(request, {
    allowedRoles: ["admin"],
    feature: "admin_user_detail",
  });

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const user = await getAdminUserDetail(id);

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable", code: "admin_user_not_found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("admin_user_detail_error", error);
    return NextResponse.json(
      { error: "Impossible de charger cet utilisateur", code: "admin_user_detail_failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffAuth(request, {
    allowedRoles: ["admin"],
    feature: "admin_user_update",
  });

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (body.role !== "admin" && body.role !== "staff") {
      return NextResponse.json(
        { error: "Rôle invalide", code: "invalid_role" },
        { status: 400 }
      );
    }

    if (
      body.profileKey !== null &&
      body.profileKey !== undefined &&
      typeof body.profileKey !== "string"
    ) {
      return NextResponse.json(
        { error: "Profil invalide", code: "invalid_profile" },
        { status: 400 }
      );
    }

    if (
      body.associatedStylistId !== null &&
      body.associatedStylistId !== undefined &&
      typeof body.associatedStylistId !== "string"
    ) {
      return NextResponse.json(
        { error: "Styliste associé invalide", code: "invalid_stylist" },
        { status: 400 }
      );
    }

    if (!isStringArray(body.assignedLocationIds)) {
      return NextResponse.json(
        { error: "Liste de centres invalide", code: "invalid_locations" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.overrides) || body.overrides.some((override) => !isValidOverride(override))) {
      return NextResponse.json(
        { error: "Overrides invalides", code: "invalid_overrides" },
        { status: 400 }
      );
    }

    const updated = await updateAdminUser(auth.userId, id, {
      role: body.role,
      profileKey: body.profileKey === undefined ? null : (body.profileKey as string | null),
      associatedStylistId:
        body.associatedStylistId === undefined
          ? null
          : (body.associatedStylistId as string | null),
      assignedLocationIds: body.assignedLocationIds,
      overrides: body.overrides as ManagedUserUpdateInput["overrides"],
    });

    return NextResponse.json({ user: updated }, { status: 200 });
  } catch (error) {
    console.error("admin_user_update_error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Impossible de mettre à jour cet utilisateur",
        code: "admin_user_update_failed",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireStaffAuth(request, {
    allowedRoles: ["admin"],
    feature: "admin_user_delete",
  });

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { id } = await context.params;

    if (id === auth.userId) {
      return NextResponse.json(
        { error: "Impossible de supprimer votre propre accès", code: "cannot_delete_self" },
        { status: 400 }
      );
    }

    await deleteAdminUser(auth.userId, id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("admin_user_delete_error", error);
    return NextResponse.json(
      { error: "Impossible de supprimer cet utilisateur", code: "admin_user_delete_failed" },
      { status: 500 }
    );
  }
}
