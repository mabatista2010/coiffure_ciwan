'use client';

import { useState, useEffect } from 'react';
import { supabase, Booking, Location, Service, Stylist } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { FaCalendarAlt, FaMapMarkerAlt, FaChevronLeft, FaChevronRight, FaCalendarDay } from 'react-icons/fa';
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
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
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
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Panneau d&apos;Administration des Réservations</h1>
            <p className="text-gray-600">Gérez les réservations de tous les centres</p>
          </div>

          {/* Filtres */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              {!showCalendarView && (
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaCalendarAlt className="inline mr-2" /> Date
                </label>
                  <div className="flex items-center">
                    <button
                      onClick={backToCalendar}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between"
                    >
                      <span>
                        {new Date(selectedDate).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <FaCalendarAlt />
                    </button>
                  </div>
              </div>
              )}

              {/* Selector de centro */}
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaMapMarkerAlt className="inline mr-2" /> Centre
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">Tous les centres</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Botón para añadir nueva reserva */}
              <button 
                onClick={() => router.push('/admin/reservations/nueva')}
                className="w-full md:w-auto bg-primary text-secondary px-4 py-2 rounded-md font-semibold hover:bg-opacity-90 transition">
                + Nouvelle Réservation
              </button>
            </div>
          </div>

          {showCalendarView ? (
            /* Vista de Calendario */
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                <h3 className="text-xl font-semibold text-gray-800">Calendrier des Réservations</h3>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={goToToday}
                    className="px-3 py-2 rounded-md bg-primary text-secondary text-sm font-medium flex items-center justify-center mr-2 transition-all hover:shadow-md hover:bg-opacity-90 active:scale-95"
                    aria-label="Aujourd&apos;hui"
                    title="Voir les réservations d'aujourd'hui"
                  >
                    <FaCalendarDay className="mr-1" /> Aujourd&apos;hui
                  </button>
                  <button 
                    onClick={prevMonth}
                    className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    aria-label="Mois précédent"
                  >
                    <FaChevronLeft />
                  </button>
                  <span className="font-medium text-gray-700 min-w-[140px] text-center">
                    {currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button 
                    onClick={nextMonth}
                    className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    aria-label="Mois suivant"
                  >
                    <FaChevronRight />
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
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                      <div key={day} className="text-center font-medium text-gray-500 py-1 sm:py-2 text-xs sm:text-sm">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 sm:gap-2">
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
                          onClick={() => day && selectDay(day)}
                          disabled={!day}
                          className={`
                            h-10 sm:h-14 flex flex-col items-center justify-center rounded-md transition-colors text-sm sm:text-base
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
                  
                  <div className="mt-6 text-center text-sm">
                    <p className="text-gray-500 mb-2">
                      Cliquez sur une date pour voir les réservations
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
          ) : (
            /* Vista de Reservas */
            loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
              <strong className="font-bold">Erreur:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          ) : bookings.length === 0 ? (
              <div className="bg-gray-100 border border-gray-300 text-gray-700 px-6 py-10 rounded-lg">
                <div className="flex flex-col items-center">
                  <FaCalendarAlt className="text-4xl mb-4 text-gray-400" />
                  <h2 className="text-xl font-semibold mb-2 text-center">Pas de réservations pour le {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                  <p className="text-center mb-6">Il n&apos;y a pas de réservations pour cette date et ce centre.</p>
                  <button 
                    onClick={backToCalendar}
                    className="bg-primary text-secondary px-4 py-2 rounded-md font-medium hover:bg-opacity-90 transition"
                  >
                    Retour au calendrier
                  </button>
                </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-lg font-semibold">
                    Réservations pour le {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {selectedLocation !== 'all' && locations.find(loc => loc.id === selectedLocation) && ` - ${locations.find(loc => loc.id === selectedLocation)?.name}`}
                  </h2>
                  <button 
                    onClick={backToCalendar}
                    className="text-primary hover:underline mt-1 flex items-center text-sm"
                  >
                    <FaCalendarAlt className="mr-1" /> Retour au calendrier
                  </button>
                </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Heure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Styliste
                      </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Centre
                        </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.map((booking) => (
                        <tr key={booking.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{booking.customer_name}</div>
                          <div className="text-sm text-gray-500">{booking.customer_phone}</div>
                            {booking.customer_email && <div className="text-sm text-gray-500">{booking.customer_email}</div>}
                        </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{booking.service?.nombre}</div>
                            <div className="text-sm text-gray-500">{booking.service?.precio}€</div>
                        </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{booking.stylist?.name}</div>
                        </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{booking.location?.name}</div>
                          </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                            {booking.status === 'pending' && 'En attente'}
                              {booking.status === 'confirmed' && 'Confirmé'}
                              {booking.status === 'cancelled' && 'Annulé'}
                              {booking.status === 'completed' && 'Terminé'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <select
                              value={booking.status}
                              onChange={(e) => handleStatusChange(booking.id, e.target.value as 'pending' | 'confirmed' | 'cancelled' | 'completed')}
                              className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-primary focus:border-primary block p-1"
                            >
                              <option value="pending">En attente</option>
                              <option value="confirmed">Confirmer</option>
                              <option value="cancelled">Annuler</option>
                              <option value="completed">Terminer</option>
                            </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
} 