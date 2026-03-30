import { NextResponse } from 'next/server';

import { requireStaffAuth } from '@/lib/apiAuth';
import { buildCustomerKey, normalizeEmail, normalizePhone } from '@/lib/crmCustomerKey';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

type CustomerSearchCandidate = {
  customer_key: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  last_visit_date: string | null;
  total_visits: number;
  total_spent: number;
  source: 'profile' | 'booking' | 'mixed';
  score: number;
};

type ProfileRow = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
};

type BookingSeedRow = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
};

type BookingStatsRow = {
  id: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'needs_replan' | 'cancelled' | 'completed';
  customer_email: string;
  customer_phone: string;
  service?: { precio?: number | null } | null;
};

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;
const MIN_QUERY_LENGTH = 2;

function sanitizeLikeTerm(value: string): string {
  return value.replace(/[,%_]/g, ' ').trim();
}

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(MAX_LIMIT, Math.floor(parsed));
}

function getMatchScore(
  candidate: Pick<CustomerSearchCandidate, 'customer_name' | 'customer_email' | 'customer_phone' | 'total_visits'>,
  normalizedQuery: string,
  phoneQuery: string
): number {
  let score = 0;

  const candidateName = (candidate.customer_name || '').toLowerCase();
  const candidateEmail = normalizeEmail(candidate.customer_email || '');
  const candidatePhone = normalizePhone(candidate.customer_phone || '');

  if (normalizedQuery) {
    if (candidateEmail === normalizedQuery) score += 120;
    else if (candidateEmail.startsWith(normalizedQuery)) score += 90;
    else if (candidateEmail.includes(normalizedQuery)) score += 60;

    if (candidateName === normalizedQuery) score += 95;
    else if (candidateName.startsWith(normalizedQuery)) score += 70;
    else if (candidateName.includes(normalizedQuery)) score += 45;
  }

  if (phoneQuery) {
    if (candidatePhone === phoneQuery) score += 125;
    else if (candidatePhone.startsWith(phoneQuery)) score += 85;
    else if (candidatePhone.includes(phoneQuery)) score += 55;
  }

  score += Math.min(candidate.total_visits, 15);
  return score;
}

function updateCandidateSource(
  previous: CustomerSearchCandidate['source'],
  incoming: CustomerSearchCandidate['source']
): CustomerSearchCandidate['source'] {
  if (previous === incoming) return previous;
  return 'mixed';
}

function candidateToPublic(candidate: CustomerSearchCandidate) {
  return {
    customer_key: candidate.customer_key,
    customer_name: candidate.customer_name,
    customer_email: candidate.customer_email,
    customer_phone: candidate.customer_phone,
    last_visit_date: candidate.last_visit_date,
    total_visits: candidate.total_visits,
    total_spent: candidate.total_spent,
    source: candidate.source,
  };
}

export async function GET(request: Request) {
  const startedAt = Date.now();

  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      feature: 'crm_customer_search',
      requiredPermission: 'crm.customers.view',
    });

    if ('response' in auth) {
      return auth.response;
    }

    const url = new URL(request.url);
    const rawQuery = (url.searchParams.get('q') || '').trim();
    const limit = parseLimit(url.searchParams.get('limit'));

    if (rawQuery.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        {
          customers: [],
          total: 0,
          query: rawQuery,
          min_length: MIN_QUERY_LENGTH,
        },
        { status: 200 }
      );
    }

    const normalizedQuery = normalizeEmail(rawQuery);
    const phoneQuery = normalizePhone(rawQuery);
    const safeLike = sanitizeLikeTerm(rawQuery);

    if (!safeLike && !phoneQuery) {
      return NextResponse.json({ customers: [], total: 0, query: rawQuery }, { status: 200 });
    }

    const supabase = getSupabaseAdminClient();

    const profileFilters: string[] = [];
    if (safeLike) {
      profileFilters.push(`customer_name.ilike.%${safeLike}%`);
      profileFilters.push(`customer_email.ilike.%${safeLike}%`);
      profileFilters.push(`customer_phone.ilike.%${safeLike}%`);
    }
    if (phoneQuery && safeLike !== phoneQuery) {
      profileFilters.push(`customer_phone.ilike.%${phoneQuery}%`);
    }

    const bookingFilters: string[] = [];
    if (safeLike) {
      bookingFilters.push(`customer_name.ilike.%${safeLike}%`);
      bookingFilters.push(`customer_email.ilike.%${safeLike}%`);
      bookingFilters.push(`customer_phone.ilike.%${safeLike}%`);
    }
    if (phoneQuery && safeLike !== phoneQuery) {
      bookingFilters.push(`customer_phone.ilike.%${phoneQuery}%`);
    }

    const [profileRes, bookingSeedsRes] = await Promise.all([
      supabase
        .from('customer_profiles')
        .select('customer_name, customer_email, customer_phone')
        .or(profileFilters.join(','))
        .limit(60),
      supabase
        .from('bookings')
        .select('customer_name, customer_email, customer_phone')
        .or(bookingFilters.join(','))
        .order('booking_date', { ascending: false })
        .limit(240),
    ]);

    if (profileRes.error) {
      console.error('crm_customer_search_profiles_error', profileRes.error);
      return NextResponse.json(
        { code: 'profiles_search_failed', error: 'Impossible de rechercher les clients' },
        { status: 500 }
      );
    }

    if (bookingSeedsRes.error) {
      console.error('crm_customer_search_bookings_error', bookingSeedsRes.error);
      return NextResponse.json(
        { code: 'bookings_search_failed', error: 'Impossible de rechercher les clients' },
        { status: 500 }
      );
    }

    const candidatesMap = new Map<string, CustomerSearchCandidate>();

    const upsertCandidate = (
      base: {
        customer_name: string;
        customer_email: string;
        customer_phone: string;
      },
      source: 'profile' | 'booking'
    ) => {
      const customerEmail = normalizeEmail(base.customer_email || '');
      const customerPhone = normalizePhone(base.customer_phone || '');
      const customerName = (base.customer_name || '').trim();
      const customerKey = buildCustomerKey(customerEmail, customerPhone);

      if (!customerKey) return;

      const existing = candidatesMap.get(customerKey);
      if (!existing) {
        candidatesMap.set(customerKey, {
          customer_key: customerKey,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          last_visit_date: null,
          total_visits: 0,
          total_spent: 0,
          source,
          score: 0,
        });
        return;
      }

      const nextName = existing.customer_name || customerName;
      const nextEmail = existing.customer_email || customerEmail;
      const nextPhone = existing.customer_phone || customerPhone;

      candidatesMap.set(customerKey, {
        ...existing,
        customer_name: nextName,
        customer_email: nextEmail,
        customer_phone: nextPhone,
        source: updateCandidateSource(existing.source, source),
      });
    };

    (profileRes.data || []).forEach((row) => upsertCandidate(row as ProfileRow, 'profile'));
    (bookingSeedsRes.data || []).forEach((row) => upsertCandidate(row as BookingSeedRow, 'booking'));

    if (candidatesMap.size === 0) {
      return NextResponse.json({ customers: [], total: 0, query: rawQuery }, { status: 200 });
    }

    const candidates = Array.from(candidatesMap.values());
    const emailValues = Array.from(
      new Set(candidates.map((candidate) => candidate.customer_email).filter(Boolean))
    );
    const phoneValues = Array.from(
      new Set(candidates.map((candidate) => candidate.customer_phone).filter(Boolean))
    );

    const [statsByEmailRes, statsByPhoneRes] = await Promise.all([
      emailValues.length > 0
        ? supabase
            .from('bookings')
            .select('id, booking_date, status, customer_email, customer_phone, service:service_id(precio)')
            .in('customer_email', emailValues)
            .limit(1200)
        : Promise.resolve({ data: [], error: null }),
      phoneValues.length > 0
        ? supabase
            .from('bookings')
            .select('id, booking_date, status, customer_email, customer_phone, service:service_id(precio)')
            .in('customer_phone', phoneValues)
            .limit(1200)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (statsByEmailRes.error) {
      console.error('crm_customer_search_stats_email_error', statsByEmailRes.error);
      return NextResponse.json(
        { code: 'stats_search_failed', error: 'Impossible de préparer les statistiques client' },
        { status: 500 }
      );
    }

    if (statsByPhoneRes.error) {
      console.error('crm_customer_search_stats_phone_error', statsByPhoneRes.error);
      return NextResponse.json(
        { code: 'stats_search_failed', error: 'Impossible de préparer les statistiques client' },
        { status: 500 }
      );
    }

    const byEmail = new Map<string, CustomerSearchCandidate[]>();
    const byPhone = new Map<string, CustomerSearchCandidate[]>();

    candidates.forEach((candidate) => {
      if (candidate.customer_email) {
        const list = byEmail.get(candidate.customer_email) || [];
        list.push(candidate);
        byEmail.set(candidate.customer_email, list);
      }

      if (candidate.customer_phone) {
        const list = byPhone.get(candidate.customer_phone) || [];
        list.push(candidate);
        byPhone.set(candidate.customer_phone, list);
      }
    });

    const statsRowsMap = new Map<string, BookingStatsRow>();
    [...(statsByEmailRes.data || []), ...(statsByPhoneRes.data || [])].forEach((row) => {
      const booking = row as BookingStatsRow;
      if (!booking.id) return;
      if (!statsRowsMap.has(booking.id)) {
        statsRowsMap.set(booking.id, booking);
      }
    });

    statsRowsMap.forEach((booking) => {
      const email = normalizeEmail(booking.customer_email || '');
      const phone = normalizePhone(booking.customer_phone || '');
      const matched = new Set<CustomerSearchCandidate>();

      (byEmail.get(email) || []).forEach((candidate) => matched.add(candidate));
      (byPhone.get(phone) || []).forEach((candidate) => matched.add(candidate));

      if (matched.size === 0) return;

      matched.forEach((candidate) => {
        candidate.total_visits += 1;

        if (!candidate.last_visit_date || booking.booking_date > candidate.last_visit_date) {
          candidate.last_visit_date = booking.booking_date;
        }

        if (booking.status === 'completed') {
          candidate.total_spent += Number(booking.service?.precio || 0);
        }
      });
    });

    candidates.forEach((candidate) => {
      candidate.score = getMatchScore(candidate, normalizedQuery, phoneQuery);
    });

    candidates.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if ((right.last_visit_date || '') !== (left.last_visit_date || '')) {
        return (right.last_visit_date || '').localeCompare(left.last_visit_date || '');
      }
      return left.customer_name.localeCompare(right.customer_name);
    });

    const sliced = candidates.slice(0, limit).map(candidateToPublic);
    const latencyMs = Date.now() - startedAt;

    console.info('crm_customer_search_ok', {
      query: rawQuery,
      limit,
      returned: sliced.length,
      total_candidates: candidates.length,
      role: auth.role,
      latency_ms: latencyMs,
    });

    return NextResponse.json(
      {
        customers: sliced,
        total: candidates.length,
        query: rawQuery,
        latency_ms: latencyMs,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('crm_customer_search_unhandled_error', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
