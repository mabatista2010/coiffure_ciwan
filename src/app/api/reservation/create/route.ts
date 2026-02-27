import { randomUUID, createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

type BookingStatus = 'pending' | 'confirmed';
type BookingRequestState = 'processing' | 'succeeded' | 'failed';

type RpcCreateBookingResult = {
  ok: boolean;
  error_code: string | null;
  booking_id: string | null;
};

type ErrorResponse = {
  error: string;
  errorCode: string;
};

type SuccessResponse = {
  success: true;
  bookingId: string;
  message: string;
};

type ApiResponse = ErrorResponse | SuccessResponse;

type BookingRequestRecord = {
  source: string;
  idempotency_key: string;
  request_hash: string;
  status: BookingRequestState;
  http_status: number | null;
  response_body: ApiResponse | null;
  error_code: string | null;
  booking_id: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_payload: 'Champs obligatoires manquants ou invalides',
  invalid_idempotency_key: 'Clé d\'idempotence invalide',
  idempotency_key_reused: 'La clé d\'idempotence est déjà utilisée avec une autre requête',
  idempotency_in_progress: 'Une requête identique est déjà en cours de traitement',
  invalid_combination: 'La combinaison styliste/centre/service n\'est pas valide',
  outside_booking_window: 'Le créneau est en dehors de la fenêtre de réservation autorisée',
  outside_working_hours: 'L\'horaire sélectionné est hors horaires de travail',
  location_closed: 'Le centre est fermé sur ce créneau',
  stylist_time_off: 'Le styliste est indisponible sur ce créneau',
  slot_conflict: 'L\'horaire sélectionné n\'est plus disponible',
  internal_error: 'Erreur lors du traitement de la réservation',
};

const ERROR_HTTP_STATUS: Record<string, number> = {
  invalid_payload: 400,
  invalid_idempotency_key: 400,
  idempotency_key_reused: 409,
  idempotency_in_progress: 409,
  slot_conflict: 409,
  invalid_combination: 422,
  outside_booking_window: 422,
  outside_working_hours: 422,
  location_closed: 422,
  stylist_time_off: 422,
  internal_error: 500,
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;
const IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9:_\-.]{1,128}$/;
const SOURCE_REGEX = /^[a-z0-9_-]{1,32}$/;

function resolveRpcError(errorCode?: string | null) {
  const normalizedCode = errorCode || 'internal_error';

  return {
    errorCode: normalizedCode,
    error: ERROR_MESSAGES[normalizedCode] || ERROR_MESSAGES.internal_error,
    status: ERROR_HTTP_STATUS[normalizedCode] || 500,
  };
}

function buildErrorResponse(errorCode: string): { payload: ErrorResponse; status: number } {
  const mapped = resolveRpcError(errorCode);
  return {
    payload: { error: mapped.error, errorCode: mapped.errorCode },
    status: mapped.status,
  };
}

function normalizeSource(rawSource: string | null): string {
  const normalized = (rawSource || '').trim().toLowerCase();
  if (SOURCE_REGEX.test(normalized)) {
    return normalized;
  }

  return 'web';
}

function buildRequestHash(params: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
  serviceId: number;
  locationId: string;
  stylistId: string;
  bookingDate: string;
  startTime: string;
  status: BookingStatus;
}): string {
  const normalizedPayload = {
    customerName: params.customerName,
    customerEmail: params.customerEmail.toLowerCase(),
    customerPhone: params.customerPhone,
    notes: params.notes,
    serviceId: params.serviceId,
    locationId: params.locationId,
    stylistId: params.stylistId,
    bookingDate: params.bookingDate,
    startTime: params.startTime,
    status: params.status,
  };

  return createHash('sha256').update(JSON.stringify(normalizedPayload)).digest('hex');
}

function buildResponse(payload: ApiResponse, status: number, requestId: string, replayed = false) {
  const headers = new Headers({
    'X-Request-Id': requestId,
  });

  if (replayed) {
    headers.set('Idempotency-Replayed', 'true');
  }

  return NextResponse.json(payload, { status, headers });
}

function logReservationEvent(params: {
  requestId: string;
  source: string;
  idempotencyKey: string | null;
  status: number;
  errorCode: string | null;
  bookingId: string | null;
  replayed: boolean;
  latencyMs: number;
}) {
  console.info(
    JSON.stringify({
      event: 'booking.create',
      request_id: params.requestId,
      source: params.source,
      idempotency_key: params.idempotencyKey,
      replayed: params.replayed,
      http_status: params.status,
      error_code: params.errorCode,
      booking_id: params.bookingId,
      latency_ms: params.latencyMs,
      at: new Date().toISOString(),
    })
  );
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = randomUUID();

  const source = normalizeSource(request.headers.get('X-Booking-Source'));
  let idempotencyKey: string | null = null;
  let requestHash: string | null = null;
  let idempotencyLocked = false;

  const supabaseAdmin = getSupabaseAdminClient();

  const finalize = async (
    payload: ApiResponse,
    status: number,
    options: { bookingId?: string | null; errorCode?: string | null; replayed?: boolean } = {}
  ) => {
    const bookingId = options.bookingId ?? null;
    const errorCode = options.errorCode ?? ('errorCode' in payload ? payload.errorCode : null);
    const replayed = options.replayed ?? false;
    const latencyMs = Date.now() - startedAt;

    if (idempotencyLocked && idempotencyKey && requestHash && !replayed) {
      const terminalState: BookingRequestState = bookingId ? 'succeeded' : 'failed';

      const { error: updateError } = await supabaseAdmin
        .from('booking_requests')
        .update({
          status: terminalState,
          booking_id: bookingId,
          http_status: status,
          response_body: payload,
          error_code: errorCode,
          latency_ms: latencyMs,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('source', source)
        .eq('idempotency_key', idempotencyKey)
        .eq('request_hash', requestHash)
        .eq('status', 'processing');

      if (updateError) {
        console.error('Erreur mise à jour booking_requests:', updateError);
      }
    }

    logReservationEvent({
      requestId,
      source,
      idempotencyKey,
      status,
      errorCode,
      bookingId,
      replayed,
      latencyMs,
    });

    return buildResponse(payload, status, requestId, replayed);
  };

  try {
    const body = await request.json();

    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const customerEmail = typeof body.customerEmail === 'string' ? body.customerEmail.trim() : '';
    const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const locationId = typeof body.locationId === 'string' ? body.locationId : '';
    const stylistId = typeof body.stylistId === 'string' ? body.stylistId : '';
    const bookingDate = typeof body.bookingDate === 'string' ? body.bookingDate : '';
    const startTime = typeof body.startTime === 'string' ? body.startTime : '';
    const rawStatus = typeof body.status === 'string' ? body.status : undefined;
    const serviceId = Number(body.serviceId);

    const rawIdempotencyKey = (request.headers.get('Idempotency-Key') || '').trim();
    if (rawIdempotencyKey) {
      if (!IDEMPOTENCY_KEY_REGEX.test(rawIdempotencyKey)) {
        const invalidKey = buildErrorResponse('invalid_idempotency_key');
        return finalize(invalidKey.payload, invalidKey.status, { errorCode: invalidKey.payload.errorCode });
      }
      idempotencyKey = rawIdempotencyKey;
    }

    if (rawStatus && rawStatus !== 'pending' && rawStatus !== 'confirmed') {
      const mapped = buildErrorResponse('invalid_payload');
      return finalize(mapped.payload, mapped.status, { errorCode: mapped.payload.errorCode });
    }

    const status: BookingStatus = rawStatus === 'confirmed' ? 'confirmed' : 'pending';

    if (
      !customerName ||
      !customerPhone ||
      !locationId ||
      !stylistId ||
      !bookingDate ||
      !startTime ||
      !Number.isInteger(serviceId) ||
      serviceId <= 0 ||
      !DATE_REGEX.test(bookingDate) ||
      !TIME_REGEX.test(startTime)
    ) {
      const mapped = buildErrorResponse('invalid_payload');
      return finalize(mapped.payload, mapped.status, { errorCode: mapped.payload.errorCode });
    }

    if (idempotencyKey) {
      requestHash = buildRequestHash({
        customerName,
        customerEmail,
        customerPhone,
        notes,
        serviceId,
        locationId,
        stylistId,
        bookingDate,
        startTime,
        status,
      });

      const nowIso = new Date().toISOString();
      const { error: insertError } = await supabaseAdmin
        .from('booking_requests')
        .insert([
          {
            source,
            idempotency_key: idempotencyKey,
            request_hash: requestHash,
            status: 'processing',
            http_status: 202,
            request_id: requestId,
            created_at: nowIso,
            updated_at: nowIso,
          },
        ]);

      if (insertError) {
        if (insertError.code !== '23505') {
          console.error('Erreur création booking_requests:', insertError);
          const mapped = buildErrorResponse('internal_error');
          return finalize(mapped.payload, mapped.status, { errorCode: mapped.payload.errorCode });
        }

        const { data: existing, error: existingError } = await supabaseAdmin
          .from('booking_requests')
          .select('source, idempotency_key, request_hash, status, http_status, response_body, error_code, booking_id')
          .eq('source', source)
          .eq('idempotency_key', idempotencyKey)
          .single<BookingRequestRecord>();

        if (existingError || !existing) {
          console.error('Erreur lecture booking_requests existant:', existingError);
          const mapped = buildErrorResponse('internal_error');
          return finalize(mapped.payload, mapped.status, { errorCode: mapped.payload.errorCode });
        }

        if (existing.request_hash !== requestHash) {
          const mapped = buildErrorResponse('idempotency_key_reused');
          return finalize(mapped.payload, mapped.status, { errorCode: mapped.payload.errorCode });
        }

        if (existing.status === 'processing') {
          const mapped = buildErrorResponse('idempotency_in_progress');
          return finalize(mapped.payload, mapped.status, { errorCode: mapped.payload.errorCode });
        }

        if (existing.response_body && existing.http_status) {
          return finalize(existing.response_body, existing.http_status, {
            bookingId: existing.booking_id,
            errorCode: existing.error_code,
            replayed: true,
          });
        }

        const mapped = buildErrorResponse('idempotency_in_progress');
        return finalize(mapped.payload, mapped.status, { errorCode: mapped.payload.errorCode });
      }

      idempotencyLocked = true;
    }

    const { data, error } = await supabaseAdmin.rpc('create_booking_atomic_v2', {
      p_customer_name: customerName,
      p_customer_email: customerEmail,
      p_customer_phone: customerPhone,
      p_notes: notes,
      p_service_id: serviceId,
      p_location_id: locationId,
      p_stylist_id: stylistId,
      p_booking_date: bookingDate,
      p_start_time: startTime,
      p_status: status,
    });

    if (error) {
      console.error('Erreur RPC create_booking_atomic_v2:', error);
      const mapped = buildErrorResponse('internal_error');
      return finalize(mapped.payload, mapped.status, { errorCode: mapped.payload.errorCode });
    }

    const rpcResult = (Array.isArray(data) ? data[0] : data) as RpcCreateBookingResult | null;

    if (!rpcResult?.ok || !rpcResult?.booking_id) {
      const mapped = resolveRpcError(rpcResult?.error_code);
      return finalize(
        {
          error: mapped.error,
          errorCode: mapped.errorCode,
        },
        mapped.status,
        { errorCode: mapped.errorCode }
      );
    }

    return finalize(
      {
        success: true,
        bookingId: rpcResult.booking_id,
        message: 'Réservation créée avec succès',
      },
      200,
      {
        bookingId: rpcResult.booking_id,
        errorCode: null,
      }
    );
  } catch (error) {
    console.error('Erreur lors du traitement de la réservation:', error);
    const mapped = buildErrorResponse('internal_error');
    return finalize(mapped.payload, mapped.status, { errorCode: mapped.payload.errorCode });
  }
}
