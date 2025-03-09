'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import AdminNav from '@/components/AdminNav';
import { FaCalendarCheck, FaEuroSign, FaUserTie, FaCut, FaChartLine } from 'react-icons/fa';

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

export default function LocationStatsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedLocationData, setSelectedLocationData] = useState<Location | null>(null);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        // 1. Total de reservas y conteo por estado
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, status, service_id, booking_date')
          .eq('location_id', selectedLocation);

        if (bookingsError) throw bookingsError;

        // 2. Obtener servicios para calcular ingresos
        const { data: servicesData, error: servicesError } = await supabase
          .from('servicios')
          .select('id, nombre, precio');

        if (servicesError) throw servicesError;

        // 3. Obtener reservas con detalles de servicio y estilista
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
          .eq('location_id', selectedLocation);

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

        // Calcular reservas por mes (últimos 6 meses)
        const monthsMap: Record<string, number> = {};
        const today = new Date();
        
        // Inicializar los últimos 6 meses
        for (let i = 0; i < 6; i++) {
          const d = new Date(today);
          d.setMonth(d.getMonth() - i);
          const monthYear = `${d.getMonth() + 1}/${d.getFullYear()}`;
          monthsMap[monthYear] = 0;
        }
        
        bookingsWithDetails?.forEach(booking => {
          if (booking.booking_date) {
            const date = new Date(booking.booking_date);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
            
            // Solo contar si está en los últimos 6 meses
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
            return (bYear * 12 + bMonth) - (aYear * 12 + aMonth);
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
  }, [selectedLocation]);

  // Función para formatear números como moneda (EUR)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-dark">
      <AdminNav />
      
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
            <div className="bg-secondary rounded-lg p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <FaChartLine className="text-primary text-2xl mr-3" />
                <h3 className="text-xl font-semibold text-light">Jours les Plus Occupés</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-light mb-4">
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
                            className="bg-primary h-2.5 rounded-full" 
                            style={{ width: `${(day.count / (stats.busyDays[0]?.count || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Gráfico de tendencia de reservas por mes */}
                <div>
                  <h4 className="text-light mb-4">Tendance des Réservations (6 derniers mois)</h4>
                  <div className="h-48 flex items-end justify-between space-x-2">
                    {stats.bookingsByMonth.map((item, index) => {
                      const maxCount = Math.max(...stats.bookingsByMonth.map(i => i.count));
                      const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      
                      return (
                        <div key={index} className="flex flex-col items-center flex-1">
                          <div 
                            className="w-full bg-primary rounded-t"
                            style={{ height: `${height}%` }}
                          ></div>
                          <div className="text-xs text-light mt-2 transform -rotate-45 origin-top-left">
                            {item.month}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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