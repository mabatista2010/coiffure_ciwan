'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Service, Location, Stylist, AvailabilitySlot } from '@/lib/supabase';
import { FaCalendarAlt, FaSpinner, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface DateTimeSelectProps {
  selectedService: Service;
  selectedLocation: Location;
  selectedStylist: Stylist;
  onDateTimeSelect: (date: string, time: string) => void;
  onBack: () => void;
}

export default function DateTimeSelect({
  selectedService,
  selectedLocation,
  selectedStylist,
  onDateTimeSelect,
  onBack
}: DateTimeSelectProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');

  // Generar fechas disponibles según la vista actual
  useEffect(() => {
    const dates = [];
    const startDate = new Date(currentWeekStart);
    
    // Determinar cuántas fechas generar según la vista
    const daysToGenerate = calendarView === 'week' ? 7 : 28;
    
    for (let i = 0; i < daysToGenerate; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      // Excluir domingos (0)
      if (date.getDay() !== 0) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }
    setAvailableDates(dates);
    
    // Si la fecha seleccionada ya no está en el rango, seleccionar la primera fecha
    if (dates.length > 0 && (!selectedDate || !dates.includes(selectedDate))) {
      setSelectedDate(dates[0]);
    }
  }, [currentWeekStart, calendarView, selectedDate]);

  // Funciones de navegación del calendario
  const goToPreviousPeriod = () => {
    const newStart = new Date(currentWeekStart);
    if (calendarView === 'week') {
      newStart.setDate(newStart.getDate() - 7);
    } else {
      newStart.setDate(newStart.getDate() - 28);
    }
    setCurrentWeekStart(newStart);
  };

  const goToNextPeriod = () => {
    const newStart = new Date(currentWeekStart);
    if (calendarView === 'week') {
      newStart.setDate(newStart.getDate() + 7);
    } else {
      newStart.setDate(newStart.getDate() + 28);
    }
    setCurrentWeekStart(newStart);
  };

  const toggleCalendarView = () => {
    setCalendarView(prevView => prevView === 'week' ? 'month' : 'week');
  };

  // Limitar navegación al pasado (no permitir fechas anteriores a hoy)
  const isPreviousDisabled = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return currentWeekStart <= today;
  };

  // Limitar navegación al futuro (máximo 3 meses)
  const isNextDisabled = () => {
    const today = new Date();
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(today.getMonth() + 3);
    
    return currentWeekStart >= threeMonthsLater;
  };

  // Cargar slots disponibles cuando se selecciona una fecha
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchAvailableSlots() {
      setLoading(true);
      setError(null);
      try {
        // Llamada a la API para obtener slots disponibles
        const response = await fetch(`/api/reservation/availability?date=${selectedDate}&stylistId=${selectedStylist.id}&locationId=${selectedLocation.id}&serviceId=${selectedService.id}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar horarios disponibles');
        }

        const data = await response.json();
        setAvailableSlots(data.availableSlots);
      } catch (err: Error | unknown) {
        setError(err instanceof Error ? err.message : String(err));
        console.error('Error cargando slots disponibles:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAvailableSlots();
  }, [selectedDate, selectedStylist.id, selectedLocation.id, selectedService.id]);

  // Formatear fecha para mostrar
  const formatDate = (dateString: string): string => {
    try {
      // Asegurarse de que la cadena de fecha no sea vacía
      if (!dateString || dateString.trim() === '') {
        return 'Fecha no seleccionada';
      }
      
      // Si la fecha está en formato ISO (YYYY-MM-DD), convertirla a objeto Date
      // Importante: añadir el tiempo para evitar problemas de zona horaria
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Meses en JS son 0-11
        const day = parseInt(parts[2], 10);
        
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          const date = new Date(year, month, day, 12, 0, 0); // Añadir mediodía para evitar problemas de zona horaria
          
          return new Intl.DateTimeFormat('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long', 
            day: 'numeric'
          }).format(date);
        }
      }
      
      // Si no está en formato ISO o si hay algún error, intentamos el método estándar
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      
      return new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Error al formatear la fecha:', error);
      return 'Error al formatear fecha';
    }
  };

  // Formatear hora para mostrar
  const formatTime = (timeString: string): string => {
    return timeString;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-secondary">
          Sélection de Date et Heure
        </h2>
        <p className="text-lg text-text-medium">
          Choisissez quand vous souhaitez réserver votre {selectedService.nombre} avec {selectedStylist.name} à {selectedLocation.name}
        </p>
      </motion.div>

      <div className="mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-accent hover:underline"
        >
          &larr; Retour à la sélection du styliste
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Selector de fechas */}
        <div className="w-full md:w-1/3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2 text-secondary">
              <FaCalendarAlt /> Sélectionnez une date
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousPeriod}
                disabled={isPreviousDisabled()}
                className={`p-2 rounded ${
                  isPreviousDisabled()
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-primary hover:bg-gray-100'
                }`}
                aria-label="Période précédente"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={toggleCalendarView}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                {calendarView === 'week' ? 'Vue mois' : 'Vue semaine'}
              </button>
              <button
                onClick={goToNextPeriod}
                disabled={isNextDisabled()}
                className={`p-2 rounded ${
                  isNextDisabled()
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-primary hover:bg-gray-100'
                }`}
                aria-label="Période suivante"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {availableDates.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    selectedDate === date
                      ? 'bg-primary text-secondary'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {new Date(date).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selector de horas */}
        <div className="w-full md:w-2/3">
          <h3 className="text-xl font-semibold mb-4 text-secondary">
            Horaires disponibles pour {formatDate(selectedDate)}
          </h3>
          <div className="bg-white rounded-lg shadow-md p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <FaSpinner className="animate-spin text-primary text-3xl" />
              </div>
            ) : error ? (
              <p className="text-center text-red-500 py-4">
                {error}
              </p>
            ) : availableSlots.length === 0 ? (
              <p className="text-center py-4 text-gray-600">
                Il n&apos;y a pas d&apos;horaires disponibles pour cette date. Veuillez sélectionner une autre date.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    disabled={!slot.available}
                    onClick={() => slot.available && onDateTimeSelect(selectedDate, slot.time)}
                    className={`py-2 px-3 rounded text-center transition-colors ${
                      slot.available
                        ? 'bg-gray-100 hover:bg-primary hover:text-secondary text-gray-800'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {formatTime(slot.time)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 