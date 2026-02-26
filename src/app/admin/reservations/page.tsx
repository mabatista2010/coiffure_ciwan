'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Booking, Location, Service, Stylist } from '@/lib/supabase';
import { FaCalendarAlt, FaCalendarDay } from 'react-icons/fa';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminCard, AdminCardContent, AdminDateInput, ReservationStatusSelect, SectionHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type BookingWithDetails = Booking & {
  stylist?: Stylist;
  location?: Location;
  service?: Service;
};

type CalendarDayStatus = "empty" | "available" | "partial" | "full";

type CalendarDayStyle = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  dotColor: string;
};

const calendarDayStyles: Record<CalendarDayStatus, CalendarDayStyle> = {
  empty: {
    backgroundColor: "var(--admin-calendar-empty-bg)",
    borderColor: "var(--admin-calendar-empty-border)",
    textColor: "var(--admin-calendar-empty-text)",
    dotColor: "var(--admin-calendar-empty-dot)",
  },
  available: {
    backgroundColor: "var(--admin-calendar-available-bg)",
    borderColor: "var(--admin-calendar-available-border)",
    textColor: "var(--admin-calendar-available-text)",
    dotColor: "var(--admin-calendar-available-dot)",
  },
  partial: {
    backgroundColor: "var(--admin-calendar-partial-bg)",
    borderColor: "var(--admin-calendar-partial-border)",
    textColor: "var(--admin-calendar-partial-text)",
    dotColor: "var(--admin-calendar-partial-dot)",
  },
  full: {
    backgroundColor: "var(--admin-calendar-full-bg)",
    borderColor: "var(--admin-calendar-full-border)",
    textColor: "var(--admin-calendar-full-text)",
    dotColor: "var(--admin-calendar-full-dot)",
  },
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
  const [calendarHighlightedDate, setCalendarHighlightedDate] = useState<string | null>(null);
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [fullyBookedDays, setFullyBookedDays] = useState<string[]>([]);
  const [partiallyBookedDays, setPartiallyBookedDays] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState<boolean>(false);

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
    
    setCalendarHighlightedDate(dateStr);
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
    setCalendarHighlightedDate(null);
    setShowCalendarView(true);
  };
  
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today.toISOString().split('T')[0]);
    setShowCalendarView(false);
  };

  const handleDateInputChange = (dateValue: string) => {
    if (!dateValue) return;

    const selected = new Date(`${dateValue}T00:00:00`);
    if (!Number.isNaN(selected.getTime())) {
      setCurrentMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }

    setSelectedDate(dateValue);
    setCalendarHighlightedDate(null);
    setShowCalendarView(false);
  };

  return (
    <div className="admin-scope min-h-screen bg-background px-4 py-8 text-foreground">
      <main className="mx-auto flex w-full max-w-7xl flex-col">
          <SectionHeader
            title="Gestion des Réservations"
            description="Calendrier, filtres croisés et gestion de statut des réservations."
          />

          {/* Layout principal con grid para separar filtros y contenido */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Columna izquierda: filtros + acciones */}
            <div className="space-y-4 lg:col-span-1">
              <AdminCard
                className="h-fit border-border/70"
                style={{ boxShadow: "var(--admin-shadow-card)" }}
              >
                <AdminCardContent className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">Filtres</h2>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => setShowFiltersMobile((prev) => !prev)}
                      aria-expanded={showFiltersMobile}
                      aria-controls="filters-content"
                      aria-label={showFiltersMobile ? "Masquer les filtres" : "Afficher les filtres"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </Button>
                  </div>

                  <div id="filters-content" className={`${showFiltersMobile ? "block" : "hidden"} space-y-4 lg:block`}>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        Centre
                      </label>
                      <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                        <SelectTrigger className="w-full rounded-md">
                          <SelectValue placeholder="Tous les centres" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les centres</SelectItem>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        Styliste
                      </label>
                      <Select value={selectedStylist} onValueChange={setSelectedStylist}>
                        <SelectTrigger className="w-full rounded-md">
                          <SelectValue placeholder="Tous les stylistes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les stylistes</SelectItem>
                          {stylists.map((stylist) => {
                            const stylistBookingsCount = bookings.filter(
                              booking => booking.stylist_id === stylist.id
                            ).length;

                            return (
                              <SelectItem key={stylist.id} value={stylist.id}>
                                {stylist.name} {stylistBookingsCount > 0 ? `(${stylistBookingsCount})` : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label htmlFor="date-select" className="mb-1 block text-sm font-medium text-muted-foreground">
                        Date
                      </label>
                      <AdminDateInput
                        id="date-select"
                        className="w-full rounded-md"
                        value={selectedDate}
                        onChange={(e) => handleDateInputChange(e.target.value)}
                      />
                    </div>

                    {(selectedLocation !== 'all' || selectedStylist !== 'all') && (
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                          setSelectedLocation('all');
                          setSelectedStylist('all');
                        }}
                      >
                        Effacer les filtres
                      </Button>
                    )}
                  </div>
                </AdminCardContent>
              </AdminCard>

              <AdminCard
                className="h-fit border-border/70"
                style={{ boxShadow: "var(--admin-shadow-card)" }}
              >
                <AdminCardContent className="p-4">
                  <h2 className="text-lg font-semibold text-foreground">Vues & actions</h2>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="flex w-full items-center justify-center gap-2"
                      onClick={backToCalendar}
                    >
                      <FaCalendarAlt size={16} />
                      Calendrier
                    </Button>

                    <Button
                      variant="outline"
                      className="flex w-full items-center justify-center gap-2"
                      onClick={goToToday}
                    >
                      <FaCalendarDay size={16} />
                      Aujourd&apos;hui
                    </Button>

                    <Button
                      onClick={() => router.push('/admin/reservations/nueva')}
                      className="w-full"
                    >
                      + Nouvelle Réservation
                    </Button>
                  </div>
                </AdminCardContent>
              </AdminCard>
            </div>

            {/* Área principal de contenido */}
            <AdminCard
              className="border-border/70 lg:col-span-3"
              style={{ boxShadow: "var(--admin-shadow-card)" }}
            >
              <AdminCardContent className="p-4 md:p-6">
                {/* Vista de calendario o lista de reservas */}
                {showCalendarView ? (
                  <div>
                    <div className="flex flex-col items-center mb-4">
                      <h2 className="text-xl font-semibold text-foreground mb-4">
                        {selectedStylist !== 'all' 
                          ? `Calendrier de ${stylists.find(s => s.id === selectedStylist)?.name || 'Styliste'}`
                          : 'Calendrier'
                        }
                      </h2>
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
                    </div>
                
                    <div className="relative">
                      {loadingAvailability && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[var(--admin-overlay)] backdrop-blur-[1px]">
                          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      )}
                
                      {/* Días de la semana */}
                      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                          <div key={day} className="text-center font-medium text-muted-foreground py-2 text-xs sm:text-sm">
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
                          const isToday = day && new Date().getDate() === day && 
                                      new Date().getMonth() === currentMonth.getMonth() && 
                                      new Date().getFullYear() === currentMonth.getFullYear();
                          const isSelectedDate = day && calendarHighlightedDate === dateStr;

                          let dayStatus: CalendarDayStatus = day ? "available" : "empty";

                          if (day && (closedDays.includes(dateStr) || fullyBookedDays.includes(dateStr))) {
                            dayStatus = "full";
                          } else if (day && partiallyBookedDays.includes(dateStr)) {
                            dayStatus = "partial";
                          }

                          const dayStyle = calendarDayStyles[dayStatus];

                          return (
                            <button
                              type="button"
                              key={index}
                              onClick={() => day && selectDay(day)}
                              disabled={!day}
                              className={`
                                h-10 sm:h-12 flex flex-col items-center justify-center rounded-md border border-border/70 shadow-sm transition-all text-xs sm:text-sm
                                ${!day ? 'cursor-default opacity-40' : 'cursor-pointer bg-card text-foreground hover:bg-muted/60'}
                                ${isToday ? 'ring-2 ring-primary font-bold' : ''}
                                ${isSelectedDate ? 'ring-2 ring-primary font-bold shadow-md' : ''}
                              `}
                              style={!day ? {
                                backgroundColor: calendarDayStyles.empty.backgroundColor,
                                borderColor: calendarDayStyles.empty.borderColor,
                                color: calendarDayStyles.empty.textColor,
                              } : undefined}
                            >
                              {day && (
                                <>
                                  <span className="leading-none">{day}</span>
                                  <span
                                    className="mt-0.5 h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5"
                                    style={{ backgroundColor: dayStyle.dotColor }}
                                  />
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 border-t border-border/70 pt-3">
                        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] sm:text-xs">
                          <div
                            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5"
                            style={{
                              borderColor: calendarDayStyles.available.borderColor,
                              color: calendarDayStyles.available.textColor,
                            }}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: calendarDayStyles.available.dotColor }}
                            />
                            Sans réservations
                          </div>
                          <div
                            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5"
                            style={{
                              borderColor: calendarDayStyles.partial.borderColor,
                              color: calendarDayStyles.partial.textColor,
                            }}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: calendarDayStyles.partial.dotColor }}
                            />
                            Avec réservations
                          </div>
                          <div
                            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5"
                            style={{
                              borderColor: calendarDayStyles.full.borderColor,
                              color: calendarDayStyles.full.textColor,
                            }}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: calendarDayStyles.full.dotColor }}
                            />
                            Complet / Fermé
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">
                      Réservations pour le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(selectedDate))}
                    </h2>
                  
                    {/* Lista de reservas para el día seleccionado */}
                    <div>
                      {/* Encabezado con fecha y botones */}
                      <div className="flex flex-col items-center justify-between gap-3 rounded-t-lg border border-border bg-muted/35 p-4 sm:flex-row">
                        <div className="flex items-center mb-3 sm:mb-0">
                          <Button
                            onClick={backToCalendar}
                            variant="outline"
                            size="icon"
                            className="mr-3 h-10 w-10 rounded-xl text-foreground"
                          >
                            &larr;
                          </Button>
                          <h3 className="text-xl font-semibold text-foreground">
                            {new Date(selectedDate).toLocaleDateString('fr-FR', { 
                              weekday: 'long', 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </h3>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={goToToday}
                            className="px-4"
                          >
                            Aujourd&apos;hui
                          </Button>
                        </div>
                      </div>
                      
                      {/* Contenido de reservas */}
                      <div className="rounded-b-lg border-x border-b border-border bg-card p-4">
                        {loading ? (
                          <div className="flex justify-center p-10">
                            <div className="w-12 h-12 rounded-full animate-spin-custom"></div>
                          </div>
                        ) : error ? (
                          <div className="p-4 text-center text-destructive">
                            {error}
                          </div>
                        ) : bookings.length === 0 ? (
                          <div className="rounded-lg bg-muted/45 p-6 text-center text-muted-foreground">
                            Aucune réservation pour cette date
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {bookings.map((booking) => (
                              <div
                                key={booking.id}
                                className="rounded-lg border border-border bg-card p-4"
                                style={{ boxShadow: "var(--admin-shadow-soft)" }}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <div className="font-medium text-foreground">{booking.customer_name}</div>
                                    <div className="text-sm text-muted-foreground">{booking.customer_phone}</div>
                                    {booking.customer_email && <div className="text-sm text-muted-foreground">{booking.customer_email}</div>}
                                  </div>
                                  {/* Desplegable visible solo en pantallas medianas o más grandes */}
                                  <div className="hidden md:block">
                                    <ReservationStatusSelect
                                      value={booking.status}
                                      onChange={(status) => handleStatusChange(booking.id, status)}
                                      className="min-w-44"
                                    />
                                  </div>
                                </div>
                            
                                <div className="mt-3 rounded-lg bg-muted/45 p-2">
                                  <div className="text-foreground font-bold text-center">
                                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                  </div>
                                </div>
                            
                                <div className="grid grid-cols-1 gap-2 text-sm mt-3">
                                  <div className="flex gap-2">
                                    <div className="flex-1">
                                      <div className="font-medium text-foreground">{booking.service?.nombre || 'Service inconnu'}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {new Date(booking.booking_date).toLocaleDateString('fr-FR')} - {formatTime(booking.start_time)}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <div className="text-foreground font-medium">
                                        {booking.service?.precio ? `${booking.service.precio} CHF` : 'Prix non disponible'}
                                      </div>
                                    </div>
                                  </div>
                              
                                  <div className="mt-2 flex items-center justify-between rounded-lg bg-muted/35 p-2">
                                    <div>
                                      <div className="text-xs text-muted-foreground">Styliste:</div>
                                      <div className="font-medium text-foreground">{booking.stylist?.name || 'Styliste inconnu'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground">Centre:</div>
                                      <div className="font-medium text-foreground">{booking.location?.name || 'Centre inconnu'}</div>
                                    </div>
                                  </div>
                              
                                  {/* Desplegable visible solo en móvil */}
                                  <div className="md:hidden mt-4">
                                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                      Statut de la réservation:
                                    </label>
                                    <ReservationStatusSelect
                                      value={booking.status}
                                      onChange={(status) => handleStatusChange(booking.id, status)}
                                      className="w-full"
                                    />
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
              </AdminCardContent>
            </AdminCard>
          </div>
      </main>
    </div>
  );
} 
