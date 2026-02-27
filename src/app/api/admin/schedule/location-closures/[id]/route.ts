import { NextResponse } from 'next/server';

import { requireStaffAuth } from '@/lib/apiAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_REGEX.test(value));
}

function isValidTime(value: string): boolean {
  return TIME_REGEX.test(value);
}

function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function badRequest(code: string, error: string) {
  return NextResponse.json({ code, error }, { status: 400 });
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

function extractId(params: { id: string }): string | null {
  return params?.id || null;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin'],
      feature: 'admin_schedule_location_closures_update',
    });

    if ('response' in auth) {
      return auth.response;
    }

    const params = await context.params;
    const id = extractId(params);
    if (!isUuid(id)) {
      return badRequest('invalid_id', 'Identifiant invalide');
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};

    if (typeof body?.locationId === 'string') {
      if (!isUuid(body.locationId)) {
        return badRequest('invalid_location_id', 'locationId invalide');
      }
      updates.location_id = body.locationId;
    }

    if (typeof body?.closureDate === 'string') {
      if (!DATE_REGEX.test(body.closureDate)) {
        return badRequest('invalid_closure_date', 'closureDate invalide');
      }
      updates.closure_date = body.closureDate;
    }

    if (typeof body?.reason === 'string') {
      updates.reason = body.reason.trim() || null;
    }

    let shouldUpdateTimes = false;
    let startTime: string | null | undefined;
    let endTime: string | null | undefined;

    if (Object.prototype.hasOwnProperty.call(body, 'startTime')) {
      shouldUpdateTimes = true;
      if (body.startTime === null || body.startTime === '') {
        startTime = null;
      } else if (typeof body.startTime === 'string' && isValidTime(body.startTime.trim())) {
        startTime = normalizeTime(body.startTime.trim());
      } else {
        return badRequest('invalid_start_time', 'startTime invalide');
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'endTime')) {
      shouldUpdateTimes = true;
      if (body.endTime === null || body.endTime === '') {
        endTime = null;
      } else if (typeof body.endTime === 'string' && isValidTime(body.endTime.trim())) {
        endTime = normalizeTime(body.endTime.trim());
      } else {
        return badRequest('invalid_end_time', 'endTime invalide');
      }
    }

    const supabase = getSupabaseAdminClient();

    if (shouldUpdateTimes) {
      const { data: existing, error: existingError } = await supabase
        .from('location_closures')
        .select('start_time,end_time')
        .eq('id', id)
        .maybeSingle();

      if (existingError) {
        console.error('location_closures_update_existing_error', existingError);
        return NextResponse.json(
          { code: 'location_closures_fetch_failed', error: 'Impossible de charger la fermeture' },
          { status: 500 }
        );
      }

      if (!existing) {
        return NextResponse.json({ code: 'not_found', error: 'Fermeture introuvable' }, { status: 404 });
      }

      const nextStart = startTime !== undefined ? startTime : existing.start_time;
      const nextEnd = endTime !== undefined ? endTime : existing.end_time;

      const hasStart = Boolean(nextStart);
      const hasEnd = Boolean(nextEnd);

      if (hasStart !== hasEnd) {
        return badRequest('invalid_time_range', 'startTime et endTime doivent être tous les deux remplis ou vides');
      }

      if (hasStart && hasEnd && (nextStart as string) >= (nextEnd as string)) {
        return badRequest('invalid_time_order', 'startTime doit être inférieur à endTime');
      }

      updates.start_time = nextStart;
      updates.end_time = nextEnd;
    }

    if (Object.keys(updates).length === 0) {
      return badRequest('empty_payload', 'Aucune donnée à mettre à jour');
    }

    const { data, error } = await supabase
      .from('location_closures')
      .update(updates)
      .eq('id', id)
      .select('id,location_id,closure_date,start_time,end_time,reason,created_at,created_by')
      .maybeSingle();

    if (error) {
      console.error('location_closures_update_error', error);
      return NextResponse.json(
        { code: 'location_closures_update_failed', error: 'Impossible de mettre à jour la fermeture' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ code: 'not_found', error: 'Fermeture introuvable' }, { status: 404 });
    }

    return NextResponse.json({ closure: data }, { status: 200 });
  } catch (error) {
    console.error('location_closures_put_unhandled_error', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin'],
      feature: 'admin_schedule_location_closures_delete',
    });

    if ('response' in auth) {
      return auth.response;
    }

    const params = await context.params;
    const id = extractId(params);
    if (!isUuid(id)) {
      return badRequest('invalid_id', 'Identifiant invalide');
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('location_closures')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('location_closures_delete_error', error);
      return NextResponse.json(
        { code: 'location_closures_delete_failed', error: 'Impossible de supprimer la fermeture' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ code: 'not_found', error: 'Fermeture introuvable' }, { status: 404 });
    }

    return NextResponse.json({ deletedId: data.id }, { status: 200 });
  } catch (error) {
    console.error('location_closures_delete_unhandled_error', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
