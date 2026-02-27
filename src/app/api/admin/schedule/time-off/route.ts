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

async function getEmployeeStylistScope(userId: string): Promise<{ stylistId: string | null; response?: NextResponse }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('stylist_users')
    .select('stylist_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('time_off_scope_fetch_error', error);
    return {
      stylistId: null,
      response: NextResponse.json(
        { code: 'scope_fetch_failed', error: 'Impossible de déterminer le scope employé' },
        { status: 500 }
      ),
    };
  }

  return { stylistId: data?.stylist_id || null };
}

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'employee'],
      feature: 'admin_schedule_time_off_get',
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

    let scopedStylistId: string | null = stylistIdParam || null;
    if (auth.role === 'employee') {
      const scope = await getEmployeeStylistScope(auth.userId);
      if (scope.response) {
        return scope.response;
      }
      scopedStylistId = scope.stylistId;

      if (!scopedStylistId) {
        return NextResponse.json({ timeOff: [], scope: { role: auth.role, stylist_id: null } }, { status: 200 });
      }
    }

    let query = supabase
      .from('time_off')
      .select('id,stylist_id,location_id,start_datetime,end_datetime,reason,category,created_at')
      .order('start_datetime', { ascending: true })
      .limit(limit);

    if (scopedStylistId) {
      query = query.eq('stylist_id', scopedStylistId);
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
        scope: { role: auth.role, stylist_id: auth.role === 'employee' ? scopedStylistId : null },
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
      allowedRoles: ['admin'],
      feature: 'admin_schedule_time_off_create',
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

    return NextResponse.json({ timeOff: data }, { status: 201 });
  } catch (error) {
    console.error('time_off_post_unhandled_error', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
