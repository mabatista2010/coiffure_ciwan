import { NextResponse } from 'next/server';

import { requireStaffAuth } from '@/lib/apiAuth';
import { insertAdminAuditLog } from '@/lib/admin/audit';
import { getScopedPermissionFilter, getStaffAccessContext } from '@/lib/permissions/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const TIME_OFF_CATEGORIES = new Set([
  'vacaciones',
  'baja',
  'descanso',
  'formacion',
  'bloqueo_operativo',
]);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_REGEX.test(value));
}

function badRequest(code: string, error: string) {
  return NextResponse.json({ code, error }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      feature: 'admin_schedule_time_off_get',
      requiredPermission: 'schedule.time_off.manage',
    });

    if ('response' in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const stylistIdParam = searchParams.get('stylistId');
    const locationIdParam = searchParams.get('locationId');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const limitParam = Number(searchParams.get('limit') || '200');
    const limit = Number.isInteger(limitParam) ? Math.max(1, Math.min(limitParam, 500)) : 200;

    if (stylistIdParam && !isUuid(stylistIdParam)) {
      return badRequest('invalid_stylist_id', 'stylistId invalide');
    }

    if (locationIdParam && !isUuid(locationIdParam)) {
      return badRequest('invalid_location_id', 'locationId invalide');
    }

    const supabase = getSupabaseAdminClient();
    const accessContext = await getStaffAccessContext(auth.userId);
    const scope = getScopedPermissionFilter(accessContext, 'schedule.time_off.manage');

    if (scope.kind === 'none') {
      return NextResponse.json(
        { timeOff: [], scope: { role: auth.role, stylist_id: null, location_ids: [], code: scope.code } },
        { status: 200 }
      );
    }

    let query = supabase
      .from('time_off')
      .select('id,stylist_id,location_id,start_datetime,end_datetime,reason,category,created_at')
      .order('start_datetime', { ascending: true })
      .limit(limit);

    if (scope.kind === 'stylist') {
      query = query.eq('stylist_id', stylistIdParam ?? scope.stylistId);
    } else if (scope.kind === 'locations') {
      query = query.in('location_id', scope.locationIds);
      if (stylistIdParam) {
        query = query.eq('stylist_id', stylistIdParam);
      }
    } else if (stylistIdParam) {
      query = query.eq('stylist_id', stylistIdParam);
    }

    if (locationIdParam) {
      query = query.eq('location_id', locationIdParam);
    }

    if (fromParam) {
      query = query.gte('start_datetime', fromParam);
    }

    if (toParam) {
      query = query.lte('end_datetime', toParam);
    }

    const { data, error } = await query;

    if (error) {
      console.error('time_off_get_error', error);
      return NextResponse.json(
        { code: 'time_off_fetch_failed', error: 'Impossible de récupérer les indisponibilités' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        timeOff: data || [],
        scope: {
          role: auth.role,
          stylist_id: scope.kind === 'stylist' ? scope.stylistId : null,
          location_ids: scope.kind === 'locations' ? scope.locationIds : [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('time_off_get_unhandled_error', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      feature: 'admin_schedule_time_off_create',
      requiredPermission: 'schedule.time_off.manage',
    });

    if ('response' in auth) {
      return auth.response;
    }

    const body = await request.json().catch(() => ({}));

    const stylistId = typeof body?.stylistId === 'string' ? body.stylistId : null;
    const locationId = typeof body?.locationId === 'string' ? body.locationId : null;
    const startDateTime = typeof body?.startDateTime === 'string' ? body.startDateTime : null;
    const endDateTime = typeof body?.endDateTime === 'string' ? body.endDateTime : null;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;
    const category = typeof body?.category === 'string' ? body.category.trim() : 'bloqueo_operativo';

    if (!isUuid(stylistId)) {
      return badRequest('invalid_stylist_id', 'Le styliste est obligatoire');
    }

    if (locationId && !isUuid(locationId)) {
      return badRequest('invalid_location_id', 'locationId invalide');
    }

    if (!startDateTime || !endDateTime) {
      return badRequest('invalid_datetime', 'Les champs startDateTime et endDateTime sont obligatoires');
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return badRequest('invalid_datetime_range', 'Intervalle de dates invalide');
    }

    if (!TIME_OFF_CATEGORIES.has(category)) {
      return badRequest('invalid_category', 'Catégorie non autorisée');
    }

    const supabase = getSupabaseAdminClient();
    const accessContext = await getStaffAccessContext(auth.userId);
    const scope = getScopedPermissionFilter(accessContext, 'schedule.time_off.manage');

    if (scope.kind === 'none') {
      return badRequest(scope.code, 'Scope insuffisant pour créer cette indisponibilité');
    }

    if (scope.kind === 'stylist' && stylistId !== scope.stylistId) {
      return badRequest('stylist_out_of_scope', 'Ce styliste est hors scope');
    }

    if (scope.kind === 'locations') {
      if (!locationId || !scope.locationIds.includes(locationId)) {
        return badRequest('location_out_of_scope', 'Ce centre est hors scope');
      }
    }

    const { data, error } = await supabase
      .from('time_off')
      .insert([
        {
          stylist_id: stylistId,
          location_id: locationId,
          start_datetime: start.toISOString(),
          end_datetime: end.toISOString(),
          reason: reason || null,
          category,
        },
      ])
      .select('id,stylist_id,location_id,start_datetime,end_datetime,reason,category,created_at')
      .single();

    if (error) {
      console.error('time_off_create_error', error);
      return NextResponse.json(
        { code: 'time_off_create_failed', error: 'Impossible de créer l’indisponibilité' },
        { status: 500 }
      );
    }

    await insertAdminAuditLog({
      actorUserId: auth.userId,
      entityType: 'time_off',
      entityId: data.id,
      action: 'create',
      before: null,
      after: data,
      meta: {
        source: 'admin_schedule_time_off_api',
      },
    });

    return NextResponse.json({ timeOff: data }, { status: 201 });
  } catch (error) {
    console.error('time_off_post_unhandled_error', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
