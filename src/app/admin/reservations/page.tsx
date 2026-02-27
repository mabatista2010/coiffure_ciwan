'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Booking, Location, Service, Stylist } from '@/lib/supabase';
import { FaCalendarAlt, FaCalendarDay } from 'react-icons/fa';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
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

type CalendarViewMode = "month" | "week" | "day";
type CalendarDayStatus = "empty" | "available" | "partial" | "full";
type BookingStatusFilter = Booking['status'] | 'all';

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

const WEEK_DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const BOOKING_STATUS_FILTER_VALUES: BookingStatusFilter[] = ['all', 'pending', 'confirmed', 'needs_replan', 'completed', 'cancelled'];

const BOOKING_STATUS_LABELS: Record<BookingStatusFilter, string> = {
  all: 'Tous les statuts',
  pending: 'En attente',
  confirmed: 'Confirmée',
  needs_replan: 'A replanifier',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

const WEEK_CARD_STATUS_META: Record<string, { label: string; chipClass: string; dotClass: string }> = {
  pending: {
    label: "Att.",
    chipClass: "border-amber-300 bg-amber-50 text-amber-700",
    dotClass: "bg-amber-500",
  },
  confirmed: {
    label: "Conf.",
    chipClass: "border-emerald-300 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  needs_replan: {
    label: "Replan.",
    chipClass: "border-violet-300 bg-violet-50 text-violet-700",
    dotClass: "bg-violet-500",
  },
  cancelled: {
    label: "Ann.",
    chipClass: "border-rose-300 bg-rose-50 text-rose-700",
    dotClass: "bg-rose-500",
  },
  completed: {
    label: "Term.",
    chipClass: "border-blue-300 bg-blue-50 text-blue-700",
    dotClass: "bg-blue-500",
  },
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getWeekStart = (date: Date): Date => {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const isValidStatusFilter = (value: string | null): value is BookingStatusFilter =>
  Boolean(value && BOOKING_STATUS_FILTER_VALUES.includes(value as BookingStatusFilter));

const isValidCalendarViewMode = (value: string | null): value is CalendarViewMode =>
  value === 'month' || value === 'week' || value === 'day';

export default function AdminBookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();
  const todayKey = formatDateKey(today);
  const initialStatusFilter = isValidStatusFilter(searchParams.get('status'))
    ? (searchParams.get('status') as BookingStatusFilter)
    : 'all';
  const initialViewMode = isValidCalendarViewMode(searchParams.get('view'))
    ? (searchParams.get('view') as CalendarViewMode)
    : 'month';
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<BookingStatusFilter>(initialStatusFilter);
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>(initialViewMode);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const initialDate = parseDateKey(todayKey);
    return getWeekStart(initialDate);
  });
  const [showCalendarView, setShowCalendarView] = useState<boolean>(true);
  const [calendarHighlightedDate, setCalendarHighlightedDate] = useState<string | null>(null);
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [fullyBookedDays, setFullyBookedDays] = useState<string[]>([]);
  const [partiallyBookedDays, setPartiallyBookedDays] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);
  const [loadingWeekBookings, setLoadingWeekBookings] = useState<boolean>(false);
  const [weekBookingsByDate, setWeekBookingsByDate] = useState<Record<string, BookingWithDetails[]>>({});
  const [showFiltersMobile, setShowFiltersMobile] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const nextStatus = selectedStatus === 'all' ? null : selectedStatus;
    const nextView = calendarViewMode === 'month' ? null : calendarViewMode;
    let shouldUpdate = false;

    if (nextStatus) {
      if (params.get('status') !== nextStatus) {
        params.set('status', nextStatus);
        shouldUpdate = true;
      }
    } else if (params.has('status')) {
      params.delete('status');
      shouldUpdate = true;
    }

    if (nextView) {
      if (params.get('view') !== nextView) {
        params.set('view', nextView);
        shouldUpdate = true;
      }
    } else if (params.has('view')) {
      params.delete('view');
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      const queryString = params.toString();
      router.replace(queryString ? `/admin/reservations?${queryString}` : '/admin/reservations', { scroll: false });
    }
  }, [calendarViewMode, router, searchParams, selectedStatus]);

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

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
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
  }, [selectedDate, selectedLocation, selectedStatus, selectedStylist]);

  const getVisibleDateRange = useCallback(() => {
    if (calendarViewMode === "month") {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      return {
        startDate,
        endDate,
        startKey: formatDateKey(startDate),
        endKey: formatDateKey(endDate),
      };
    }

    if (calendarViewMode === "week") {
      const startDate = new Date(currentWeekStart);
      const endDate = addDays(startDate, 6);
      return {
        startDate,
        endDate,
        startKey: formatDateKey(startDate),
        endKey: formatDateKey(endDate),
      };
    }

    const dayDate = parseDateKey(selectedDate);
    return {
      startDate: dayDate,
      endDate: dayDate,
      startKey: selectedDate,
      endKey: selectedDate,
    };
  }, [calendarViewMode, currentMonth, currentWeekStart, selectedDate]);

  const fetchCenterSchedule = useCallback(async () => {
    if (!showCalendarView) return;

    setLoadingAvailability(true);
    try {
      const { startDate, endDate } = getVisibleDateRange();
      const closed: string[] = [];

      if (selectedLocation === 'all' && selectedStylist === 'all') {
        setClosedDays([]);
        return;
      }

      let locationHours: Array<Record<string, unknown>> = [];
      if (selectedLocation !== 'all') {
        const { data: locHours, error: locError } = await supabase
          .from('location_hours')
          .select('*')
          .eq('location_id', selectedLocation);

        if (locError) throw locError;
        locationHours = locHours || [];
      }

      let stylistHours: Array<Record<string, unknown>> = [];
      if (selectedStylist !== 'all') {
        let query = supabase
          .from('working_hours')
          .select('*')
          .eq('stylist_id', selectedStylist);

        if (selectedLocation !== 'all') {
          query = query.eq('location_id', selectedLocation);
        }

        const { data: workHours, error: workError } = await query;
        if (workError) throw workError;
        stylistHours = workHours || [];
      }

      for (
        let cursor = new Date(startDate);
        cursor <= endDate;
        cursor = addDays(cursor, 1)
      ) {
        const dayOfWeek = cursor.getDay();
        const dayName = getDayName(dayOfWeek);
        let isClosed = false;

        if (selectedLocation !== 'all' && locationHours.length > 0) {
          const centerOpen = locationHours.some(hour =>
            hour.day_of_week === dayOfWeek ||
            hour.day === dayName ||
            hour.day === dayName.toLowerCase()
          );

          if (!centerOpen) {
            isClosed = true;
          }
        }

        if (selectedStylist !== 'all' && stylistHours.length > 0) {
          const stylistWorks = stylistHours.some(hour =>
            hour.day_of_week === dayOfWeek ||
            hour.day === dayName ||
            hour.day === dayName.toLowerCase()
          );

          if (!stylistWorks) {
            isClosed = true;
          }
        }

        if (isClosed) {
          closed.push(formatDateKey(cursor));
        }
      }

      setClosedDays(closed);
    } catch (error: unknown) {
      const err = error as ErrorType;
      console.error('Error al cargar el horario del centro:', err.message);
    } finally {
      setLoadingAvailability(false);
    }
  }, [getVisibleDateRange, selectedLocation, selectedStylist, showCalendarView, getDayName]);

  const fetchBookingDays = useCallback(async () => {
    if (!showCalendarView) return;

    try {
      const { startKey, endKey } = getVisibleDateRange();

      let query = supabase
        .from('bookings')
        .select('booking_date, location_id, start_time, end_time, stylist_id')
        .gte('booking_date', startKey)
        .lte('booking_date', endKey);

      if (selectedLocation !== 'all') {
        query = query.eq('location_id', selectedLocation);
      }

      if (selectedStylist !== 'all') {
        query = query.eq('stylist_id', selectedStylist);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data: bookingsRange, error } = await query;

      if (error) throw error;

      const bookingsByDate: Record<string, number> = {};
      (bookingsRange || []).forEach((booking) => {
        bookingsByDate[booking.booking_date] = (bookingsByDate[booking.booking_date] || 0) + 1;
      });

      const fullyBooked: string[] = [];
      let partiallyBooked: string[] = [];

      if (selectedLocation !== 'all') {
        let workingHoursQuery = supabase
          .from('working_hours')
          .select('*')
          .eq('location_id', selectedLocation);

        if (selectedStylist !== 'all') {
          workingHoursQuery = workingHoursQuery.eq('stylist_id', selectedStylist);
        }

        const { data: workingHours, error: workingHoursError } = await workingHoursQuery;

        if (workingHoursError) throw workingHoursError;

        for (const [dateKey, bookingsCount] of Object.entries(bookingsByDate)) {
          const dateObj = parseDateKey(dateKey);
          const dayOfWeek = dateObj.getDay();

          const hoursForDay = (workingHours || []).filter(wh =>
            wh.day_of_week === dayOfWeek || wh.day === getDayName(dayOfWeek)
          );

          if (hoursForDay.length > 0) {
            let totalWorkMinutes = 0;

            hoursForDay.forEach(wh => {
              if (wh.start_time && wh.end_time) {
                const [startHour, startMinute] = wh.start_time.split(':').map(Number);
                const [endHour, endMinute] = wh.end_time.split(':').map(Number);
                totalWorkMinutes += (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
              }
            });

            const averageServiceDuration = 30;
            const estimatedSlots = Math.floor(totalWorkMinutes / averageServiceDuration);

            if (bookingsCount >= estimatedSlots && estimatedSlots > 0) {
              fullyBooked.push(dateKey);
            } else {
              partiallyBooked.push(dateKey);
            }
          } else {
            partiallyBooked.push(dateKey);
          }
        }
      } else {
        partiallyBooked = Object.keys(bookingsByDate);
      }

      setFullyBookedDays(fullyBooked);
      setPartiallyBookedDays(partiallyBooked);
    } catch (error: unknown) {
      const err = error as ErrorType;
      console.error('Error al cargar los días con reservas:', err.message);
    }
  }, [getVisibleDateRange, selectedLocation, selectedStatus, selectedStylist, showCalendarView, getDayName]);

  const fetchWeekBookings = useCallback(async () => {
    if (!showCalendarView || calendarViewMode !== "week") {
      setWeekBookingsByDate({});
      return;
    }

    setLoadingWeekBookings(true);
    try {
      const { startKey, endKey } = getVisibleDateRange();

      let query = supabase
        .from('bookings')
        .select(`
          *,
          stylist:stylists(*),
          location:locations(*),
          service:servicios(*)
        `)
        .gte('booking_date', startKey)
        .lte('booking_date', endKey)
        .order('booking_date')
        .order('start_time');

      if (selectedLocation !== 'all') {
        query = query.eq('location_id', selectedLocation);
      }

      if (selectedStylist !== 'all') {
        query = query.eq('stylist_id', selectedStylist);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      const grouped: Record<string, BookingWithDetails[]> = {};
      (data || []).forEach((booking) => {
        const bookingWithDetails = booking as BookingWithDetails;
        if (!grouped[bookingWithDetails.booking_date]) {
          grouped[bookingWithDetails.booking_date] = [];
        }
        grouped[bookingWithDetails.booking_date].push(bookingWithDetails);
      });

      setWeekBookingsByDate(grouped);
    } catch (error: unknown) {
      const err = error as ErrorType;
      console.error('Error al cargar las reservas semanales:', err.message);
      setWeekBookingsByDate({});
    } finally {
      setLoadingWeekBookings(false);
    }
  }, [calendarViewMode, getVisibleDateRange, selectedLocation, selectedStatus, selectedStylist, showCalendarView]);

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

  useEffect(() => {
    fetchWeekBookings();
  }, [fetchWeekBookings]);

  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'needs_replan' | 'cancelled' | 'completed') => {
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
  
  const generateMonthCalendarData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    const days: Array<Date | null> = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const generateWeekCalendarData = () => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  };

  const getCalendarDayStatus = (dateKey: string): CalendarDayStatus => {
    if (closedDays.includes(dateKey) || fullyBookedDays.includes(dateKey)) {
      return "full";
    }

    if (partiallyBookedDays.includes(dateKey)) {
      return "partial";
    }

    return "available";
  };

  const getCalendarPeriodLabel = () => {
    if (calendarViewMode === "month") {
      return currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    }

    if (calendarViewMode === "week") {
      const weekEnd = addDays(currentWeekStart, 6);
      const startLabel = currentWeekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const endLabel = weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${startLabel} - ${endLabel}`;
    }

    const dayDate = parseDateKey(selectedDate);
    const monthLabelLong = dayDate.toLocaleDateString('fr-FR', { month: 'long' });
    const monthFormat = monthLabelLong.length >= 8 ? 'short' : 'long';

    return dayDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: monthFormat,
      year: 'numeric',
    });
  };

  const syncCalendarAnchorsWithDate = (dateKey: string) => {
    const targetDate = parseDateKey(dateKey);
    setCurrentMonth(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
    setCurrentWeekStart(getWeekStart(targetDate));
  };

  const setCalendarMode = (mode: CalendarViewMode) => {
    setCalendarViewMode(mode);
    syncCalendarAnchorsWithDate(selectedDate);
    if (mode === "day") {
      setCalendarHighlightedDate(selectedDate);
      setShowCalendarView(false);
      return;
    }

    setCalendarHighlightedDate(null);
    setShowCalendarView(true);
  };

  const goToPreviousPeriod = () => {
    if (calendarViewMode === "month") {
      setCurrentMonth((prevMonth) => {
        const newMonth = new Date(prevMonth);
        newMonth.setMonth(newMonth.getMonth() - 1);
        return newMonth;
      });
      return;
    }

    if (calendarViewMode === "week") {
      setCurrentWeekStart((prevWeek) => addDays(prevWeek, -7));
      return;
    }

    const previousDay = addDays(parseDateKey(selectedDate), -1);
    const previousDayKey = formatDateKey(previousDay);
    setSelectedDate(previousDayKey);
    setCalendarHighlightedDate(previousDayKey);
    syncCalendarAnchorsWithDate(previousDayKey);
  };

  const goToNextPeriod = () => {
    if (calendarViewMode === "month") {
      setCurrentMonth((prevMonth) => {
        const newMonth = new Date(prevMonth);
        newMonth.setMonth(newMonth.getMonth() + 1);
        return newMonth;
      });
      return;
    }

    if (calendarViewMode === "week") {
      setCurrentWeekStart((prevWeek) => addDays(prevWeek, 7));
      return;
    }

    const nextDay = addDays(parseDateKey(selectedDate), 1);
    const nextDayKey = formatDateKey(nextDay);
    setSelectedDate(nextDayKey);
    setCalendarHighlightedDate(nextDayKey);
    syncCalendarAnchorsWithDate(nextDayKey);
  };

  const selectDay = (date: Date | null) => {
    if (!date) return;

    const dateStr = formatDateKey(date);
    setCalendarHighlightedDate(dateStr);
    setSelectedDate(dateStr);
    syncCalendarAnchorsWithDate(dateStr);
    setShowCalendarView(false);

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

        if (selectedStatus !== 'all') {
          query = query.eq('status', selectedStatus);
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
    syncCalendarAnchorsWithDate(selectedDate);
    if (calendarViewMode === "day") {
      setCalendarViewMode("month");
    }
    setShowCalendarView(true);
  };
  
  const goToToday = () => {
    const now = new Date();
    const nowKey = formatDateKey(now);
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setCurrentWeekStart(getWeekStart(now));
    setSelectedDate(nowKey);
    setCalendarHighlightedDate(nowKey);
    setShowCalendarView(false);
  };

  const handleDateInputChange = (dateValue: string) => {
    if (!dateValue) return;

    const selected = new Date(`${dateValue}T00:00:00`);
    if (!Number.isNaN(selected.getTime())) {
      setCurrentMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
      setCurrentWeekStart(getWeekStart(selected));
    }

    setSelectedDate(dateValue);
    setCalendarHighlightedDate(dateValue);
    setCalendarViewMode("day");
    setShowCalendarView(false);
  };

  const renderCalendarDayButton = (
    date: Date | null,
    key: string,
    className: string
  ) => {
    if (!date) {
      return (
        <button
          type="button"
          key={key}
          disabled
          className={`cursor-default rounded-md border border-border/70 opacity-40 ${className}`}
          style={{
            backgroundColor: calendarDayStyles.empty.backgroundColor,
            borderColor: calendarDayStyles.empty.borderColor,
            color: calendarDayStyles.empty.textColor,
          }}
          aria-hidden="true"
        />
      );
    }

    const dateKey = formatDateKey(date);
    const todayKeyLocal = formatDateKey(new Date());
    const isToday = todayKeyLocal === dateKey;
    const isSelectedDate = calendarHighlightedDate === dateKey;
    const dayStatus = getCalendarDayStatus(dateKey);
    const dayStyle = calendarDayStyles[dayStatus];

    return (
      <button
        type="button"
        key={key}
        onClick={() => selectDay(date)}
        className={`
          flex flex-col items-center justify-center rounded-md border border-border/70 bg-card text-foreground shadow-sm transition-all hover:bg-muted/60
          ${className}
          ${isToday ? 'ring-2 ring-primary font-bold' : ''}
          ${isSelectedDate ? 'ring-2 ring-primary font-bold shadow-md' : ''}
        `}
      >
        <span className="leading-none">{date.getDate()}</span>
        <span
          className="mt-0.5 h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5"
          style={{ backgroundColor: dayStyle.dotColor }}
        />
      </button>
    );
  };

  const getWeekCardStatusMeta = (status: string) => {
    return WEEK_CARD_STATUS_META[status] || {
      label: "Info",
      chipClass: "border-border bg-muted/40 text-foreground",
      dotClass: "bg-muted-foreground",
    };
  };

  return (
    <div className="admin-scope min-h-screen bg-background px-4 py-8 text-foreground">
      <main className="mx-auto flex w-full max-w-7xl flex-col">
          <SectionHeader
            title="Gestion des Réservations"
          />

          {/* Layout principal con grid para separar filtros y contenido */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Columna izquierda: filtros + acciones */}
            <div className="order-2 space-y-4 lg:order-1 lg:col-span-1">
              <AdminCard
                className="relative z-[120] h-fit border-border/70"
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
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        Statut
                      </label>
                      <Select
                        value={selectedStatus}
                        onValueChange={(value) => setSelectedStatus(value as BookingStatusFilter)}
                      >
                        <SelectTrigger className="w-full rounded-md">
                          <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                        <SelectContent>
                          {BOOKING_STATUS_FILTER_VALUES.map((statusValue) => (
                            <SelectItem key={statusValue} value={statusValue}>
                              {BOOKING_STATUS_LABELS[statusValue]}
                            </SelectItem>
                          ))}
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

                    {(selectedLocation !== 'all' || selectedStylist !== 'all' || selectedStatus !== 'all') && (
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                          setSelectedLocation('all');
                          setSelectedStylist('all');
                          setSelectedStatus('all');
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
              className="order-1 border-border/70 lg:order-2 lg:col-span-3"
              style={{ boxShadow: "var(--admin-shadow-card)" }}
            >
              <AdminCardContent className="p-4 md:p-6">
                {/* Vista de calendario o lista de reservas */}
                {showCalendarView ? (
                  <div>
                    <div className="mb-4 flex flex-col gap-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-xl font-semibold text-foreground">
                          {selectedStylist !== 'all'
                            ? `Calendrier de ${stylists.find(s => s.id === selectedStylist)?.name || 'Styliste'}`
                            : 'Calendrier'
                          }
                        </h2>

                        <div className="inline-flex w-full rounded-xl border border-border bg-muted/35 p-1 sm:w-auto">
                          <Button
                            type="button"
                            size="sm"
                            variant={calendarViewMode === "month" ? "default" : "ghost"}
                            className="flex-1 sm:flex-none"
                            onClick={() => setCalendarMode("month")}
                          >
                            Mois
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={calendarViewMode === "week" ? "default" : "ghost"}
                            className="flex-1 sm:flex-none"
                            onClick={() => setCalendarMode("week")}
                          >
                            Semaine
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={calendarViewMode === "day" ? "default" : "ghost"}
                            className="flex-1 sm:flex-none"
                            onClick={() => setCalendarMode("day")}
                          >
                            Jour
                          </Button>
                        </div>
                      </div>

                      <div className="mx-auto mb-2 grid w-full max-w-[22rem] grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2 px-1 sm:w-fit sm:max-w-none sm:grid-cols-[2.5rem_20rem_2.5rem] sm:gap-3 sm:px-0">
                        <Button
                          onClick={goToPreviousPeriod}
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full border-border bg-background text-foreground shadow-sm hover:bg-accent"
                          aria-label="Période précédente"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="w-full truncate text-center text-lg font-medium text-foreground capitalize sm:text-2xl">
                          {getCalendarPeriodLabel()}
                        </span>
                        <Button
                          onClick={goToNextPeriod}
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full border-border bg-background text-foreground shadow-sm hover:bg-accent"
                          aria-label="Période suivante"
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

                      {calendarViewMode !== "day" && (
                        <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
                          {WEEK_DAY_LABELS.map((dayLabel) => (
                            <div
                              key={dayLabel}
                              className="py-2 text-center text-xs font-medium text-muted-foreground sm:text-sm"
                            >
                              {dayLabel}
                            </div>
                          ))}
                        </div>
                      )}

                      {calendarViewMode === "month" && (
                        <div className="grid grid-cols-7 gap-1 sm:gap-2">
                          {generateMonthCalendarData().map((dayDate, index) =>
                            renderCalendarDayButton(dayDate, `month-${index}`, "h-10 text-xs sm:h-12 sm:text-sm")
                          )}
                        </div>
                      )}

                      {calendarViewMode === "week" && (
                        <div className="space-y-3">
                          {loadingWeekBookings && (
                            <div className="flex items-center justify-center rounded-lg border border-border/70 bg-muted/30 py-3 text-sm text-muted-foreground">
                              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                              Chargement des réservations de la semaine...
                            </div>
                          )}

                          <div className="pb-2">
                            <div className="grid grid-cols-7 gap-2 md:gap-2.5">
                              {generateWeekCalendarData().map((dayDate, dayIndex) => {
                                const dateKey = formatDateKey(dayDate);
                                const dayStatus = getCalendarDayStatus(dateKey);
                                const dayStyle = calendarDayStyles[dayStatus];
                                const dayBookings = weekBookingsByDate[dateKey] || [];

                                return (
                                  <div
                                    key={`week-column-${dateKey}`}
                                    className="min-w-0 rounded-xl border border-border/70 bg-card p-2 md:p-2.5 shadow-[var(--admin-shadow-soft)]"
                                  >
                                    <div className="border-b border-border/60 pb-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:text-xs">
                                            {WEEK_DAY_LABELS[dayIndex]}
                                          </p>
                                          <p className="truncate text-xs font-semibold text-foreground capitalize md:text-sm">
                                            {dayDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                          </p>
                                        </div>
                                        <span
                                          className="inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium md:px-2"
                                          style={{ borderColor: dayStyle.borderColor, color: dayStyle.textColor }}
                                        >
                                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dayStyle.dotColor }} />
                                          <span className="hidden md:inline">{dayBookings.length} RDV</span>
                                          <span className="md:hidden">{dayBookings.length}</span>
                                        </span>
                                      </div>
                                    </div>

                                    <div className="mt-2.5 max-h-[300px] space-y-1.5 overflow-x-hidden overflow-y-auto pr-0.5" style={{ touchAction: 'pan-y' }}>
                                      {dayBookings.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-2 py-2 text-center text-[11px] text-muted-foreground">
                                          Aucune réservation
                                        </div>
                                      ) : (
                                        dayBookings.map((booking) => {
                                          const statusMeta = getWeekCardStatusMeta(booking.status);
                                          return (
                                            <button
                                              key={booking.id}
                                              type="button"
                                              onClick={() => selectDay(dayDate)}
                                              className="w-full min-w-0 rounded-md border border-border/70 bg-background p-1.5 text-left transition-colors hover:bg-muted/40"
                                              title="Voir le détail du jour"
                                            >
                                              <div className="flex items-center gap-1.5">
                                                <p className="text-xs font-semibold tabular-nums text-foreground md:text-sm">
                                                  {formatTime(booking.start_time)}
                                                </p>
                                              </div>
                                              <p className="mt-1 truncate text-[11px] font-medium leading-tight text-foreground md:text-xs">
                                                {booking.customer_name}
                                              </p>
                                              <p className="truncate text-[10px] leading-tight text-muted-foreground">
                                                {booking.service?.nombre || 'Service'}
                                              </p>
                                              <div className="mt-1 flex justify-center">
                                                <span
                                                  className={`inline-flex max-w-full items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${statusMeta.chipClass}`}
                                                >
                                                  <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                                                  {statusMeta.label}
                                                </span>
                                              </div>
                                            </button>
                                          );
                                        })
                                      )}
                                    </div>

                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="mt-2.5 h-8 w-full px-2 text-xs"
                                      onClick={() => selectDay(dayDate)}
                                    >
                                      Voir le jour
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {calendarViewMode === "day" && (
                        <div className="mx-auto max-w-sm">
                          <p className="mb-2 text-center text-sm text-muted-foreground">
                            {parseDateKey(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long' })}
                          </p>
                          {renderCalendarDayButton(
                            parseDateKey(selectedDate),
                            `day-${selectedDate}`,
                            "h-20 w-full text-base sm:h-24"
                          )}
                        </div>
                      )}

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
                    {calendarViewMode === "day" ? (
                      <div className="mb-4 flex flex-col gap-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <h2 className="text-xl font-semibold text-foreground">
                            {selectedStylist !== 'all'
                              ? `Calendrier de ${stylists.find(s => s.id === selectedStylist)?.name || 'Styliste'}`
                              : 'Calendrier'
                            }
                          </h2>

                          <div className="inline-flex w-full rounded-xl border border-border bg-muted/35 p-1 sm:w-auto">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="flex-1 sm:flex-none"
                              onClick={() => setCalendarMode("month")}
                            >
                              Mois
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="flex-1 sm:flex-none"
                              onClick={() => setCalendarMode("week")}
                            >
                              Semaine
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              className="flex-1 sm:flex-none"
                              onClick={() => setCalendarMode("day")}
                            >
                              Jour
                            </Button>
                          </div>
                        </div>

                        <div className="mx-auto mb-2 grid w-full max-w-[22rem] grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2 px-1 sm:w-fit sm:max-w-none sm:grid-cols-[2.5rem_20rem_2.5rem] sm:gap-3 sm:px-0">
                          <Button
                            onClick={goToPreviousPeriod}
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-full border-border bg-background text-foreground shadow-sm hover:bg-accent"
                            aria-label="Jour précédent"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="w-full truncate text-center text-lg font-medium text-foreground capitalize sm:text-2xl">
                            {getCalendarPeriodLabel()}
                          </span>
                          <Button
                            onClick={goToNextPeriod}
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-full border-border bg-background text-foreground shadow-sm hover:bg-accent"
                            aria-label="Jour suivant"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <h2 className="mb-4 text-xl font-semibold text-foreground">
                        Réservations pour le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(selectedDate))}
                      </h2>
                    )}
                  
                    {/* Lista de reservas para el día seleccionado */}
                    <div>
                      {/* Encabezado con fecha y botones */}
                      {calendarViewMode !== "day" && (
                        <div className="flex flex-col items-center justify-between gap-3 rounded-t-lg border border-border bg-muted/35 p-4 sm:flex-row">
                          <div className="mb-3 flex items-center sm:mb-0">
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
                      )}
                      
                      {/* Contenido de reservas */}
                      <div className={`${calendarViewMode === "day" ? 'rounded-lg border border-border' : 'rounded-b-lg border-x border-b'} border-border bg-card p-4`}>
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
                            {selectedStatus === 'all'
                              ? 'Aucune réservation pour cette date'
                              : `Aucune réservation (${BOOKING_STATUS_LABELS[selectedStatus].toLowerCase()}) pour cette date`}
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
