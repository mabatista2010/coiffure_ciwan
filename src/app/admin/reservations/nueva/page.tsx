'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, Location, Stylist, AvailabilitySlot, Service } from '@/lib/supabase';
import { FaUser, FaMapMarkerAlt, FaCalendarDay, FaArrowLeft, FaCheck, FaFilter, FaSyncAlt } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AdminCard, AdminCardContent, SectionHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { getImageUrl } from '@/lib/getImageUrl';

type TimeSlotPeriod = 'morning' | 'afternoon' | 'evening';
type ReservationCombination = {
  stylistId: string;
  locationId: string;
  serviceId: string;
};

const buildCombinationKey = ({ stylistId, locationId, serviceId }: ReservationCombination): string =>
  `${stylistId}|${locationId}|${serviceId}`;

const timeSlotLabels: Record<TimeSlotPeriod, string> = {
  morning: 'Matin',
  afternoon: 'Après-midi',
  evening: 'Soir',
};

function getTimeSlotPeriod(time: string): TimeSlotPeriod {
  const [rawHour] = time.split(':');
  const hour = Number(rawHour);

  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export default function NuevaReservacion() {
  const router = useRouter();
  
  // Estados para los filtros
  const [selectedStylist, setSelectedStylist] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Estados para datos completos (sin filtrar)
  const [allStylists, setAllStylists] = useState<Stylist[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  
  // Estados para datos filtrados
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  // Otros estados
  const [isLoading, setLoading] = useState<boolean>(true);
  const [stylistDetail, setStylistDetail] = useState<Stylist | null>(null);
  const [locationDetail, setLocationDetail] = useState<Location | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bookingInProgress, setBookingInProgress] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  
  // Relación real entre estilista-centro-servicio (combinaciones posibles)
  const [allCombinations, setAllCombinations] = useState<ReservationCombination[]>([]);
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, Record<string, AvailabilitySlot[]>>>({});
  
  // Añadir nuevos estados para controlar la disponibilidad de los días
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [fullyBookedDays, setFullyBookedDays] = useState<string[]>([]);
  const [partiallyBookedDays, setPartiallyBookedDays] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);
  
  // Cargar datos iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Cargar estilistas
        const { data: stylistsData, error: stylistsError } = await supabase
          .from('stylists')
          .select('*')
          .eq('active', true)
          .order('name');
        
        if (stylistsError) throw stylistsError;
        
        // Cargar centros
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('*')
          .eq('active', true)
          .order('name');
        
        if (locationsError) throw locationsError;

        // Cargar servicios
        const { data: servicesData, error: servicesError } = await supabase
          .from('servicios')
          .select('*')
          .eq('active', true)
          .order('nombre');
        
        if (servicesError) throw servicesError;
        
        // Cargar relaciones estilista-servicio
        const { data: stylistServicesData, error: stylistServicesError } = await supabase
          .from('stylist_services')
          .select('*');
        
        if (stylistServicesError) throw stylistServicesError;
        
        // Cargar relaciones estilista-centro (working_hours)
        const { data: workingHoursData, error: workingHoursError } = await supabase
          .from('working_hours')
          .select('*');
        
        if (workingHoursError) throw workingHoursError;
        
        // Establecer datos completos
        setAllStylists(stylistsData || []);
        setAllLocations(locationsData || []);
        setAllServices(servicesData || []);
        
        // Inicialmente, las listas filtradas son iguales a las completas
        setStylists(stylistsData || []);
        setLocations(locationsData || []);
        setServices(servicesData || []);
        
        // Crear mapping de relaciones estilista-centro
        const stylistToLocations: Record<string, string[]> = {};
        
        // Relaciones estilista-centro (desde working_hours)
        workingHoursData?.forEach(wh => {
          if (!stylistToLocations[wh.stylist_id]) {
            stylistToLocations[wh.stylist_id] = [];
          }
          
          if (!stylistToLocations[wh.stylist_id].includes(wh.location_id)) {
            stylistToLocations[wh.stylist_id].push(wh.location_id);
          }
        });
        
        // Construir combinaciones reales estilista-centro-servicio
        const combinations: ReservationCombination[] = [];
        const combinationKeys = new Set<string>();

        stylistServicesData?.forEach(ss => {
          const stylistId = ss.stylist_id;
          const serviceId = ss.service_id.toString();
          const locationsForStylist = stylistToLocations[stylistId] || [];

          locationsForStylist.forEach(locationId => {
            const combination: ReservationCombination = {
              stylistId,
              locationId,
              serviceId,
            };
            const key = buildCombinationKey(combination);
            if (!combinationKeys.has(key)) {
              combinationKeys.add(key);
              combinations.push(combination);
            }
          });
        });

        setAllCombinations(combinations);
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  const primaryFilteredCombinations = useMemo(() => {
    return allCombinations.filter(combination => {
      if (selectedStylist && combination.stylistId !== selectedStylist) return false;
      if (selectedLocation && combination.locationId !== selectedLocation) return false;
      if (selectedService && combination.serviceId !== selectedService) return false;
      return true;
    });
  }, [allCombinations, selectedStylist, selectedLocation, selectedService]);

  const mergeAvailableSlotsForCombinations = useCallback(
    (
      combinations: ReservationCombination[],
      dateCache: Record<string, AvailabilitySlot[]>
    ): AvailabilitySlot[] => {
      const uniqueTimes = new Set<string>();

      combinations.forEach(combination => {
        const key = buildCombinationKey(combination);
        const slots = dateCache[key] || [];
        slots.forEach(slot => {
          if (slot.available) {
            uniqueTimes.add(slot.time);
          }
        });
      });

      return Array.from(uniqueTimes)
        .sort((a, b) => a.localeCompare(b))
        .map(time => ({ time, available: true }));
    },
    []
  );

  const ensureAvailabilityForDate = useCallback(
    async (
      date: string,
      combinations: ReservationCombination[]
    ): Promise<Record<string, AvailabilitySlot[]>> => {
      const existingForDate = availabilityByDate[date] || {};
      const uniqueCombinations = combinations.filter((combination, index, arr) => {
        const key = buildCombinationKey(combination);
        return arr.findIndex(candidate => buildCombinationKey(candidate) === key) === index;
      });

      const missingCombinations = uniqueCombinations.filter(
        combination => !existingForDate[buildCombinationKey(combination)]
      );

      if (missingCombinations.length === 0) {
        return existingForDate;
      }

      const fetchedEntries = await Promise.all(
        missingCombinations.map(async combination => {
          const params = new URLSearchParams({
            date,
            stylistId: combination.stylistId,
            locationId: combination.locationId,
            serviceId: combination.serviceId,
          });

          try {
            const response = await fetch(`/api/reservation/availability?${params.toString()}`);
            if (!response.ok) {
              return {
                key: buildCombinationKey(combination),
                slots: [] as AvailabilitySlot[],
              };
            }

            const payload = await response.json();
            return {
              key: buildCombinationKey(combination),
              slots: (payload.availableSlots || []) as AvailabilitySlot[],
            };
          } catch (error) {
            console.error('Erreur lors du chargement des disponibilités:', error);
            return {
              key: buildCombinationKey(combination),
              slots: [] as AvailabilitySlot[],
            };
          }
        })
      );

      const fetchedByKey = fetchedEntries.reduce<Record<string, AvailabilitySlot[]>>((acc, entry) => {
        acc[entry.key] = entry.slots;
        return acc;
      }, {});

      const merged = {
        ...existingForDate,
        ...fetchedByKey,
      };

      setAvailabilityByDate(prev => ({
        ...prev,
        [date]: {
          ...(prev[date] || {}),
          ...fetchedByKey,
        },
      }));

      return merged;
    },
    [availabilityByDate]
  );

  const isDateAvailabilityReady = useMemo(() => {
    if (!selectedDate) return true;
    const dateCache = availabilityByDate[selectedDate] || {};
    return primaryFilteredCombinations.every(
      combination => Boolean(dateCache[buildCombinationKey(combination)])
    );
  }, [selectedDate, availabilityByDate, primaryFilteredCombinations]);

  const dateFilteredCombinations = useMemo(() => {
    if (!selectedDate || !isDateAvailabilityReady) {
      return primaryFilteredCombinations;
    }

    const dateCache = availabilityByDate[selectedDate] || {};
    return primaryFilteredCombinations.filter(combination => {
      const slots = dateCache[buildCombinationKey(combination)] || [];
      return slots.some(slot => slot.available);
    });
  }, [
    selectedDate,
    isDateAvailabilityReady,
    primaryFilteredCombinations,
    availabilityByDate,
  ]);

  const combinationsForOptions = useMemo(() => {
    if (!selectedDate || !selectedTime || !isDateAvailabilityReady) {
      return dateFilteredCombinations;
    }

    const dateCache = availabilityByDate[selectedDate] || {};
    return dateFilteredCombinations.filter(combination => {
      const slots = dateCache[buildCombinationKey(combination)] || [];
      return slots.some(slot => slot.available && slot.time === selectedTime);
    });
  }, [
    selectedDate,
    selectedTime,
    isDateAvailabilityReady,
    dateFilteredCombinations,
    availabilityByDate,
  ]);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      return;
    }

    if (primaryFilteredCombinations.length === 0) {
      setAvailableSlots([]);
      return;
    }

    let isCancelled = false;

    const loadDateSlots = async () => {
      setLoadingSlots(true);
      try {
        const dateCache = await ensureAvailabilityForDate(selectedDate, primaryFilteredCombinations);
        if (isCancelled) return;
        const mergedSlots = mergeAvailableSlotsForCombinations(primaryFilteredCombinations, dateCache);
        setAvailableSlots(mergedSlots);
      } finally {
        if (!isCancelled) {
          setLoadingSlots(false);
        }
      }
    };

    loadDateSlots();

    return () => {
      isCancelled = true;
    };
  }, [
    selectedDate,
    primaryFilteredCombinations,
    ensureAvailabilityForDate,
    mergeAvailableSlotsForCombinations,
  ]);

  useEffect(() => {
    const stylistIds = new Set(combinationsForOptions.map(combination => combination.stylistId));
    const locationIds = new Set(combinationsForOptions.map(combination => combination.locationId));
    const serviceIds = new Set(combinationsForOptions.map(combination => combination.serviceId));

    setStylists(allStylists.filter(stylist => stylistIds.has(stylist.id)));
    setLocations(allLocations.filter(location => locationIds.has(location.id)));
    setServices(allServices.filter(service => serviceIds.has(service.id.toString())));

    if (!isDateAvailabilityReady) {
      return;
    }

    if (selectedStylist && !stylistIds.has(selectedStylist)) {
      setSelectedStylist('');
    }
    if (selectedLocation && !locationIds.has(selectedLocation)) {
      setSelectedLocation('');
    }
    if (selectedService && !serviceIds.has(selectedService)) {
      setSelectedService('');
    }
  }, [
    combinationsForOptions,
    allStylists,
    allLocations,
    allServices,
    selectedStylist,
    selectedLocation,
    selectedService,
    isDateAvailabilityReady,
  ]);

  useEffect(() => {
    if (!selectedTime) return;
    const isSelectedTimeAvailable = availableSlots.some(slot => slot.time === selectedTime && slot.available);
    if (!isSelectedTimeAvailable) {
      setSelectedTime('');
    }
  }, [selectedTime, availableSlots]);

  // Cargar detalles cuando se selecciona estilista y centro
  useEffect(() => {
    const fetchDetails = async () => {
      if (selectedStylist) {
        try {
          // Obtener detalles del estilista
          const { data: stylistData, error: stylistError } = await supabase
            .from('stylists')
            .select('*')
            .eq('id', selectedStylist)
            .single();
          
          if (stylistError) throw stylistError;
          setStylistDetail(stylistData);
        } catch (error) {
          console.error('Error al cargar detalles del styliste:', error);
        }
      } else {
        setStylistDetail(null);
      }
      
      if (selectedLocation) {
        try {
          // Obtener detalles del centre
          const { data: locationData, error: locationError } = await supabase
            .from('locations')
            .select('*')
            .eq('id', selectedLocation)
            .single();
          
          if (locationError) throw locationError;
          setLocationDetail(locationData);
        } catch (error) {
          console.error('Error al cargar details du centre:', error);
        }
      } else {
        setLocationDetail(null);
      }
    };
    
    fetchDetails();
  }, [selectedStylist, selectedLocation]);

  // Función pour resetear todos los filtros
  const resetAllFilters = () => {
    setSelectedStylist('');
    setSelectedLocation('');
    setSelectedService('');
    setStylistDetail(null);
    setLocationDetail(null);
    setSelectedDate(null);
    setSelectedTime('');
    setAvailableSlots([]);
    setAvailabilityByDate({});
    setShowTimeModal(false);
    setShowCustomerModal(false);
    setStylists(allStylists);
    setLocations(allLocations);
    setServices(allServices);
  };

  // Obtener días du mois actuel
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Obtener le premier jour de la semaine du mois
  const getFirstDayOfMonth = (year: number, month: number) => {
    // En JavaScript, getDay() devuelve 0 para domingo, 1 para lunes, etc.
    // Como nuestro calendario comienza en lunes, necesitamos ajustar:
    // - Si es domingo (0), lo convertimos a 7
    // - Para otros días, restamos 1 para que lunes sea 0, martes 1, etc.
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  // Generer les données du calendrier
  const generateCalendarData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const calendarDays = [];
    
    // Ajouter des jours vides pour aligner avec le jour de la semaine
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }
    
    // Ajouter les jours du mois
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(i);
    }
    
    return calendarDays;
  };

  // Changer au mois précédent
  const prevMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  // Changer au mois suivant
  const nextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // Sélectionner un jour dans le calendrier
  const selectDate = (day: number) => {
    if (!day) return;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (selectedDate !== dateStr) {
      setSelectedTime('');
      setAvailableSlots([]);
    }

    setSelectedDate(dateStr);
    setShowCustomerModal(false);
    setShowTimeModal(true);
  };

  // Réserver un horaire
  const bookAppointment = (time: string) => {
    if (!selectedDate) {
      return;
    }
    
    setSelectedTime(time);
    setShowTimeModal(false);
    setShowCustomerModal(false);
  };

  const openCustomerDataModal = () => {
    if (!selectedDate || !selectedTime) {
      alert('Veuillez sélectionner une date et un horaire avant de continuer');
      return;
    }

    if (!selectedStylist || !selectedLocation || !selectedService) {
      alert('Veuillez sélectionner un styliste, un centre et un service pour continuer');
      return;
    }

    setShowCustomerModal(true);
  };

  // Compléter la réservation avec les données du client
  const completeBooking = async () => {
    if (!selectedDate || !selectedStylist || !selectedLocation || !selectedService || !selectedTime) {
      return;
    }
    
    // Valider les données du client
    if (!customerName.trim()) {
      alert('Veuillez introduire le nom du client');
      return;
    }
    
    if (!customerPhone.trim()) {
      alert('Veuillez introduire le téléphone du client');
      return;
    }
    
    setBookingInProgress(true);
    setBookingError(null);
    
    try {
      // Calculer l'heure de fin basée sur la durée du service
      const selectedServiceObj = allServices.find(s => s.id.toString() === selectedService);
      const serviceDuration = selectedServiceObj?.duration || 30; // Durée par défaut: 30 minutes
      
      const [hours, minutes] = selectedTime.split(':').map(num => parseInt(num, 10));
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0);
      
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + serviceDuration);
      
      const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      
      // Créer la réservation dans Supabase
      const { error } = await supabase
        .from('bookings')
        .insert([
          {
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            stylist_id: selectedStylist,
            service_id: parseInt(selectedService),
            location_id: selectedLocation,
            booking_date: selectedDate,
            start_time: selectedTime,
            end_time: endTime,
            status: 'confirmed', // Par défaut, les réservations manuelles son créées como confirmées
            notes: notes,
          }
        ])
        .select();
      
      if (error) {
        throw error;
      }
      
      setBookingSuccess(true);
      
      // Réinitialiser le formulaire
      setTimeout(() => {
        setShowCustomerModal(false);
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setNotes('');
        setBookingSuccess(false);
        
        // Rediriger vers la page des réservations
        router.push('/admin/reservations');
      }, 2000);
      
    } catch (error) {
      console.error('Erreur lors de la création de la réservation:', error);
      setBookingError('Erreur lors de la création de la réservation. Veuillez réessayer plus tard.');
    } finally {
      setBookingInProgress(false);
    }
  };

  // Añadir un efecto para cargar los días que tienen reservas y su disponibilidad
  useEffect(() => {
    const fetchAvailabilityData = async () => {
      if (!selectedLocation) {
        setClosedDays([]);
        setFullyBookedDays([]);
        setPartiallyBookedDays([]);
        return;
      }
      
      setLoadingAvailability(true);
      try {
        // Determinar el primer y último día del mes actual
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(getDaysInMonth(year, month)).padStart(2, '0')}`;
        
        // 1. Obtener los días cerrados (sin horarios configurados)
        const closed: string[] = [];
        
        // Obtener los horarios del centro seleccionado
        const { data: locationHours, error: locationHoursError } = await supabase
          .from('location_hours')
          .select('*')
          .eq('location_id', selectedLocation);
        
        if (locationHoursError) throw locationHoursError;
        
        // Verificar cada día del mes si está cerrado
        const daysInMonth = getDaysInMonth(year, month);
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const dayOfWeek = date.getDay(); // 0 es domingo, 6 es sábado
          
          // Verificar si hay horario para este día de la semana
          const hasHoursForDay = locationHours.some(hour => hour.day_of_week === dayOfWeek);
          
          if (!hasHoursForDay) {
            // Si no hay horario, el centro está cerrado este día
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            closed.push(dateStr);
          }
        }
        
        // 2. Obtener las reservas existentes
        let query = supabase
          .from('bookings')
          .select('booking_date, location_id, start_time, end_time, stylist_id')
          .gte('booking_date', firstDay)
          .lte('booking_date', lastDay)
          .eq('location_id', selectedLocation);
          
        if (selectedStylist) {
          query = query.eq('stylist_id', selectedStylist);
        }
        
        const { data: bookings, error: bookingsError } = await query;
        
        if (bookingsError) throw bookingsError;
        
        // Agrupar las reservas por fecha
        const bookingsByDate: Record<string, {
          booking_date?: string;
          booking_time?: string;
          start_time?: string;
          end_time?: string;
          service_id?: number;
          stylist_id?: string;
          location_id?: number;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string;
          status?: string;
        }[]> = {};
        bookings.forEach(booking => {
          if (!bookingsByDate[booking.booking_date]) {
            bookingsByDate[booking.booking_date] = [];
          }
          bookingsByDate[booking.booking_date].push(booking);
        });
        
        // 3. Determinar días parcialmente y completamente reservados
        const fullyBooked: string[] = [];
        const partiallyBooked: string[] = [];
        
        // Obtener estilistas y sus horarios para el centro seleccionado
        const { data: workingHours, error: workingHoursError } = await supabase
          .from('working_hours')
          .select('*')
          .eq('location_id', selectedLocation);
        
        if (workingHoursError) throw workingHoursError;
        
        // Para cada día con reservas, verificar si todos los slots están ocupados
        for (const [date, dateBookings] of Object.entries(bookingsByDate)) {
          if (closed.includes(date)) continue; // Ignorar días cerrados
          
          const dateObj = new Date(date);
          const dayOfWeek = dateObj.getDay(); // 0 es domingo, 1 es lunes, etc.
          
          // Obtener horas de trabajo para este día
          const stylistId = selectedStylist || undefined;
          const hoursForDay = workingHours.filter(wh => {
            return wh.day_of_week === dayOfWeek && (!stylistId || wh.stylist_id === stylistId);
          });
          
          if (hoursForDay.length > 0) {
            // Calcular la duración total de horas de trabajo
            let totalWorkMinutes = 0;
            
            hoursForDay.forEach(wh => {
              const [startHour, startMinute] = wh.start_time.split(':').map(Number);
              const [endHour, endMinute] = wh.end_time.split(':').map(Number);
              
              const startMinutes = startHour * 60 + startMinute;
              const endMinutes = endHour * 60 + endMinute;
              
              totalWorkMinutes += endMinutes - startMinutes;
            });
            
            // Calcular slots disponibles basados en duración promedio de servicios (30 minutos)
            const averageServiceDuration = 30; // minutos
            const estimatedSlots = Math.floor(totalWorkMinutes / averageServiceDuration);
            
            // Determinar si está completamente reservado
            if (dateBookings.length >= estimatedSlots) {
              fullyBooked.push(date);
            } else {
              partiallyBooked.push(date);
            }
          }
        }
        
        // Actualizar estados
        setClosedDays(closed);
        setFullyBookedDays(fullyBooked);
        setPartiallyBookedDays(partiallyBooked);
        
      } catch (err) {
        console.error('Erreur lors du chargement des disponibilités:', err);
      } finally {
        setLoadingAvailability(false);
      }
    };
    
    fetchAvailabilityData();
  }, [currentMonth, selectedLocation, selectedStylist]);

  // Renderizaciones condicionales basadas en el estado
  if (isLoading) {
    return (
      <div className="admin-scope min-h-screen bg-dark px-4 py-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-light">Chargement du système de réservation...</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedServiceDetail =
    selectedService ? allServices.find(service => service.id.toString() === selectedService) : null;
  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;
  const groupedSlots = availableSlots.reduce<Record<TimeSlotPeriod, AvailabilitySlot[]>>(
    (acc, slot) => {
      const period = getTimeSlotPeriod(slot.time);
      acc[period].push(slot);
      return acc;
    },
    { morning: [], afternoon: [], evening: [] }
  );

  return (
    <main className="admin-scope min-h-screen bg-dark px-4 py-8">
      <div className="mx-auto w-full max-w-7xl">
          <SectionHeader
            title="Nouvelle Réservation"
            description="Créez un nouveau rendez-vous en sélectionnant un styliste, un centre et une date."
            actions={
              <div className="flex w-full gap-3 md:w-auto">
                <Button
                  onClick={resetAllFilters}
                  variant="secondary"
                  className="flex-1 md:flex-initial"
                  title="Réinitialiser les filtres"
                >
                  <FaSyncAlt className="mr-2" />
                  <span className="whitespace-nowrap">Réinitialiser</span>
                </Button>
                <Button
                  onClick={() => router.push('/admin/reservations')}
                  variant="outline"
                  className="flex-1 md:flex-initial"
                >
                  <FaArrowLeft className="mr-2" />
                  <span className="whitespace-nowrap">Retour</span>
                </Button>
              </div>
            }
          />

          {/* Filtres supérieurs */}
          <AdminCard className="mt-6 mb-6">
            <AdminCardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Selector de Styliste */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  <FaUser className="inline mr-2" /> Styliste
                </label>
                <Select
                  value={selectedStylist}
                  onValueChange={setSelectedStylist}
                  disabled={stylists.length === 0}
                >
                  <SelectTrigger
                    className={`w-full rounded-md bg-dark text-light ${
                      stylists.length === 0 ? 'border-coral' : 'border-primary'
                    }`}
                  >
                    <SelectValue placeholder="Sélectionnez un styliste" />
                  </SelectTrigger>
                  <SelectContent>
                    {stylists.map(stylist => (
                      <SelectItem key={stylist.id} value={stylist.id}>
                        {stylist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {stylists.length === 0 && (
                  <p className="text-xs text-coral mt-1">
                    Aucun styliste disponible avec les filtres actuels
                  </p>
                )}
              </div>
              
              {/* Selector de Centre */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  <FaMapMarkerAlt className="inline mr-2" /> Centre
                </label>
                <Select
                  value={selectedLocation}
                  onValueChange={setSelectedLocation}
                  disabled={locations.length === 0}
                >
                  <SelectTrigger
                    className={`w-full rounded-md bg-dark text-light ${
                      locations.length === 0 ? 'border-coral' : 'border-primary'
                    }`}
                  >
                    <SelectValue placeholder="Sélectionnez un centre" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {locations.length === 0 && (
                  <p className="text-xs text-coral mt-1">
                    Aucun centre disponible avec les filtres actuels
                  </p>
                )}
              </div>
              
              {/* Selector de Service */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  <FaCalendarDay className="inline mr-2" /> Service
                </label>
                <Select
                  value={selectedService}
                  onValueChange={setSelectedService}
                  disabled={services.length === 0}
                >
                  <SelectTrigger
                    className={`w-full rounded-md bg-dark text-light ${
                      services.length === 0 ? 'border-coral' : 'border-primary'
                    }`}
                  >
                    <SelectValue placeholder="Sélectionnez un service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.nombre} - {service.precio} CHF
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {services.length === 0 && (
                  <p className="text-xs text-coral mt-1">
                    Aucun service disponible avec les filtres actuels
                  </p>
                )}
              </div>
            </div>
            
            {(selectedStylist || selectedLocation || selectedService || selectedDate || selectedTime) && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <FaFilter className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Filtres actifs:</strong> Les options sont filtrées en fonction des sélections (styliste, centre, service, date et horaire).
                    {(stylists.length === 0 || locations.length === 0 || services.length === 0) && (
                      <p className="mt-1 text-red-600">
                        Certaines options ne sont pas disponibles avec la configuration actuelle. Vous pouvez réinitialiser les filtres en utilisant le bouton &ldquo;Réinitialiser&rdquo;.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            </AdminCardContent>
          </AdminCard>

          {/* Contenedor principal del grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Columna 1: Calendario */}
            <div className="bg-secondary rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b border-dark">
                <h2 className="text-lg font-semibold text-foreground">Calendrier</h2>
              </div>
              
              <div className="p-4">
                <div className="mb-4 flex items-center justify-center gap-4">
                  <Button
                    onClick={prevMonth}
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full border-border bg-background text-foreground shadow-sm hover:bg-accent"
                    aria-label="Mois précédent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[160px] text-center text-2xl font-medium text-foreground capitalize">
                    {currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button
                    onClick={nextMonth}
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full border-border bg-background text-foreground shadow-sm hover:bg-accent"
                    aria-label="Mois suivant"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {loadingAvailability && (
                  <div className="absolute inset-0 bg-dark bg-opacity-50 flex items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                )}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, idx) => (
                    <div key={idx} className="text-center font-medium text-muted-foreground py-2 text-xs">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {generateCalendarData().map((day, index) => {
                    if (!day) {
                      return <div key={index} className="h-10 sm:h-12"></div>;
                    }
                    
                    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = new Date().toDateString() === new Date(dateStr).toDateString();
                    const isSelected = selectedDate === dateStr;
                    const isClosed = closedDays.includes(dateStr);
                    const isFullyBooked = fullyBookedDays.includes(dateStr);
                    const isPartiallyBooked = partiallyBookedDays.includes(dateStr);
                    
                    let buttonClasses = 'text-center h-10 sm:h-12 flex flex-col items-center justify-center rounded-md border border-border/70 bg-card text-foreground shadow-sm text-xs sm:text-sm transition-colors duration-200';
                    let dotColor = 'bg-green-500';
                    
                    if (isClosed) {
                      buttonClasses += ' cursor-not-allowed opacity-65';
                      dotColor = 'bg-red-500';
                    } else if (isFullyBooked) {
                      buttonClasses += ' cursor-pointer hover:bg-muted/60';
                      dotColor = 'bg-red-500';
                    } else if (isPartiallyBooked) {
                      buttonClasses += ' cursor-pointer hover:bg-muted/60';
                      dotColor = 'bg-yellow-500';
                    } else {
                      buttonClasses += ' cursor-pointer hover:bg-muted/60';
                      dotColor = 'bg-green-500';
                    }
                    
                    if (isSelected) {
                      buttonClasses += ' ring-2 ring-primary ring-opacity-100 font-bold';
                    } else if (isToday) {
                      buttonClasses += ' ring-2 ring-primary ring-opacity-70';
                    }
                    
                    return (
                      <Button
                        key={index}
                        onClick={() => isClosed ? null : selectDate(day)}
                        disabled={isClosed}
                        className={buttonClasses}
                      >
                        <span>{day}</span>
                        <span className={`h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full mt-0.5 ${dotColor}`}></span>
                      </Button>
                    );
                  })}
                </div>
                
                <div className="mt-4 text-[11px] text-muted-foreground sm:text-xs">
                  <div className="mb-1 flex items-center">
                    <span className="mr-1.5 h-2.5 w-2.5 rounded-full bg-green-500"></span>
                    <span>Disponible</span>
                  </div>
                  <div className="mb-1 flex items-center">
                    <span className="mr-1.5 h-2.5 w-2.5 rounded-full bg-yellow-500"></span>
                    <span>Partiellement réservé</span>
                  </div>
                  <div className="mb-1 flex items-center">
                    <span className="mr-1.5 h-2.5 w-2.5 rounded-full bg-red-500"></span>
                    <span>Complet/Fermé</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Zona derecha: tarjetas sincronizadas por filas */}
            <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 auto-rows-fr gap-6">
              {/* Styliste */}
              {stylistDetail && (
                <div className="bg-secondary rounded-lg shadow-md overflow-hidden h-full min-h-[280px]">
                  <div className="p-4 border-b border-dark">
                    <h2 className="text-lg font-semibold text-foreground">Styliste</h2>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center mb-4">
                      <div className="relative w-16 h-16 mr-4 rounded-full overflow-hidden bg-dark">
                        {stylistDetail.profile_img ? (
                          <Image
                            src={stylistDetail.profile_img}
                            alt={stylistDetail.name}
                            layout="fill"
                            objectFit="cover"
                            onError={(e) => {
                              // Fallback en caso de error
                              e.currentTarget.src = 'https://via.placeholder.com/150?text=Styliste';
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-dark text-light">
                            <FaUser size={24} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-light">{stylistDetail.name}</h3>
                        <p className="text-sm text-light opacity-70">
                          {stylistDetail.specialties && stylistDetail.specialties.length > 0
                            ? stylistDetail.specialties.join(', ')
                            : 'Styliste professionnel'}
                        </p>
                      </div>
                    </div>
                    <p className="text-light text-sm mb-3">
                      {stylistDetail.bio || 'Informations sur le styliste non disponibles.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Service sélectionné */}
              {selectedServiceDetail && (
                <div className="bg-secondary rounded-lg shadow-md overflow-hidden h-full min-h-[280px]">
                  <div className="p-4 border-b border-dark">
                    <h2 className="text-lg font-semibold text-foreground">Service sélectionné</h2>
                  </div>
                  <div className="p-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-light">{selectedServiceDetail.nombre}</h3>
                      <div className="flex justify-between items-center my-2">
                        <span className="text-light text-sm">Durée estimée :</span>
                        <span className="bg-dark text-light text-xs px-2 py-1 rounded">
                          {selectedServiceDetail.duration} min
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-light text-sm">Prix :</span>
                        <span className="text-primary font-bold">
                          {selectedServiceDetail.precio.toFixed(2)} CHF
                        </span>
                      </div>
                      <p className="text-light text-sm mt-3">
                        {selectedServiceDetail.descripcion || 'Aucune description disponible.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Centre */}
              {locationDetail && (
                <div className="bg-secondary rounded-lg shadow-md overflow-hidden h-full min-h-[320px]">
                  <div className="p-4 border-b border-dark">
                    <h2 className="text-lg font-semibold text-foreground">Centre</h2>
                  </div>
                  <div className="relative h-36 w-full border-b border-dark/60 bg-dark/10">
                    {locationDetail.image ? (
                      <Image
                        src={getImageUrl(locationDetail.image)}
                        alt={locationDetail.name}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 33vw, 100vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-light/60">
                        <FaMapMarkerAlt className="mr-2" />
                        <span className="text-sm">Image du centre</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-light mb-2">{locationDetail.name}</h3>
                    <p className="text-light text-sm mb-3">
                      <FaMapMarkerAlt className="inline-block mr-1" />
                      {locationDetail.address || 'Adresse non disponible'}
                    </p>
                    <div className="text-xs text-light opacity-70">
                      <p>E-mail: {locationDetail.email || 'Non disponible'}</p>
                      <p>Téléphone: {locationDetail.phone || 'Non disponible'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Résumé de réservation et action client */}
              {selectedServiceDetail && selectedDate && (
                <div className="bg-secondary rounded-lg shadow-md overflow-hidden h-full min-h-[320px] flex flex-col">
                  <div className="p-4 border-b border-dark">
                    <h2 className="text-lg font-semibold text-foreground">Résumé de réservation</h2>
                  </div>
                  <div className="p-4 flex h-full flex-col">
                    <div className="space-y-2 text-sm text-light">
                      <div className="flex justify-between gap-3">
                        <span className="opacity-70">Styliste :</span>
                        <span className="font-medium text-right">{stylistDetail?.name || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="opacity-70">Centre :</span>
                        <span className="font-medium text-right">{locationDetail?.name || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="opacity-70">Service :</span>
                        <span className="font-medium text-right">{selectedServiceDetail.nombre}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="opacity-70">Date :</span>
                        <span className="font-medium text-right capitalize">{selectedDateLabel || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="opacity-70">Horaire :</span>
                        <span className="font-medium text-right">{selectedTime || 'Non sélectionné'}</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowTimeModal(true)}
                        >
                          Modifier l&apos;horaire
                        </Button>
                        <Button
                          type="button"
                          onClick={openCustomerDataModal}
                          disabled={!selectedTime || !selectedStylist || !selectedLocation || !selectedService}
                          className="text-primary-foreground"
                        >
                          Données du client
                        </Button>
                      </div>

                      {!selectedTime && (
                        <p className="mt-3 text-xs text-light opacity-70">
                          Sélectionnez un horaire pour continuer vers les données du client.
                        </p>
                      )}
                      {selectedTime && (!selectedStylist || !selectedLocation || !selectedService) && (
                        <p className="mt-3 text-xs text-light opacity-70">
                          Sélectionnez aussi styliste, centre et service pour continuer.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
      
      {/* Modal pour sélectionner une heure */}
      <Dialog open={showTimeModal && Boolean(selectedDate)} onOpenChange={setShowTimeModal}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-0 max-h-[85dvh] overflow-hidden">
          <div className="flex h-full max-h-[85dvh] flex-col">
            <DialogHeader className="border-b border-border px-6 py-4 pr-12">
              <DialogTitle className="text-lg sm:text-xl">
                Horaires disponibles pour le{" "}
                {selectedDate
                  ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : ""}
              </DialogTitle>
              <DialogDescription>
                Choisissez un créneau pour continuer avec la réservation.
              </DialogDescription>
            </DialogHeader>

            {loadingSlots ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
                <div className="mb-2 h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
                <p className="text-muted-foreground">Chargement des horaires disponibles...</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-6 py-8 text-center text-muted-foreground">
                Aucun horaire disponible pour cette date
              </div>
            ) : (
              <ScrollArea className="h-[52dvh] px-6 py-4">
                <div className="space-y-5 pr-3">
                  {(Object.keys(timeSlotLabels) as TimeSlotPeriod[]).map((period) => {
                    const periodSlots = groupedSlots[period];
                    if (periodSlots.length === 0) return null;

                    return (
                      <section key={period}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <h4 className="text-sm font-semibold text-foreground">
                            {timeSlotLabels[period]}
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {periodSlots.map((slot, index) => (
                            <Button
                              key={`${period}-${slot.time}-${index}`}
                              onClick={() => bookAppointment(slot.time)}
                              disabled={!slot.available}
                              variant={slot.available ? "outline" : "secondary"}
                              className={`
                                py-2 px-3 rounded-md text-sm font-medium
                                ${
                                  slot.available
                                    ? "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                                    : "cursor-not-allowed border-border bg-muted text-muted-foreground hover:bg-muted"
                                }
                              `}
                            >
                              {slot.time}
                            </Button>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            <DialogFooter className="border-t border-border px-6 py-4">
              <Button
                onClick={() => setShowTimeModal(false)}
                variant="outline"
                className="w-full px-4 sm:w-auto"
              >
                Fermer
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal pour les données du client */}
      <Dialog
        open={showCustomerModal && Boolean(selectedTime)}
        onOpenChange={setShowCustomerModal}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-0 max-h-[85dvh] overflow-hidden">
          <div className="flex h-full max-h-[85dvh] flex-col">
            <DialogHeader className="border-b border-border px-6 py-4 pr-12">
              <DialogTitle className="text-lg sm:text-xl">Informations du client</DialogTitle>
              <DialogDescription>
                Veuillez entrer les informations du client pour compléter la réservation
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                completeBooking();
              }}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <ScrollArea className="h-[52dvh] px-6 py-4">
                <div className="space-y-4 pr-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Nom complet*
                    </label>
                    <Input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Téléphone*
                    </label>
                    <Input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Notes supplémentaires
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full"
                    ></Textarea>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  variant="outline"
                  className="w-full px-4 sm:w-auto"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="w-full px-4 text-primary-foreground sm:w-auto"
                  disabled={bookingInProgress}
                >
                  {bookingInProgress ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block mr-2 align-middle"></div>
                      En cours de traitement...
                    </>
                  ) : (
                    'Confirmer la réservation'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {bookingSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center" style={{ boxShadow: "var(--admin-shadow-card-strong)" }}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <FaCheck size={32} />
            </div>
            <h3 className="mb-2 text-xl font-bold text-foreground">Réservation confirmée</h3>
            <p className="mb-6 text-muted-foreground">
              La réservation a été créée avec succès
            </p>
            <Button
              onClick={() => {
                setBookingSuccess(false);
                router.push('/admin/reservations');
              }}
              className="px-6 text-primary-foreground"
            >
              Retour au calendrier
            </Button>
          </div>
        </div>
      )}

      {bookingError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center" style={{ boxShadow: "var(--admin-shadow-card-strong)" }}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <FaUser size={32} />
            </div>
            <h3 className="mb-2 text-xl font-bold text-foreground">Erreur</h3>
            <p className="mb-6 text-muted-foreground">
              {bookingError}
            </p>
            <Button
              onClick={() => setBookingError(null)}
              variant="destructive"
              className="px-6"
            >
              Réessayer
            </Button>
          </div>
        </div>
      )}
    </main>
  );
} 
