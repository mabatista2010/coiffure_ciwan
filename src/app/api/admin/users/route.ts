import { NextResponse } from "next/server";

import { requireStaffAuth } from "@/lib/apiAuth";
import { listAdminUsers } from "@/lib/permissions/adminUsers";

export async function GET(request: Request) {
  const auth = await requireStaffAuth(request, {
    allowedRoles: ["admin"],
    feature: "admin_users_list",
  });

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const payload = await listAdminUsers();
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("admin_users_list_error", error);
    return NextResponse.json(
      { error: "Impossible de charger les utilisateurs admin", code: "admin_users_list_failed" },
      { status: 500 }
    );
  }
}
