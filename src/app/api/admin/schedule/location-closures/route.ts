import { NextResponse } from 'next/server';

import { requireStaffAuth } from '@/lib/apiAuth';
import { insertAdminAuditLog } from '@/lib/admin/audit';
import { getScopedPermissionFilter, getStaffAccessContext } from '@/lib/permissions/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_REGEX.test(value));
}

function badRequest(code: string, error: string) {
  return NextResponse.json({ code, error }, { status: 400 });
}

function isValidTime(value: string): boolean {
  return TIME_REGEX.test(value);
}

function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      feature: 'admin_schedule_location_closures_get',
      requiredPermission: 'schedule.location_closures.manage',
    });

    if ('response' in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const limitParam = Number(searchParams.get('limit') || '200');
    const limit = Number.isInteger(limitParam) ? Math.max(1, Math.min(limitParam, 500)) : 200;

    if (locationId && !isUuid(locationId)) {
      return badRequest('invalid_location_id', 'locationId invalide');
    }

    if (fromDate && !DATE_REGEX.test(fromDate)) {
      return badRequest('invalid_from_date', 'fromDate invalide');
    }

    if (toDate && !DATE_REGEX.test(toDate)) {
      return badRequest('invalid_to_date', 'toDate invalide');
    }

    const supabase = getSupabaseAdminClient();
    const accessContext = await getStaffAccessContext(auth.userId);
    const scope = getScopedPermissionFilter(accessContext, 'schedule.location_closures.manage');

    if (scope.kind === 'none') {
      return NextResponse.json(
        { closures: [], scope: { role: auth.role, location_ids: [], code: scope.code } },
        { status: 200 }
      );
    }

    let query = supabase
      .from('location_closures')
      .select('id,location_id,closure_date,start_time,end_time,reason,created_at,created_by')
      .order('closure_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(limit);

    if (scope.kind === 'locations') {
      const allowedLocations = locationId ? scope.locationIds.filter((id) => id === locationId) : scope.locationIds;
      if (allowedLocations.length === 0) {
        return NextResponse.json(
          { closures: [], scope: { role: auth.role, location_ids: scope.locationIds, code: 'location_out_of_scope' } },
          { status: 200 }
        );
      }
      query = query.in('location_id', allowedLocations);
    } else if (locationId) {
      query = query.eq('location_id', locationId);
    }

    if (fromDate) {
      query = query.gte('closure_date', fromDate);
    }

    if (toDate) {
      query = query.lte('closure_date', toDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('location_closures_get_error', error);
      return NextResponse.json(
        { code: 'location_closures_fetch_failed', error: 'Impossible de récupérer les fermetures de centre' },
        { status: 500 }
      );
    }

    return NextResponse.json({ closures: data || [] }, { status: 200 });
  } catch (error) {
    console.error('location_closures_get_unhandled_error', error);
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
      feature: 'admin_schedule_location_closures_create',
      requiredPermission: 'schedule.location_closures.manage',
    });

    if ('response' in auth) {
      return auth.response;
    }

    const body = await request.json().catch(() => ({}));

    const locationId = typeof body?.locationId === 'string' ? body.locationId : null;
    const closureDate = typeof body?.closureDate === 'string' ? body.closureDate : null;
    const startTimeRaw = typeof body?.startTime === 'string' ? body.startTime.trim() : null;
    const endTimeRaw = typeof body?.endTime === 'string' ? body.endTime.trim() : null;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;

    if (!isUuid(locationId)) {
      return badRequest('invalid_location_id', 'locationId invalide');
    }

    if (!closureDate || !DATE_REGEX.test(closureDate)) {
      return badRequest('invalid_closure_date', 'closureDate invalide');
    }

    const hasStart = Boolean(startTimeRaw);
    const hasEnd = Boolean(endTimeRaw);

    if (hasStart !== hasEnd) {
      return badRequest('invalid_time_range', 'startTime et endTime doivent être tous les deux remplis ou vides');
    }

    let startTime: string | null = null;
    let endTime: string | null = null;

    if (hasStart && hasEnd) {
      if (!isValidTime(startTimeRaw as string) || !isValidTime(endTimeRaw as string)) {
        return badRequest('invalid_time_format', 'Format horaire invalide');
      }

      startTime = normalizeTime(startTimeRaw as string);
      endTime = normalizeTime(endTimeRaw as string);

      if (startTime >= endTime) {
        return badRequest('invalid_time_order', 'startTime doit être inférieur à endTime');
      }
    }

    const supabase = getSupabaseAdminClient();
    const accessContext = await getStaffAccessContext(auth.userId);
    const scope = getScopedPermissionFilter(accessContext, 'schedule.location_closures.manage');

    if (scope.kind === 'none') {
      return badRequest(scope.code, 'Scope insuffisant pour créer cette fermeture');
    }

    if (scope.kind === 'locations' && !scope.locationIds.includes(locationId)) {
      return badRequest('location_out_of_scope', 'Ce centre est hors scope');
    }

    const { data, error } = await supabase
      .from('location_closures')
      .insert([
        {
          location_id: locationId,
          closure_date: closureDate,
          start_time: startTime,
          end_time: endTime,
          reason: reason || null,
          created_by: auth.userId,
        },
      ])
      .select('id,location_id,closure_date,start_time,end_time,reason,created_at,created_by')
      .single();

    if (error) {
      console.error('location_closures_create_error', error);
      return NextResponse.json(
        { code: 'location_closures_create_failed', error: 'Impossible de créer la fermeture du centre' },
        { status: 500 }
      );
    }

    await insertAdminAuditLog({
      actorUserId: auth.userId,
      entityType: 'location_closures',
      entityId: data.id,
      action: 'create',
      before: null,
      after: data,
      meta: {
        source: 'admin_schedule_location_closures_api',
      },
    });

    return NextResponse.json({ closure: data }, { status: 201 });
  } catch (error) {
    console.error('location_closures_post_unhandled_error', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
