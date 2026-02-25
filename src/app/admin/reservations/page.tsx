'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Booking, Location, Service, Stylist } from '@/lib/supabase';
import { FaCalendarAlt, FaCalendarDay } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

type BookingWithDetails = Booking & {
  stylist?: Stylist;
  location?: Location;
  service?: Service;
};

// Definir un tipo para errores
type ErrorType = {
  message: string;
  [key: string]: unknown;
};

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [showCalendarView, setShowCalendarView] = useState<boolean>(true);
  const [daysWithBookings, setDaysWithBookings] = useState<string[]>([]);
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [fullyBookedDays, setFullyBookedDays] = useState<string[]>([]);
  const [partiallyBookedDays, setPartiallyBookedDays] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);

  // Función auxiliar para obtener el nombre del día a partir del número - envuelta en useCallback
  const getDayName = useCallback((dayOfWeek: number): string => {
    const dayMap = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday'
    };
    return dayMap[dayOfWeek as keyof typeof dayMap];
  }, []);
  
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (year: number, month: number) => {
    // Obtener el día de la semana (0 = Domingo, 1 = Lunes, etc.)
    const firstDay = new Date(year, month, 1).getDay();
    
    // Ajustar para que lunes sea el primer día de la semana (0 = Lunes, 6 = Domingo)
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  // Usando useCallback para funciones que se usan en dependencias de useEffect
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Empezar a construir la consulta
      let query = supabase
        .from('bookings')
        .select(`
          *,
          stylist:stylists(*),
          location:locations(*),
          service:servicios(*)
        `)
        .eq('booking_date', selectedDate);
      
      // Añadir filtro por centro si es necesario
      if (selectedLocation !== 'all') {
        query = query.eq('location_id', selectedLocation);
      }
      
      // Añadir filtro por estilista si es necesario
      if (selectedStylist !== 'all') {
        query = query.eq('stylist_id', selectedStylist);
      }
      
      // Ordenar por hora de inicio
      query = query.order('start_time');
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setBookings((data || []) as BookingWithDetails[]);
    } catch (error: unknown) {
      const err = error as ErrorType;
      console.error('Error al cargar las reservas:', err.message);
      setError(`Error al cargar las reservas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedLocation, selectedStylist]);

  const fetchCenterSchedule = useCallback(async () => {
    if (!showCalendarView) return;
    
    setLoadingAvailability(true);
    try {
      // Determinar el primer y último día del mes actual
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      // Obtener todos los días del mes
      const daysInMonth = getDaysInMonth(year, month);
      const closed: string[] = [];
      
      if (selectedLocation === 'all' && selectedStylist === 'all') {
        // Si no hay filtros, no hay días cerrados
        setClosedDays([]);
        setLoadingAvailability(false);
        return;
      }
      
      // Obtener los horarios de centros si se ha seleccionado uno
      let locationHours = null;
      if (selectedLocation !== 'all') {
        const { data: locHours, error: locError } = await supabase
          .from('location_hours')
          .select('*')
          .eq('location_id', selectedLocation);
        
        if (locError) throw locError;
        locationHours = locHours;
      }
      
      // Obtener los horarios del estilista si se ha seleccionado uno
      let stylistHours = null;
      if (selectedStylist !== 'all') {
        let query = supabase
          .from('working_hours')
          .select('*')
          .eq('stylist_id', selectedStylist);
        
        // Si también hay un centro seleccionado, filtrar por ese centro
        if (selectedLocation !== 'all') {
          query = query.eq('location_id', selectedLocation);
        }
        
        const { data: workHours, error: workError } = await query;
        if (workError) throw workError;
        stylistHours = workHours;
      }
      
      // Verificar cada día del mes
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay(); // 0 es domingo, 6 es sábado
        const dayName = getDayName(dayOfWeek);
        
        let isClosed = false;
        
        // Si hay un centro seleccionado, verificar si está abierto
        if (selectedLocation !== 'all' && locationHours) {
          // El centro está cerrado si no hay horario para este día
          const centerOpen = locationHours.some(hour => 
            hour.day_of_week === dayOfWeek || 
            hour.day === dayName || 
            hour.day === dayName.toLowerCase()
          );
          
          if (!centerOpen) {
            isClosed = true;
          }
        }
        
        // Si hay un estilista seleccionado, verificar si trabaja
        if (selectedStylist !== 'all' && stylistHours) {
          // El día está cerrado si el estilista no trabaja
          const stylistWorks = stylistHours.some(hour => 
            hour.day_of_week === dayOfWeek || 
            hour.day === dayName || 
            hour.day === dayName.toLowerCase()
          );
          
          if (!stylistWorks) {
            isClosed = true;
          }
        }
        
        // Si el día está cerrado (por centro o estilista), añadirlo a la lista
        if (isClosed) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          closed.push(dateStr);
        }
      }
      
      setClosedDays(closed);
      
      // Debug
      console.log('Días cerrados:', closed);
      
      setLoadingAvailability(false);
    } catch (error: unknown) {
      const err = error as ErrorType;
      console.error('Error al cargar el horario del centro:', err.message);
      setLoadingAvailability(false);
    }
  }, [currentMonth, selectedLocation, selectedStylist, showCalendarView, getDayName]);

  const fetchBookingDays = useCallback(async () => {
    if (!showCalendarView) return;
    
    try {
      // Determinar el primer y último día del mes actual
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(getDaysInMonth(year, month)).padStart(2, '0')}`;
      
      // Consultar las reservas en el rango de fechas
      let query = supabase
        .from('bookings')
        .select('booking_date, location_id, start_time, end_time, stylist_id')
        .gte('booking_date', firstDay)
        .lte('booking_date', lastDay);
      
      // Filtrar por centro si es necesario
      if (selectedLocation !== 'all') {
        query = query.eq('location_id', selectedLocation);
      }
      
      // Filtrar por estilista si uno está seleccionado
      if (selectedStylist !== 'all') {
        query = query.eq('stylist_id', selectedStylist);
      }
      
      const { data: bookings, error } = await query;
      
      if (error) throw error;
      
      // Agrupar las reservas por fecha
      const bookingsByDate: Record<string, Record<string, unknown>[]> = {};
      bookings.forEach(booking => {
        if (!bookingsByDate[booking.booking_date]) {
          bookingsByDate[booking.booking_date] = [];
        }
        bookingsByDate[booking.booking_date].push(booking);
      });
      
      // Para determinar si un día está completamente reservado, necesitaríamos información adicional
      const fullyBooked: string[] = [];
      let partiallyBooked: string[] = [];
      
      if (selectedLocation !== 'all') {
        // Obtener los horarios de trabajo relevantes
        let workingHoursQuery = supabase
          .from('working_hours')
          .select('*');
        
        if (selectedLocation !== 'all') {
          workingHoursQuery = workingHoursQuery.eq('location_id', selectedLocation);
        }
        
        if (selectedStylist !== 'all') {
          workingHoursQuery = workingHoursQuery.eq('stylist_id', selectedStylist);
        }
        
        const { data: workingHours, error: workingHoursError } = await workingHoursQuery;
        
        if (workingHoursError) throw workingHoursError;
        
        // Para cada día con reservas, verificar si todos los slots están ocupados
        for (const [date, dateBookings] of Object.entries(bookingsByDate)) {
          const dateObj = new Date(date);
          const dayOfWeek = dateObj.getDay(); // 0 = domingo, 1 = lunes, etc.
          
          // Obtener horas de trabajo para este día
          const hoursForDay = workingHours.filter(wh => 
            wh.day_of_week === dayOfWeek || wh.day === getDayName(dayOfWeek)
          );
          
          if (hoursForDay.length > 0) {
            // Calcular la duración total de horas de trabajo
            let totalWorkMinutes = 0;
            
            hoursForDay.forEach(wh => {
              if (wh.start_time && wh.end_time) {
                const [startHour, startMinute] = wh.start_time.split(':').map(Number);
                const [endHour, endMinute] = wh.end_time.split(':').map(Number);
                
                const startMinutes = startHour * 60 + startMinute;
                const endMinutes = endHour * 60 + endMinute;
                
                totalWorkMinutes += endMinutes - startMinutes;
              }
            });
            
            // Calcular slots disponibles basados en duración promedio de servicios (30 minutos)
            const averageServiceDuration = 30; // minutos
            const estimatedSlots = Math.floor(totalWorkMinutes / averageServiceDuration);
            
            // Determinar si está completamente reservado
            if (dateBookings.length >= estimatedSlots && estimatedSlots > 0) {
              fullyBooked.push(date);
            } else {
              partiallyBooked.push(date);
            }
          }
        }
      } else {
        // Si no hay centro o estilista seleccionado, simplemente consideramos todos los días con reservas como parcialmente ocupados
        partiallyBooked = Object.keys(bookingsByDate);
      }
      
      // Actualizar los estados con la información calculada
      setFullyBookedDays(fullyBooked);
      setPartiallyBookedDays(partiallyBooked);
      setDaysWithBookings(Object.keys(bookingsByDate));
      
      // Debug para verificar
      console.log('Días parcialmente ocupados:', partiallyBooked);
      console.log('Días completamente ocupados:', fullyBooked);
      console.log('Días con reservas:', Object.keys(bookingsByDate));
      
    } catch (error: unknown) {
      const err = error as ErrorType;
      console.error('Error al cargar los días con reservas:', err.message);
    }
  }, [currentMonth, selectedLocation, selectedStylist, showCalendarView, getDayName]);

  useEffect(() => {
    // Cargar centros al inicio
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .order('id');
          
        if (error) throw error;
        
        setLocations(data || []);
      } catch (error: unknown) {
        const err = error as ErrorType;
        console.error('Error al cargar los centros:', err.message);
      }
    };
    
    const fetchStylists = async () => {
      try {
        const { data, error } = await supabase
          .from('stylists')
          .select('*')
          .eq('active', true)
          .order('name');
          
        if (error) throw error;
        
        setStylists(data || []);
      } catch (error: unknown) {
        const err = error as ErrorType;
        console.error('Error al cargar los estilistas:', err.message);
      }
    };
    
    fetchLocations();
    fetchStylists();
  }, []);
  
  useEffect(() => {
    // Cargar reservas cuando cambie la fecha, ubicación o estilista
    fetchBookings();
  }, [fetchBookings]);
  
  useEffect(() => {
    // Cargar días con reservas cuando cambie el mes
    if (!showCalendarView) return;
    
    fetchBookingDays();
    fetchCenterSchedule();
  }, [fetchBookingDays, fetchCenterSchedule, showCalendarView]);

  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);
      
      if (error) throw error;
      
      // Actualizar el estado local
      setBookings((prevBookings) => 
        prevBookings.map((booking) => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus } 
            : booking
        )
      );
      
    } catch (error: unknown) {
      const err = error as ErrorType;
      console.error('Error al actualizar el estado de la reserva:', err.message);
      alert(`Error al actualizar: ${err.message}`);
    }
  };
  
  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-primary bg-primary bg-opacity-50 text-black';
      case 'confirmed':
        return 'border-blue-500 bg-blue-500 bg-opacity-50 text-white';
      case 'completed':
        return 'border-green-500 bg-green-500 bg-opacity-50 text-white';
      case 'cancelled':
        return 'border-coral bg-coral bg-opacity-50 text-white';
      default:
        return 'border-gray-400 bg-gray-400 bg-opacity-50 text-black';
    }
  };
  
  const generateCalendarData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    
    // Crear array con los días del mes
    const days = [];
    
    // Añadir espacios vacíos para los días anteriores al primer día del mes
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Añadir los días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };
  
  const prevMonth = () => {
    setCurrentMonth((prevMonth) => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() - 1);
      return newMonth;
    });
  };
  
  const nextMonth = () => {
    setCurrentMonth((prevMonth) => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() + 1);
      return newMonth;
    });
  };
  
  const selectDay = (day: number | null) => {
    if (!day) return;
    
    // Crear la fecha usando una string con formato YYYY-MM-DD para evitar problemas de zona horaria
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1; // +1 porque getMonth() devuelve 0-11
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    setSelectedDate(dateStr);
    setShowCalendarView(false);
    
    // Cargar reservas para el día seleccionado inmediatamente
    const loadBookingsForSelectedDay = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Empezar a construir la consulta
        let query = supabase
          .from('bookings')
          .select(`
            *,
            stylist:stylists(*),
            location:locations(*),
            service:servicios(*)
          `)
          .eq('booking_date', dateStr);
        
        // Añadir filtro por centro si es necesario
        if (selectedLocation !== 'all') {
          query = query.eq('location_id', selectedLocation);
        }
        
        // Añadir filtro por estilista si es necesario
        if (selectedStylist !== 'all') {
          query = query.eq('stylist_id', selectedStylist);
        }
        
        // Ordenar por hora de inicio
        query = query.order('start_time');
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setBookings((data || []) as BookingWithDetails[]);
      } catch (error: unknown) {
        const err = error as ErrorType;
        console.error('Error al cargar las reservas:', err.message);
        setError(`Error al cargar las reservas: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadBookingsForSelectedDay();
  };
  
  const backToCalendar = () => {
    setShowCalendarView(true);
  };
  
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today.toISOString().split('T')[0]);
    setShowCalendarView(false);
  };

  return (
    <div className="min-h-screen bg-dark text-light">
      <div className="transition-all duration-300">
        <main className="flex-grow container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6 text-primary border-b-2 border-primary border-opacity-40 pb-2">Gestion des Réservations</h1>
          
          {/* Contenido principal */}
          <div className="bg-secondary rounded-lg shadow-lg p-4 md:p-6">
            {/* Layout principal con grid para separar filtros y contenido */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Panel de filtros - ocupa 1 columna en escritorio y toda la anchura en móvil */}
              <div className="lg:col-span-1">
                <div className="bg-secondary rounded-lg shadow-md p-4 mb-6 border border-primary border-opacity-30">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-primary">Filtres</h2>
                    {/* Botón para colapsar/expandir filtros en móvil */}
                    <button 
                      className="lg:hidden text-light hover:text-primary"
                      onClick={() => {
                        const filtersContent = document.getElementById('filters-content');
                        if (filtersContent) {
                          filtersContent.classList.toggle('hidden');
                        }
                      }}
                    >
                      {/* Icono de filtros */}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Contenido de filtros - colapsable en móvil */}
                  <div id="filters-content" className="hidden lg:block">
                    <div className="flex flex-col gap-4">
                      <div>
                        <label htmlFor="location-select" className="block text-sm font-medium text-primary mb-1">
                          Centre
                        </label>
                        <select
                          id="location-select"
                          className="w-full pl-3 pr-10 py-2 text-base border border-primary border-opacity-50 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-dark text-light"
                          value={selectedLocation}
                          onChange={(e) => setSelectedLocation(e.target.value)}
                        >
                          <option value="all">Tous les centres</option>
                          {locations.map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="stylist-select" className="block text-sm font-medium text-primary mb-1">
                          Styliste
                        </label>
                        <select
                          id="stylist-select"
                          className={`w-full pl-3 pr-10 py-2 text-base border border-primary border-opacity-50 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-dark text-light ${selectedStylist !== 'all' ? 'border-2 border-primary' : ''}`}
                          value={selectedStylist}
                          onChange={(e) => setSelectedStylist(e.target.value)}
                        >
                          <option value="all">Tous les stylistes</option>
                          {stylists.map((stylist) => {
                            // Contar cuántas reservas tiene este estilista en la fecha seleccionada
                            const stylistBookingsCount = bookings.filter(
                              booking => booking.stylist_id === stylist.id
                            ).length;
                            
                            return (
                              <option key={stylist.id} value={stylist.id}>
                                {stylist.name} {stylistBookingsCount > 0 ? `(${stylistBookingsCount})` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                  
                      <div>
                        <label htmlFor="date-select" className="block text-sm font-medium text-primary mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          id="date-select"
                          className="w-full pl-3 pr-10 py-2 text-base border border-primary border-opacity-50 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-dark text-light"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                        />
                      </div>
                
                      <div className="flex flex-col gap-2 mt-4">
                        <button
                          className="flex items-center justify-center gap-2 bg-dark hover:bg-opacity-80 text-primary font-medium py-2 px-4 rounded-md transition-all w-full border border-primary border-opacity-30"
                          onClick={backToCalendar}
                        >
                          <FaCalendarAlt className="text-primary" size={16} />
                          Calendrier
                        </button>
                    
                        <button
                          className="flex items-center justify-center gap-2 bg-dark hover:bg-opacity-80 text-primary font-medium py-2 px-4 rounded-md transition-all w-full border border-primary border-opacity-30"
                          onClick={goToToday}
                        >
                          <FaCalendarDay className="text-primary" size={16} />
                          Aujourd&apos;hui
                        </button>
                          
                        {(selectedLocation !== 'all' || selectedStylist !== 'all') && (
                          <button
                            className="flex items-center justify-center gap-2 bg-coral hover:bg-opacity-80 text-white font-medium py-2 px-4 rounded-md transition-all w-full"
                            onClick={() => {
                              setSelectedLocation('all');
                              setSelectedStylist('all');
                            }}
                          >
                            Effacer les filtres
                          </button>
                        )}
                    
                        <button
                          onClick={() => router.push('/admin/reservations/nueva')}
                          className="flex items-center justify-center gap-2 bg-primary hover:bg-opacity-80 text-secondary font-medium py-2 px-4 rounded-md transition-all w-full"
                        >
                          + Nouvelle Réservation
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Área principal de contenido - ocupa 3 columnas en escritorio */}
              <div className="lg:col-span-3">
                {/* Vista de calendario o lista de reservas */}
                {showCalendarView ? (
                  <div className="bg-secondary rounded-lg shadow-md p-4">
                    <div className="flex flex-col items-center mb-4">
                      <h2 className="text-xl font-semibold text-primary mb-4">
                        {selectedStylist !== 'all' 
                          ? `Calendrier de ${stylists.find(s => s.id === selectedStylist)?.name || 'Styliste'}`
                          : 'Calendrier'
                        }
                      </h2>
                      <div className="flex items-center space-x-3 mb-4">
                        <button 
                          onClick={prevMonth}
                          className="p-3 rounded-md bg-dark hover:bg-opacity-80 flex items-center justify-center text-primary"
                          aria-label="Mois précédent"
                        >
                          &larr;
                        </button>
                        <span className="font-medium text-primary text-xl min-w-[160px] text-center">
                          {currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button 
                          onClick={nextMonth}
                          className="p-3 rounded-md bg-dark hover:bg-opacity-80 flex items-center justify-center text-primary"
                          aria-label="Mois suivant"
                        >
                          &rarr;
                        </button>
                      </div>
                    </div>
                
                    <div className="relative">
                      {loadingAvailability && (
                        <div className="absolute inset-0 bg-secondary bg-opacity-70 z-10 flex items-center justify-center rounded">
                          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      )}
                
                      {/* Días de la semana */}
                      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                          <div key={day} className="text-center font-medium text-primary py-2 text-xs sm:text-sm">
                            {day}
                          </div>
                        ))}
                      </div>
                  
                      {/* Cuadrícula del calendario con días */}
                      <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {generateCalendarData().map((day, index) => {
                          const dateStr = day ? 
                            `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` 
                            : '';
                        
                          // Determinar el color según la disponibilidad
                          let bgColor = 'bg-green-100'; // Por defecto, verde (disponible)
                          let hoverColor = 'hover:bg-green-200';
                          let textColor = 'text-green-800';
                          let dotColor = 'bg-green-500';
                        
                          // Rojo para días cerrados
                          if (day && closedDays.includes(dateStr)) {
                            bgColor = 'bg-coral bg-opacity-20';
                            hoverColor = 'hover:bg-coral hover:bg-opacity-30';
                            textColor = 'text-coral';
                            dotColor = 'bg-coral';
                          } 
                          // Rojo también para días completamente ocupados
                          else if (day && fullyBookedDays.includes(dateStr)) {
                            bgColor = 'bg-coral bg-opacity-20';
                            hoverColor = 'hover:bg-coral hover:bg-opacity-30';
                            textColor = 'text-coral';
                            dotColor = 'bg-coral';
                          }
                          // Amarillo para días parcialmente ocupados
                          else if (day && partiallyBookedDays.includes(dateStr)) {
                            bgColor = 'bg-primary bg-opacity-20';
                            hoverColor = 'hover:bg-primary hover:bg-opacity-30';
                            textColor = 'text-dark';
                            dotColor = 'bg-primary';
                          }
                          // Para días disponibles, usamos un verde más adaptado al tema
                          else if (day) {
                            bgColor = 'bg-green-100 bg-opacity-80'; 
                            hoverColor = 'hover:bg-green-200';
                            textColor = 'text-dark';
                          }
                        
                          const hasBookings = day && daysWithBookings.includes(dateStr);
                          const isToday = day && new Date().getDate() === day && 
                                      new Date().getMonth() === currentMonth.getMonth() && 
                                      new Date().getFullYear() === currentMonth.getFullYear();
                        
                          return (
                            <button
                              key={index}
                              onClick={() => day && selectDay(day)}
                              disabled={!day}
                              className={`
                                h-10 sm:h-12 flex flex-col items-center justify-center rounded-md transition-colors text-xs sm:text-sm
                                ${!day ? 'bg-secondary bg-opacity-40' : `${bgColor} ${hoverColor} cursor-pointer ${textColor}`}
                                ${isToday ? 'ring-2 ring-primary ring-opacity-100 font-bold' : ''}
                                ${day && selectedDate === dateStr ? 'ring-2 ring-primary ring-opacity-100 font-bold shadow-md' : ''}
                              `}
                            >
                              {day && (
                                <>
                                  <span>{day}</span>
                                  {hasBookings && (
                                    <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full mt-0.5" style={{backgroundColor: dotColor}}></span>
                                  )}
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl font-semibold text-primary mb-4">
                      Réservations pour le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(selectedDate))}
                    </h2>
                  
                    {/* Lista de reservas para el día seleccionado */}
                    <div>
                      {/* Encabezado con fecha y botones */}
                      <div className="flex flex-col sm:flex-row justify-between items-center bg-secondary p-4 rounded-t-lg">
                        <div className="flex items-center mb-3 sm:mb-0">
                          <button 
                            onClick={backToCalendar} 
                            className="mr-3 p-2 rounded bg-dark hover:bg-opacity-80 text-primary"
                          >
                            &larr;
                          </button>
                          <h3 className="text-xl font-semibold text-primary">
                            {new Date(selectedDate).toLocaleDateString('fr-FR', { 
                              weekday: 'long', 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </h3>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={goToToday}
                            className="px-4 py-2 bg-primary text-secondary rounded hover:bg-opacity-80 font-medium"
                          >
                            Aujourd&apos;hui
                          </button>
                        </div>
                      </div>
                      
                      {/* Contenido de reservas */}
                      <div className="bg-secondary rounded-b-lg shadow-md p-4">
                        {loading ? (
                          <div className="flex justify-center p-10">
                            <div className="w-12 h-12 rounded-full animate-spin-custom"></div>
                          </div>
                        ) : error ? (
                          <div className="text-coral p-4 text-center">
                            {error}
                          </div>
                        ) : bookings.length === 0 ? (
                          <div className="text-light p-6 text-center bg-dark bg-opacity-30 rounded-lg">
                            Aucune réservation pour cette date
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {bookings.map((booking) => (
                              <div key={booking.id} className="bg-secondary rounded-lg shadow-md p-4 border-2 border-primary">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <div className="font-medium text-light">{booking.customer_name}</div>
                                    <div className="text-sm text-light opacity-70">{booking.customer_phone}</div>
                                    {booking.customer_email && <div className="text-sm text-light opacity-70">{booking.customer_email}</div>}
                                  </div>
                                  {/* Desplegable visible solo en pantallas medianas o más grandes */}
                                  <div className="hidden md:block">
                                    <select
                                      value={booking.status}
                                      onChange={(e) => handleStatusChange(booking.id, e.target.value as 'pending' | 'confirmed' | 'cancelled' | 'completed')}
                                      className={`text-sm rounded-full px-3 py-1 font-medium cursor-pointer border-2 outline-none appearance-none ${getStatusColor(booking.status)}`}
                                      style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.2em 1.2em', paddingRight: '2.5rem' }}
                                    >
                                      <option value="pending" className="bg-primary bg-opacity-80 text-black font-medium px-2 py-1">En attente</option>
                                      <option value="confirmed" className="bg-blue-500 bg-opacity-80 text-white font-medium px-2 py-1">Confirmé</option>
                                      <option value="completed" className="bg-green-500 bg-opacity-80 text-white font-medium px-2 py-1">Terminé</option>
                                      <option value="cancelled" className="bg-coral bg-opacity-80 text-white font-medium px-2 py-1">Annulé</option>
                                    </select>
                                  </div>
                                </div>
                            
                                <div className="mt-3 p-2 bg-dark bg-opacity-30 rounded-lg">
                                  <div className="text-primary font-bold text-center">
                                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                  </div>
                                </div>
                            
                                <div className="grid grid-cols-1 gap-2 text-sm mt-3">
                                  <div className="flex gap-2">
                                    <div className="flex-1">
                                      <div className="font-medium text-light">{booking.service?.nombre || 'Service inconnu'}</div>
                                      <div className="text-xs text-light opacity-70">
                                        {new Date(booking.booking_date).toLocaleDateString('fr-FR')} - {formatTime(booking.start_time)}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <div className="text-primary font-medium">
                                        {booking.service?.precio ? `${booking.service.precio}€` : 'Prix non disponible'}
                                      </div>
                                    </div>
                                  </div>
                              
                                  <div className="mt-2 p-2 bg-dark bg-opacity-20 rounded-lg flex justify-between items-center">
                                    <div>
                                      <div className="text-xs text-light opacity-70">Styliste:</div>
                                      <div className="font-medium text-light">{booking.stylist?.name || 'Styliste inconnu'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-light opacity-70">Centre:</div>
                                      <div className="font-medium text-light">{booking.location?.name || 'Centre inconnu'}</div>
                                    </div>
                                  </div>
                              
                                  {/* Desplegable visible solo en móvil */}
                                  <div className="md:hidden mt-4">
                                    <label className="block text-xs font-medium text-light opacity-70 mb-1">
                                      Statut de la réservation:
                                    </label>
                                    <select
                                      value={booking.status}
                                      onChange={(e) => handleStatusChange(booking.id, e.target.value as 'pending' | 'confirmed' | 'cancelled' | 'completed')}
                                      className={`w-full text-sm rounded-md py-2 px-3 font-medium cursor-pointer border-2 outline-none appearance-none ${getStatusColor(booking.status)}`}
                                      style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.2em 1.2em', paddingRight: '2.5rem' }}
                                    >
                                      <option value="pending" className="bg-primary bg-opacity-80 text-black font-medium px-2 py-1">En attente</option>
                                      <option value="confirmed" className="bg-blue-500 bg-opacity-80 text-white font-medium px-2 py-1">Confirmé</option>
                                      <option value="completed" className="bg-green-500 bg-opacity-80 text-white font-medium px-2 py-1">Terminé</option>
                                      <option value="cancelled" className="bg-coral bg-opacity-80 text-white font-medium px-2 py-1">Annulé</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 
