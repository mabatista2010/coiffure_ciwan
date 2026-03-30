import { NextResponse } from 'next/server';

import { requireStaffAuth } from '@/lib/apiAuth';
import { getScopedPermissionFilter, getStaffAccessContext } from '@/lib/permissions/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const MAX_BULK_IDS = 500;

type PendingBookingRow = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'needs_replan' | 'cancelled' | 'completed';
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  stylist_id: string;
  location_id: string;
  service_id: number;
  stylist?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
  service?: { id: number; nombre: string; precio: number | null } | null;
};

type PendingBookingRelation<T> = T | T[] | null | undefined;

type PendingBookingRowFromQuery = Omit<PendingBookingRow, 'stylist' | 'location' | 'service'> & {
  stylist?: PendingBookingRelation<{ id: string; name: string }>;
  location?: PendingBookingRelation<{ id: string; name: string }>;
  service?: PendingBookingRelation<{ id: number; nombre: string; precio: number | null }>;
};

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function badRequest(code: string, error: string) {
  return NextResponse.json({ code, error }, { status: 400 });
}

function unprocessable(code: string, error: string) {
  return NextResponse.json({ code, error }, { status: 422 });
}

function firstRelationItem<T>(value: PendingBookingRelation<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function normalizePendingRows(rows: PendingBookingRowFromQuery[]): PendingBookingRow[] {
  return rows.map((row) => ({
    ...row,
    stylist: firstRelationItem(row.stylist),
    location: firstRelationItem(row.location),
    service: firstRelationItem(row.service),
  }));
}

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      feature: 'admin_pending_bookings_get',
      requiredPermission: 'reservations.manage_pending',
    });

    if ('response' in auth) {
      return auth.response;
    }

    const todayKey = toDateKey(new Date());
    const supabase = getSupabaseAdminClient();
    const accessContext = await getStaffAccessContext(auth.userId);
    const scope = getScopedPermissionFilter(accessContext, 'reservations.manage_pending');

    if (scope.kind === 'none') {
      return NextResponse.json(
        {
          bookings: [],
          scope: { role: auth.role, stylist_id: null, location_ids: [], code: scope.code },
        },
        { status: 200 }
      );
    }

    let query = supabase
      .from('bookings')
      .select(
        `
          id,
          booking_date,
          start_time,
          end_time,
          status,
          customer_name,
          customer_email,
          customer_phone,
          stylist_id,
          location_id,
          service_id,
          stylist:stylists(id,name),
          location:locations(id,name),
          service:servicios(id,nombre,precio)
        `
      )
      .eq('status', 'pending')
      .gte('booking_date', todayKey)
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(300);

    if (scope.kind === 'stylist') {
      query = query.eq('stylist_id', scope.stylistId);
    } else if (scope.kind === 'locations') {
      query = query.in('location_id', scope.locationIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('pending_bookings_fetch_error', error);
      return NextResponse.json(
        { code: 'pending_fetch_failed', error: 'Impossible de récupérer les réservations en attente' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        bookings: normalizePendingRows((data || []) as PendingBookingRowFromQuery[]),
        scope: {
          role: auth.role,
          stylist_id: scope.kind === 'stylist' ? scope.stylistId : null,
          location_ids: scope.kind === 'locations' ? scope.locationIds : [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('pending_bookings_get_unhandled_error', error);
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
      feature: 'admin_pending_bookings_confirm',
      requiredPermission: 'reservations.manage_pending',
    });

    if ('response' in auth) {
      return auth.response;
    }

    const body = await request.json().catch(() => ({}));
    const approveAll = Boolean(body?.approveAll);
    const rawBookingIds = Array.isArray(body?.bookingIds)
      ? body.bookingIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    const bookingIds = Array.from(new Set(rawBookingIds.map((id: string) => id.trim())));

    if (!approveAll && bookingIds.length === 0) {
      return badRequest('missing_target', 'Aucune réservation cible fournie');
    }

    if (bookingIds.length > MAX_BULK_IDS) {
      return badRequest('too_many_ids', `Maximum ${MAX_BULK_IDS} réservations par requête`);
    }

    const todayKey = toDateKey(new Date());
    const supabase = getSupabaseAdminClient();
    const accessContext = await getStaffAccessContext(auth.userId);
    const scope = getScopedPermissionFilter(accessContext, 'reservations.manage_pending');

    if (scope.kind === 'none') {
      return unprocessable(scope.code, 'Scope insuffisant pour valider des réservations');
    }

    let eligibleQuery = supabase
      .from('bookings')
      .select('id')
      .eq('status', 'pending')
      .gte('booking_date', todayKey);

    if (scope.kind === 'stylist') {
      eligibleQuery = eligibleQuery.eq('stylist_id', scope.stylistId);
    } else if (scope.kind === 'locations') {
      eligibleQuery = eligibleQuery.in('location_id', scope.locationIds);
    }

    if (!approveAll) {
      eligibleQuery = eligibleQuery.in('id', bookingIds);
    }

    const { data: eligibleData, error: eligibleError } = await eligibleQuery;

    if (eligibleError) {
      console.error('pending_bookings_eligible_error', eligibleError);
      return NextResponse.json(
        { code: 'eligible_fetch_failed', error: 'Impossible de préparer la validation des réservations' },
        { status: 500 }
      );
    }

    const eligibleIds = (eligibleData || []).map((row) => row.id);
    if (eligibleIds.length === 0) {
      return NextResponse.json(
        {
          updated_count: 0,
          updated_ids: [],
          eligible_count: 0,
          requested_count: approveAll ? 0 : bookingIds.length,
          skipped_count: approveAll ? 0 : bookingIds.length,
        },
        { status: 200 }
      );
    }

    let updateQuery = supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .in('id', eligibleIds)
      .eq('status', 'pending')
      .select('id');

    if (scope.kind === 'stylist') {
      updateQuery = updateQuery.eq('stylist_id', scope.stylistId);
    } else if (scope.kind === 'locations') {
      updateQuery = updateQuery.in('location_id', scope.locationIds);
    }

    const { data: updatedRows, error: updateError } = await updateQuery;

    if (updateError) {
      console.error('pending_bookings_update_error', updateError);
      return NextResponse.json(
        { code: 'pending_update_failed', error: 'Impossible de confirmer les réservations' },
        { status: 500 }
      );
    }

    const updatedIds = (updatedRows || []).map((row) => row.id);
    const requestedCount = approveAll ? eligibleIds.length : bookingIds.length;

    return NextResponse.json(
      {
        updated_count: updatedIds.length,
        updated_ids: updatedIds,
        eligible_count: eligibleIds.length,
        requested_count: requestedCount,
        skipped_count: Math.max(requestedCount - updatedIds.length, 0),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('pending_bookings_post_unhandled_error', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
