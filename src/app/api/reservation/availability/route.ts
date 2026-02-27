import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

type AvailabilityRow = {
  slot_time: string;
  available: boolean;
  reason_code: string | null;
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const stylistId = searchParams.get('stylistId');
    const locationId = searchParams.get('locationId');
    const serviceIdParam = searchParams.get('serviceId');

    const serviceId = Number(serviceIdParam);

    if (
      !date ||
      !stylistId ||
      !locationId ||
      !serviceIdParam ||
      !DATE_REGEX.test(date) ||
      !Number.isInteger(serviceId) ||
      serviceId <= 0
    ) {
      return NextResponse.json(
        { error: 'Paramètres requis manquants ou invalides' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();

    const { data, error } = await supabaseAdmin.rpc('get_availability_slots_v2', {
      p_booking_date: date,
      p_stylist_id: stylistId,
      p_location_id: locationId,
      p_service_id: serviceId,
    });

    if (error) {
      console.error('Erreur get_availability_slots_v2:', error);
      return NextResponse.json(
        { error: 'Erreur lors du calcul de la disponibilité' },
        { status: 500 }
      );
    }

    const availableSlots = ((data || []) as AvailabilityRow[]).map((row) => ({
      time: row.slot_time,
      available: row.available,
      reasonCode: row.reason_code,
    }));

    return NextResponse.json({ availableSlots });
  } catch (error) {
    console.error('Erreur lors du calcul de la disponibilité:', error);
    return NextResponse.json(
      { error: 'Erreur lors du calcul de la disponibilité' },
      { status: 500 }
    );
  }
}
