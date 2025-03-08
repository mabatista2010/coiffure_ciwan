import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      notes,
      serviceId,
      locationId,
      stylistId,
      bookingDate,
      startTime,
    } = body;

    // Valider les données obligatoires
    if (!customerName || !customerEmail || !customerPhone || !serviceId || !locationId || !stylistId || !bookingDate || !startTime) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants' },
        { status: 400 }
      );
    }

    // Obtenir la durée du service pour calculer l'heure de fin
    const { data: service, error: serviceError } = await supabase
      .from('servicios')
      .select('duration')
      .eq('id', serviceId)
      .single();

    if (serviceError) {
      console.error('Erreur lors de l\'obtention de la durée du service:', serviceError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'obtention des détails du service' },
        { status: 500 }
      );
    }

    const serviceDuration = service?.duration || 30; // Durée par défaut: 30 minutes

    // Calculer l'heure de fin
    const endTime = calculateEndTime(startTime, serviceDuration);

    // Vérifier si l'horaire est toujours disponible (évite les conflits de concurrence)
    const isStillAvailable = await checkAvailability(stylistId, locationId, bookingDate, startTime, endTime);

    if (!isStillAvailable) {
      return NextResponse.json(
        { error: 'L\'horaire sélectionné n\'est plus disponible' },
        { status: 409 }
      );
    }

    // Créer la réservation
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([
        {
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          notes: notes || '',
          stylist_id: stylistId,
          service_id: serviceId,
          location_id: locationId,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: endTime,
          status: 'pending', // État initial
        },
      ])
      .select()
      .single();

    if (bookingError) {
      console.error('Erreur lors de la création de la réservation:', bookingError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la réservation' },
        { status: 500 }
      );
    }

    // TODO: Ici, on pourrait envoyer un email de confirmation au client

    return NextResponse.json({ 
      success: true, 
      bookingId: booking.id,
      message: 'Réservation créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du traitement de la réservation:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la réservation' },
      { status: 500 }
    );
  }
}

// Fonction pour calculer l'heure de fin
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + durationMinutes);
  
  return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
}

// Fonction pour vérifier si l'horaire est toujours disponible
async function checkAvailability(
  stylistId: string,
  locationId: string,
  bookingDate: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  // Convertir les heures en minutes pour faciliter les comparaisons
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  const slotStartMinutes = startHours * 60 + startMinutes;
  const slotEndMinutes = endHours * 60 + endMinutes;

  // Obtenir le jour de la semaine pour cette date
  const dayOfWeek = new Date(bookingDate).getDay();

  // Vérifier si l'horaire de réservation est à l'intérieur des plages horaires de travail du styliste
  const { data: workingHours, error: workingHoursError } = await supabase
    .from('working_hours')
    .select('*')
    .eq('stylist_id', stylistId)
    .eq('location_id', locationId)
    .eq('day_of_week', dayOfWeek);

  if (workingHoursError) {
    console.error('Erreur lors de la vérification des horaires de travail:', workingHoursError);
    throw new Error('Erreur lors de la vérification des horaires de travail');
  }

  // Vérifier si l'horaire est dans au moins une plage horaire de travail
  const isWithinWorkingHours = workingHours?.some(workHour => {
    const [whStartHours, whStartMins] = workHour.start_time.split(':').map(Number);
    const [whEndHours, whEndMins] = workHour.end_time.split(':').map(Number);
    const whStartMinutes = whStartHours * 60 + whStartMins;
    const whEndMinutes = whEndHours * 60 + whEndMins;

    // Le créneau de réservation doit être entièrement à l'intérieur d'une plage horaire de travail
    return (slotStartMinutes >= whStartMinutes && slotEndMinutes <= whEndMinutes);
  });

  if (!isWithinWorkingHours) {
    console.error('L\'horaire de réservation n\'est pas dans les plages horaires de travail du styliste');
    return false;
  }

  // Vérifier s'il y a des réservations existantes qui se chevauchent
  const { data: existingBookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .eq('stylist_id', stylistId)
    .eq('location_id', locationId)
    .eq('booking_date', bookingDate)
    .in('status', ['pending', 'confirmed']);

  if (bookingsError) {
    console.error('Erreur lors de la vérification de disponibilité:', bookingsError);
    throw new Error('Erreur lors de la vérification de disponibilité');
  }

  // Vérifier s'il y a une réservation qui se chevauche
  const isSlotBooked = existingBookings?.some(booking => {
    const bookingStartParts = booking.start_time.split(':').map(Number);
    const bookingEndParts = booking.end_time.split(':').map(Number);
    const bookingStartTime = bookingStartParts[0] * 60 + bookingStartParts[1];
    const bookingEndTime = bookingEndParts[0] * 60 + bookingEndParts[1];
    
    // Vérifier s'il y a chevauchement
    return (slotStartMinutes < bookingEndTime && slotEndMinutes > bookingStartTime);
  });

  // Vérifier s'il y a des temps libres qui se chevauchent
  const { data: timeOff, error: timeOffError } = await supabase
    .from('time_off')
    .select('*')
    .eq('stylist_id', stylistId)
    .eq('location_id', locationId)
    .lte('start_datetime', `${bookingDate}T23:59:59`)
    .gte('end_datetime', `${bookingDate}T00:00:00`);

  if (timeOffError) {
    console.error('Erreur lors de la vérification des temps libres:', timeOffError);
    throw new Error('Erreur lors de la vérification des temps libres');
  }

  // Vérifier s'il y a un temps libre qui se chevauche
  const isSlotInTimeOff = timeOff?.some(offTime => {
    const offStartDateTime = new Date(offTime.start_datetime);
    const offEndDateTime = new Date(offTime.end_datetime);
    
    const offStartDate = offStartDateTime.toISOString().split('T')[0];
    const offEndDate = offEndDateTime.toISOString().split('T')[0];
    
    if (offStartDate <= bookingDate && offEndDate >= bookingDate) {
      let offStartMinutes = 0; // Début de la journée
      let offEndMinutes = 24 * 60 - 1; // Fin de la journée
      
      if (offStartDate === bookingDate) {
        offStartMinutes = offStartDateTime.getHours() * 60 + offStartDateTime.getMinutes();
      }
      
      if (offEndDate === bookingDate) {
        offEndMinutes = offEndDateTime.getHours() * 60 + offEndDateTime.getMinutes();
      }
      
      return (slotStartMinutes < offEndMinutes && slotEndMinutes > offStartMinutes);
    }
    
    return false;
  });

  // L'horaire est disponible s'il est dans une plage horaire de travail, 
  // qu'il n'y a pas de réservations ni de temps libres qui se chevauchent
  return isWithinWorkingHours && !isSlotBooked && !isSlotInTimeOff;
} 