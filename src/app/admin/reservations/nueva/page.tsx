'use client';

import { useState, useEffect } from 'react';
import { supabase, Location, Stylist, AvailabilitySlot, Service, StylistService } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { FaUser, FaMapMarkerAlt, FaCalendarDay, FaArrowLeft, FaCheck, FaCut, FaPhone, FaFilter, FaSyncAlt } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
  const [daysWithBookings, setDaysWithBookings] = useState<string[]>([]);
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
    
    setSelectedDate(dateStr);
    if (selectedStylist && selectedLocation && selectedService) {
      fetchAvailableSlots(dateStr);
      setShowTimeModal(true);
    } else {
      alert('Veuillez sélectionner un styliste, un centre et un service avant de choisir la date');
    }
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
  const bookAppointment = async (time: string) => {
    if (!selectedDate || !selectedStylist || !selectedLocation || !selectedService) {
      return;
    }
    
    setSelectedTime(time);
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
      const selectedServiceObj = services.find(s => s.id.toString() === selectedService);
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
            status: 'confirmed', // Par défaut, les réservations manuelles sont créées comme confirmées
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
        setDaysWithBookings(Object.keys(bookingsByDate));
        
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
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">Chargement du système de réservation...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Nouvelle Réservation</h1>
              <p className="text-gray-600">Créez un nouveau rendez-vous en sélectionnant un styliste, un centre et une date</p>
            </div>
            <div className="flex w-full md:w-auto gap-3 mt-2 md:mt-0">
              <button 
                onClick={resetAllFilters}
                className="flex-1 md:flex-initial flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md transition-colors"
                title="Réinitialiser les filtres"
              >
                <FaSyncAlt className="mr-2" /> <span className="whitespace-nowrap">Réinitialiser</span>
              </button>
              <button 
                onClick={() => router.push('/admin/reservations')}
                className="flex-1 md:flex-initial flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md transition-colors"
              >
                <FaArrowLeft className="mr-2" /> <span className="whitespace-nowrap">Retour</span>
              </button>
            </div>
          </div>

          {/* Filtres supérieurs */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Selector de Styliste */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaUser className="inline mr-2" /> Styliste
                </label>
                <select
                  value={selectedStylist}
                  onChange={(e) => setSelectedStylist(e.target.value)}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    stylists.length === 0 ? 'bg-gray-100 text-gray-500' : 'border-gray-300'
                  }`}
                  disabled={stylists.length === 0}
                >
                  <option value="">Sélectionnez un styliste</option>
                  {stylists.map(stylist => (
                    <option key={stylist.id} value={stylist.id}>
                      {stylist.name}
                    </option>
                  ))}
                </select>
                {stylists.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    Aucun styliste disponible avec les filtres actuels
                  </p>
                )}
              </div>
              
              {/* Selector de Centre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaMapMarkerAlt className="inline mr-2" /> Centre
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    locations.length === 0 ? 'bg-gray-100 text-gray-500' : 'border-gray-300'
                  }`}
                  disabled={locations.length === 0}
                >
                  <option value="">Sélectionnez un centre</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                {locations.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    Aucun centre disponible avec les filtres actuels
                  </p>
                )}
              </div>
              
              {/* Selector de Service */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaCalendarDay className="inline mr-2" /> Service
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    services.length === 0 ? 'bg-gray-100 text-gray-500' : 'border-gray-300'
                  }`}
                  disabled={services.length === 0}
                >
                  <option value="">Sélectionnez un service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id.toString()}>
                      {service.nombre} - {service.precio}€
                    </option>
                  ))}
                </select>
                {services.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
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
                        Certaines options ne sont pas disponibles avec votre configuration actuelle. Vous pouvez réinitialiser les filtres en utilisant le bouton &quot;Réinitialiser&quot;.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Información de estilista y centro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 mb-6">
            {/* Detalles del Estilista */}
            <div className="bg-white rounded-lg shadow-md p-4 h-full sm:col-span-1 lg:col-span-3">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                <FaUser className="mr-2 text-primary" /> Styliste Sélectionné
              </h3>
              {stylistDetail ? (
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden mb-4 bg-gray-200 border-4 border-primary border-opacity-20">
                    {stylistDetail.profile_img ? (
                      <Image 
                        src={stylistDetail.profile_img} 
                        alt={stylistDetail.name}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                        <FaUser size={40} />
                      </div>
                    )}
                  </div>
                  <h4 className="text-lg font-medium text-gray-800">{stylistDetail.name}</h4>
                  {stylistDetail.bio && (
                    <p className="mt-2 text-sm text-gray-600 text-center line-clamp-3">
                      {stylistDetail.bio}
                    </p>
                  )}
                  {stylistDetail.specialties && stylistDetail.specialties.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-1">
                      {stylistDetail.specialties.map((specialty, index) => (
                        <span 
                          key={index}
                          className="inline-block bg-primary bg-opacity-10 text-primary text-xs px-2 py-1 rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8 sm:py-12">
                  <FaUser size={40} className="mb-3" />
                  <p>Sélectionnez un styliste</p>
                </div>
              )}
            </div>
            
            {/* Detalles del Centro */}
            <div className="bg-white rounded-lg shadow-md p-4 h-full sm:col-span-1 lg:col-span-3">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                <FaMapMarkerAlt className="mr-2 text-primary" /> Centre Sélectionné
              </h3>
              {locationDetail ? (
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-md overflow-hidden mb-4 bg-gray-200 border-4 border-primary border-opacity-20">
                    {locationDetail.image ? (
                      <Image
                        src={locationDetail.image}
                        alt={locationDetail.name}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                        <FaMapMarkerAlt size={40} />
                      </div>
                    )}
                  </div>
                  <h4 className="text-lg font-medium text-gray-800">{locationDetail.name}</h4>
                  <div className="mt-2 flex flex-col items-center">
                    <p className="text-sm text-gray-600 text-center flex items-center gap-1">
                      <FaMapMarkerAlt className="text-gray-400 flex-shrink-0" size={12} />
                      {locationDetail.address}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <FaPhone className="text-gray-400 flex-shrink-0" size={12} />
                      {locationDetail.phone}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8 sm:py-12">
                  <FaMapMarkerAlt size={40} className="mb-3" />
                  <p>Sélectionnez un centre</p>
                </div>
              )}
            </div>
            
            {/* Calendario */}
            <div className="bg-white rounded-lg shadow-md p-4 h-full sm:col-span-2 lg:col-span-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Calendrier</h3>
                <div className="flex space-x-2">
                  <button 
                    onClick={prevMonth}
                    className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    aria-label="Mois précédent"
                  >
                    &larr;
                  </button>
                  <span className="font-medium text-gray-700 min-w-[140px] text-center">
                    {currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button 
                    onClick={nextMonth}
                    className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    aria-label="Mois suivant"
                  >
                    &rarr;
                  </button>
                </div>
              </div>
              
              {loadingAvailability ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                  <p className="text-gray-500">Chargement des disponibilités...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                      <div key={day} className="text-center font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2">
                    {generateCalendarData().map((day, index) => {
                      // Verificar si este día tiene reservas y su estado
                      const dateStr = day ? 
                        `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : 
                        '';
                      
                      // Determinar el color según la disponibilidad
                      let bgColor = 'bg-green-100'; // Por defecto, verde (disponible)
                      let hoverColor = 'hover:bg-green-200';
                      let textColor = 'text-green-800';
                      let dotColor = 'bg-green-500';
                      
                      // Rojo para días cerrados
                      if (day && closedDays.includes(dateStr)) {
                        bgColor = 'bg-red-100';
                        hoverColor = 'hover:bg-red-200';
                        textColor = 'text-red-800';
                        dotColor = 'bg-red-500';
                      } 
                      // Rojo también para días completamente ocupados
                      else if (day && fullyBookedDays.includes(dateStr)) {
                        bgColor = 'bg-red-100';
                        hoverColor = 'hover:bg-red-200';
                        textColor = 'text-red-800';
                        dotColor = 'bg-red-500';
                      }
                      // Amarillo para días parcialmente ocupados
                      else if (day && partiallyBookedDays.includes(dateStr)) {
                        bgColor = 'bg-yellow-100';
                        hoverColor = 'hover:bg-yellow-200';
                        textColor = 'text-yellow-800';
                        dotColor = 'bg-yellow-500';
                      }
                      
                      const hasBookings = day && daysWithBookings.includes(dateStr);
                      const isToday = day && new Date().getDate() === day && 
                                     new Date().getMonth() === currentMonth.getMonth() && 
                                     new Date().getFullYear() === currentMonth.getFullYear();
                      
                      return (
                        <button
                          key={index}
                          onClick={() => day && selectDate(day)}
                          disabled={!day}
                          className={`
                            h-12 flex flex-col items-center justify-center rounded-md transition-colors text-sm sm:text-base
                            ${!day ? 'bg-transparent' : `${bgColor} ${hoverColor} cursor-pointer ${textColor}`}
                            ${isToday ? 'border-2 border-primary' : ''}
                            ${hasBookings ? 'font-semibold' : ''}
                          `}
                        >
                          {day}
                          {hasBookings && (
                            <div className={`w-2 h-2 rounded-full ${dotColor} mt-1 animate-pulse`}></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 text-center text-sm">
                    <p className="text-gray-500 mb-2">
                      Sélectionnez une date pour voir les heures disponibles
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                      <div className="flex items-center text-xs text-gray-700">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                        <span>Disponible</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-700">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
                        <span>Partiellement réservé</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-700">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                        <span>Fermé ou complet</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal pour sélectionner une heure */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              Horaires disponibles pour {new Date(selectedDate!).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            
            {loadingSlots ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="py-8 text-center text-gray-600">
                Aucun horaire disponible pour cette date
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    disabled={!slot.available}
                    onClick={() => slot.available && bookAppointment(slot.time)}
                    className={`py-2 px-3 rounded text-center transition-colors ${
                      slot.available
                        ? 'bg-gray-100 hover:bg-primary hover:text-secondary text-gray-800'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowTimeModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour les données du client */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6">
            {bookingSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaCheck className="text-green-500 text-2xl" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">Réservation créée avec succès!</h3>
                <p className="text-gray-600 mb-4">La réservation a été enregistrée correctement.</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-4 text-gray-800">
                  Compléter la réservation
                </h3>
                
                <div className="bg-gray-100 p-4 rounded-md mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Informations sur le Styliste */}
                    <div>
                      <div className="flex items-start gap-3 mb-3">
                        {stylistDetail?.profile_img ? (
                          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                              src={stylistDetail.profile_img}
                              alt={stylistDetail.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <FaUser className="text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{stylistDetail?.name}</div>
                          <div className="text-sm text-gray-500">Styliste</div>
                        </div>
                      </div>
                    </div>

                    {/* Informations sur le Centre */}
                    <div>
                      <div className="flex items-start gap-3 mb-3">
                        {locationDetail?.image ? (
                          <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                            <Image
                              src={locationDetail.image}
                              alt={locationDetail.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <FaMapMarkerAlt className="text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{locationDetail?.name}</div>
                          <div className="text-sm text-gray-500">Centre</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ligne séparatrice */}
                  <div className="border-t border-gray-300 my-3"></div>

                  {/* Informations sur le Service et Date/Heure */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Informations sur le Service */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary bg-opacity-20 flex items-center justify-center flex-shrink-0">
                        <FaCut className="text-primary" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Service</div>
                        <div>{services.find(s => s.id.toString() === selectedService)?.nombre}</div>
                      </div>
                    </div>

                    {/* Informations sur la Date */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary bg-opacity-20 flex items-center justify-center flex-shrink-0">
                        <FaCalendarDay className="text-primary" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Date et heure</div>
                        <div>{new Date(selectedDate!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} • {selectedTime}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du client*
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email du client
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone du client*
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes supplémentaires
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                  />
                </div>
                
                {bookingError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {bookingError}
                  </div>
                )}
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowCustomerModal(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800"
                    disabled={bookingInProgress}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={completeBooking}
                    className="px-4 py-2 bg-primary text-secondary rounded-md font-medium hover:bg-opacity-90 transition flex items-center"
                    disabled={bookingInProgress}
                  >
                    {bookingInProgress ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-secondary mr-2"></div>
                        Traitement...
                      </>
                    ) : (
                      'Confirmer la Réservation'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      <Footer />
    </main>
  );
} 