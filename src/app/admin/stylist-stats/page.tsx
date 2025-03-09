'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import AdminNav from '@/components/AdminNav';
import { FaCalendarCheck, FaEuroSign, FaCut, FaMapMarkerAlt, FaChartLine, FaCalendarAlt } from 'react-icons/fa';

// Función para manejar URLs de imágenes
const getImageUrl = (path: string | null): string => {
  if (!path) return 'https://placehold.co/400x400/212121/FFD700.png?text=Styliste'; // Imagen por defecto en línea
  
  if (path.startsWith('http')) {
    // Ya es una URL completa
    return path;
  } else if (path.includes('storage/v1/object')) {
    // Es una URL de Supabase pero sin el dominio
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/${path}`;
  } else {
    // Construir URL de Supabase Storage para esta imagen
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    
    // Si la ruta comienza con 'stylists/' o 'estilistas/' es un bucket de storage
    if (path.startsWith('stylists/') || path.startsWith('estilistas/')) {
      return `${supabaseUrl}/storage/v1/object/public/${path}`;
    }
    
    // De lo contrario, tratar como ruta local
    return path.startsWith('/') ? path : `/${path}`;
  }
};

// Tipos para los datos
interface Stylist {
  id: string;
  name: string;
  profile_img: string | null;
}

interface ServiceCount {
  service_name: string;
  count: number;
}

interface LocationCount {
  location_name: string;
  count: number;
}

interface StylistStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  topServices: ServiceCount[];
  bookingsByLocation: LocationCount[];
  bookingsByMonth: { month: string; count: number }[];
}

// Tipo para el rango de fechas
interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export default function StylistStatsPage() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<string | null>(null);
  const [selectedStylistData, setSelectedStylistData] = useState<Stylist | null>(null);
  const [stats, setStats] = useState<StylistStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Referencia para el control de detalles desplegable
  const detailsRef = useRef<HTMLDetailsElement>(null);
  
  // Estados para el filtro de fechas
  const [dateRangeType, setDateRangeType] = useState<'semana' | 'mes' | 'año' | 'personalizado' | 'semana_anterior' | 'mes_anterior' | 'año_anterior'>('mes');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Por defecto, mostrar el mes actual
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      startDate: startOfMonth,
      endDate: endOfMonth,
      label: 'Mes actual'
    };
  });
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Cargar la lista de estilistas
  useEffect(() => {
    async function loadStylists() {
      try {
        const { data, error } = await supabase
          .from('stylists')
          .select('id, name, profile_img')
          .eq('active', true)
          .order('name');

        if (error) throw error;
        
        // Log para debugging
        if (data && data.length > 0) {
          console.log('Estilista seleccionado:', data[0]);
          console.log('URL de la imagen:', data[0].profile_img);
        }
        
        setStylists(data || []);
        if (data && data.length > 0) {
          setSelectedStylist(data[0].id);
        }
      } catch (err) {
        console.error('Error al cargar estilistas:', err);
        setError('Error al cargar la lista de estilistas');
      } finally {
        setLoading(false);
      }
    }

    loadStylists();
  }, []);

  // Actualizar el estilista seleccionado cuando cambia el ID
  useEffect(() => {
    if (selectedStylist && stylists.length > 0) {
      const stylistData = stylists.find(s => s.id === selectedStylist);
      setSelectedStylistData(stylistData || null);
      
      // Log para debugging
      if (stylistData) {
        console.log('Estilista seleccionado actualizado:', stylistData);
        console.log('URL de la imagen a mostrar:', getImageUrl(stylistData.profile_img));
      }
    } else {
      setSelectedStylistData(null);
    }
  }, [selectedStylist, stylists]);

  // Función para actualizar el rango de fechas según el tipo seleccionado
  useEffect(() => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;
    let label: string;

    switch (dateRangeType) {
      case 'semana':
        // Encontrar el primer día de la semana (lunes)
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // ajusta cuando es domingo
        startDate = new Date(today.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        
        // Último día de la semana (domingo)
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        
        label = 'Semana actual';
        break;

      case 'semana_anterior':
        // Encontrar el primer día de la semana anterior
        const currentDay = new Date().getDay();
        const diffToMonday = new Date().getDate() - currentDay + (currentDay === 0 ? -6 : 1);
        const monday = new Date();
        monday.setDate(diffToMonday);
        monday.setHours(0, 0, 0, 0);
        
        // Retroceder una semana
        startDate = new Date(monday);
        startDate.setDate(monday.getDate() - 7);
        
        // Último día de la semana anterior (domingo)
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        
        label = 'Semana anterior';
        break;
        
      case 'mes':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        label = 'Mes actual';
        break;

      case 'mes_anterior':
        // Mes anterior
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        label = 'Mes anterior';
        break;
        
      case 'año':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        label = 'Año actual';
        break;

      case 'año_anterior':
        // Año anterior
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        label = 'Año anterior';
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
        label = 'Mes actual';
    }

    setDateRange({ startDate, endDate, label });
  }, [dateRangeType, customStartDate, customEndDate]);

  // Cargar estadísticas cuando se selecciona un estilista
  useEffect(() => {
    if (!selectedStylist) return;

    async function loadStylistStats() {
      setLoading(true);
      try {
        // Formatear fechas para Supabase (ISO string)
        const startDateStr = dateRange.startDate.toISOString();
        const endDateStr = dateRange.endDate.toISOString();
        
        // 1. Total de reservas y conteo por estado con filtro de fechas
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, status, service_id, booking_date')
          .eq('stylist_id', selectedStylist)
          .gte('booking_date', startDateStr)
          .lte('booking_date', endDateStr);

        if (bookingsError) throw bookingsError;

        // 2. Obtener servicios para calcular ingresos
        const { data: servicesData, error: servicesError } = await supabase
          .from('servicios')
          .select('id, nombre, precio');

        if (servicesError) throw servicesError;

        // 3. Obtener reservas con detalles de servicio para top servicios con filtro de fechas
        const { data: bookingsWithService, error: bookingsWithServiceError } = await supabase
          .from('bookings')
          .select(`
            id, 
            status,
            service_id,
            servicios:service_id (nombre),
            location_id,
            locations:location_id (name),
            booking_date
          `)
          .eq('stylist_id', selectedStylist)
          .gte('booking_date', startDateStr)
          .lte('booking_date', endDateStr);

        if (bookingsWithServiceError) throw bookingsWithServiceError;

        // Calcular estadísticas
        const totalBookings = bookingsData?.length || 0;
        const completedBookings = bookingsData?.filter(b => b.status === 'completed').length || 0;
        const cancelledBookings = bookingsData?.filter(b => b.status === 'cancelled').length || 0;
        const pendingBookings = bookingsData?.filter(b => b.status === 'pending').length || 0;
        const confirmedBookings = bookingsData?.filter(b => b.status === 'confirmed').length || 0;

        // Calcular ingresos (solo de reservas completadas)
        let totalRevenue = 0;
        const completedBookingsWithService = bookingsWithService?.filter(b => b.status === 'completed') || [];
        
        completedBookingsWithService.forEach(booking => {
          const service = servicesData?.find(s => s.id === booking.service_id);
          if (service) {
            totalRevenue += service.precio;
          }
        });

        // Calcular servicios más populares
        const serviceCountMap: Record<string, number> = {};
        bookingsWithService?.forEach(booking => {
          if (booking.servicios && typeof booking.servicios === 'object' && 'nombre' in booking.servicios) {
            const serviceName = booking.servicios.nombre as string;
            serviceCountMap[serviceName] = (serviceCountMap[serviceName] || 0) + 1;
          }
        });

        const topServices = Object.entries(serviceCountMap)
          .map(([service_name, count]) => ({ service_name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Calcular reservas por ubicación
        const locationCountMap: Record<string, number> = {};
        bookingsWithService?.forEach(booking => {
          if (booking.locations && typeof booking.locations === 'object' && 'name' in booking.locations) {
            const locationName = booking.locations.name as string;
            locationCountMap[locationName] = (locationCountMap[locationName] || 0) + 1;
          }
        });

        const bookingsByLocation = Object.entries(locationCountMap)
          .map(([location_name, count]) => ({ location_name, count }))
          .sort((a, b) => b.count - a.count);

        // Calcular reservas por mes en el rango de fechas seleccionado
        const monthsMap: Record<string, number> = {};
        
        // Determinar el rango de meses a mostrar según las fechas seleccionadas
        const startMonth = new Date(dateRange.startDate);
        const endMonth = new Date(dateRange.endDate);
        
        // Inicializar todos los meses del rango
        const currentMonth = new Date(startMonth);
        while (currentMonth <= endMonth) {
          const monthYear = `${currentMonth.getMonth() + 1}/${currentMonth.getFullYear()}`;
          monthsMap[monthYear] = 0;
          currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
        
        bookingsWithService?.forEach(booking => {
          if (booking.booking_date) {
            const date = new Date(booking.booking_date);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
            
            // Contar si el mes está en nuestro rango
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
            return (aYear * 12 + aMonth) - (bYear * 12 + bMonth); // Orden cronológico
          });

        setStats({
          totalBookings,
          completedBookings,
          cancelledBookings,
          pendingBookings,
          confirmedBookings,
          totalRevenue,
          topServices,
          bookingsByLocation,
          bookingsByMonth
        });
      } catch (err) {
        console.error('Error al cargar estadísticas:', err);
        setError('Error al cargar las estadísticas del estilista');
      } finally {
        setLoading(false);
      }
    }

    loadStylistStats();
  }, [selectedStylist, dateRange]);

  // Función para formatear números como moneda (EUR)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Función para cambiar el tipo de rango de fechas y cerrar el menú desplegable si es necesario
  const handleDateRangeTypeChange = (newType: typeof dateRangeType) => {
    setDateRangeType(newType);
    
    // Si no es personalizado, cerrar el menú desplegable
    if (newType !== 'personalizado' && detailsRef.current) {
      detailsRef.current.open = false;
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      <AdminNav />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary mb-8">Statistiques des Stylistes</h1>
        
        {/* Selector de estilista */}
        <div className="mb-8 mx-auto max-w-md">
          <label htmlFor="stylist-select" className="block text-light mb-2">
            Sélectionner un styliste:
          </label>
          <select
            id="stylist-select"
            value={selectedStylist || ''}
            onChange={(e) => setSelectedStylist(e.target.value)}
            className="w-full p-2 rounded bg-secondary text-light border border-primary"
          >
            <option value="">Sélectionner un styliste</option>
            {stylists.map((stylist) => (
              <option key={stylist.id} value={stylist.id}>
                {stylist.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Imagen del estilista centrada */}
        {selectedStylistData && (
          <div className="flex justify-center mb-6">
            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-primary">
                <Image 
                  src={getImageUrl(selectedStylistData.profile_img)}
                  alt={selectedStylistData.name}
                  fill
                  style={{objectFit: 'cover'}}
                  className="rounded-full"
                  onError={(e) => {
                    console.error('Error loading image:', e);
                    // Fallback a imagen por defecto en caso de error
                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/212121/FFD700.png?text=Styliste';
                  }}
                />
              </div>
              <h2 className="text-xl font-bold text-primary mt-2">{selectedStylistData.name}</h2>
            </div>
          </div>
        )}
        
        {/* Selector de rango de fechas - Versión Móvil/Escritorio */}
        {selectedStylistData && (
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
            {/* Cabecera de periodo */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-primary">
                Statistiques pour la période:
                <span className="ml-2 font-bold">{dateRange.label}</span>
              </h2>
            </div>
            
            {/* Tarjetas de estadísticas principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-secondary rounded-lg p-4 md:p-6 shadow-lg">
                <div className="flex items-center mb-3">
                  <FaCalendarCheck className="text-primary text-xl md:text-2xl mr-2 md:mr-3" />
                  <h3 className="text-lg md:text-xl font-semibold text-light">Réservations</h3>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-primary">{stats.totalBookings}</p>
                <div className="mt-2 text-xs md:text-sm">
                  <div className="grid grid-cols-2 gap-1 md:block">
                    <p><span className="text-light">Complétées:</span> <span className="text-primary font-semibold">{stats.completedBookings}</span></p>
                    <p><span className="text-light">Confirmées:</span> <span className="text-primary font-semibold">{stats.confirmedBookings}</span></p>
                    <p><span className="text-light">En attente:</span> <span className="text-primary font-semibold">{stats.pendingBookings}</span></p>
                    <p><span className="text-light">Annulées:</span> <span className="text-primary font-semibold">{stats.cancelledBookings}</span></p>
                  </div>
                </div>
              </div>
              
              <div className="bg-secondary rounded-lg p-4 md:p-6 shadow-lg">
                <div className="flex items-center mb-3">
                  <FaEuroSign className="text-primary text-xl md:text-2xl mr-2 md:mr-3" />
                  <h3 className="text-lg md:text-xl font-semibold text-light">Revenus</h3>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-primary">{formatCurrency(stats.totalRevenue)}</p>
                <p className="mt-2 text-xs md:text-sm text-light">
                  Moyenne par réservation: {formatCurrency(stats.completedBookings ? stats.totalRevenue / stats.completedBookings : 0)}
                </p>
              </div>
              
              <div className="bg-secondary rounded-lg p-4 md:p-6 shadow-lg">
                <div className="flex items-center mb-3">
                  <FaCut className="text-primary text-xl md:text-2xl mr-2 md:mr-3" />
                  <h3 className="text-lg md:text-xl font-semibold text-light">Services Populaires</h3>
                </div>
                <ul className="text-xs md:text-sm">
                  {stats.topServices.slice(0, 3).map((service, index) => (
                    <li key={index} className="mb-1 flex justify-between">
                      <span className="text-light truncate pr-2" title={service.service_name}>{service.service_name}</span>
                      <span className="text-primary font-semibold">{service.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-secondary rounded-lg p-4 md:p-6 shadow-lg">
                <div className="flex items-center mb-3">
                  <FaMapMarkerAlt className="text-primary text-xl md:text-2xl mr-2 md:mr-3" />
                  <h3 className="text-lg md:text-xl font-semibold text-light">Centres</h3>
                </div>
                <ul className="text-xs md:text-sm">
                  {stats.bookingsByLocation.slice(0, 3).map((location, index) => (
                    <li key={index} className="mb-1 flex justify-between">
                      <span className="text-light truncate pr-2" title={location.location_name}>{location.location_name}</span>
                      <span className="text-primary font-semibold">{location.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Gráficos y detalles adicionales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Servicios más populares */}
              <div className="bg-secondary rounded-lg p-4 md:p-6 shadow-lg">
                <h3 className="text-lg md:text-xl font-semibold text-light mb-4 flex items-center">
                  <FaCut className="text-primary text-xl md:text-2xl mr-2 md:mr-3 inline" />
                  Services les Plus Demandés
                </h3>
                <div className="space-y-3">
                  {stats.topServices.map((service, index) => (
                    <div key={index} className="relative">
                      <div className="flex justify-between mb-1 text-xs md:text-sm">
                        <span className="text-light truncate pr-2 max-w-[70%]" title={service.service_name}>
                          {service.service_name}
                        </span>
                        <span className="text-primary font-semibold">{service.count}</span>
                      </div>
                      <div className="w-full bg-dark rounded-full h-2 md:h-2.5">
                        <div 
                          className="bg-primary h-2 md:h-2.5 rounded-full transition-all duration-300 hover:bg-primary/80" 
                          style={{ width: `${(service.count / (stats.topServices[0]?.count || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Reservas por centro */}
              <div className="bg-secondary rounded-lg p-4 md:p-6 shadow-lg">
                <h3 className="text-lg md:text-xl font-semibold text-light mb-4 flex items-center">
                  <FaMapMarkerAlt className="text-primary text-xl md:text-2xl mr-2 md:mr-3 inline" />
                  Réservations par Centre
                </h3>
                <div className="space-y-3">
                  {stats.bookingsByLocation.map((location, index) => (
                    <div key={index} className="relative">
                      <div className="flex justify-between mb-1 text-xs md:text-sm">
                        <span className="text-light truncate pr-2 max-w-[70%]" title={location.location_name}>
                          {location.location_name}
                        </span>
                        <span className="text-primary font-semibold">{location.count}</span>
                      </div>
                      <div className="w-full bg-dark rounded-full h-2 md:h-2.5">
                        <div 
                          className="bg-primary h-2 md:h-2.5 rounded-full transition-all duration-300 hover:bg-primary/80" 
                          style={{ width: `${(location.count / (stats.bookingsByLocation[0]?.count || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Gráfico de tendencia de reservas por mes */}
            <div className="bg-secondary rounded-lg p-4 md:p-6 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center mb-4">
                <FaChartLine className="text-primary text-2xl mb-2 md:mb-0 md:mr-3" />
                <h3 className="text-xl font-semibold text-light">
                  Tendance des Réservations 
                  <span className="block md:inline mt-1 md:mt-0 md:ml-2 text-sm md:text-base">
                    {stats.bookingsByMonth.length > 0 ? 
                      `(${stats.bookingsByMonth[0].month} - ${stats.bookingsByMonth[stats.bookingsByMonth.length - 1].month})` : 
                      '(Aucune donnée)'}
                  </span>
                </h3>
              </div>
              
              {stats.bookingsByMonth.length > 0 ? (
                <div className="h-64 flex items-end justify-between space-x-1 md:space-x-2 overflow-x-auto pb-2">
                  {stats.bookingsByMonth.map((item, index) => {
                    const maxCount = Math.max(...stats.bookingsByMonth.map(i => i.count));
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    
                    // Convertir formato mes/año a nombre de mes
                    const [month, year] = item.month.split('/');
                    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
                    const monthName = monthNames[parseInt(month) - 1];
                    const displayLabel = `${monthName} ${year}`;
                    
                    // En móvil, solo mostrar el mes si hay más de 6 meses
                    const mobileLabel = stats.bookingsByMonth.length > 6 ? monthName : displayLabel;
                    
                    return (
                      <div key={index} className="flex flex-col items-center min-w-[40px] md:min-w-0 md:flex-1">
                        <div 
                          className="w-full bg-primary rounded-t transition-all duration-300 hover:bg-primary/80"
                          style={{ height: `${height}%` }}
                        ></div>
                        <div className="text-xs text-light mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                          <span className="block md:hidden">{mobileLabel}</span>
                          <span className="hidden md:block">{displayLabel}</span>
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
        ) : (
          <div className="bg-secondary text-light p-4 rounded">
            Sélectionnez un styliste pour voir ses statistiques.
          </div>
        )}
      </div>
    </div>
  );
} 