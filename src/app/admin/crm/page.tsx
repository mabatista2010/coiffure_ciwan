'use client';

import { useState, useEffect } from 'react';
import { supabase, ClientCRM, Booking, Location, Service, Stylist } from '@/lib/supabase';
import { FaUser, FaEnvelope, FaPhone, FaCalendarAlt, FaMapMarkerAlt, FaUserTie, FaSearch, FaChevronDown, FaCut } from 'react-icons/fa';
import AdminNav from '@/components/AdminNav';

// Tipo extendido para las reservas con detalles
type BookingWithDetails = Booking & {
  stylist?: Stylist;
  location?: Location;
  service?: Service;
};

export default function ClientCRMPage() {
  const [clients, setClients] = useState<ClientCRM[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientCRM[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<ClientCRM | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ClientCRM | '',
    direction: 'ascending' | 'descending'
  }>({ key: '', direction: 'ascending' });

  useEffect(() => {
    // Cargar datos necesarios
    const fetchData = async () => {
      setLoading(true);
      try {
        // Cargar centros
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('*')
          .eq('active', true);

        if (locationsError) throw locationsError;
        setLocations(locationsData || []);

        // Cargar estilistas
        const { data: stylistsData, error: stylistsError } = await supabase
          .from('stylists')
          .select('*')
          .eq('active', true);

        if (stylistsError) throw stylistsError;
        setStylists(stylistsData || []);

        // Cargar servicios
        const { data: servicesData, error: servicesError } = await supabase
          .from('servicios')
          .select('*')
          .eq('active', true);

        if (servicesError) throw servicesError;
        setServices(servicesData || []);

        // Cargar todas las reservas
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            *,
            stylist:stylist_id(*),
            location:location_id(*),
            service:service_id(*)
          `)
          .order('booking_date', { ascending: false });

        if (bookingsError) throw bookingsError;

        // Procesar datos para crear el CRM de clientes
        const clientsMap = new Map<string, ClientCRM>();

        bookingsData?.forEach(booking => {
          const email = booking.customer_email;
          
          if (!clientsMap.has(email)) {
            // Inicializar nuevo cliente
            clientsMap.set(email, {
              email,
              name: booking.customer_name,
              phone: booking.customer_phone,
              total_visits: 0,
              last_visit_date: '',
              first_visit_date: '',
              total_spent: 0,
              visits_by_location: {},
              visits_by_stylist: {},
              visits_by_service: {},
              bookings: []
            });
          }

          const client = clientsMap.get(email)!;
          
          // Actualizar contadores
          client.total_visits += 1;
          
          // Actualizar fechas de visita
          const bookingDate = booking.booking_date;
          if (!client.last_visit_date || bookingDate > client.last_visit_date) {
            client.last_visit_date = bookingDate;
          }
          if (!client.first_visit_date || bookingDate < client.first_visit_date) {
            client.first_visit_date = bookingDate;
          }
          
          // Actualizar total gastado (si el estado es completado)
          if (booking.status === 'completed' && booking.service?.precio) {
            client.total_spent += booking.service.precio;
          }
          
          // Actualizar visitas por ubicación
          const locationId = booking.location_id;
          client.visits_by_location[locationId] = (client.visits_by_location[locationId] || 0) + 1;
          
          // Actualizar visitas por estilista
          const stylistId = booking.stylist_id;
          client.visits_by_stylist[stylistId] = (client.visits_by_stylist[stylistId] || 0) + 1;
          
          // Actualizar visitas por servicio
          const serviceId = booking.service_id.toString();
          client.visits_by_service[serviceId] = (client.visits_by_service[serviceId] || 0) + 1;
          
          // Añadir reserva a la lista como BookingWithDetails
          client.bookings.push(booking as unknown as Booking);
        });

        // Determinar favoritos para cada cliente
        clientsMap.forEach(client => {
          // Ubicación favorita
          let maxVisits = 0;
          let favoriteLocationId = '';
          
          Object.entries(client.visits_by_location).forEach(([locationId, visits]) => {
            if (visits > maxVisits) {
              maxVisits = visits;
              favoriteLocationId = locationId;
            }
          });
          
          if (favoriteLocationId) {
            client.favorite_location = locations.find(loc => loc.id === favoriteLocationId);
          }
          
          // Estilista favorito
          maxVisits = 0;
          let favoriteStylistId = '';
          
          Object.entries(client.visits_by_stylist).forEach(([stylistId, visits]) => {
            if (visits > maxVisits) {
              maxVisits = visits;
              favoriteStylistId = stylistId;
            }
          });
          
          if (favoriteStylistId) {
            client.favorite_stylist = stylists.find(stylist => stylist.id === favoriteStylistId);
          }
          
          // Servicio favorito
          maxVisits = 0;
          let favoriteServiceId = '';
          
          Object.entries(client.visits_by_service).forEach(([serviceId, visits]) => {
            if (visits > maxVisits) {
              maxVisits = visits;
              favoriteServiceId = serviceId;
            }
          });
          
          if (favoriteServiceId) {
            client.favorite_service = services.find(service => service.id.toString() === favoriteServiceId);
          }
        });

        // Convertir el mapa a array
        const clientsArray = Array.from(clientsMap.values());
        setClients(clientsArray);
        setFilteredClients(clientsArray);
        
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtrar clientes cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term) ||
        client.phone.toLowerCase().includes(term)
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients, locations, services, stylists]);

  // Función para ordenar clientes
  const requestSort = (key: keyof ClientCRM) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
    
    const sortedClients = [...filteredClients].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];
      
      if (aValue === undefined || bValue === undefined) {
        return 0;
      }
      
      if (aValue < bValue) {
        return direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredClients(sortedClients);
  };

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  // Función para formatear precio
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  // Función para ver detalles de un cliente
  const viewClientDetails = (client: ClientCRM) => {
    setSelectedClient(client);
  };

  // Función para volver a la lista de clientes
  const backToClientList = () => {
    setSelectedClient(null);
  };

  // Renderizar la página de detalles del cliente
  if (selectedClient) {
    return (
      <div className="min-h-screen flex flex-col bg-dark">
        <AdminNav />
        <div className="flex-grow container mx-auto px-4 py-8">
          <button
            onClick={backToClientList}
            className="mb-6 flex items-center text-primary hover:opacity-80 transition-opacity duration-200"
          >
            <FaChevronDown className="rotate-90 mr-2" /> Retour à la liste des clients
          </button>
          
          <h1 className="text-3xl font-bold text-primary mb-8">Détails du Client</h1>
          
          {/* Información del cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-secondary rounded-lg p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <FaUser className="text-primary text-2xl mr-3" />
                <h3 className="text-xl font-semibold text-light">Informations Personnelles</h3>
              </div>
              
              <div className="space-y-2">
                <p className="flex items-center">
                  <span className="text-light mr-2">Nom:</span> 
                  <span className="text-primary font-semibold">{selectedClient.name}</span>
                </p>
                <p className="flex items-center">
                  <FaEnvelope className="text-light mr-2" /> 
                  <span className="text-primary">{selectedClient.email}</span>
                </p>
                <p className="flex items-center">
                  <FaPhone className="text-light mr-2" /> 
                  <span className="text-primary">{selectedClient.phone}</span>
                </p>
              </div>
            </div>
            
            <div className="bg-secondary rounded-lg p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <FaCalendarAlt className="text-primary text-2xl mr-3" />
                <h3 className="text-xl font-semibold text-light">Statistiques</h3>
              </div>
              
              <div className="space-y-2">
                <p>
                  <span className="text-light">Première visite:</span> 
                  <span className="text-primary font-semibold ml-2">{formatDate(selectedClient.first_visit_date)}</span>
                </p>
                <p>
                  <span className="text-light">Dernière visite:</span> 
                  <span className="text-primary font-semibold ml-2">{formatDate(selectedClient.last_visit_date)}</span>
                </p>
                <p>
                  <span className="text-light">Total des visites:</span> 
                  <span className="text-primary font-semibold ml-2">{selectedClient.total_visits}</span>
                </p>
                <p>
                  <span className="text-light">Total dépensé:</span> 
                  <span className="text-primary font-semibold ml-2">{formatPrice(selectedClient.total_spent)}</span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Preferencias del cliente */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-secondary rounded-lg p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <FaMapMarkerAlt className="text-primary text-2xl mr-3" />
                <h3 className="text-xl font-semibold text-light">Centre Préféré</h3>
              </div>
              
              {selectedClient.favorite_location ? (
                <p className="text-primary font-semibold">{selectedClient.favorite_location.name}</p>
              ) : (
                <p className="text-light opacity-60 italic">Non défini</p>
              )}
            </div>
            
            <div className="bg-secondary rounded-lg p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <FaUserTie className="text-primary text-2xl mr-3" />
                <h3 className="text-xl font-semibold text-light">Styliste Préféré</h3>
              </div>
              
              {selectedClient.favorite_stylist ? (
                <p className="text-primary font-semibold">{selectedClient.favorite_stylist.name}</p>
              ) : (
                <p className="text-light opacity-60 italic">Non défini</p>
              )}
            </div>
            
            <div className="bg-secondary rounded-lg p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <FaCut className="text-primary text-2xl mr-3" />
                <h3 className="text-xl font-semibold text-light">Service Préféré</h3>
              </div>
              
              {selectedClient.favorite_service ? (
                <p className="text-primary font-semibold">{selectedClient.favorite_service.nombre}</p>
              ) : (
                <p className="text-light opacity-60 italic">Non défini</p>
              )}
            </div>
          </div>
          
          {/* Reservas del cliente */}
          <div className="bg-secondary rounded-lg p-6 shadow-lg">
            <div className="flex items-center mb-6">
              <FaCalendarAlt className="text-primary text-2xl mr-3" />
              <h3 className="text-xl font-semibold text-light">Historique des Réservations</h3>
            </div>
            
            {selectedClient.bookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-dark">
                  <thead className="bg-dark">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-light uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-light uppercase tracking-wider">Service</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-light uppercase tracking-wider">Styliste</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-light uppercase tracking-wider">Centre</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-light uppercase tracking-wider">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark">
                    {selectedClient.bookings.map((booking) => {
                      // Tratar booking como BookingWithDetails
                      const bookingWithDetails = booking as unknown as BookingWithDetails;
                      return (
                        <tr key={booking.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-light">{formatDate(booking.booking_date)}</div>
                            <div className="text-sm text-primary">
                              {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-light">{bookingWithDetails.service?.nombre || 'Service inconnu'}</div>
                            {bookingWithDetails.service?.precio && (
                              <div className="text-sm text-primary">{formatPrice(bookingWithDetails.service.precio)}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-light">{bookingWithDetails.stylist?.name || 'Styliste inconnu'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-light">{bookingWithDetails.location?.name || 'Centre inconnu'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${booking.status === 'completed' ? 'bg-primary text-dark' : 
                                booking.status === 'confirmed' ? 'bg-primary bg-opacity-70 text-dark' : 
                                booking.status === 'cancelled' ? 'bg-red-500 text-light' : 
                                'bg-primary bg-opacity-30 text-dark'}`}>
                              {booking.status === 'completed' ? 'Terminé' : 
                                booking.status === 'confirmed' ? 'Confirmé' : 
                                booking.status === 'cancelled' ? 'Annulé' : 
                                'En attente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-light opacity-60 italic">Aucune réservation trouvée</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Renderizar la lista de clientes
  return (
    <div className="min-h-screen flex flex-col bg-dark">
      <AdminNav />
      <div className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary mb-8">Gestion des Clients</h1>
        
        <div className="bg-secondary rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div className="relative w-full md:w-96 mb-4 md:mb-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-primary opacity-70" />
              </div>
              <input
                type="text"
                className="pl-10 pr-4 py-2 border border-primary rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-dark text-light"
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-light">
                <span className="text-primary font-semibold">{filteredClients.length}</span> client{filteredClients.length !== 1 ? 's' : ''} trouvé{filteredClients.length !== 1 ? 's' : ''}
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => requestSort('name')}
                  className={`px-2 py-1 rounded text-xs ${sortConfig.key === 'name' ? 'bg-primary text-dark' : 'bg-dark text-light'}`}
                >
                  Nom {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </button>
                <button 
                  onClick={() => requestSort('total_visits')}
                  className={`px-2 py-1 rounded text-xs ${sortConfig.key === 'total_visits' ? 'bg-primary text-dark' : 'bg-dark text-light'}`}
                >
                  Visites {sortConfig.key === 'total_visits' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </button>
                <button 
                  onClick={() => requestSort('total_spent')}
                  className={`px-2 py-1 rounded text-xs ${sortConfig.key === 'total_spent' ? 'bg-primary text-dark' : 'bg-dark text-light'}`}
                >
                  Dépensé {sortConfig.key === 'total_spent' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-500 text-white p-4 rounded relative" role="alert">
              <strong className="font-bold">Erreur!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <FaUser className="mx-auto text-primary opacity-50 text-5xl mb-4" />
              <p className="text-light opacity-60 text-lg">Aucun client trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => (
                <div 
                  key={client.email} 
                  className="bg-dark rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-dark hover:border-primary cursor-pointer"
                  onClick={() => viewClientDetails(client)}
                >
                  <div className="flex items-start mb-4">
                    <div className="bg-secondary p-3 rounded-full mr-3">
                      <FaUser className="text-primary text-xl" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-primary">{client.name}</h3>
                      <p className="text-sm text-light flex items-center mt-1">
                        <FaEnvelope className="mr-2 text-primary opacity-70" /> {client.email}
                      </p>
                      <p className="text-sm text-light flex items-center mt-1">
                        <FaPhone className="mr-2 text-primary opacity-70" /> {client.phone}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-secondary p-2 rounded-lg">
                      <p className="text-xs text-light">Visites</p>
                      <p className="text-xl font-bold text-primary">{client.total_visits}</p>
                    </div>
                    <div className="bg-secondary p-2 rounded-lg">
                      <p className="text-xs text-light">Dépensé</p>
                      <p className="text-xl font-bold text-primary">{formatPrice(client.total_spent)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-xs text-light">
                      Dernière visite: <span className="text-primary">{formatDate(client.last_visit_date)}</span>
                    </div>
                    <button className="text-xs text-primary hover:underline">
                      Détails →
                    </button>
                  </div>
                  
                  {client.favorite_service && (
                    <div className="mt-2 bg-primary bg-opacity-10 text-primary text-xs py-1 px-2 rounded-full inline-block">
                      Service: {client.favorite_service.nombre}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 