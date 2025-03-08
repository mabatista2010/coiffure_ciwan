import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Interfaces para reemplazar los tipos any
interface Booking {
  start_time: string;
  end_time: string;
  id?: string;
  stylist_id?: string;
  service_id?: string;
  date?: string;
}

interface TimeOff {
  start_datetime: string;
  end_datetime: string;
  date?: string;
  id?: string;
  stylist_id?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const stylistId = searchParams.get('stylistId');
    const locationId = searchParams.get('locationId');
    const serviceId = searchParams.get('serviceId');

    // Valider que tous les paramètres requis sont présents
    if (!date || !stylistId || !locationId || !serviceId) {
      return NextResponse.json(
        { error: 'Paramètres requis manquants' },
        { status: 400 }
      );
    }

    // Convertir la date en jour de la semaine (0-6, où 0 est dimanche)
    const dayOfWeek = new Date(date).getDay();

    // 1. Obtenir l'horaire de travail du styliste pour ce jour dans ce centre
    const { data: workingHours, error: workingHoursError } = await supabase
      .from('working_hours')
      .select('*')
      .eq('stylist_id', stylistId)
      .eq('location_id', locationId)
      .eq('day_of_week', dayOfWeek);

    if (workingHoursError) {
      console.error('Erreur lors de l\'obtention des horaires de travail:', workingHoursError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'obtention des horaires de disponibilité' },
        { status: 500 }
      );
    }

    // S'il n'y a pas d'horaire de travail pour ce jour, il n'y a pas de disponibilité
    if (!workingHours || workingHours.length === 0) {
      return NextResponse.json({ availableSlots: [] });
    }

    // Nous utilisons le premier horaire trouvé (normalement, il n'y en aura qu'un par jour)
    const workHours = workingHours[0];
    const startTime = workHours.start_time;
    const endTime = workHours.end_time;

    // 2. Obtenir la durée du service
    const { data: service, error: serviceError } = await supabase
      .from('servicios')
      .select('duration')
      .eq('id', serviceId)
      .single();

    if (serviceError) {
      console.error('Erreur lors de l\'obtention des détails du service:', serviceError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'obtention des détails du service' },
        { status: 500 }
      );
    }

    const serviceDuration = service?.duration || 30; // Durée par défaut: 30 minutes

    // 3. Obtenir les réservations existantes pour ce styliste, cette date et ce centre
    const { data: existingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('stylist_id', stylistId)
      .eq('location_id', locationId)
      .eq('booking_date', date)
      .in('status', ['pending', 'confirmed']);

    if (bookingsError) {
      console.error('Erreur lors de l\'obtention des réservations existantes:', bookingsError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'obtention des réservations existantes' },
        { status: 500 }
      );
    }

    // 4. Obtenir les temps libres programmés pour ce styliste, cette date et ce centre
    const { data: timeOff, error: timeOffError } = await supabase
      .from('time_off')
      .select('*')
      .eq('stylist_id', stylistId)
      .eq('location_id', locationId)
      .lte('start_datetime', `${date}T23:59:59`)
      .gte('end_datetime', `${date}T00:00:00`);

    if (timeOffError) {
      console.error('Erreur lors de l\'obtention des temps libres:', timeOffError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'obtention des temps libres' },
        { status: 500 }
      );
    }

    // 5. Générer des créneaux horaires disponibles
    const availableSlots = generateAvailableSlots(
      startTime,
      endTime,
      serviceDuration,
      existingBookings || [],
      timeOff || [],
      date
    );

    return NextResponse.json({ availableSlots });
  } catch (error) {
    console.error('Erreur lors du calcul de la disponibilité:', error);
    return NextResponse.json(
      { error: 'Erreur lors du calcul de la disponibilité' },
      { status: 500 }
    );
  }
}

// Fonction pour générer des créneaux horaires disponibles
function generateAvailableSlots(
  startTime: string,
  endTime: string,
  serviceDuration: number,
  bookings: Booking[],
  timeOff: TimeOff[],
  date: string
) {
  const slots = [];
  
  // Convertir les horaires en minutes pour faciliter les calculs
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  // Créer des créneaux toutes les 15 minutes
  const slotInterval = 15; // minutes
  
  for (let currentMinutes = startMinutes; currentMinutes <= endMinutes - serviceDuration; currentMinutes += slotInterval) {
    const slotStartTime = minutesToTime(currentMinutes);
    
    const isAvailable = !isSlotBooked(currentMinutes, currentMinutes + serviceDuration, bookings) &&
                        !isSlotInTimeOff(currentMinutes, currentMinutes + serviceDuration, timeOff, date);
    
    slots.push({
      time: slotStartTime,
      available: isAvailable
    });
  }
  
  return slots;
}

// Fonction pour convertir le temps au format HH:MM en minutes depuis minuit
function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Fonction pour convertir des minutes depuis minuit au format HH:MM
function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Fonction pour vérifier si un créneau est réservé
function isSlotBooked(startMinutes: number, endMinutes: number, bookings: Booking[]) {
  return bookings.some(booking => {
    const bookingStart = timeToMinutes(booking.start_time);
    const bookingEnd = timeToMinutes(booking.end_time);
    
    // Vérifier s'il y a chevauchement
    return (startMinutes < bookingEnd && endMinutes > bookingStart);
  });
}

// Fonction pour vérifier si un créneau est dans une période de temps libre
function isSlotInTimeOff(startMinutes: number, endMinutes: number, timeOff: TimeOff[], date: string) {
  return timeOff.some(offTime => {
    // Extraire l'heure des dates de temps libre
    const offStartDateTime = new Date(offTime.start_datetime);
    const offEndDateTime = new Date(offTime.end_datetime);
    
    // Si le temps libre est pour le même jour
    const offStartDate = offStartDateTime.toISOString().split('T')[0];
    const offEndDate = offEndDateTime.toISOString().split('T')[0];
    
    if (offStartDate <= date && offEndDate >= date) {
      // Convertir en minutes depuis minuit pour le jour sélectionné
      let offStartMinutes = 0; // Début de la journée
      let offEndMinutes = 24 * 60 - 1; // Fin de la journée
      
      // Si le temps libre commence le jour sélectionné, utiliser son heure de début
      if (offStartDate === date) {
        offStartMinutes = offStartDateTime.getHours() * 60 + offStartDateTime.getMinutes();
      }
      
      // Si le temps libre se termine le jour sélectionné, utiliser son heure de fin
      if (offEndDate === date) {
        offEndMinutes = offEndDateTime.getHours() * 60 + offEndDateTime.getMinutes();
      }
      
      // Vérifier s'il y a chevauchement
      return (startMinutes < offEndMinutes && endMinutes > offStartMinutes);
    }
    
    return false;
  });
} 