import { NextResponse } from 'next/server';

import { requireStaffAuth } from '@/lib/apiAuth';
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
      feature: 'admin_schedule_time_off_update',
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

    if (typeof body?.stylistId === 'string') {
      if (!isUuid(body.stylistId)) {
        return badRequest('invalid_stylist_id', 'stylistId invalide');
      }
      updates.stylist_id = body.stylistId;
    }

    if (typeof body?.locationId === 'string') {
      if (!isUuid(body.locationId)) {
        return badRequest('invalid_location_id', 'locationId invalide');
      }
      updates.location_id = body.locationId;
    }

    if (body?.locationId === null) {
      updates.location_id = null;
    }

    if (typeof body?.reason === 'string') {
      updates.reason = body.reason.trim() || null;
    }

    if (typeof body?.category === 'string') {
      const category = body.category.trim();
      if (!TIME_OFF_CATEGORIES.has(category)) {
        return badRequest('invalid_category', 'Catégorie non autorisée');
      }
      updates.category = category;
    }

    const nextStart = typeof body?.startDateTime === 'string' ? new Date(body.startDateTime) : null;
    const nextEnd = typeof body?.endDateTime === 'string' ? new Date(body.endDateTime) : null;

    if (nextStart) {
      if (Number.isNaN(nextStart.getTime())) {
        return badRequest('invalid_start_datetime', 'startDateTime invalide');
      }
      updates.start_datetime = nextStart.toISOString();
    }

    if (nextEnd) {
      if (Number.isNaN(nextEnd.getTime())) {
        return badRequest('invalid_end_datetime', 'endDateTime invalide');
      }
      updates.end_datetime = nextEnd.toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return badRequest('empty_payload', 'Aucune donnée à mettre à jour');
    }

    if (updates.start_datetime || updates.end_datetime) {
      const supabase = getSupabaseAdminClient();
      const { data: existing, error: existingError } = await supabase
        .from('time_off')
        .select('start_datetime,end_datetime')
        .eq('id', id)
        .maybeSingle();

      if (existingError) {
        console.error('time_off_update_existing_error', existingError);
        return NextResponse.json(
          { code: 'time_off_fetch_failed', error: 'Impossible de charger l’indisponibilité' },
          { status: 500 }
        );
      }

      if (!existing) {
        return NextResponse.json(
          { code: 'not_found', error: 'Indisponibilité introuvable' },
          { status: 404 }
        );
      }

      const start = new Date((updates.start_datetime as string) || existing.start_datetime);
      const end = new Date((updates.end_datetime as string) || existing.end_datetime);

      if (end <= start) {
        return badRequest('invalid_datetime_range', 'Intervalle de dates invalide');
      }
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('time_off')
      .update(updates)
      .eq('id', id)
      .select('id,stylist_id,location_id,start_datetime,end_datetime,reason,category,created_at')
      .maybeSingle();

    if (error) {
      console.error('time_off_update_error', error);
      return NextResponse.json(
        { code: 'time_off_update_failed', error: 'Impossible de mettre à jour l’indisponibilité' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { code: 'not_found', error: 'Indisponibilité introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json({ timeOff: data }, { status: 200 });
  } catch (error) {
    console.error('time_off_put_unhandled_error', error);
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
      feature: 'admin_schedule_time_off_delete',
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
      .from('time_off')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('time_off_delete_error', error);
      return NextResponse.json(
        { code: 'time_off_delete_failed', error: 'Impossible de supprimer l’indisponibilité' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { code: 'not_found', error: 'Indisponibilité introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json({ deletedId: data.id }, { status: 200 });
  } catch (error) {
    console.error('time_off_delete_unhandled_error', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
