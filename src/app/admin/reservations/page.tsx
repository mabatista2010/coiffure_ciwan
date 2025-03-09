'use client';

import { useState, useEffect } from 'react';
import { supabase, Booking, Location, Service, Stylist } from '@/lib/supabase';
import AdminNav from '@/components/AdminNav';
import { FaCalendarAlt, FaCalendarDay } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

type BookingWithDetails = Booking & {
  stylist?: Stylist;
  location?: Location;
  service?: Service;
};

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
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

  useEffect(() => {
    // Cargar centros al inicio
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('active', true)
          .order('name');

        if (error) {
          throw error;
        }

        setLocations(data || []);
      } catch (err: Error | unknown) {
        console.error('Erreur lors du chargement des centres:', err);
      }
    };

    fetchLocations();
  }, []);

  useEffect(() => {
    // Cargar reservas cuando cambie la fecha o el centro seleccionado
    const fetchBookings = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('bookings')
          .select(`
            *,
            stylist:stylist_id(*),
            location:location_id(*),
            service:service_id(*)
          `)
          .eq('booking_date', selectedDate);

        // Filtrar por centro si se ha seleccionado uno
        if (selectedLocation !== 'all') {
          query = query.eq('location_id', selectedLocation);
        }

        const { data, error: fetchError } = await query.order('start_time');

        if (fetchError) {
          throw fetchError;
        }

        // Procesar datos para un formato más fácil de usar
        const processedBookings: BookingWithDetails[] = data?.map(booking => ({
          ...booking,
          stylist: booking.stylist,
          location: booking.location,
          service: booking.service,
        })) || [];

        setBookings(processedBookings);
        
        // Una vez que tenemos las reservas, mostramos la vista de detalles
        setShowCalendarView(false);
      } catch (err: Error | unknown) {
        console.error('Erreur lors du chargement des réservations:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des réservations');
      } finally {
        setLoading(false);
      }
    };

    // Solo cargar las reservas si no estamos en vista de calendario
    if (!showCalendarView) {
    fetchBookings();
    }
  }, [selectedDate, selectedLocation, showCalendarView]);

  useEffect(() => {
    const fetchCenterSchedule = async () => {
      if (!showCalendarView) return;
      
      try {
        // Determinar el primer y último día del mes actual
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        // Obtener todos los días del mes
        const daysInMonth = getDaysInMonth(year, month);
        const closed: string[] = [];
        
        // Si tenemos un centro específico seleccionado, verificar los días cerrados
        if (selectedLocation !== 'all') {
          // Obtener los horarios del centro seleccionado
          const { data: locationHours, error } = await supabase
            .from('location_hours')
            .select('*')
            .eq('location_id', selectedLocation);
          
          if (error) throw error;
          
          // Verificar cada día del mes si está cerrado
          for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay(); // 0 es domingo, 6 es sábado
            
            // No necesitamos ajustar el día de la semana, ya que en la base de datos
            // también se almacena como 0 = domingo, 1 = lunes, ..., 6 = sábado
            // Verificar si hay horario para este día de la semana
            const hasHoursForDay = locationHours.some(hour => hour.day_of_week === dayOfWeek);
            
            if (!hasHoursForDay) {
              // Si no hay horario, el centro está cerrado este día
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              closed.push(dateStr);
            }
          }
        }
        
        setClosedDays(closed);
      } catch (err) {
        console.error('Erreur lors du chargement des jours fermés:', err);
      }
    };
    
    if (showCalendarView) {
      fetchCenterSchedule();
    }
  }, [currentMonth, selectedLocation, showCalendarView]);

  useEffect(() => {
    const fetchBookingDays = async () => {
      if (!showCalendarView) return;
      
      setLoadingAvailability(true);
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
        
        const { data: bookings, error } = await query;
        
        if (error) throw error;
        
        // Agrupar las reservas por fecha
        const bookingsByDate: Record<string, {
          booking_date: string;
          location_id: string;
          start_time: string;
          end_time: string;
          stylist_id: string;
        }[]> = {};
        bookings.forEach(booking => {
          if (!bookingsByDate[booking.booking_date]) {
            bookingsByDate[booking.booking_date] = [];
          }
          bookingsByDate[booking.booking_date].push(booking);
        });
        
        // Para determinar si un día está completamente reservado, necesitamos información adicional
        const fullyBooked: string[] = [];
        let partiallyBooked: string[] = [];
        
        if (selectedLocation !== 'all') {
          // Obtener estilistas y sus horarios para el centro seleccionado
          const { data: workingHours, error: workingHoursError } = await supabase
            .from('working_hours')
            .select('*')
            .eq('location_id', selectedLocation);
          
          if (workingHoursError) throw workingHoursError;
          
          // Para cada día con reservas, verificar si todos los slots están ocupados
          for (const [date, dateBookings] of Object.entries(bookingsByDate)) {
            const dateObj = new Date(date);
            const dayOfWeek = dateObj.getDay(); // Usar directamente getDay() sin ajustar (0 = domingo, 1 = lunes, etc.)
            
            // Obtener horas de trabajo para este día
            const hoursForDay = workingHours.filter(wh => wh.day_of_week === dayOfWeek);
            
            if (hoursForDay.length > 0) {
              // Obtener estilistas únicos que trabajan este día
              // const stylistsWorking = [...new Set(hoursForDay.map(wh => wh.stylist_id))];
              
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
        } else {
          // Si no hay centro seleccionado, simplemente consideramos todos los días con reservas como parcialmente ocupados
          partiallyBooked = Object.keys(bookingsByDate);
        }
        
        setFullyBookedDays(fullyBooked);
        setPartiallyBookedDays(partiallyBooked);
        setDaysWithBookings(Object.keys(bookingsByDate));
      } catch (err) {
        console.error('Erreur lors du chargement des disponibilités:', err);
      } finally {
        setLoadingAvailability(false);
      }
    };
    
    if (showCalendarView) {
      fetchBookingDays();
    }
  }, [currentMonth, selectedLocation, showCalendarView]);

  // Manejar cambio de estado de una reserva
  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) {
        throw error;
      }

      // Actualizar estado local
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus } 
            : booking
        )
      );
    } catch (err: Error | unknown) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      alert('Erreur lors de la mise à jour du statut de la réservation');
    }
  };

  // Formatear hora para mostrar
  const formatTime = (time: string) => {
    return time;
  };

  // Obtener color según estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-primary bg-opacity-20 text-light border-primary border-opacity-40';
      case 'confirmed':
        return 'bg-primary bg-opacity-30 text-light border-primary border-opacity-50';
      case 'cancelled':
        return 'bg-coral bg-opacity-20 text-coral border-coral border-opacity-40';
      case 'completed':
        return 'bg-secondary bg-opacity-30 text-light border-secondary border-opacity-50';
      default:
        return 'bg-secondary bg-opacity-20 text-light border-secondary border-opacity-40';
    }
  };

  // Funciones para el calendario
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Función que determina el primer día del mes
  const getFirstDayOfMonth = (year: number, month: number) => {
    // En JavaScript, getDay() devuelve 0 para domingo, 1 para lunes, etc.
    // Como nuestro calendario comienza en lunes, necesitamos ajustar:
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convertir el domingo (0) a 6, y restar 1 al resto
  };

  // Generar datos para el calendario
  const generateCalendarData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const calendarDays = [];
    
    // Añadir días vacíos para alinear con el día de la semana
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }
    
    // Añadir días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(i);
    }
    
    return calendarDays;
  };

  // Cambiar al mes anterior
  const prevMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  // Cambiar al mes siguiente
  const nextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // Seleccionar día y ver reservas
  const selectDay = (day: number | null) => {
    if (!day) return;
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    setSelectedDate(dateStr);
    setShowCalendarView(false);
  };

  // Volver al calendario
  const backToCalendar = () => {
    setShowCalendarView(true);
  };

  // Añadir una función para ir al día actual
  const goToToday = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Actualizar el mes en el calendario para que coincida con el mes actual
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    
    // Seleccionar la fecha actual y mostrar las reservas
    setSelectedDate(todayStr);
    setShowCalendarView(false);
  };

  // Añadir un log para depuración
  useEffect(() => {
    console.log("Días cerrados:", closedDays);
    console.log("Días parcialmente ocupados:", partiallyBookedDays);
    console.log("Días completamente ocupados:", fullyBookedDays);
  }, [closedDays, partiallyBookedDays, fullyBookedDays]);

  return (
    <div className="min-h-screen flex flex-col bg-dark">
      <AdminNav />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-primary">Gestion des Réservations</h1>
        
        {/* Contenido principal */}
        <div className="bg-secondary rounded-lg shadow-lg p-4 md:p-6">
          {/* Filtros */}
          <div className="bg-dark rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div>
                  <label htmlFor="location-select" className="block text-sm font-medium text-light mb-1">
                    Centre
                  </label>
                  <select
                    id="location-select"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-dark text-light"
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
                  <label htmlFor="date-select" className="block text-sm font-medium text-light mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    id="date-select"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-primary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-dark text-light"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={backToCalendar}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-secondary bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <FaCalendarAlt className="mr-2" />
                  Calendrier
                </button>
                
                <button
                  onClick={goToToday}
                  className="inline-flex items-center px-4 py-2 border border-primary text-sm font-medium rounded-md shadow-sm text-light bg-dark hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <FaCalendarDay className="mr-2" />
                  Aujourd&apos;hui
                </button>
                
                <button
                  onClick={() => router.push('/admin/reservations/nueva')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-coral hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coral"
                >
                  + Nouvelle Réservation
                </button>
              </div>
            </div>
          </div>

          {/* Vista de calendario o lista de reservas */}
          {showCalendarView ? (
            <div className="bg-dark rounded-lg shadow-md p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-primary">Calendrier</h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={prevMonth}
                    className="p-2 rounded-md bg-secondary hover:bg-opacity-80 flex items-center justify-center text-light"
                    aria-label="Mois précédent"
                  >
                    &larr;
                  </button>
                  <span className="font-medium text-light min-w-[140px] text-center">
                    {currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button 
                    onClick={nextMonth}
                    className="p-2 rounded-md bg-secondary hover:bg-opacity-80 flex items-center justify-center text-light"
                    aria-label="Mois suivant"
                  >
                    &rarr;
                  </button>
                </div>
              </div>
              
              <div className="relative">
                {loadingAvailability && (
                  <div className="absolute inset-0 bg-dark bg-opacity-70 z-10 flex items-center justify-center rounded">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                  </div>
                )}
              
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                    <div key={day} className="text-center font-medium text-light py-2 text-xs sm:text-sm">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {generateCalendarData().map((day, index) => {
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
                        onClick={() => day && selectDay(day)}
                        disabled={!day}
                        className={`
                          h-10 sm:h-12 flex flex-col items-center justify-center rounded-md transition-colors text-xs sm:text-sm
                          ${!day ? 'bg-transparent' : `${bgColor} ${hoverColor} cursor-pointer ${textColor}`}
                          ${isToday ? 'ring-2 ring-primary ring-opacity-70' : ''}
                          ${day && selectedDate === dateStr ? 'ring-2 ring-primary ring-opacity-100 font-bold' : ''}
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
              
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin-custom rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="bg-coral bg-opacity-20 border border-coral text-white px-4 py-3 rounded relative" role="alert">
                  <strong className="font-bold">Erreur!</strong>
                  <span className="block sm:inline"> {error}</span>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12 bg-dark rounded-lg">
                  <p className="text-light text-lg">Aucune réservation trouvée pour cette date</p>
                </div>
              ) : (
                <div>
                  {/* Vista de escritorio */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-dark">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                            Horaire
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                            Client
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                            Service
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                            Styliste
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                            Centre
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary uppercase tracking-wider">
                            Statut
                          </th>
                          <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-dark divide-y divide-gray-700">
                        {bookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-secondary hover:bg-opacity-20 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-light font-bold text-primary">
                                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-light">{booking.customer_name}</div>
                              <div className="text-sm text-light opacity-70">{booking.customer_phone}</div>
                              {booking.customer_email && <div className="text-sm text-light opacity-70">{booking.customer_email}</div>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-light">{booking.service?.nombre || 'Service inconnu'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-light">{booking.stylist?.name || 'Styliste inconnu'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-light">{booking.location?.name || 'Centre inconnu'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={booking.status}
                                onChange={(e) => handleStatusChange(booking.id, e.target.value as 'pending' | 'confirmed' | 'cancelled' | 'completed')}
                                className={`text-sm rounded-full px-3 py-1 font-medium ${getStatusColor(booking.status)}`}
                              >
                                <option value="pending">En attente</option>
                                <option value="confirmed">Confirmé</option>
                                <option value="completed">Terminé</option>
                                <option value="cancelled">Annulé</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                className="text-primary hover:opacity-80 mr-4 transition-opacity duration-200"
                                onClick={() => {
                                  // Implementar edición
                                  console.log('Editar reserva', booking.id);
                                }}
                              >
                                Modifier
                              </button>
                              <button
                                className="text-coral hover:opacity-80 transition-opacity duration-200"
                                onClick={() => handleStatusChange(booking.id, 'cancelled')}
                              >
                                Annuler
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Vista móvil para reservas */}
                  <div className="md:hidden mt-4 space-y-4">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="bg-secondary rounded-lg shadow-md p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-light">{booking.customer_name}</div>
                            <div className="text-sm text-light opacity-70">{booking.customer_phone}</div>
                            {booking.customer_email && <div className="text-sm text-light opacity-70">{booking.customer_email}</div>}
                          </div>
                          <select
                            value={booking.status}
                            onChange={(e) => handleStatusChange(booking.id, e.target.value as 'pending' | 'confirmed' | 'cancelled' | 'completed')}
                            className={`text-sm rounded-full px-3 py-1 font-medium ${getStatusColor(booking.status)}`}
                          >
                            <option value="pending">En attente</option>
                            <option value="confirmed">Confirmé</option>
                            <option value="completed">Terminé</option>
                            <option value="cancelled">Annulé</option>
                          </select>
                        </div>
                        
                        <div className="mt-3 p-2 bg-dark bg-opacity-30 rounded-lg">
                          <div className="text-primary font-bold text-center">
                            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                          <div>
                            <span className="text-light opacity-70">Service:</span>
                            <div className="text-light">{booking.service?.nombre || 'Service inconnu'}</div>
                          </div>
                          <div>
                            <span className="text-light opacity-70">Styliste:</span>
                            <div className="text-light">{booking.stylist?.name || 'Styliste inconnu'}</div>
                          </div>
                          <div>
                            <span className="text-light opacity-70">Centre:</span>
                            <div className="text-light">{booking.location?.name || 'Centre inconnu'}</div>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex justify-end space-x-3">
                          <button
                            className="text-primary hover:opacity-80 text-sm font-medium transition-opacity duration-200"
                            onClick={() => {
                              // Implementar edición
                              console.log('Editar reserva', booking.id);
                            }}
                          >
                            Modifier
                          </button>
                          <button
                            className="text-coral hover:opacity-80 text-sm font-medium transition-opacity duration-200"
                            onClick={() => handleStatusChange(booking.id, 'cancelled')}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 