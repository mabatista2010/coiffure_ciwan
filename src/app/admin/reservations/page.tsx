'use client';

import { useState, useEffect } from 'react';
import { supabase, Booking, Location, Service, Stylist } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';

type BookingWithDetails = Booking & {
  stylist?: Stylist;
  location?: Location;
  service?: Service;
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

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
      } catch (err: Error | unknown) {
        console.error('Erreur lors du chargement des réservations:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des réservations');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [selectedDate, selectedLocation]);

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

  // Generar fechas para la selección (2 semanas)
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    // Incluir fechas pasadas (2 semanas atrás)
    for (let i = -14; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dates.push({
        value: dateStr,
        label: new Date(dateStr).toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        })
      });
    }
    
    return dates;
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
              {/* Selector de fecha */}
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaCalendarAlt className="inline mr-2" /> Date
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {generateDateOptions().map(date => (
                    <option key={date.value} value={date.value}>
                      {date.label}
                    </option>
                  ))}
                </select>
              </div>

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
              
              {/* Botón para añadir nueva reserva (implementación futura) */}
              <button className="w-full md:w-auto bg-primary text-secondary px-4 py-2 rounded-md font-semibold hover:bg-opacity-90 transition">
                + Nouvelle Réservation
              </button>
            </div>
          </div>

          {/* Tabla de reservas */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
              <strong className="font-bold">Erreur:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-gray-100 border border-gray-300 text-gray-700 px-6 py-10 rounded-lg text-center">
              <FaCalendarAlt className="mx-auto text-4xl mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">Pas de réservations pour cette date</h2>
              <p>Sélectionnez une autre date ou un autre centre pour voir les réservations disponibles.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                      {selectedLocation === 'all' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Centre
                        </th>
                      )}
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
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{booking.customer_name}</div>
                          <div className="text-sm text-gray-500">{booking.customer_email}</div>
                          <div className="text-sm text-gray-500">{booking.customer_phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {booking.service?.nombre || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {booking.stylist?.name || 'N/A'}
                        </td>
                        {selectedLocation === 'all' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {booking.location?.name || 'N/A'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs inline-flex leading-5 font-semibold rounded-full border ${getStatusColor(booking.status)}`}>
                            {booking.status === 'pending' && 'En attente'}
                            {booking.status === 'confirmed' && 'Confirmée'}
                            {booking.status === 'cancelled' && 'Annulée'}
                            {booking.status === 'completed' && 'Terminée'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleStatusChange(booking.id, 'confirmed')}
                              className="text-green-600 hover:text-green-900"
                              disabled={booking.status === 'confirmed'}
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking.id, 'cancelled')}
                              className="text-red-600 hover:text-red-900"
                              disabled={booking.status === 'cancelled'}
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking.id, 'completed')}
                              className="text-blue-600 hover:text-blue-900"
                              disabled={booking.status === 'completed'}
                            >
                              Terminer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Futuras implementaciones: 
            - Vista de calendario
            - Gestión de horarios de estilistas
            - Gestión de temps libre
            - Édition de réservations
          */}
        </div>
      </div>
      <Footer />
    </main>
  );
} 