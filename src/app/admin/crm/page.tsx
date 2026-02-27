'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  supabase,
  ClientCRM,
  Booking,
  Location,
  Service,
  Stylist,
  CustomerProfile,
  CustomerNote,
} from '@/lib/supabase';
import { buildCustomerKey } from '@/lib/crmCustomerKey';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaUserTie,
  FaSearch,
  FaCut,
  FaStickyNote,
  FaSave,
} from 'react-icons/fa';
import { X } from 'lucide-react';
import {
  AdminCard,
  AdminCardContent,
  AdminCardHeader,
  FilterBar,
  SectionHeader,
  StatusBadge,
} from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogHeader, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
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

type ProfileFormState = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  birthDate: string;
  maritalStatus: string;
  hasChildren: '' | 'yes' | 'no';
  hobbies: string;
  occupation: string;
  preferredContactChannel: string;
  marketingConsent: boolean;
  internalNotesSummary: string;
};

type UnsavedChangesAction =
  | { type: 'switch_client'; client: ClientCRM }
  | { type: 'close_panel' }
  | null;

const EMPTY_PROFILE_FORM: ProfileFormState = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  birthDate: '',
  maritalStatus: '',
  hasChildren: '',
  hobbies: '',
  occupation: '',
  preferredContactChannel: '',
  marketingConsent: false,
  internalNotesSummary: '',
};

function profileToForm(profile: CustomerProfile | null, client: ClientCRM | null): ProfileFormState {
  return {
    customerName: profile?.customer_name || client?.name || '',
    customerEmail: profile?.customer_email || client?.email || '',
    customerPhone: profile?.customer_phone || client?.phone || '',
    birthDate: profile?.birth_date || '',
    maritalStatus: profile?.marital_status || '',
    hasChildren:
      typeof profile?.has_children === 'boolean'
        ? profile.has_children
          ? 'yes'
          : 'no'
        : '',
    hobbies: profile?.hobbies || '',
    occupation: profile?.occupation || '',
    preferredContactChannel: profile?.preferred_contact_channel || '',
    marketingConsent: Boolean(profile?.marketing_consent),
    internalNotesSummary: profile?.internal_notes_summary || '',
  };
}

async function getStaffAccessToken(forceRefresh = false): Promise<string> {
  if (forceRefresh) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session?.access_token) {
      throw new Error('Session admin introuvable');
    }

    return refreshData.session.access_token;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (sessionError || !accessToken) {
    throw new Error('Session admin introuvable');
  }

  return accessToken;
}

async function fetchWithStaffAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
  retryOnUnauthorized = true
): Promise<Response> {
  const execute = async (accessToken: string) => {
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${accessToken}`);

    return fetch(input, {
      ...init,
      headers,
    });
  };

  let response = await execute(await getStaffAccessToken(false));
  if (response.status !== 401 || !retryOnUnauthorized) {
    return response;
  }

  response = await execute(await getStaffAccessToken(true));
  return response;
}

export default function ClientCRMPage() {
  const [clients, setClients] = useState<ClientCRM[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientCRM[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<ClientCRM | null>(null);
  const [isClientPanelOpen, setIsClientPanelOpen] = useState<boolean>(false);
  const [unsavedChangesDialogOpen, setUnsavedChangesDialogOpen] = useState<boolean>(false);
  const [pendingUnsavedAction, setPendingUnsavedAction] = useState<UnsavedChangesAction>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ClientCRM | '',
    direction: 'ascending' | 'descending'
  }>({ key: '', direction: 'ascending' });

  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileSaving, setProfileSaving] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);

  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [notesLoading, setNotesLoading] = useState<boolean>(false);
  const [noteSaving, setNoteSaving] = useState<boolean>(false);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [noteType, setNoteType] = useState<'general' | 'follow_up' | 'incident' | 'preference'>('general');
  const previousSelectedKeyRef = useRef<string | null>(null);

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

        // Cargar estilistas
        const { data: stylistsData, error: stylistsError } = await supabase
          .from('stylists')
          .select('*')
          .eq('active', true);

        if (stylistsError) throw stylistsError;

        // Cargar servicios
        const { data: servicesData, error: servicesError } = await supabase
          .from('servicios')
          .select('*')
          .eq('active', true);

        if (servicesError) throw servicesError;

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

        bookingsData?.forEach((booking) => {
          const customerKey = buildCustomerKey(booking.customer_email, booking.customer_phone);
          if (!customerKey) {
            return;
          }

          if (!clientsMap.has(customerKey)) {
            // Inicializar nuevo cliente
            clientsMap.set(customerKey, {
              customer_key: customerKey,
              email: booking.customer_email || '',
              name: booking.customer_name || '',
              phone: booking.customer_phone || '',
              total_visits: 0,
              last_visit_date: '',
              first_visit_date: '',
              total_spent: 0,
              visits_by_location: {},
              visits_by_stylist: {},
              visits_by_service: {},
              bookings: [],
            });
          }

          const client = clientsMap.get(customerKey)!;

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

          // Añadir reserva a la lista
          client.bookings.push(booking as unknown as Booking);
        });

        // Determinar favoritos para cada cliente
        clientsMap.forEach((client) => {
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
            client.favorite_location = locationsData?.find((loc) => loc.id === favoriteLocationId);
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
            client.favorite_stylist = stylistsData?.find((stylist) => stylist.id === favoriteStylistId);
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
            client.favorite_service = servicesData?.find(
              (service) => service.id.toString() === favoriteServiceId
            );
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
  }, []);

  // Filtrar clientes cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clients.filter(
        (client) =>
          client.name.toLowerCase().includes(term) ||
          client.email.toLowerCase().includes(term) ||
          client.phone.toLowerCase().includes(term)
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  useEffect(() => {
    const fetchClientDetail = async () => {
      if (!selectedClient) {
        previousSelectedKeyRef.current = null;
        setProfile(null);
        setProfileForm(EMPTY_PROFILE_FORM);
        setNotes([]);
        setProfileError(null);
        return;
      }

      const selectedKey = selectedClient.customer_key;
      const hasClientChanged = previousSelectedKeyRef.current !== selectedKey;
      previousSelectedKeyRef.current = selectedKey;

      // Evita refetch innecesario al editar/guardar el mismo cliente y preserva el mensaje de éxito.
      if (!hasClientChanged) {
        return;
      }

      setProfileLoading(true);
      setNotesLoading(true);
      setProfileError(null);
      setProfileSuccess(null);

      try {
        const queryParams = new URLSearchParams({
          customerName: selectedClient.name || '',
          customerEmail: selectedClient.email || '',
          customerPhone: selectedClient.phone || '',
        });

        const encodedKey = encodeURIComponent(selectedClient.customer_key);

        const [profileRes, notesRes] = await Promise.all([
          fetchWithStaffAuth(`/api/admin/crm/customers/${encodedKey}/profile?${queryParams.toString()}`),
          fetchWithStaffAuth(`/api/admin/crm/customers/${encodedKey}/notes?${queryParams.toString()}`),
        ]);

        const profilePayload = await profileRes.json().catch(() => ({}));
        const notesPayload = await notesRes.json().catch(() => ({}));

        if (!profileRes.ok) {
          throw new Error(profilePayload?.error || 'Erreur lors du chargement du profil client');
        }

        if (!notesRes.ok) {
          throw new Error(notesPayload?.error || 'Erreur lors du chargement des notes client');
        }

        const fetchedProfile = (profilePayload?.profile || null) as CustomerProfile | null;
        const fetchedNotes = (notesPayload?.notes || []) as CustomerNote[];

        setProfile(fetchedProfile);
        setProfileForm(profileToForm(fetchedProfile, selectedClient));
        setNotes(fetchedNotes);
      } catch (fetchError) {
        console.error('crm_fetch_detail_error', fetchError);
        setProfileError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Erreur lors du chargement du détail client'
        );
      } finally {
        setProfileLoading(false);
        setNotesLoading(false);
      }
    };

    fetchClientDetail();
  }, [selectedClient]);

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedClient) return false;
    const base = profileToForm(profile, selectedClient);

    return (
      profileForm.customerName !== base.customerName ||
      profileForm.customerEmail !== base.customerEmail ||
      profileForm.customerPhone !== base.customerPhone ||
      profileForm.birthDate !== base.birthDate ||
      profileForm.maritalStatus !== base.maritalStatus ||
      profileForm.hasChildren !== base.hasChildren ||
      profileForm.hobbies !== base.hobbies ||
      profileForm.occupation !== base.occupation ||
      profileForm.preferredContactChannel !== base.preferredContactChannel ||
      profileForm.marketingConsent !== base.marketingConsent ||
      profileForm.internalNotesSummary !== base.internalNotesSummary
    );
  }, [profile, profileForm, selectedClient]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Función para ordenar clientes
  const requestSort = (key: keyof ClientCRM) => {
    let direction: 'ascending' | 'descending' = 'ascending';

    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }

    setSortConfig({ key, direction });

    const sortedClients = [...filteredClients].sort((a, b) => {
      const aValue = a[key] as string | number | undefined;
      const bValue = b[key] as string | number | undefined;

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
      year: 'numeric',
    }).format(date);
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Función para formatear precio
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'CHF',
    }).format(price);
  };

  // Función para ver detalles de un cliente
  const viewClientDetails = (client: ClientCRM) => {
    if (selectedClient?.customer_key === client.customer_key && isClientPanelOpen) {
      return;
    }

    if (hasUnsavedChanges) {
      setPendingUnsavedAction({ type: 'switch_client', client });
      setUnsavedChangesDialogOpen(true);
      return;
    }

    setSelectedClient(client);
    setIsClientPanelOpen(true);
  };

  const resetClientPanelState = () => {
    setIsClientPanelOpen(false);
    setSelectedClient(null);
    setProfileError(null);
    setProfileSuccess(null);
    setNoteDraft('');
    setNoteType('general');
  };

  const closeClientPanel = (): boolean => {
    if (hasUnsavedChanges) {
      setPendingUnsavedAction({ type: 'close_panel' });
      setUnsavedChangesDialogOpen(true);
      return false;
    }

    resetClientPanelState();
    return true;
  };

  const handleClientPanelOpenChange = (open: boolean) => {
    if (open) {
      setIsClientPanelOpen(true);
      return;
    }

    const isClosed = closeClientPanel();
    if (!isClosed) {
      setIsClientPanelOpen(true);
    }
  };

  const handleUnsavedChangesDialogOpenChange = (open: boolean) => {
    setUnsavedChangesDialogOpen(open);
    if (!open) {
      setPendingUnsavedAction(null);
    }
  };

  const confirmUnsavedChangesAction = () => {
    if (!pendingUnsavedAction) {
      setUnsavedChangesDialogOpen(false);
      return;
    }

    if (pendingUnsavedAction.type === 'switch_client') {
      setSelectedClient(pendingUnsavedAction.client);
      setIsClientPanelOpen(true);
    } else if (pendingUnsavedAction.type === 'close_panel') {
      resetClientPanelState();
    }

    setUnsavedChangesDialogOpen(false);
    setPendingUnsavedAction(null);
  };

  const handleSaveProfile = async () => {
    if (!selectedClient) return;

    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const encodedKey = encodeURIComponent(selectedClient.customer_key);
      const response = await fetchWithStaffAuth(`/api/admin/crm/customers/${encodedKey}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: profileForm.customerName,
          customerEmail: profileForm.customerEmail,
          customerPhone: profileForm.customerPhone,
          birthDate: profileForm.birthDate || null,
          maritalStatus: profileForm.maritalStatus || null,
          hasChildren:
            profileForm.hasChildren === '' ? null : profileForm.hasChildren === 'yes',
          hobbies: profileForm.hobbies || null,
          occupation: profileForm.occupation || null,
          preferredContactChannel: profileForm.preferredContactChannel || null,
          marketingConsent: profileForm.marketingConsent,
          internalNotesSummary: profileForm.internalNotesSummary || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur lors de la sauvegarde du profil');
      }

      const updatedProfile = (payload.profile || null) as CustomerProfile | null;
      setProfile(updatedProfile);
      setProfileForm(profileToForm(updatedProfile, selectedClient));
      setProfileSuccess('Profil client enregistré avec succès.');

      if (updatedProfile) {
        setClients((prev) =>
          prev.map((client) =>
            client.customer_key === selectedClient.customer_key
              ? {
                  ...client,
                  name: updatedProfile.customer_name || client.name,
                  email: updatedProfile.customer_email || client.email,
                  phone: updatedProfile.customer_phone || client.phone,
                }
              : client
          )
        );
        setFilteredClients((prev) =>
          prev.map((client) =>
            client.customer_key === selectedClient.customer_key
              ? {
                  ...client,
                  name: updatedProfile.customer_name || client.name,
                  email: updatedProfile.customer_email || client.email,
                  phone: updatedProfile.customer_phone || client.phone,
                }
              : client
          )
        );
        setSelectedClient((prev) =>
          prev
            ? {
                ...prev,
                name: updatedProfile.customer_name || prev.name,
                email: updatedProfile.customer_email || prev.email,
                phone: updatedProfile.customer_phone || prev.phone,
              }
            : prev
        );
      }
    } catch (saveError) {
      console.error('crm_profile_save_error', saveError);
      setProfileError(
        saveError instanceof Error ? saveError.message : 'Erreur lors de la sauvegarde du profil'
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedClient || !noteDraft.trim()) return;

    setNoteSaving(true);
    setProfileError(null);

    try {
      const encodedKey = encodeURIComponent(selectedClient.customer_key);
      const response = await fetchWithStaffAuth(`/api/admin/crm/customers/${encodedKey}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: noteDraft,
          noteType,
          customerName: profileForm.customerName,
          customerEmail: profileForm.customerEmail,
          customerPhone: profileForm.customerPhone,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur lors de la création de la note');
      }

      const createdNote = payload.note as CustomerNote;
      setNotes((prev) => [createdNote, ...prev]);
      setNoteDraft('');
      setNoteType('general');
    } catch (noteError) {
      console.error('crm_note_save_error', noteError);
      setProfileError(noteError instanceof Error ? noteError.message : 'Erreur lors de la création de la note');
    } finally {
      setNoteSaving(false);
    }
  };

  return (
    <div className="admin-scope min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <SectionHeader
          title="Gestion des clients"
          description="Recherche, tri et accès rapide aux fiches CRM."
        />

        <section>
          <FilterBar
            className="mb-5"
            fieldsClassName="md:grid-cols-2 xl:grid-cols-4 gap-3 xl:gap-5"
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
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                className="pl-10"
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex h-11 items-center rounded-xl border border-border bg-card px-4 text-sm text-foreground shadow-[var(--admin-shadow-soft)]">
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
                <div className="py-10 text-center text-muted-foreground">
                  <FaUser className="mx-auto mb-3 text-4xl text-muted-foreground" />
                  Aucun client trouvé
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredClients.map((client) => (
                    <AdminCard
                      key={client.customer_key}
                      className={`cursor-pointer border-border hover:border-primary/45 ${
                        selectedClient?.customer_key === client.customer_key && isClientPanelOpen
                          ? 'border-primary/55 ring-1 ring-primary/35'
                          : ''
                      }`}
                      onClick={() => viewClientDetails(client)}
                    >
                      <AdminCardContent className="space-y-4 pt-6">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{client.name || 'Client sans nom'}</h3>
                          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <FaEnvelope className="text-primary" />
                            {client.email || 'Email non renseigné'}
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <FaPhone className="text-primary" />
                            {client.phone || 'Téléphone non renseigné'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg border border-border bg-muted/40 p-2">
                            <p className="text-xs text-muted-foreground">Visites</p>
                            <p className="text-lg font-semibold text-primary">{client.total_visits}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/40 p-2">
                            <p className="text-xs text-muted-foreground">Dépensé</p>
                            <p className="text-sm font-semibold text-primary">{formatPrice(client.total_spent)}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Dernière visite: <span className="text-primary">{formatDate(client.last_visit_date)}</span>
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
        </section>
      </div>

      <Dialog open={isClientPanelOpen} onOpenChange={handleClientPanelOpenChange}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[230] bg-black/30 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="admin-scope fixed inset-y-0 right-0 z-[240] h-[100dvh] w-[min(100vw,58rem)] border-l border-border bg-background text-foreground shadow-2xl duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-full">
            <DialogHeader className="sr-only">
              <DialogTitle>Détails client</DialogTitle>
              <DialogDescription>Fiche CRM complète du client sélectionné.</DialogDescription>
            </DialogHeader>

            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {selectedClient?.name || 'Client sans nom'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedClient?.email || 'Email non renseigné'}
                  </p>
                </div>
                <DialogPrimitive.Close asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl border border-border"
                    aria-label="Fermer le panneau client"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogPrimitive.Close>
              </div>

              {!selectedClient ? (
                <div className="flex h-full items-center justify-center px-5 text-sm text-muted-foreground">
                  Sélectionnez un client pour afficher sa fiche CRM détaillée.
                </div>
              ) : (
                <ScrollArea className="min-h-0 flex-1 px-5 py-4">
                  <div className="flex flex-col gap-4 pb-4">
                    <AdminCard>
                      <AdminCardHeader>
                        <h3 className="text-lg font-semibold text-foreground">Informations personnelles</h3>
                      </AdminCardHeader>
                      <AdminCardContent className="space-y-2 text-sm text-foreground">
                        <p className="flex items-center gap-2">
                          <FaUser className="text-primary" />
                          <span className="font-semibold text-foreground">{selectedClient.name || 'Client sans nom'}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <FaEnvelope className="text-primary" />
                          {selectedClient.email || 'Non renseigné'}
                        </p>
                        <p className="flex items-center gap-2">
                          <FaPhone className="text-primary" />
                          {selectedClient.phone || 'Non renseigné'}
                        </p>
                      </AdminCardContent>
                    </AdminCard>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <AdminCard>
                        <AdminCardHeader>
                          <h3 className="text-base font-semibold text-foreground">Statistiques</h3>
                        </AdminCardHeader>
                        <AdminCardContent className="space-y-2 text-sm text-foreground">
                          <p>
                            Première visite:{' '}
                            <span className="font-semibold text-primary">{formatDate(selectedClient.first_visit_date)}</span>
                          </p>
                          <p>
                            Dernière visite:{' '}
                            <span className="font-semibold text-primary">{formatDate(selectedClient.last_visit_date)}</span>
                          </p>
                          <p>
                            Total des visites:{' '}
                            <span className="font-semibold text-primary">{selectedClient.total_visits}</span>
                          </p>
                          <p>
                            Total dépensé:{' '}
                            <span className="font-semibold text-primary">{formatPrice(selectedClient.total_spent)}</span>
                          </p>
                        </AdminCardContent>
                      </AdminCard>

                      <AdminCard>
                        <AdminCardHeader>
                          <h3 className="text-base font-semibold text-foreground">Préférences</h3>
                        </AdminCardHeader>
                        <AdminCardContent className="space-y-2 text-sm text-foreground">
                          <p className="flex items-center gap-2">
                            <FaMapMarkerAlt className="text-primary" />
                            Centre: {selectedClient.favorite_location?.name || 'Non défini'}
                          </p>
                          <p className="flex items-center gap-2">
                            <FaUserTie className="text-primary" />
                            Styliste: {selectedClient.favorite_stylist?.name || 'Non défini'}
                          </p>
                          <p className="flex items-center gap-2">
                            <FaCut className="text-primary" />
                            Service: {selectedClient.favorite_service?.nombre || 'Non défini'}
                          </p>
                        </AdminCardContent>
                      </AdminCard>
                    </div>

                    <AdminCard>
                      <AdminCardHeader>
                        <h3 className="text-lg font-semibold text-foreground">Fiche client (éditable)</h3>
                      </AdminCardHeader>
                      <AdminCardContent className="space-y-4">
                        {profileLoading ? (
                          <div className="text-sm text-muted-foreground">Chargement du profil...</div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Nom</label>
                                <Input
                                  value={profileForm.customerName}
                                  onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, customerName: e.target.value }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Email</label>
                                <Input
                                  value={profileForm.customerEmail}
                                  onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, customerEmail: e.target.value }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Téléphone</label>
                                <Input
                                  value={profileForm.customerPhone}
                                  onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, customerPhone: e.target.value }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Date de naissance</label>
                                <Input
                                  type="date"
                                  value={profileForm.birthDate}
                                  onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, birthDate: e.target.value }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">État civil</label>
                                <Input
                                  value={profileForm.maritalStatus}
                                  onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, maritalStatus: e.target.value }))
                                  }
                                  placeholder="Ex: célibataire"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">A des enfants</label>
                                <select
                                  value={profileForm.hasChildren}
                                  onChange={(e) =>
                                    setProfileForm((prev) => ({
                                      ...prev,
                                      hasChildren: e.target.value as '' | 'yes' | 'no',
                                    }))
                                  }
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                  <option value="">Non renseigné</option>
                                  <option value="yes">Oui</option>
                                  <option value="no">Non</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Occupation</label>
                                <Input
                                  value={profileForm.occupation}
                                  onChange={(e) =>
                                    setProfileForm((prev) => ({ ...prev, occupation: e.target.value }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Canal préféré</label>
                                <select
                                  value={profileForm.preferredContactChannel}
                                  onChange={(e) =>
                                    setProfileForm((prev) => ({
                                      ...prev,
                                      preferredContactChannel: e.target.value,
                                    }))
                                  }
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                  <option value="">Non renseigné</option>
                                  <option value="phone">Téléphone</option>
                                  <option value="email">Email</option>
                                  <option value="whatsapp">WhatsApp</option>
                                  <option value="sms">SMS</option>
                                  <option value="none">Aucun</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">Hobbies</label>
                              <Textarea
                                value={profileForm.hobbies}
                                onChange={(e) =>
                                  setProfileForm((prev) => ({ ...prev, hobbies: e.target.value }))
                                }
                                rows={2}
                                placeholder="Centres d'intérêt du client"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">Commentaires internes</label>
                              <Textarea
                                value={profileForm.internalNotesSummary}
                                onChange={(e) =>
                                  setProfileForm((prev) => ({ ...prev, internalNotesSummary: e.target.value }))
                                }
                                rows={3}
                                placeholder="Résumé interne du client"
                              />
                            </div>

                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={profileForm.marketingConsent}
                                onChange={(e) =>
                                  setProfileForm((prev) => ({
                                    ...prev,
                                    marketingConsent: e.target.checked,
                                  }))
                                }
                              />
                              Consentement marketing
                            </label>

                            {profileError ? <p className="text-sm text-destructive">{profileError}</p> : null}
                            {profileSuccess ? <p className="text-sm text-emerald-600">{profileSuccess}</p> : null}

                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                onClick={handleSaveProfile}
                                disabled={profileSaving || !hasUnsavedChanges}
                                className="text-primary-foreground"
                              >
                                <FaSave className="mr-2" />
                                {profileSaving ? 'Enregistrement...' : 'Enregistrer la fiche'}
                              </Button>
                              {hasUnsavedChanges ? (
                                <span className="text-xs text-amber-600">Modifications non enregistrées</span>
                              ) : null}
                            </div>
                          </>
                        )}
                      </AdminCardContent>
                    </AdminCard>

                    <AdminCard>
                      <AdminCardHeader>
                        <h3 className="text-lg font-semibold text-foreground">Notes internes</h3>
                      </AdminCardHeader>
                      <AdminCardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                          <Textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            rows={3}
                            placeholder="Ajouter une note interne..."
                          />
                          <div className="flex flex-col gap-2">
                            <select
                              value={noteType}
                              onChange={(e) =>
                                setNoteType(e.target.value as 'general' | 'follow_up' | 'incident' | 'preference')
                              }
                              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="general">Général</option>
                              <option value="follow_up">Suivi</option>
                              <option value="incident">Incident</option>
                              <option value="preference">Préférence</option>
                            </select>
                            <Button
                              type="button"
                              onClick={handleAddNote}
                              disabled={noteSaving || !noteDraft.trim()}
                              className="text-primary-foreground"
                            >
                              <FaStickyNote className="mr-2" />
                              {noteSaving ? 'Ajout...' : 'Ajouter note'}
                            </Button>
                          </div>
                        </div>

                        {notesLoading ? (
                          <p className="text-sm text-muted-foreground">Chargement des notes...</p>
                        ) : notes.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Aucune note interne pour ce client.</p>
                        ) : (
                          <div className="space-y-2">
                            {notes.map((note) => (
                              <div key={note.id} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{note.note_type}</span>
                                  <span>{formatDateTime(note.created_at)}</span>
                                </div>
                                <p className="whitespace-pre-wrap text-foreground">{note.note}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </AdminCardContent>
                    </AdminCard>

                    <AdminCard>
                      <AdminCardHeader>
                        <h3 className="text-lg font-semibold text-foreground">Historique des réservations</h3>
                      </AdminCardHeader>
                      <AdminCardContent>
                        {selectedClient.bookings.length > 0 ? (
                          <div className="overflow-x-auto">
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
                                  const bookingWithDetails = booking as unknown as BookingWithDetails;
                                  return (
                                    <TableRow key={booking.id}>
                                      <TableCell>
                                        <div>{formatDate(booking.booking_date)}</div>
                                        <div className="text-primary">
                                          {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div>{bookingWithDetails.service?.nombre || 'Service inconnu'}</div>
                                        {bookingWithDetails.service?.precio ? (
                                          <div className="text-primary">{formatPrice(bookingWithDetails.service.precio)}</div>
                                        ) : null}
                                      </TableCell>
                                      <TableCell>{bookingWithDetails.stylist?.name || 'Styliste inconnu'}</TableCell>
                                      <TableCell>{bookingWithDetails.location?.name || 'Centre inconnu'}</TableCell>
                                      <TableCell>
                                        <StatusBadge status={booking.status} />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">Aucune réservation trouvée.</p>
                        )}
                      </AdminCardContent>
                    </AdminCard>
                  </div>
                </ScrollArea>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      <Dialog open={unsavedChangesDialogOpen} onOpenChange={handleUnsavedChangesDialogOpenChange}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[250] bg-black/35 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[260] w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-[0_36px_90px_-30px_rgba(15,23,42,0.45)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <DialogHeader className="text-left">
              <DialogTitle>Modifications non enregistrées</DialogTitle>
              <DialogDescription>
                Vous avez des changements non sauvegardés. Si vous continuez, ils seront perdus.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setUnsavedChangesDialogOpen(false);
                  setPendingUnsavedAction(null);
                }}
              >
                Annuler
              </Button>
              <Button type="button" className="gap-2" onClick={confirmUnsavedChangesAction}>
                Continuer sans enregistrer
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
