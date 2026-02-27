import { NextResponse } from 'next/server';

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

export type StaffRole = 'admin' | 'employee';

interface RequireStaffAuthOptions {
  allowedRoles?: StaffRole[];
  feature?: string;
}

type RequireStaffAuthResult =
  | { userId: string; role: StaffRole }
  | { response: NextResponse };

function extractPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

function unauthorized(code: string) {
  return NextResponse.json(
    { error: 'Authentification requise', code },
    { status: 401 }
  );
}

function forbidden(code: string) {
  return NextResponse.json(
    { error: 'Accès refusé', code },
    { status: 403 }
  );
}

export async function requireStaffAuth(
  request: Request,
  options: RequireStaffAuthOptions = {}
): Promise<RequireStaffAuthResult> {
  const feature = options.feature ?? 'api';
  const allowedRoles = options.allowedRoles ?? ['admin', 'employee'];
  const path = extractPath(request.url);
  const token = extractBearerToken(request);

  if (!token) {
    console.warn('api_auth_denied', {
      feature,
      path,
      reason: 'missing_bearer_token',
    });
    return { response: unauthorized('missing_token') };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      console.warn('api_auth_denied', {
        feature,
        path,
        reason: 'invalid_token',
      });
      return { response: unauthorized('invalid_token') };
    }

    const userId = userData.user.id;
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (roleError || !roleData?.role) {
      console.warn('api_auth_denied', {
        feature,
        path,
        user_id: userId,
        reason: 'role_not_found',
      });
      return { response: forbidden('role_not_found') };
    }

    const role = roleData.role as StaffRole;
    if (!allowedRoles.includes(role)) {
      console.warn('api_auth_denied', {
        feature,
        path,
        user_id: userId,
        role,
        reason: 'insufficient_role',
      });
      return { response: forbidden('insufficient_role') };
    }

    return { userId, role };
  } catch (error) {
    console.error('api_auth_error', {
      feature,
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      response: NextResponse.json(
        { error: 'Erreur interne du serveur', code: 'auth_internal_error' },
        { status: 500 }
      ),
    };
  }
}
