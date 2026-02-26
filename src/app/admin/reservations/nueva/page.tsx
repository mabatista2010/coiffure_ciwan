'use client';

import { useState, useEffect } from 'react';
import { supabase, Location, Stylist, AvailabilitySlot, Service, StylistService } from '@/lib/supabase';
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
  const [stylistServices, setStylistServices] = useState<StylistService[]>([]);
  
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
  
  // Relaciones entre estilistas y centros
  const [stylistLocations, setStylistLocations] = useState<Record<string, string[]>>({});
  const [locationStylists, setLocationStylists] = useState<Record<string, string[]>>({});
  const [serviceStylists, setServiceStylists] = useState<Record<string, string[]>>({});
  const [serviceLocations, setServiceLocations] = useState<Record<string, string[]>>({});
  
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
        setStylistServices(stylistServicesData || []);
        
        // Inicialmente, las listas filtradas son iguales a las completas
        setStylists(stylistsData || []);
        setLocations(locationsData || []);
        setServices(servicesData || []);
        
        // Crear mappings de relaciones
        const stylistToLocations: Record<string, string[]> = {};
        const locationToStylists: Record<string, string[]> = {};
        const serviceToStylists: Record<string, string[]> = {};
        const serviceToLocations: Record<string, string[]> = {};
        
        // Relaciones estilista-centro (desde working_hours)
        workingHoursData?.forEach(wh => {
          if (!stylistToLocations[wh.stylist_id]) {
            stylistToLocations[wh.stylist_id] = [];
          }
          if (!locationToStylists[wh.location_id]) {
            locationToStylists[wh.location_id] = [];
          }
          
          if (!stylistToLocations[wh.stylist_id].includes(wh.location_id)) {
            stylistToLocations[wh.stylist_id].push(wh.location_id);
          }
          
          if (!locationToStylists[wh.location_id].includes(wh.stylist_id)) {
            locationToStylists[wh.location_id].push(wh.stylist_id);
          }
        });
        
        // Relaciones servicio-estilista (desde stylist_services)
        stylistServicesData?.forEach(ss => {
          if (!serviceToStylists[ss.service_id]) {
            serviceToStylists[ss.service_id] = [];
          }
          
          if (!serviceToStylists[ss.service_id].includes(ss.stylist_id)) {
            serviceToStylists[ss.service_id].push(ss.stylist_id);
          }
        });
        
        // Derivar relaciones servicio-centro
        Object.entries(serviceToStylists).forEach(([serviceId, stylistIds]) => {
          serviceToLocations[serviceId] = [];
          
          stylistIds.forEach(stylistId => {
            const locationsForStylist = stylistToLocations[stylistId] || [];
            
            locationsForStylist.forEach(locationId => {
              if (!serviceToLocations[serviceId].includes(locationId)) {
                serviceToLocations[serviceId].push(locationId);
              }
            });
          });
        });
        
        // Guardar todas las relaciones
        setStylistLocations(stylistToLocations);
        setLocationStylists(locationToStylists);
        setServiceStylists(serviceToStylists);
        setServiceLocations(serviceToLocations);
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  // Actualizar opciones al cambiar selección de estilista
  useEffect(() => {
    if (selectedStylist) {
      // Filtrar centros donde trabaja este estilista
      const availableLocations = stylistLocations[selectedStylist] || [];
      setLocations(allLocations.filter(loc => availableLocations.includes(loc.id)));
      
      // Filtrar servicios que ofrece este estilista
      const availableServiceIds = stylistServices
        .filter(ss => ss.stylist_id === selectedStylist)
        .map(ss => ss.service_id);
      setServices(allServices.filter(service => availableServiceIds.includes(service.id)));
      
      // Si el centro o servicio seleccionado ya no está disponible para este estilista, resetear
      if (selectedLocation && !availableLocations.includes(selectedLocation)) {
        setSelectedLocation('');
        setLocationDetail(null);
      }
      
      if (selectedService && !availableServiceIds.includes(parseInt(selectedService))) {
        setSelectedService('');
      }
    } else {
      // Si no hay estilista seleccionado, aplicar solo otros filtros activos
      if (selectedLocation) {
        const stylistsInLocation = locationStylists[selectedLocation] || [];
        setStylists(allStylists.filter(s => stylistsInLocation.includes(s.id)));
        
        if (selectedService) {
          const stylistsForService = serviceStylists[selectedService] || [];
          const availableStylists = stylistsInLocation.filter(
            stylistId => stylistsForService.includes(stylistId)
          );
          setStylists(allStylists.filter(s => availableStylists.includes(s.id)));
        }
      } else if (selectedService) {
        const stylistsForService = serviceStylists[selectedService] || [];
        setStylists(allStylists.filter(s => stylistsForService.includes(s.id)));
      } else {
        setStylists(allStylists);
        setLocations(allLocations);
        setServices(allServices);
      }
    }
  }, [selectedStylist, allLocations, allServices, stylistLocations, stylistServices, selectedLocation, selectedService, allStylists, locationStylists, serviceStylists]);

  // Actualizar opciones al cambiar selección de centro
  useEffect(() => {
    if (selectedLocation) {
      // Filtrar estilistas que trabajan en este centro
      const availableStylistsIds = locationStylists[selectedLocation] || [];
      setStylists(allStylists.filter(stylist => availableStylistsIds.includes(stylist.id)));
      
      // Filtrar servicios disponibles en este centro
      const servicesInLocation = new Set<number>();
      
      availableStylistsIds.forEach(stylistId => {
        stylistServices
          .filter(ss => ss.stylist_id === stylistId)
          .forEach(ss => servicesInLocation.add(ss.service_id));
      });
      
      setServices(allServices.filter(service => servicesInLocation.has(service.id)));
      
      // Si el estilista seleccionado no trabaja en este centro, resetear
      if (selectedStylist && !availableStylistsIds.includes(selectedStylist)) {
        setSelectedStylist('');
        setStylistDetail(null);
      }
      
      // Si el servicio seleccionado no está disponible en este centro, resetear
      if (selectedService && !Array.from(servicesInLocation).includes(parseInt(selectedService))) {
        setSelectedService('');
      }
    } else {
      // Si no hay centro seleccionado, aplicar solo otros filtros activos
      if (selectedStylist) {
        const locationsForStylist = stylistLocations[selectedStylist] || [];
        setLocations(allLocations.filter(loc => locationsForStylist.includes(loc.id)));
        
        if (selectedService) {
          const locationsForService = serviceLocations[selectedService] || [];
          const availableLocations = locationsForStylist.filter(
            locationId => locationsForService.includes(locationId)
          );
          setLocations(allLocations.filter(loc => availableLocations.includes(loc.id)));
        }
      } else if (selectedService) {
        const locationsForService = serviceLocations[selectedService] || [];
        setLocations(allLocations.filter(loc => locationsForService.includes(loc.id)));
      } else {
        setStylists(allStylists);
        setLocations(allLocations);
        setServices(allServices);
      }
    }
  }, [selectedLocation, allStylists, allServices, locationStylists, stylistServices, selectedStylist, selectedService, allLocations, serviceLocations, stylistLocations]);

  // Actualizar opciones al cambiar selección de servicio
  useEffect(() => {
    if (selectedService) {
      // Filtrar estilistas que ofrecen este servicio
      const availableStylistsIds = serviceStylists[selectedService] || [];
      setStylists(allStylists.filter(stylist => availableStylistsIds.includes(stylist.id)));
      
      // Filtrar centros donde se ofrece este servicio
      const availableLocationsIds = serviceLocations[selectedService] || [];
      setLocations(allLocations.filter(loc => availableLocationsIds.includes(loc.id)));
      
      // Si el estilista seleccionado no ofrece este servicio, resetear
      if (selectedStylist && !availableStylistsIds.includes(selectedStylist)) {
        setSelectedStylist('');
        setStylistDetail(null);
      }
      
      // Si el centro seleccionado no ofrece este servicio, resetear
      if (selectedLocation && !availableLocationsIds.includes(selectedLocation)) {
        setSelectedLocation('');
        setLocationDetail(null);
      }
    } else {
      // Si no hay servicio seleccionado, aplicar solo otros filtros activos
      if (selectedStylist) {
        const availableServiceIds = stylistServices
          .filter(ss => ss.stylist_id === selectedStylist)
          .map(ss => ss.service_id);
        setServices(allServices.filter(service => availableServiceIds.includes(service.id)));
        
        if (selectedLocation) {
          // Encontrar servicios que ofrece este estilista en este centro específico
          const stylistsInLocation = locationStylists[selectedLocation] || [];
          if (stylistsInLocation.includes(selectedStylist)) {
            setServices(allServices.filter(service => availableServiceIds.includes(service.id)));
          } else {
            setServices([]);
          }
        }
      } else if (selectedLocation) {
        const availableStylistsIds = locationStylists[selectedLocation] || [];
        const servicesInLocation = new Set<number>();
        
        availableStylistsIds.forEach(stylistId => {
          stylistServices
            .filter(ss => ss.stylist_id === stylistId)
            .forEach(ss => servicesInLocation.add(ss.service_id));
        });
        
        setServices(allServices.filter(service => servicesInLocation.has(service.id)));
      } else {
        setStylists(allStylists);
        setLocations(allLocations);
        setServices(allServices);
      }
    }
  }, [selectedService, allStylists, allLocations, serviceStylists, serviceLocations, selectedStylist, selectedLocation, allServices, locationStylists, stylistServices]);

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
    
    if (!selectedStylist || !selectedLocation || !selectedService) {
      alert('Veuillez sélectionner un styliste, un centre et un service avant de choisir la date');
      return;
    }

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    setSelectedDate(dateStr);
    setSelectedTime('');
    setShowCustomerModal(false);
    fetchAvailableSlots(dateStr);
    setShowTimeModal(true);
  };

  // Obtenir les slots disponibles pour la date sélectionnée
  const fetchAvailableSlots = async (date: string) => {
    if (!selectedStylist || !selectedLocation || !selectedService) return;
    
    setLoadingSlots(true);
    try {
      const response = await fetch(`/api/reservation/availability?date=${date}&stylistId=${selectedStylist}&locationId=${selectedLocation}&serviceId=${selectedService}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la chargement des horaires disponibles');
      }
      
      const data = await response.json();
      setAvailableSlots(data.availableSlots || []);
    } catch (error) {
      console.error('Erreur lors de la chargement des slots disponibles:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Réserver un horaire
  const bookAppointment = (time: string) => {
    if (!selectedDate || !selectedStylist || !selectedLocation || !selectedService) {
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
      if (!selectedLocation) return;
      
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

  useEffect(() => {
    setSelectedDate(null);
    setSelectedTime('');
    setAvailableSlots([]);
    setShowTimeModal(false);
    setShowCustomerModal(false);
  }, [selectedStylist, selectedLocation, selectedService]);

  // Renderizaciones condicionales basadas en el estado
  if (isLoading) {
    return (
      <div className="admin-scope min-h-screen bg-dark px-4 py-12">
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
    <main className="admin-scope min-h-screen bg-dark px-4 pb-12 pt-24">
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
            
            {(selectedStylist || selectedLocation || selectedService) && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <FaFilter className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Filtres actifs:</strong> Les options des sélecteurs sont filtrées en fonction de vos sélections.
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
                          disabled={!selectedTime}
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
