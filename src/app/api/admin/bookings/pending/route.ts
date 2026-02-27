import { NextResponse } from 'next/server';

import { requireStaffAuth } from '@/lib/apiAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const MAX_BULK_IDS = 500;

type PendingBookingRow = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
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

async function getEmployeeStylistScope(userId: string): Promise<{ stylistId: string | null; error?: NextResponse }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('stylist_users')
    .select('stylist_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('pending_bookings_scope_error', error);
    return {
      stylistId: null,
      error: NextResponse.json(
        { code: 'scope_fetch_failed', error: 'Impossible de déterminer le scope du styliste' },
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
      feature: 'admin_pending_bookings_get',
    });

    if ('response' in auth) {
      return auth.response;
    }

    const todayKey = toDateKey(new Date());
    const supabase = getSupabaseAdminClient();

    let scopedStylistId: string | null = null;
    if (auth.role === 'employee') {
      const scope = await getEmployeeStylistScope(auth.userId);
      if (scope.error) {
        return scope.error;
      }
      scopedStylistId = scope.stylistId;

      if (!scopedStylistId) {
        return NextResponse.json(
          {
            bookings: [],
            scope: { role: auth.role, stylist_id: null, code: 'employee_without_stylist' },
          },
          { status: 200 }
        );
      }
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

    if (scopedStylistId) {
      query = query.eq('stylist_id', scopedStylistId);
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
        bookings: (data || []) as PendingBookingRow[],
        scope: { role: auth.role, stylist_id: scopedStylistId },
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
      allowedRoles: ['admin', 'employee'],
      feature: 'admin_pending_bookings_confirm',
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

    let scopedStylistId: string | null = null;
    if (auth.role === 'employee') {
      const scope = await getEmployeeStylistScope(auth.userId);
      if (scope.error) {
        return scope.error;
      }
      scopedStylistId = scope.stylistId;

      if (!scopedStylistId) {
        return unprocessable(
          'employee_without_stylist',
          'Aucun styliste associé à ce compte employé'
        );
      }
    }

    let eligibleQuery = supabase
      .from('bookings')
      .select('id')
      .eq('status', 'pending')
      .gte('booking_date', todayKey);

    if (scopedStylistId) {
      eligibleQuery = eligibleQuery.eq('stylist_id', scopedStylistId);
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

    if (scopedStylistId) {
      updateQuery = updateQuery.eq('stylist_id', scopedStylistId);
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
