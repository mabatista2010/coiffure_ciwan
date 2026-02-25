'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { FaCalendarCheck, FaEuroSign, FaUserTie, FaCut, FaChartLine, FaCalendarAlt } from 'react-icons/fa';

// Función para manejar URLs de imágenes
const getImageUrl = (path: string | null): string => {
  if (!path) return 'https://placehold.co/640x360/212121/FFD700.png?text=Centre'; // Imagen por defecto en línea
  
  if (path.startsWith('http')) {
    // Ya es una URL completa
    return path;
  } else if (path.includes('storage/v1/object')) {
    // Es una URL de Supabase pero sin el dominio
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/${path}`;
  } else {
    // Construir URL de Supabase Storage para esta imagen
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    
    // Si la ruta comienza con 'locations/' o 'centros/' es un bucket de storage
    if (path.startsWith('locations/') || path.startsWith('centros/')) {
      return `${supabaseUrl}/storage/v1/object/public/${path}`;
    }
    
    // De lo contrario, tratar como ruta local
    return path.startsWith('/') ? path : `/${path}`;
  }
};

// Función para formatear el mes/año en formato legible
const formatMonthYear = (monthYearStr: string): string => {
  const [month, year] = monthYearStr.split('/');
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
};

// Función para obtener solo el nombre del mes
const getMonthName = (monthYearStr: string): string => {
  const month = monthYearStr.split('/')[0];
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return monthNames[parseInt(month) - 1];
};

// Tipos para los datos
interface Location {
  id: string;
  name: string;
  image: string | null;
}

interface StylistCount {
  stylist_name: string;
  count: number;
}

interface ServiceCount {
  service_name: string;
  count: number;
}

interface LocationStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  topStylists: StylistCount[];
  topServices: ServiceCount[];
  bookingsByMonth: { month: string; count: number }[];
  averageBookingsPerDay: number;
  busyDays: { day: string; count: number }[];
}

// Función para obtener el nombre del día de la semana en francés
const getDayName = (dayIndex: number): string => {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days[dayIndex];
};

interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export default function LocationStatsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedLocationData, setSelectedLocationData] = useState<Location | null>(null);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRangeType, setDateRangeType] = useState<'semana' | 'semana_anterior' | 'mes' | 'mes_anterior' | 'año' | 'año_anterior' | 'personalizado'>('mes');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(),
    endDate: new Date(),
    label: 'Mois actuel'
  });
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Cargar la lista de centros
  useEffect(() => {
    async function loadLocations() {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('id, name, image')
          .eq('active', true)
          .order('name');

        if (error) throw error;
        
        // Log para debugging
        if (data && data.length > 0) {
          console.log('Centro seleccionado:', data[0]);
          console.log('URL de la imagen:', data[0].image);
        }
        
        setLocations(data || []);
        if (data && data.length > 0) {
          setSelectedLocation(data[0].id);
        }
      } catch (err) {
        console.error('Error al cargar centros:', err);
        setError('Error al cargar la lista de centros');
      } finally {
        setLoading(false);
      }
    }

    loadLocations();
  }, []);

  // Actualizar el centro seleccionado cuando cambia el ID
  useEffect(() => {
    if (selectedLocation && locations.length > 0) {
      const locationData = locations.find(l => l.id === selectedLocation);
      setSelectedLocationData(locationData || null);
      
      // Log para debugging
      if (locationData) {
        console.log('Centro seleccionado actualizado:', locationData);
        console.log('URL de la imagen a mostrar:', getImageUrl(locationData.image));
      }
    } else {
      setSelectedLocationData(null);
    }
  }, [selectedLocation, locations]);

  // Cargar estadísticas cuando se selecciona un centro
  useEffect(() => {
    if (!selectedLocation) return;

    async function loadLocationStats() {
      setLoading(true);
      try {
        // 1. Total de reservas y conteo por estado dentro del rango de fechas
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, status, service_id, booking_date')
          .eq('location_id', selectedLocation)
          .gte('booking_date', dateRange.startDate.toISOString())
          .lte('booking_date', dateRange.endDate.toISOString());

        if (bookingsError) throw bookingsError;

        // 2. Obtener servicios para calcular ingresos
        const { data: servicesData, error: servicesError } = await supabase
          .from('servicios')
          .select('id, nombre, precio');

        if (servicesError) throw servicesError;

        // 3. Obtener reservas con detalles de servicio y estilista dentro del rango de fechas
        const { data: bookingsWithDetails, error: bookingsWithDetailsError } = await supabase
          .from('bookings')
          .select(`
            id, 
            status,
            service_id,
            servicios:service_id (nombre),
            stylist_id,
            stylists:stylist_id (name),
            booking_date
          `)
          .eq('location_id', selectedLocation)
          .gte('booking_date', dateRange.startDate.toISOString())
          .lte('booking_date', dateRange.endDate.toISOString());

        if (bookingsWithDetailsError) throw bookingsWithDetailsError;

        // Calcular estadísticas
        const totalBookings = bookingsData?.length || 0;
        const completedBookings = bookingsData?.filter(b => b.status === 'completed').length || 0;
        const cancelledBookings = bookingsData?.filter(b => b.status === 'cancelled').length || 0;
        const pendingBookings = bookingsData?.filter(b => b.status === 'pending').length || 0;
        const confirmedBookings = bookingsData?.filter(b => b.status === 'confirmed').length || 0;

        // Calcular ingresos (solo de reservas completadas)
        let totalRevenue = 0;
        const completedBookingsWithDetails = bookingsWithDetails?.filter(b => b.status === 'completed') || [];
        
        completedBookingsWithDetails.forEach(booking => {
          const service = servicesData?.find(s => s.id === booking.service_id);
          if (service) {
            totalRevenue += service.precio;
          }
        });

        // Calcular estilistas más activos
        const stylistCountMap: Record<string, number> = {};
        bookingsWithDetails?.forEach(booking => {
          if (booking.stylists && typeof booking.stylists === 'object' && 'name' in booking.stylists) {
            const stylistName = booking.stylists.name as string;
            stylistCountMap[stylistName] = (stylistCountMap[stylistName] || 0) + 1;
          }
        });

        const topStylists = Object.entries(stylistCountMap)
          .map(([stylist_name, count]) => ({ stylist_name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Calcular servicios más populares
        const serviceCountMap: Record<string, number> = {};
        bookingsWithDetails?.forEach(booking => {
          if (booking.servicios && typeof booking.servicios === 'object' && 'nombre' in booking.servicios) {
            const serviceName = booking.servicios.nombre as string;
            serviceCountMap[serviceName] = (serviceCountMap[serviceName] || 0) + 1;
          }
        });

        const topServices = Object.entries(serviceCountMap)
          .map(([service_name, count]) => ({ service_name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Calcular reservas por mes para el período seleccionado
        const monthsMap: Record<string, number> = {};
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        
        // Inicializar todos los meses en el rango
        let year = startDate.getFullYear();
        let month = startDate.getMonth();
        
        while (new Date(year, month, 1) <= endDate) {
          const monthYear = `${month + 1}/${year}`;
          monthsMap[monthYear] = 0;
          
          // Avanzar al siguiente mes
          month++;
          if (month === 12) {
            month = 0;
            year++;
          }
        }
        
        bookingsWithDetails?.forEach(booking => {
          if (booking.booking_date) {
            const date = new Date(booking.booking_date);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
            if (monthsMap[monthYear] !== undefined) {
              monthsMap[monthYear] = (monthsMap[monthYear] || 0) + 1;
            }
          }
        });
        
        const bookingsByMonth = Object.entries(monthsMap)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => {
            const [aMonth, aYear] = a.month.split('/').map(Number);
            const [bMonth, bYear] = b.month.split('/').map(Number);
            return (aYear * 12 + aMonth) - (bYear * 12 + bMonth); // Orden cronológico ascendente
          });

        // Calcular promedio de reservas por día
        const uniqueDays = new Set(bookingsData?.map(b => b.booking_date) || []);
        const averageBookingsPerDay = uniqueDays.size > 0 ? totalBookings / uniqueDays.size : 0;

        // Calcular días más ocupados
        const dayCountMap: Record<string, number> = {};
        bookingsData?.forEach(booking => {
          if (booking.booking_date) {
            const date = new Date(booking.booking_date);
            const dayName = getDayName(date.getDay());
            dayCountMap[dayName] = (dayCountMap[dayName] || 0) + 1;
          }
        });

        const busyDays = Object.entries(dayCountMap)
          .map(([day, count]) => ({ day, count }))
          .sort((a, b) => b.count - a.count);

        setStats({
          totalBookings,
          completedBookings,
          cancelledBookings,
          pendingBookings,
          confirmedBookings,
          totalRevenue,
          topStylists,
          topServices,
          bookingsByMonth,
          averageBookingsPerDay,
          busyDays
        });
      } catch (err) {
        console.error('Error al cargar estadísticas:', err);
        setError('Error al cargar las estadísticas del centro');
      } finally {
        setLoading(false);
      }
    }

    loadLocationStats();
  }, [selectedLocation, dateRange]);

  // Efecto para actualizar el rango de fechas cuando cambia el tipo
  useEffect(() => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;
    let label: string;

    switch (dateRangeType) {
      case 'semana':
        // Semana actual
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay() + 1); // Lunes
        endDate = new Date(today);
        endDate.setDate(startDate.getDate() + 6); // Domingo
        endDate.setHours(23, 59, 59, 999);
        label = 'Semaine actuelle';
        break;

      case 'semana_anterior':
        // Semana anterior
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay() - 6); // Lunes anterior
        endDate = new Date(today);
        endDate.setDate(startDate.getDate() + 6); // Domingo anterior
        endDate.setHours(23, 59, 59, 999);
        label = 'Semaine précédente';
        break;

      case 'mes':
        // Mes actual
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        label = 'Mois actuel';
        break;

      case 'mes_anterior':
        // Mes anterior
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        label = 'Mois précédent';
        break;
        
      case 'año':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        label = 'Année actuelle';
        break;

      case 'año_anterior':
        // Año anterior
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        label = 'Année précédente';
        break;
        
      case 'personalizado':
        // Usar las fechas personalizadas o fechas por defecto
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
          label = `${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`;
        } else {
          // Si no hay fechas personalizadas, usar el mes actual
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          label = 'Periodo personalizado';
        }
        break;
        
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        label = 'Mois actuel';
    }

    setDateRange({ startDate, endDate, label });
  }, [dateRangeType, customStartDate, customEndDate]);

  // Función para cambiar el tipo de rango de fechas y cerrar el menú desplegable si es necesario
  const handleDateRangeTypeChange = (newType: typeof dateRangeType) => {
    setDateRangeType(newType);
    
    // Si no es personalizado, cerrar el menú desplegable
    if (newType !== 'personalizado' && detailsRef.current) {
      detailsRef.current.open = false;
    }
  };

  // Función para formatear números como moneda (EUR)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary mb-8">Statistiques des Centres</h1>
        
        {/* Selector de centro */}
        <div className="mb-8 mx-auto max-w-md">
          <label htmlFor="location-select" className="block text-light mb-2">
            Sélectionner un centre:
          </label>
          <select
            id="location-select"
            value={selectedLocation || ''}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full p-2 rounded bg-secondary text-light border border-primary"
          >
            <option value="">Sélectionner un centre</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Imagen del centro centrada */}
        {selectedLocationData && (
          <div className="flex justify-center mb-8">
            <div className="flex flex-col items-center">
              <div className="relative w-64 h-36 overflow-hidden border-4 border-primary rounded-lg">
                <Image 
                  src={getImageUrl(selectedLocationData.image)}
                  alt={selectedLocationData.name}
                  fill
                  style={{objectFit: 'cover'}}
                  className="rounded-lg"
                  onError={(e) => {
                    console.error('Error loading image:', e);
                    // Fallback a imagen por defecto en caso de error
                    (e.target as HTMLImageElement).src = 'https://placehold.co/640x360/212121/FFD700.png?text=Centre';
                  }}
                />
              </div>
              <h2 className="text-xl font-bold text-primary mt-2">{selectedLocationData.name}</h2>
            </div>
          </div>
        )}
        
        {/* Filtros temporales */}
        {selectedLocationData && (
          <div className="mb-8 bg-secondary rounded-lg p-4 md:p-6 shadow-lg">
            <div className="flex items-center mb-4">
              <FaCalendarAlt className="text-primary text-2xl mr-3" />
              <h3 className="text-xl font-semibold text-light">Filtrer par période</h3>
            </div>
            
            {/* Diseño para móvil (desplegable) */}
            <div className="block md:hidden">
              <div className="bg-dark rounded-lg mb-4 p-2">
                <details ref={detailsRef} className="text-center">
                  <summary className="list-none focus:outline-none cursor-pointer">
                    <span className="flex items-center justify-between">
                      <span className="text-primary font-semibold flex items-center">
                        <FaCalendarAlt className="text-primary text-lg mr-2" />
                        {dateRange.label}
                      </span>
                      <span className="text-primary">▼</span>
                    </span>
                  </summary>
                  <div className="mt-3 flex flex-col space-y-2">
                    <button
                      className={`px-4 py-2 rounded ${dateRangeType === 'semana' ? 'bg-primary text-dark' : 'bg-dark text-light border border-primary'}`}
                      onClick={() => handleDateRangeTypeChange('semana')}
                    >
                      Semaine actuelle
                    </button>
                    <button
                      className={`px-4 py-2 rounded ${dateRangeType === 'semana_anterior' ? 'bg-primary text-dark' : 'bg-dark text-light border border-primary'}`}
                      onClick={() => handleDateRangeTypeChange('semana_anterior')}
                    >
                      Semaine précédente
                    </button>
                    <button
                      className={`px-4 py-2 rounded ${dateRangeType === 'mes' ? 'bg-primary text-dark' : 'bg-dark text-light border border-primary'}`}
                      onClick={() => handleDateRangeTypeChange('mes')}
                    >
                      Mois actuel
                    </button>
                    <button
                      className={`px-4 py-2 rounded ${dateRangeType === 'mes_anterior' ? 'bg-primary text-dark' : 'bg-dark text-light border border-primary'}`}
                      onClick={() => handleDateRangeTypeChange('mes_anterior')}
                    >
                      Mois précédent
                    </button>
                    <button
                      className={`px-4 py-2 rounded ${dateRangeType === 'año' ? 'bg-primary text-dark' : 'bg-dark text-light border border-primary'}`}
                      onClick={() => handleDateRangeTypeChange('año')}
                    >
                      Année actuelle
                    </button>
                    <button
                      className={`px-4 py-2 rounded ${dateRangeType === 'año_anterior' ? 'bg-primary text-dark' : 'bg-dark text-light border border-primary'}`}
                      onClick={() => handleDateRangeTypeChange('año_anterior')}
                    >
                      Année précédente
                    </button>
                    <button
                      className={`px-4 py-2 rounded ${dateRangeType === 'personalizado' ? 'bg-primary text-dark' : 'bg-dark text-light border border-primary'}`}
                      onClick={() => handleDateRangeTypeChange('personalizado')}
                    >
                      Personnalisé
                    </button>
                  </div>
                </details>
              </div>
              
              {dateRangeType === 'personalizado' && (
                <div className="grid grid-cols-1 gap-3 mt-4">
                  <div>
                    <label htmlFor="mobile-start-date" className="block text-light mb-1 text-sm">Date de début:</label>
                    <div className="relative">
                      <input
                        id="mobile-start-date"
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full p-2 rounded bg-dark text-light border border-primary text-sm appearance-none pl-10"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <FaCalendarAlt className="text-primary text-lg" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="mobile-end-date" className="block text-light mb-1 text-sm">Date de fin:</label>
                    <div className="relative">
                      <input
                        id="mobile-end-date"
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full p-2 rounded bg-dark text-light border border-primary text-sm appearance-none pl-10"
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <FaCalendarAlt className="text-primary text-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="text-center mt-3">
                <p className="text-light text-sm mb-1">Période sélectionnée:</p>
                <div className="bg-dark text-primary px-3 py-1 rounded-lg font-semibold inline-block">
                  {dateRange.startDate.toLocaleDateString('fr-FR')} - {dateRange.endDate.toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
            
            {/* Diseño para escritorio (original) */}
            <div className="hidden md:block">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      className={`px-4 py-2 rounded ${dateRangeType === 'semana' ? 'bg-primary text-dark' : 'bg-dark text-light hover:bg-dark/80'}`}
                      onClick={() => handleDateRangeTypeChange('semana')}
                    >
                      Semaine actuelle
                    </button>
                    <button
                      className={`px-4 py-2 rounded ${dateRangeType === 'semana_anterior' ? 'bg-primary text-dark' : 'bg-dark text-light hover:bg-dark/80'}`}
                      onClick={() => handleDateRangeTypeChange('semana_anterior')}
                    >
                      Semaine précédente
                    </button>
                    <button
                      className={`px-4 py-2 rounded ${dateRangeType === 'mes' ? 'bg-primary text-dark' : 'bg-dark text-light hover:bg-dark/80'}`}
                      onClick={() => handleDateRangeTypeChange('mes')}
                    >
                      Mois actuel
                    </button>
                    <button
                      className={`px-4 py-2 rounded ${dateRangeType === 'mes_anterior' ? 'bg-primary text-dark' : 'bg-dark text-light hover:bg-dark/80'}`}
                      onClick={() => handleDateRangeTypeChange('mes_anterior')}
                    >
                      Mois précédent
                    </button>
                    <button
                      className={`px-4 py-2 rounded ${dateRangeType === 'año' ? 'bg-primary text-dark' : 'bg-dark text-light hover:bg-dark/80'}`}
                      onClick={() => handleDateRangeTypeChange('año')}
                    >
                      Année actuelle
                    </button>
                    <button
                      className={`px-4 py-2 rounded ${dateRangeType === 'año_anterior' ? 'bg-primary text-dark' : 'bg-dark text-light hover:bg-dark/80'}`}
                      onClick={() => handleDateRangeTypeChange('año_anterior')}
                    >
                      Année précédente
                    </button>
                    <button
                      className={`px-4 py-2 rounded ${dateRangeType === 'personalizado' ? 'bg-primary text-dark' : 'bg-dark text-light hover:bg-dark/80'}`}
                      onClick={() => handleDateRangeTypeChange('personalizado')}
                    >
                      Personnalisé
                    </button>
                  </div>
                  
                  {dateRangeType === 'personalizado' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label htmlFor="start-date" className="block text-light mb-1">Date de début:</label>
                        <div className="relative">
                          <input
                            id="start-date"
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full p-2 rounded bg-dark text-light border border-primary appearance-none pl-10"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <FaCalendarAlt className="text-primary text-lg" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="end-date" className="block text-light mb-1">Date de fin:</label>
                        <div className="relative">
                          <input
                            id="end-date"
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full p-2 rounded bg-dark text-light border border-primary appearance-none pl-10"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <FaCalendarAlt className="text-primary text-lg" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col justify-center items-center md:items-end">
                  <p className="text-light mb-2">Période sélectionnée:</p>
                  <div className="bg-dark text-primary px-4 py-2 rounded-lg font-semibold">
                    {dateRange.label}
                  </div>
                  <p className="text-light text-sm mt-2">
                    {dateRange.startDate.toLocaleDateString('fr-FR')} - {dateRange.endDate.toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500 text-white p-4 rounded">
            {error}
          </div>
        ) : stats ? (
          <div className="space-y-8">
            {/* Tarjetas de estadísticas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-secondary rounded-lg p-6 shadow-lg">
                <div className="flex items-center mb-4">
                  <FaCalendarCheck className="text-primary text-2xl mr-3" />
                  <h3 className="text-xl font-semibold text-light">Réservations</h3>
                </div>
                <p className="text-3xl font-bold text-primary">{stats.totalBookings}</p>
                <div className="mt-2 text-sm">
                  <p><span className="text-light">Complétées:</span> <span className="text-primary font-semibold">{stats.completedBookings}</span></p>
                  <p><span className="text-light">Confirmées:</span> <span className="text-primary font-semibold">{stats.confirmedBookings}</span></p>
                  <p><span className="text-light">En attente:</span> <span className="text-primary font-semibold">{stats.pendingBookings}</span></p>
                  <p><span className="text-light">Annulées:</span> <span className="text-primary font-semibold">{stats.cancelledBookings}</span></p>
                </div>
              </div>
              
              <div className="bg-secondary rounded-lg p-6 shadow-lg">
                <div className="flex items-center mb-4">
                  <FaEuroSign className="text-primary text-2xl mr-3" />
                  <h3 className="text-xl font-semibold text-light">Revenus</h3>
                </div>
                <p className="text-3xl font-bold text-primary">{formatCurrency(stats.totalRevenue)}</p>
                <p className="mt-2 text-sm text-light">
                  Moyenne par réservation: {formatCurrency(stats.completedBookings ? stats.totalRevenue / stats.completedBookings : 0)}
                </p>
              </div>
              
              <div className="bg-secondary rounded-lg p-6 shadow-lg">
                <div className="flex items-center mb-4">
                  <FaUserTie className="text-primary text-2xl mr-3" />
                  <h3 className="text-xl font-semibold text-light">Stylistes Actifs</h3>
                </div>
                <ul className="text-sm">
                  {stats.topStylists.slice(0, 3).map((stylist, index) => (
                    <li key={index} className="mb-1 flex justify-between">
                      <span className="text-light">{stylist.stylist_name}</span>
                      <span className="text-primary font-semibold">{stylist.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-secondary rounded-lg p-6 shadow-lg">
                <div className="flex items-center mb-4">
                  <FaCut className="text-primary text-2xl mr-3" />
                  <h3 className="text-xl font-semibold text-light">Services Populaires</h3>
                </div>
                <ul className="text-sm">
                  {stats.topServices.slice(0, 3).map((service, index) => (
                    <li key={index} className="mb-1 flex justify-between">
                      <span className="text-light">{service.service_name}</span>
                      <span className="text-primary font-semibold">{service.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Gráficos y detalles adicionales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Estilistas más activos */}
              <div className="bg-secondary rounded-lg p-6 shadow-lg">
                <h3 className="text-xl font-semibold text-light mb-4">Stylistes les Plus Actifs</h3>
                <div className="space-y-3">
                  {stats.topStylists.map((stylist, index) => (
                    <div key={index} className="relative">
                      <div className="flex justify-between mb-1">
                        <span className="text-light">{stylist.stylist_name}</span>
                        <span className="text-primary font-semibold">{stylist.count}</span>
                      </div>
                      <div className="w-full bg-dark rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${(stylist.count / (stats.topStylists[0]?.count || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Servicios más populares */}
              <div className="bg-secondary rounded-lg p-6 shadow-lg">
                <h3 className="text-xl font-semibold text-light mb-4">Services les Plus Demandés</h3>
                <div className="space-y-3">
                  {stats.topServices.map((service, index) => (
                    <div key={index} className="relative">
                      <div className="flex justify-between mb-1">
                        <span className="text-light">{service.service_name}</span>
                        <span className="text-primary font-semibold">{service.count}</span>
                      </div>
                      <div className="w-full bg-dark rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${(service.count / (stats.topServices[0]?.count || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Días más ocupados */}
            <div className="bg-secondary rounded-lg p-4 md:p-6 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center mb-4">
                <FaChartLine className="text-primary text-2xl mb-2 md:mb-0 md:mr-3" />
                <h3 className="text-xl font-semibold text-light">Jours les Plus Occupés</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-dark/30 p-3 md:p-4 rounded-lg">
                  <p className="text-light mb-4 text-center md:text-left">
                    Moyenne de réservations par jour: <span className="text-primary font-bold">{stats.averageBookingsPerDay.toFixed(1)}</span>
                  </p>
                  
                  <div className="space-y-3">
                    {stats.busyDays.map((day, index) => (
                      <div key={index} className="relative">
                        <div className="flex justify-between mb-1">
                          <span className="text-light">{day.day}</span>
                          <span className="text-primary font-semibold">{day.count}</span>
                        </div>
                        <div className="w-full bg-dark rounded-full h-2.5">
                          <div 
                            className="bg-primary h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${(day.count / (stats.busyDays[0]?.count || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Gráfico de tendencia de reservas por mes */}
                <div className="bg-dark/30 p-3 md:p-4 rounded-lg">
                  <h4 className="text-light mb-4 text-center md:text-left">
                    Tendance des Réservations
                    <span className="block md:inline mt-1 md:mt-0 md:ml-2 text-sm md:text-base">
                      {stats.bookingsByMonth.length > 0 ? 
                        `(${formatMonthYear(stats.bookingsByMonth[0].month)} - ${formatMonthYear(stats.bookingsByMonth[stats.bookingsByMonth.length - 1].month)})` : 
                        '(Aucune donnée)'}
                    </span>
                  </h4>
                  
                  {stats.bookingsByMonth.length > 0 ? (
                    <div className="h-48 md:h-64 flex items-end justify-between space-x-1 md:space-x-2 overflow-x-auto pb-2">
                      {stats.bookingsByMonth.map((item, index) => {
                        const maxCount = Math.max(...stats.bookingsByMonth.map(i => i.count));
                        const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                        
                        return (
                          <div key={index} className="flex flex-col items-center min-w-[40px] md:min-w-0 md:flex-1">
                            <div 
                              className="w-full bg-primary rounded-t transition-all duration-300 hover:bg-primary/80"
                              style={{ height: `${height}%` }}
                            ></div>
                            <div className="text-xs text-light mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                              <span className="block md:hidden">
                                {stats.bookingsByMonth.length > 6 ? getMonthName(item.month) : formatMonthYear(item.month)}
                              </span>
                              <span className="hidden md:block">{formatMonthYear(item.month)}</span>
                            </div>
                            <div className="text-xs text-primary font-semibold mt-1">
                              {item.count}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-32 text-light">
                      Aucune réservation trouvée pour cette période
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-secondary text-light p-4 rounded">
            Sélectionnez un centre pour voir ses statistiques.
          </div>
        )}
      </div>
    </div>
  );
} 
