import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!supabaseUrl) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL" },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const resource = `${url.protocol}//${url.host}`;
  const authorizationServer = `${supabaseUrl.replace(/\/$/, "")}/.well-known/oauth-authorization-server/auth/v1`;

  return NextResponse.json(
    {
      resource,
      authorization_servers: [authorizationServer],
      scopes_supported: ["email", "profile", "openid", "phone"],
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
