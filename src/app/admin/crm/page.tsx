'use client';

import { useState, useEffect } from 'react';
import { supabase, ClientCRM, Booking, Location, Service, Stylist } from '@/lib/supabase';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaUserTie, FaSearch, FaChevronDown, FaCut } from 'react-icons/fa';
import {
  AdminCard,
  AdminCardContent,
  AdminCardHeader,
  FilterBar,
  SectionHeader,
  StatusBadge,
} from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

  if (selectedClient) {
    return (
      <div className="admin-scope min-h-screen bg-dark px-4 py-8 text-zinc-100">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <SectionHeader
            title="Détails du client"
            description="Vue CRM détaillée avec historique, habitudes et dépenses."
            actions={
              <Button type="button" variant="outline" onClick={backToClientList}>
                <FaChevronDown className="rotate-90" />
                Retour à la liste
              </Button>
            }
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AdminCard>
              <AdminCardHeader>
                <h3 className="text-lg font-semibold text-zinc-100">
                  Informations personnelles
                </h3>
              </AdminCardHeader>
              <AdminCardContent className="space-y-2 text-sm text-zinc-300">
                <p className="flex items-center gap-2">
                  <FaUser className="text-primary" />
                  <span className="font-semibold text-zinc-100">
                    {selectedClient.name}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <FaEnvelope className="text-primary" />
                  {selectedClient.email}
                </p>
                <p className="flex items-center gap-2">
                  <FaPhone className="text-primary" />
                  {selectedClient.phone}
                </p>
              </AdminCardContent>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader>
                <h3 className="text-lg font-semibold text-zinc-100">
                  Statistiques
                </h3>
              </AdminCardHeader>
              <AdminCardContent className="space-y-2 text-sm text-zinc-300">
                <p>
                  Première visite:{" "}
                  <span className="font-semibold text-primary">
                    {formatDate(selectedClient.first_visit_date)}
                  </span>
                </p>
                <p>
                  Dernière visite:{" "}
                  <span className="font-semibold text-primary">
                    {formatDate(selectedClient.last_visit_date)}
                  </span>
                </p>
                <p>
                  Total des visites:{" "}
                  <span className="font-semibold text-primary">
                    {selectedClient.total_visits}
                  </span>
                </p>
                <p>
                  Total dépensé:{" "}
                  <span className="font-semibold text-primary">
                    {formatPrice(selectedClient.total_spent)}
                  </span>
                </p>
              </AdminCardContent>
            </AdminCard>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <AdminCard>
              <AdminCardHeader>
                <h3 className="text-base font-semibold text-zinc-100">
                  Centre préféré
                </h3>
              </AdminCardHeader>
              <AdminCardContent className="text-sm text-zinc-300">
                <p className="flex items-center gap-2">
                  <FaMapMarkerAlt className="text-primary" />
                  {selectedClient.favorite_location?.name || "Non défini"}
                </p>
              </AdminCardContent>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader>
                <h3 className="text-base font-semibold text-zinc-100">
                  Styliste préféré
                </h3>
              </AdminCardHeader>
              <AdminCardContent className="text-sm text-zinc-300">
                <p className="flex items-center gap-2">
                  <FaUserTie className="text-primary" />
                  {selectedClient.favorite_stylist?.name || "Non défini"}
                </p>
              </AdminCardContent>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader>
                <h3 className="text-base font-semibold text-zinc-100">
                  Service préféré
                </h3>
              </AdminCardHeader>
              <AdminCardContent className="text-sm text-zinc-300">
                <p className="flex items-center gap-2">
                  <FaCut className="text-primary" />
                  {selectedClient.favorite_service?.nombre || "Non défini"}
                </p>
              </AdminCardContent>
            </AdminCard>
          </div>

          <AdminCard>
            <AdminCardHeader>
              <h3 className="text-lg font-semibold text-zinc-100">
                Historique des réservations
              </h3>
            </AdminCardHeader>
            <AdminCardContent>
              {selectedClient.bookings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Styliste</TableHead>
                      <TableHead>Centre</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedClient.bookings.map((booking) => {
                      const bookingWithDetails =
                        booking as unknown as BookingWithDetails;
                      return (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <div>{formatDate(booking.booking_date)}</div>
                            <div className="text-primary">
                              {booking.start_time.substring(0, 5)} -{" "}
                              {booking.end_time.substring(0, 5)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              {bookingWithDetails.service?.nombre ||
                                "Service inconnu"}
                            </div>
                            {bookingWithDetails.service?.precio ? (
                              <div className="text-primary">
                                {formatPrice(bookingWithDetails.service.precio)}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {bookingWithDetails.stylist?.name ||
                              "Styliste inconnu"}
                          </TableCell>
                          <TableCell>
                            {bookingWithDetails.location?.name || "Centre inconnu"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={booking.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-zinc-400">Aucune réservation trouvée.</p>
              )}
            </AdminCardContent>
          </AdminCard>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-scope min-h-screen bg-dark px-4 py-8 text-zinc-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <SectionHeader
          title="Gestion des clients"
          description="Recherche, tri et accès rapide aux fiches CRM."
        />

        <FilterBar
          actions={
            <>
              <Button
                type="button"
                size="sm"
                variant={sortConfig.key === 'name' ? 'default' : 'secondary'}
                onClick={() => requestSort('name')}
              >
                Nom {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sortConfig.key === 'total_visits' ? 'default' : 'secondary'}
                onClick={() => requestSort('total_visits')}
              >
                Visites {sortConfig.key === 'total_visits' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sortConfig.key === 'total_spent' ? 'default' : 'secondary'}
                onClick={() => requestSort('total_spent')}
              >
                Dépensé {sortConfig.key === 'total_spent' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </Button>
            </>
          }
        >
          <div className="relative md:col-span-2">
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              type="text"
              className="pl-10"
              placeholder="Rechercher par nom, email ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex h-11 items-center rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-zinc-300">
            <span className="font-semibold text-primary">{filteredClients.length}</span>
            <span className="ml-2">
              client{filteredClients.length !== 1 ? 's' : ''} trouvé{filteredClients.length !== 1 ? 's' : ''}
            </span>
          </div>
        </FilterBar>

        <AdminCard>
          <AdminCardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
              </div>
            ) : error ? (
              <AdminCard className="border-destructive/35 bg-destructive/10">
                <AdminCardContent className="py-4 text-sm text-destructive-foreground">
                  {error}
                </AdminCardContent>
              </AdminCard>
            ) : filteredClients.length === 0 ? (
              <div className="py-10 text-center text-zinc-400">
                <FaUser className="mx-auto mb-3 text-4xl text-zinc-500" />
                Aucun client trouvé
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredClients.map((client) => (
                  <AdminCard
                    key={client.email}
                    className="cursor-pointer border-white/10 hover:border-primary/45"
                    onClick={() => viewClientDetails(client)}
                  >
                    <AdminCardContent className="space-y-4 pt-6">
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-100">
                          {client.name}
                        </h3>
                        <p className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                          <FaEnvelope className="text-primary" />
                          {client.email}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                          <FaPhone className="text-primary" />
                          {client.phone}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-white/10 bg-black/25 p-2">
                          <p className="text-xs text-zinc-400">Visites</p>
                          <p className="text-lg font-semibold text-primary">
                            {client.total_visits}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/25 p-2">
                          <p className="text-xs text-zinc-400">Dépensé</p>
                          <p className="text-sm font-semibold text-primary">
                            {formatPrice(client.total_spent)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>
                          Dernière visite:{" "}
                          <span className="text-primary">
                            {formatDate(client.last_visit_date)}
                          </span>
                        </span>
                        <Button type="button" size="sm" variant="ghost">
                          Détails
                        </Button>
                      </div>

                      {client.favorite_service ? (
                        <div className="inline-flex rounded-full border border-primary/30 px-3 py-1 text-xs text-primary">
                          Service: {client.favorite_service.nombre}
                        </div>
                      ) : null}
                    </AdminCardContent>
                  </AdminCard>
                ))}
              </div>
            )}
          </AdminCardContent>
        </AdminCard>
      </div>
    </div>
  );
}
