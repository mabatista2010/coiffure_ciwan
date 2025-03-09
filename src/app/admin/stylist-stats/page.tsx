'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import AdminNav from '@/components/AdminNav';
import { FaCalendarCheck, FaEuroSign, FaCut, FaMapMarkerAlt, FaChartLine } from 'react-icons/fa';

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

export default function StylistStatsPage() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<string | null>(null);
  const [selectedStylistData, setSelectedStylistData] = useState<Stylist | null>(null);
  const [stats, setStats] = useState<StylistStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  // Cargar estadísticas cuando se selecciona un estilista
  useEffect(() => {
    if (!selectedStylist) return;

    async function loadStylistStats() {
      setLoading(true);
      try {
        // 1. Total de reservas y conteo por estado
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, status, service_id')
          .eq('stylist_id', selectedStylist);

        if (bookingsError) throw bookingsError;

        // 2. Obtener servicios para calcular ingresos
        const { data: servicesData, error: servicesError } = await supabase
          .from('servicios')
          .select('id, nombre, precio');

        if (servicesError) throw servicesError;

        // 3. Obtener reservas con detalles de servicio para top servicios
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
          .eq('stylist_id', selectedStylist);

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
        
        bookingsWithService?.forEach(booking => {
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
  }, [selectedStylist]);

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
          <div className="flex justify-center mb-8">
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
              
              <div className="bg-secondary rounded-lg p-6 shadow-lg">
                <div className="flex items-center mb-4">
                  <FaMapMarkerAlt className="text-primary text-2xl mr-3" />
                  <h3 className="text-xl font-semibold text-light">Centres</h3>
                </div>
                <ul className="text-sm">
                  {stats.bookingsByLocation.slice(0, 3).map((location, index) => (
                    <li key={index} className="mb-1 flex justify-between">
                      <span className="text-light">{location.location_name}</span>
                      <span className="text-primary font-semibold">{location.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Gráficos y detalles adicionales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              
              {/* Reservas por centro */}
              <div className="bg-secondary rounded-lg p-6 shadow-lg">
                <h3 className="text-xl font-semibold text-light mb-4">Réservations par Centre</h3>
                <div className="space-y-3">
                  {stats.bookingsByLocation.map((location, index) => (
                    <div key={index} className="relative">
                      <div className="flex justify-between mb-1">
                        <span className="text-light">{location.location_name}</span>
                        <span className="text-primary font-semibold">{location.count}</span>
                      </div>
                      <div className="w-full bg-dark rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${(location.count / (stats.bookingsByLocation[0]?.count || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Gráfico de tendencia de reservas por mes */}
            <div className="bg-secondary rounded-lg p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <FaChartLine className="text-primary text-2xl mr-3" />
                <h3 className="text-xl font-semibold text-light">Tendance des Réservations (6 derniers mois)</h3>
              </div>
              
              <div className="h-64 flex items-end justify-between space-x-2">
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
        ) : (
          <div className="bg-secondary text-light p-4 rounded">
            Sélectionnez un styliste pour voir ses statistiques.
          </div>
        )}
      </div>
    </div>
  );
} 