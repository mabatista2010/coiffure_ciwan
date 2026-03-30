import { NextResponse } from 'next/server';

import { requireStaffAuth } from '@/lib/apiAuth';
import { getScopedPermissionFilter, getStaffAccessContext } from '@/lib/permissions/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const MAX_BULK_IDS = 200;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_REGEX.test(value));
}

function badRequest(code: string, error: string) {
  return NextResponse.json({ code, error }, { status: 400 });
}

function unprocessable(code: string, error: string) {
  return NextResponse.json({ code, error }, { status: 422 });
}

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      feature: 'admin_replan_get',
      requiredPermission: 'reservations.replan',
    });

    if ('response' in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const stylistIdParam = searchParams.get('stylistId');
    const locationIdParam = searchParams.get('locationId');
    const limitParam = Number(searchParams.get('limit') || '200');
    const limit = Number.isInteger(limitParam) ? Math.max(1, Math.min(limitParam, 500)) : 200;

    if (fromDate && !DATE_REGEX.test(fromDate)) {
      return badRequest('invalid_from_date', 'fromDate invalide');
    }

    if (toDate && !DATE_REGEX.test(toDate)) {
      return badRequest('invalid_to_date', 'toDate invalide');
    }

    if (stylistIdParam && !isUuid(stylistIdParam)) {
      return badRequest('invalid_stylist_id', 'stylistId invalide');
    }

    if (locationIdParam && !isUuid(locationIdParam)) {
      return badRequest('invalid_location_id', 'locationId invalide');
    }

    const supabase = getSupabaseAdminClient();
    const accessContext = await getStaffAccessContext(auth.userId);
    const scope = getScopedPermissionFilter(accessContext, 'reservations.replan');

    if (scope.kind === 'none') {
      return NextResponse.json(
        { bookings: [], scope: { role: auth.role, stylist_id: null, location_ids: [], code: scope.code } },
        { status: 200 }
      );
    }

    let query = supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        status,
        customer_name,
        customer_email,
        customer_phone,
        notes,
        replan_reason,
        replan_marked_at,
        stylist_id,
        location_id,
        service_id,
        stylist:stylists(id,name),
        location:locations(id,name),
        service:servicios(id,nombre,precio,duration)
      `)
      .eq('status', 'needs_replan')
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })
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

    if (fromDate) {
      query = query.gte('booking_date', fromDate);
    }

    if (toDate) {
      query = query.lte('booking_date', toDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('replan_fetch_error', error);
      return NextResponse.json(
        { code: 'replan_fetch_failed', error: 'Impossible de récupérer les réservations à replanifier' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        bookings: data || [],
        scope: {
          role: auth.role,
          stylist_id: scope.kind === 'stylist' ? scope.stylistId : null,
          location_ids: scope.kind === 'locations' ? scope.locationIds : [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('replan_get_unhandled_error', error);
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
      feature: 'admin_replan_post',
      requiredPermission: 'reservations.replan',
    });

    if ('response' in auth) {
      return auth.response;
    }

    const body = await request.json().catch(() => ({}));
    const action = typeof body?.action === 'string' ? body.action : null;

    if (!action || !['confirm', 'cancel', 'move'].includes(action)) {
      return badRequest('invalid_action', 'Action invalide');
    }

    const supabase = getSupabaseAdminClient();
    const accessContext = await getStaffAccessContext(auth.userId);
    const scope = getScopedPermissionFilter(accessContext, 'reservations.replan');

    if (scope.kind === 'none') {
      return unprocessable(scope.code, 'Scope insuffisant pour replanifier cette réservation');
    }

    if (action === 'move') {
      const bookingId = typeof body?.bookingId === 'string' ? body.bookingId : null;
      const newBookingDate = typeof body?.newBookingDate === 'string' ? body.newBookingDate : null;
      const newStartTimeRaw = typeof body?.newStartTime === 'string' ? body.newStartTime.trim() : null;
      const newStatus = body?.newStatus === 'pending' ? 'pending' : 'confirmed';

      if (!isUuid(bookingId)) {
        return badRequest('invalid_booking_id', 'bookingId invalide');
      }

      if (!newBookingDate || !DATE_REGEX.test(newBookingDate)) {
        return badRequest('invalid_new_booking_date', 'newBookingDate invalide');
      }

      if (!newStartTimeRaw || !TIME_REGEX.test(newStartTimeRaw)) {
        return badRequest('invalid_new_start_time', 'newStartTime invalide');
      }

      const normalizedStartTime = newStartTimeRaw.length === 5 ? `${newStartTimeRaw}:00` : newStartTimeRaw;

      let bookingQuery = supabase
        .from('bookings')
        .select('id,stylist_id,location_id,service_id,status')
        .eq('id', bookingId)
        .eq('status', 'needs_replan');

      if (scope.kind === 'stylist') {
        bookingQuery = bookingQuery.eq('stylist_id', scope.stylistId);
      } else if (scope.kind === 'locations') {
        bookingQuery = bookingQuery.in('location_id', scope.locationIds);
      }

      const { data: booking, error: bookingError } = await bookingQuery.maybeSingle();

      if (bookingError) {
        console.error('replan_move_fetch_error', bookingError);
        return NextResponse.json(
          { code: 'replan_move_fetch_failed', error: 'Impossible de charger la réservation à déplacer' },
          { status: 500 }
        );
      }

      if (!booking) {
        return NextResponse.json(
          { code: 'booking_not_found', error: 'Réservation introuvable ou hors scope' },
          { status: 404 }
        );
      }

      const { data: checkData, error: checkError } = await supabase.rpc('check_booking_slot_v2', {
        p_service_id: booking.service_id,
        p_location_id: booking.location_id,
        p_stylist_id: booking.stylist_id,
        p_booking_date: newBookingDate,
        p_start_time: normalizedStartTime,
      });

      if (checkError) {
        console.error('replan_move_check_error', checkError);
        return NextResponse.json(
          { code: 'slot_check_failed', error: 'Impossible de valider le nouveau créneau' },
          { status: 500 }
        );
      }

      const checkResult = Array.isArray(checkData) ? checkData[0] : checkData;
      if (!checkResult?.ok || !checkResult?.end_time) {
        return NextResponse.json(
          {
            code: checkResult?.error_code || 'slot_not_available',
            error: 'Le nouveau créneau n’est pas disponible',
          },
          { status: 422 }
        );
      }

      let updateQuery = supabase
        .from('bookings')
        .update({
          booking_date: newBookingDate,
          start_time: normalizedStartTime,
          end_time: checkResult.end_time,
          status: newStatus,
          replan_reason: null,
          replan_marked_at: null,
        })
        .eq('id', bookingId)
        .eq('status', 'needs_replan')
        .select('id,booking_date,start_time,end_time,status,replan_reason,replan_marked_at');

      if (scope.kind === 'stylist') {
        updateQuery = updateQuery.eq('stylist_id', scope.stylistId);
      } else if (scope.kind === 'locations') {
        updateQuery = updateQuery.in('location_id', scope.locationIds);
      }

      const { data: movedBooking, error: moveError } = await updateQuery.maybeSingle();

      if (moveError) {
        console.error('replan_move_update_error', moveError);
        return NextResponse.json(
          { code: 'replan_move_failed', error: 'Impossible de déplacer la réservation' },
          { status: 500 }
        );
      }

      if (!movedBooking) {
        return NextResponse.json(
          { code: 'booking_not_found', error: 'Réservation introuvable ou déjà modifiée' },
          { status: 404 }
        );
      }

      return NextResponse.json({ updated_count: 1, updated_ids: [movedBooking.id], booking: movedBooking }, { status: 200 });
    }

    const rawBookingIds = Array.isArray(body?.bookingIds)
      ? body.bookingIds.filter((value: unknown): value is string => typeof value === 'string' && isUuid(value))
      : [];
    const bookingIds = Array.from(new Set(rawBookingIds));

    if (bookingIds.length === 0) {
      return badRequest('missing_booking_ids', 'Aucune réservation fournie');
    }

    if (bookingIds.length > MAX_BULK_IDS) {
      return badRequest('too_many_ids', `Maximum ${MAX_BULK_IDS} réservations par requête`);
    }

    const nextStatus = action === 'confirm' ? 'confirmed' : 'cancelled';

    let query = supabase
      .from('bookings')
      .update({
        status: nextStatus,
        replan_reason: null,
        replan_marked_at: null,
      })
      .in('id', bookingIds)
      .eq('status', 'needs_replan')
      .select('id');

    if (scope.kind === 'stylist') {
      query = query.eq('stylist_id', scope.stylistId);
    } else if (scope.kind === 'locations') {
      query = query.in('location_id', scope.locationIds);
    }

    const { data: updatedRows, error: updateError } = await query;

    if (updateError) {
      console.error('replan_bulk_update_error', updateError);
      return NextResponse.json(
        { code: 'replan_bulk_update_failed', error: 'Impossible de mettre à jour les réservations' },
        { status: 500 }
      );
    }

    const updatedIds = (updatedRows || []).map((row) => row.id);
    return NextResponse.json(
      {
        updated_count: updatedIds.length,
        updated_ids: updatedIds,
        requested_count: bookingIds.length,
        skipped_count: Math.max(bookingIds.length - updatedIds.length, 0),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('replan_post_unhandled_error', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
