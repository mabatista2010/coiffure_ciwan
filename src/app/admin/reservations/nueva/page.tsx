'use client';

import { useState, useEffect, useMemo, useCallback, useRef, type KeyboardEvent } from 'react';
import { supabase, Location, Stylist, AvailabilitySlot, Service } from '@/lib/supabase';
import {
  FaUser,
  FaMapMarkerAlt,
  FaCalendarDay,
  FaArrowLeft,
  FaCheck,
  FaSyncAlt,
  FaSearch,
  FaAddressBook,
  FaTimes,
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AdminCard, AdminCardContent, SectionHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { getImageUrl } from '@/lib/getImageUrl';
import { CustomerSearchPanel } from '@/components/admin/crm/CustomerSearchPanel';
import { type AdminCustomerSearchResult, searchAdminCustomers } from '@/lib/adminCustomerSearch';
import { getSafeServiceDuration } from '@/lib/serviceDuration';

type TimeSlotPeriod = 'morning' | 'afternoon' | 'evening';
type ReservationCombination = {
  stylistId: string;
  locationId: string;
  serviceId: string;
};

const buildCombinationKey = ({ stylistId, locationId, serviceId }: ReservationCombination): string =>
  `${stylistId}|${locationId}|${serviceId}`;

const timeSlotLabels: Record<TimeSlotPeriod, string> = {
  morning: 'Matin',
  afternoon: 'Après-midi',
  evening: 'Soir',
};

function getTimeSlotPeriod(time: string): TimeSlotPeriod {
  const [rawHour] = time.split(':');
  const hour = Number(rawHour);

  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function getTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export default function NuevaReservacion() {
  const router = useRouter();
  
  // Estados para los filtros
  const [selectedStylist, setSelectedStylist] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Estados para datos completos (sin filtrar)
  const [allStylists, setAllStylists] = useState<Stylist[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  
  // Estados para datos filtrados
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  // Otros estados
  const [isLoading, setLoading] = useState<boolean>(true);
  const [stylistDetail, setStylistDetail] = useState<Stylist | null>(null);
  const [locationDetail, setLocationDetail] = useState<Location | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerLookupQuery, setCustomerLookupQuery] = useState<string>('');
  const [customerLookupResults, setCustomerLookupResults] = useState<AdminCustomerSearchResult[]>([]);
  const [customerLookupLoading, setCustomerLookupLoading] = useState<boolean>(false);
  const [customerLookupError, setCustomerLookupError] = useState<string | null>(null);
  const [showCustomerLookupDropdown, setShowCustomerLookupDropdown] = useState<boolean>(false);
  const [highlightedLookupIndex, setHighlightedLookupIndex] = useState<number>(-1);
  const [selectedExistingCustomer, setSelectedExistingCustomer] = useState<AdminCustomerSearchResult | null>(null);
  const [showCustomerDirectoryPanel, setShowCustomerDirectoryPanel] = useState<boolean>(false);
  const customerLookupAbortRef = useRef<AbortController | null>(null);
  const skipLookupFetchRef = useRef<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bookingInProgress, setBookingInProgress] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  
  // Relación real entre estilista-centro-servicio (combinaciones posibles)
  const [allCombinations, setAllCombinations] = useState<ReservationCombination[]>([]);
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, Record<string, AvailabilitySlot[]>>>({});
  const availabilityByDateRef = useRef<Record<string, Record<string, AvailabilitySlot[]>>>({});
  
  // Añadir nuevos estados para controlar la disponibilidad de los días
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [fullyBookedDays, setFullyBookedDays] = useState<string[]>([]);
  const [partiallyBookedDays, setPartiallyBookedDays] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);

  useEffect(() => {
    availabilityByDateRef.current = availabilityByDate;
  }, [availabilityByDate]);
  
  // Cargar datos iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Cargar estilistas
        const { data: stylistsData, error: stylistsError } = await supabase
          .from('stylists')
          .select('*')
          .eq('active', true)
          .order('name');
        
        if (stylistsError) throw stylistsError;
        
        // Cargar centros
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('*')
          .eq('active', true)
          .order('name');
        
        if (locationsError) throw locationsError;

        // Cargar servicios
        const { data: servicesData, error: servicesError } = await supabase
          .from('servicios')
          .select('*')
          .eq('active', true)
          .order('nombre');
        
        if (servicesError) throw servicesError;
        
        // Cargar relaciones estilista-servicio
        const { data: stylistServicesData, error: stylistServicesError } = await supabase
          .from('stylist_services')
          .select('*');
        
        if (stylistServicesError) throw stylistServicesError;
        
        // Cargar relaciones estilista-centro (working_hours)
        const { data: workingHoursData, error: workingHoursError } = await supabase
          .from('working_hours')
          .select('*');
        
        if (workingHoursError) throw workingHoursError;
        
        // Establecer datos completos
        setAllStylists(stylistsData || []);
        setAllLocations(locationsData || []);
        setAllServices(servicesData || []);
        
        // Inicialmente, las listas filtradas son iguales a las completas
        setStylists(stylistsData || []);
        setLocations(locationsData || []);
        setServices(servicesData || []);
        
        // Crear mapping de relaciones estilista-centro
        const stylistToLocations: Record<string, string[]> = {};
        
        // Relaciones estilista-centro (desde working_hours)
        workingHoursData?.forEach(wh => {
          if (!stylistToLocations[wh.stylist_id]) {
            stylistToLocations[wh.stylist_id] = [];
          }
          
          if (!stylistToLocations[wh.stylist_id].includes(wh.location_id)) {
            stylistToLocations[wh.stylist_id].push(wh.location_id);
          }
        });
        
        // Construir combinaciones reales estilista-centro-servicio
        const combinations: ReservationCombination[] = [];
        const combinationKeys = new Set<string>();

        stylistServicesData?.forEach(ss => {
          const stylistId = ss.stylist_id;
          const serviceId = ss.service_id.toString();
          const locationsForStylist = stylistToLocations[stylistId] || [];

          locationsForStylist.forEach(locationId => {
            const combination: ReservationCombination = {
              stylistId,
              locationId,
              serviceId,
            };
            const key = buildCombinationKey(combination);
            if (!combinationKeys.has(key)) {
              combinationKeys.add(key);
              combinations.push(combination);
            }
          });
        });

        setAllCombinations(combinations);
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  const primaryFilteredCombinations = useMemo(() => {
    return allCombinations.filter(combination => {
      if (selectedStylist && combination.stylistId !== selectedStylist) return false;
      if (selectedLocation && combination.locationId !== selectedLocation) return false;
      if (selectedService && combination.serviceId !== selectedService) return false;
      return true;
    });
  }, [allCombinations, selectedStylist, selectedLocation, selectedService]);

  const selectedCombinationForAvailability = useMemo(() => {
    if (primaryFilteredCombinations.length !== 1) {
      return null;
    }
    return primaryFilteredCombinations[0];
  }, [primaryFilteredCombinations]);

  const mergeAvailableSlotsForCombinations = useCallback(
    (
      combinations: ReservationCombination[],
      dateCache: Record<string, AvailabilitySlot[]>
    ): AvailabilitySlot[] => {
      const uniqueTimes = new Set<string>();

      combinations.forEach(combination => {
        const key = buildCombinationKey(combination);
        const slots = dateCache[key] || [];
        slots.forEach(slot => {
          if (slot.available) {
            uniqueTimes.add(slot.time);
          }
        });
      });

      return Array.from(uniqueTimes)
        .sort((a, b) => a.localeCompare(b))
        .map(time => ({ time, available: true }));
    },
    []
  );

  const ensureAvailabilityForDate = useCallback(
    async (
      date: string,
      combinations: ReservationCombination[]
    ): Promise<Record<string, AvailabilitySlot[]>> => {
      const existingForDate = availabilityByDateRef.current[date] || {};
      const uniqueCombinations = combinations.filter((combination, index, arr) => {
        const key = buildCombinationKey(combination);
        return arr.findIndex(candidate => buildCombinationKey(candidate) === key) === index;
      });

      const missingCombinations = uniqueCombinations.filter(
        combination => !existingForDate[buildCombinationKey(combination)]
      );

      if (missingCombinations.length === 0) {
        return existingForDate;
      }

      const fetchedEntries = await Promise.all(
        missingCombinations.map(async combination => {
          const params = new URLSearchParams({
            date,
            stylistId: combination.stylistId,
            locationId: combination.locationId,
            serviceId: combination.serviceId,
          });

          try {
            const response = await fetch(`/api/reservation/availability?${params.toString()}`);
            if (!response.ok) {
              return {
                key: buildCombinationKey(combination),
                slots: [] as AvailabilitySlot[],
              };
            }

            const payload = await response.json();
            return {
              key: buildCombinationKey(combination),
              slots: (payload.availableSlots || []) as AvailabilitySlot[],
            };
          } catch (error) {
            console.error('Erreur lors du chargement des disponibilités:', error);
            return {
              key: buildCombinationKey(combination),
              slots: [] as AvailabilitySlot[],
            };
          }
        })
      );

      const fetchedByKey = fetchedEntries.reduce<Record<string, AvailabilitySlot[]>>((acc, entry) => {
        acc[entry.key] = entry.slots;
        return acc;
      }, {});

      const merged = {
        ...existingForDate,
        ...fetchedByKey,
      };

      setAvailabilityByDate(prev => ({
        ...prev,
        [date]: {
          ...(prev[date] || {}),
          ...fetchedByKey,
        },
      }));

      return merged;
    },
    []
  );

  // Filtros facetados "self-excluding":
  // cada selector se calcula aplicando todos los demás filtros, excepto el propio.
  const stylistOptionCombinations = useMemo(() => {
    return allCombinations.filter(combination => {
      if (selectedLocation && combination.locationId !== selectedLocation) return false;
      if (selectedService && combination.serviceId !== selectedService) return false;
      return true;
    });
  }, [allCombinations, selectedLocation, selectedService]);

  const locationOptionCombinations = useMemo(() => {
    return allCombinations.filter(combination => {
      if (selectedStylist && combination.stylistId !== selectedStylist) return false;
      if (selectedService && combination.serviceId !== selectedService) return false;
      return true;
    });
  }, [allCombinations, selectedStylist, selectedService]);

  const serviceOptionCombinations = useMemo(() => {
    return allCombinations.filter(combination => {
      if (selectedStylist && combination.stylistId !== selectedStylist) return false;
      if (selectedLocation && combination.locationId !== selectedLocation) return false;
      return true;
    });
  }, [allCombinations, selectedStylist, selectedLocation]);

  const filteredStylists = useMemo(() => {
    const stylistIds = new Set(stylistOptionCombinations.map(combination => combination.stylistId));
    return allStylists.filter(stylist => stylistIds.has(stylist.id));
  }, [allStylists, stylistOptionCombinations]);

  const filteredLocations = useMemo(() => {
    const locationIds = new Set(locationOptionCombinations.map(combination => combination.locationId));
    return allLocations.filter(location => locationIds.has(location.id));
  }, [allLocations, locationOptionCombinations]);

  const filteredServices = useMemo(() => {
    const serviceIds = new Set(serviceOptionCombinations.map(combination => combination.serviceId));
    return allServices.filter(service => serviceIds.has(service.id.toString()));
  }, [allServices, serviceOptionCombinations]);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      return;
    }

    if (!selectedCombinationForAvailability) {
      setAvailableSlots([]);
      return;
    }

    let isCancelled = false;

    const loadDateSlots = async () => {
      setLoadingSlots(true);
      try {
        const activeCombinations = [selectedCombinationForAvailability];
        const dateCache = await ensureAvailabilityForDate(selectedDate, activeCombinations);
        if (isCancelled) return;
        const mergedSlots = mergeAvailableSlotsForCombinations(activeCombinations, dateCache);
        setAvailableSlots(mergedSlots);
      } finally {
        if (!isCancelled) {
          setLoadingSlots(false);
        }
      }
    };

    loadDateSlots();

    return () => {
      isCancelled = true;
    };
  }, [
    selectedDate,
    selectedCombinationForAvailability,
    ensureAvailabilityForDate,
    mergeAvailableSlotsForCombinations,
  ]);

  useEffect(() => {
    setStylists(filteredStylists);
    setLocations(filteredLocations);
    setServices(filteredServices);

    if (selectedStylist && !filteredStylists.some(stylist => stylist.id === selectedStylist)) {
      setSelectedStylist('');
    }
    if (selectedLocation && !filteredLocations.some(location => location.id === selectedLocation)) {
      setSelectedLocation('');
    }
    if (selectedService && !filteredServices.some(service => service.id.toString() === selectedService)) {
      setSelectedService('');
    }
  }, [
    filteredStylists,
    filteredLocations,
    filteredServices,
    selectedStylist,
    selectedLocation,
    selectedService,
  ]);

  useEffect(() => {
    if (!selectedTime) return;
    const isSelectedTimeAvailable = availableSlots.some(slot => slot.time === selectedTime && slot.available);
    if (!isSelectedTimeAvailable) {
      setSelectedTime('');
    }
  }, [selectedTime, availableSlots]);

  useEffect(() => {
    if (!showCustomerModal) {
      customerLookupAbortRef.current?.abort();
      customerLookupAbortRef.current = null;
      setShowCustomerLookupDropdown(false);
      setHighlightedLookupIndex(-1);
      return;
    }

    if (skipLookupFetchRef.current) {
      skipLookupFetchRef.current = false;
      return;
    }

    const safeQuery = customerLookupQuery.trim();
    if (safeQuery.length < 2) {
      customerLookupAbortRef.current?.abort();
      customerLookupAbortRef.current = null;
      setCustomerLookupResults([]);
      setCustomerLookupLoading(false);
      setCustomerLookupError(null);
      setHighlightedLookupIndex(-1);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      customerLookupAbortRef.current?.abort();
      const controller = new AbortController();
      customerLookupAbortRef.current = controller;

      setCustomerLookupLoading(true);
      setCustomerLookupError(null);

      try {
        const payload = await searchAdminCustomers(safeQuery, {
          limit: 8,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;
        setCustomerLookupResults(payload.customers);
        setShowCustomerLookupDropdown(true);
        setHighlightedLookupIndex(payload.customers.length > 0 ? 0 : -1);
      } catch (searchError) {
        if (controller.signal.aborted) return;
        console.error('reservation_customer_lookup_error', searchError);
        setCustomerLookupError(
          searchError instanceof Error
            ? searchError.message
            : 'Erreur lors de la recherche des clients'
        );
        setCustomerLookupResults([]);
        setHighlightedLookupIndex(-1);
      } finally {
        if (!controller.signal.aborted) {
          setCustomerLookupLoading(false);
        }
      }
    }, 260);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [customerLookupQuery, showCustomerModal]);

  // Cargar detalles cuando se selecciona estilista y centro
  useEffect(() => {
    const fetchDetails = async () => {
      if (selectedStylist) {
        try {
          // Obtener detalles del estilista
          const { data: stylistData, error: stylistError } = await supabase
            .from('stylists')
            .select('*')
            .eq('id', selectedStylist)
            .single();
          
          if (stylistError) throw stylistError;
          setStylistDetail(stylistData);
        } catch (error) {
          console.error('Error al cargar detalles del styliste:', error);
        }
      } else {
        setStylistDetail(null);
      }
      
      if (selectedLocation) {
        try {
          // Obtener detalles del centre
          const { data: locationData, error: locationError } = await supabase
            .from('locations')
            .select('*')
            .eq('id', selectedLocation)
            .single();
          
          if (locationError) throw locationError;
          setLocationDetail(locationData);
        } catch (error) {
          console.error('Error al cargar details du centre:', error);
        }
      } else {
        setLocationDetail(null);
      }
    };
    
    fetchDetails();
  }, [selectedStylist, selectedLocation]);

  // Función pour resetear todos los filtros
  const resetAllFilters = () => {
    setSelectedStylist('');
    setSelectedLocation('');
    setSelectedService('');
    setStylistDetail(null);
    setLocationDetail(null);
    setSelectedDate(null);
    setSelectedTime('');
    setAvailableSlots([]);
    setAvailabilityByDate({});
    setShowTimeModal(false);
    setShowCustomerModal(false);
    setStylists(allStylists);
    setLocations(allLocations);
    setServices(allServices);
  };

  const resetCustomerForm = () => {
    customerLookupAbortRef.current?.abort();
    customerLookupAbortRef.current = null;
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerLookupQuery('');
    setCustomerLookupResults([]);
    setCustomerLookupLoading(false);
    setCustomerLookupError(null);
    setShowCustomerLookupDropdown(false);
    setHighlightedLookupIndex(-1);
    setSelectedExistingCustomer(null);
    setShowCustomerDirectoryPanel(false);
    setNotes('');
  };

  const startNewReservation = () => {
    resetAllFilters();
    resetCustomerForm();
    setBookingError(null);
    setBookingSuccess(false);
    setBookingInProgress(false);
    setCurrentMonth(new Date());
  };

  // Obtener días du mois actuel
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Obtener le premier jour de la semaine du mois
  const getFirstDayOfMonth = (year: number, month: number) => {
    // En JavaScript, getDay() devuelve 0 para domingo, 1 para lunes, etc.
    // Como nuestro calendario comienza en lunes, necesitamos ajustar:
    // - Si es domingo (0), lo convertimos a 7
    // - Para otros días, restamos 1 para que lunes sea 0, martes 1, etc.
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  // Generer les données du calendrier
  const generateCalendarData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const calendarDays = [];
    
    // Ajouter des jours vides pour aligner avec le jour de la semaine
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }
    
    // Ajouter les jours du mois
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(i);
    }
    
    return calendarDays;
  };

  // Changer au mois précédent
  const prevMonth = () => {
    const todayStart = getTodayStart();
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const todayMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    if (currentMonthStart <= todayMonthStart) {
      return;
    }

    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  // Changer au mois suivant
  const nextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // Sélectionner un jour dans le calendrier
  const selectDate = (day: number) => {
    if (!day) return;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dayDate = new Date(year, month, day);
    const todayStart = getTodayStart();

    if (dayDate < todayStart) {
      return;
    }

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (selectedDate !== dateStr) {
      setSelectedTime('');
      setAvailableSlots([]);
    }

    setSelectedDate(dateStr);
    setShowCustomerModal(false);
    setShowTimeModal(true);
  };

  // Réserver un horaire
  const bookAppointment = (time: string) => {
    if (!selectedDate) {
      return;
    }
    
    setSelectedTime(time);
    setShowTimeModal(false);
    setShowCustomerModal(false);
  };

  const applySelectedExistingCustomer = (customer: AdminCustomerSearchResult) => {
    skipLookupFetchRef.current = true;
    setSelectedExistingCustomer(customer);
    setCustomerLookupQuery(
      customer.customer_name || customer.customer_email || customer.customer_phone || ''
    );
    setCustomerName(customer.customer_name || '');
    setCustomerEmail(customer.customer_email || '');
    setCustomerPhone(customer.customer_phone || '');
    setCustomerLookupError(null);
    setCustomerLookupResults([]);
    setShowCustomerLookupDropdown(false);
    setHighlightedLookupIndex(-1);
  };

  const clearSelectedExistingCustomer = () => {
    setSelectedExistingCustomer(null);
    setCustomerLookupQuery('');
    setCustomerLookupResults([]);
    setShowCustomerLookupDropdown(false);
    setHighlightedLookupIndex(-1);
  };

  const openCustomerDirectoryFromCustomerModal = () => {
    setShowCustomerModal(false);
    setShowCustomerDirectoryPanel(true);
    setShowCustomerLookupDropdown(false);
  };

  const closeCustomerDirectoryPanel = (open: boolean) => {
    setShowCustomerDirectoryPanel(open);
    if (!open) {
      setShowCustomerModal(true);
    }
  };

  const handleLookupInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showCustomerLookupDropdown || customerLookupResults.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedLookupIndex((previous) =>
        previous < customerLookupResults.length - 1 ? previous + 1 : 0
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedLookupIndex((previous) =>
        previous > 0 ? previous - 1 : customerLookupResults.length - 1
      );
      return;
    }

    if (event.key === 'Enter') {
      if (highlightedLookupIndex >= 0 && customerLookupResults[highlightedLookupIndex]) {
        event.preventDefault();
        applySelectedExistingCustomer(customerLookupResults[highlightedLookupIndex]);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setShowCustomerLookupDropdown(false);
      setHighlightedLookupIndex(-1);
    }
  };

  const openCustomerDataModal = () => {
    if (!selectedDate || !selectedTime) {
      alert('Veuillez sélectionner une date et un horaire avant de continuer');
      return;
    }

    if (!selectedStylist || !selectedLocation || !selectedService) {
      alert('Veuillez sélectionner un styliste, un centre et un service pour continuer');
      return;
    }

    setShowCustomerModal(true);
    setShowCustomerDirectoryPanel(false);
    setShowConfirmModal(false);
  };

  const openBookingConfirmationModal = () => {
    if (!customerName.trim()) {
      alert('Veuillez introduire le nom du client');
      return;
    }

    if (!customerPhone.trim()) {
      alert('Veuillez introduire le téléphone du client');
      return;
    }

    setShowCustomerModal(false);
    setShowConfirmModal(true);
  };

  // Compléter la réservation avec les données du client
  const completeBooking = async () => {
    if (!selectedDate || !selectedStylist || !selectedLocation || !selectedService || !selectedTime) {
      return;
    }
    
    // Valider les données du client
    if (!customerName.trim()) {
      alert('Veuillez introduire le nom du client');
      return;
    }
    
    if (!customerPhone.trim()) {
      alert('Veuillez introduire le téléphone du client');
      return;
    }
    
    setBookingInProgress(true);
    setBookingError(null);
    
    try {
      const response = await fetch('/api/reservation/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
          'X-Booking-Source': 'admin',
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          notes: notes.trim(),
          serviceId: Number(selectedService),
          locationId: selectedLocation,
          stylistId: selectedStylist,
          bookingDate: selectedDate,
          startTime: selectedTime,
          status: 'confirmed',
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (payload?.errorCode === 'slot_conflict') {
          setSelectedTime('');
          setShowCustomerModal(false);
          setShowConfirmModal(false);
          setShowTimeModal(true);
          setBookingError('Ce créneau vient d\'être réservé. Veuillez sélectionner un autre horaire.');
          return;
        }

        setBookingError(
          payload?.error || 'Erreur lors de la création de la réservation. Veuillez réessayer plus tard.'
        );
        return;
      }
      
      setShowCustomerModal(false);
      setShowTimeModal(false);
      setShowConfirmModal(false);
      setBookingSuccess(true);
    } catch (error) {
      console.error('Erreur lors de la création de la réservation:', error);
      setBookingError('Erreur lors de la création de la réservation. Veuillez réessayer plus tard.');
    } finally {
      setBookingInProgress(false);
    }
  };

  // Cálculo mensual de estado del calendario basado en disponibilidad real (backend).
  useEffect(() => {
    let isCancelled = false;

    const fetchMonthAvailability = async () => {
      if (!selectedCombinationForAvailability) {
        setClosedDays([]);
        setFullyBookedDays([]);
        setPartiallyBookedDays([]);
        setLoadingAvailability(false);
        return;
      }

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = getDaysInMonth(year, month);
      const todayStart = getTodayStart();
      const activeCombinations = [selectedCombinationForAvailability];

      const closed: string[] = [];
      const fullyBooked: string[] = [];
      const partiallyBooked: string[] = [];
      const monthDates: string[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        if (dayDate < todayStart) {
          continue;
        }
        monthDates.push(
          `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        );
      }

      setLoadingAvailability(true);

      try {
        const batchSize = 5;

        for (let index = 0; index < monthDates.length; index += batchSize) {
          const batchDates = monthDates.slice(index, index + batchSize);
          const batchResults = await Promise.all(
            batchDates.map(async (date) => {
              const dateCache = await ensureAvailabilityForDate(date, activeCombinations);
              return { date, dateCache };
            })
          );

          if (isCancelled) return;

          batchResults.forEach(({ date, dateCache }) => {
            const slotsByTime = new Map<
              string,
              { hasAvailable: boolean; reasons: Set<string> }
            >();

            activeCombinations.forEach((combination) => {
              const key = buildCombinationKey(combination);
              const slots = dateCache[key] || [];

              slots.forEach((slot) => {
                const slotEntry = slotsByTime.get(slot.time) || {
                  hasAvailable: false,
                  reasons: new Set<string>(),
                };

                if (slot.available) {
                  slotEntry.hasAvailable = true;
                } else if (slot.reasonCode) {
                  slotEntry.reasons.add(slot.reasonCode);
                }

                slotsByTime.set(slot.time, slotEntry);
              });
            });

            if (slotsByTime.size === 0) {
              closed.push(date);
              return;
            }

            let availableTimeCount = 0;
            const blockedReasons = new Set<string>();

            slotsByTime.forEach((slotEntry) => {
              if (slotEntry.hasAvailable) {
                availableTimeCount += 1;
                return;
              }

              slotEntry.reasons.forEach((reason) => blockedReasons.add(reason));
            });

            if (availableTimeCount === 0) {
              const hasOnlyConflicts =
                blockedReasons.size > 0 &&
                Array.from(blockedReasons).every((reason) => reason === 'slot_conflict');

              if (hasOnlyConflicts) {
                fullyBooked.push(date);
              } else {
                closed.push(date);
              }
              return;
            }

            if (availableTimeCount < slotsByTime.size) {
              partiallyBooked.push(date);
            }
          });
        }

        if (isCancelled) return;

        setClosedDays(closed);
        setFullyBookedDays(fullyBooked);
        setPartiallyBookedDays(partiallyBooked);
      } catch (err) {
        console.error('Erreur lors du chargement des disponibilités mensuelles:', err);
        if (!isCancelled) {
          setClosedDays([]);
          setFullyBookedDays([]);
          setPartiallyBookedDays([]);
        }
      } finally {
        if (!isCancelled) {
          setLoadingAvailability(false);
        }
      }
    };

    fetchMonthAvailability();

    return () => {
      isCancelled = true;
    };
  }, [currentMonth, selectedCombinationForAvailability, ensureAvailabilityForDate]);

  // Renderizaciones condicionales basadas en el estado
  if (isLoading) {
    return (
      <div className="admin-scope min-h-screen bg-dark px-4 py-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-light">Chargement du système de réservation...</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedServiceDetail =
    selectedService ? allServices.find(service => service.id.toString() === selectedService) : null;
  const selectedServiceDuration = selectedServiceDetail
    ? getSafeServiceDuration(selectedServiceDetail.duration)
    : null;
  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;
  const todayStart = getTodayStart();
  const canGoToPreviousMonth =
    new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1) >
    new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const groupedSlots = availableSlots.reduce<Record<TimeSlotPeriod, AvailabilitySlot[]>>(
    (acc, slot) => {
      const period = getTimeSlotPeriod(slot.time);
      acc[period].push(slot);
      return acc;
    },
    { morning: [], afternoon: [], evening: [] }
  );

  return (
    <main className="admin-scope min-h-screen bg-dark px-4 py-8">
      <div className="mx-auto w-full max-w-7xl">
          <SectionHeader
            title="Nouvelle Réservation"
            description="Créez un nouveau rendez-vous en sélectionnant un styliste, un centre et une date."
            actions={
              <div className="flex w-full gap-3 md:w-auto">
                <Button
                  onClick={resetAllFilters}
                  variant="secondary"
                  className="flex-1 md:flex-initial"
                  title="Réinitialiser les filtres"
                >
                  <FaSyncAlt className="mr-2" />
                  <span className="whitespace-nowrap">Réinitialiser</span>
                </Button>
                <Button
                  onClick={() => router.push('/admin/reservations')}
                  variant="outline"
                  className="flex-1 md:flex-initial"
                >
                  <FaArrowLeft className="mr-2" />
                  <span className="whitespace-nowrap">Retour</span>
                </Button>
              </div>
            }
          />

          {/* Filtres supérieurs */}
          <AdminCard className="mt-6 mb-6">
            <AdminCardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Selector de Styliste */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  <FaUser className="inline mr-2" /> Styliste
                </label>
                <Select
                  value={selectedStylist}
                  onValueChange={setSelectedStylist}
                  disabled={stylists.length === 0}
                >
                  <SelectTrigger
                    className={`w-full rounded-md bg-dark text-light ${
                      stylists.length === 0 ? 'border-coral' : 'border-primary'
                    }`}
                  >
                    <SelectValue placeholder="Sélectionnez un styliste" />
                  </SelectTrigger>
                  <SelectContent>
                    {stylists.map(stylist => (
                      <SelectItem key={stylist.id} value={stylist.id}>
                        {stylist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {stylists.length === 0 && (
                  <p className="text-xs text-coral mt-1">
                    Aucun styliste disponible avec les filtres actuels
                  </p>
                )}
              </div>
              
              {/* Selector de Centre */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  <FaMapMarkerAlt className="inline mr-2" /> Centre
                </label>
                <Select
                  value={selectedLocation}
                  onValueChange={setSelectedLocation}
                  disabled={locations.length === 0}
                >
                  <SelectTrigger
                    className={`w-full rounded-md bg-dark text-light ${
                      locations.length === 0 ? 'border-coral' : 'border-primary'
                    }`}
                  >
                    <SelectValue placeholder="Sélectionnez un centre" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {locations.length === 0 && (
                  <p className="text-xs text-coral mt-1">
                    Aucun centre disponible avec les filtres actuels
                  </p>
                )}
              </div>
              
              {/* Selector de Service */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  <FaCalendarDay className="inline mr-2" /> Service
                </label>
                <Select
                  value={selectedService}
                  onValueChange={setSelectedService}
                  disabled={services.length === 0}
                >
                  <SelectTrigger
                    className={`w-full rounded-md bg-dark text-light ${
                      services.length === 0 ? 'border-coral' : 'border-primary'
                    }`}
                  >
                    <SelectValue placeholder="Sélectionnez un service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.nombre} - {service.precio} CHF
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {services.length === 0 && (
                  <p className="text-xs text-coral mt-1">
                    Aucun service disponible avec les filtres actuels
                  </p>
                )}
              </div>
            </div>
            
            </AdminCardContent>
          </AdminCard>

          {/* Contenedor principal del grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Columna 1: Calendario */}
            <div className="bg-secondary rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b border-dark">
                <h2 className="text-lg font-semibold text-foreground">Calendrier</h2>
              </div>
              
              <div className="p-4">
                <div className="mb-4 flex items-center justify-center gap-4">
                  <Button
                    onClick={prevMonth}
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full border-border bg-background text-foreground shadow-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Mois précédent"
                    disabled={!canGoToPreviousMonth}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[160px] text-center text-2xl font-medium text-foreground capitalize">
                    {currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button
                    onClick={nextMonth}
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full border-border bg-background text-foreground shadow-sm hover:bg-accent"
                    aria-label="Mois suivant"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {loadingAvailability && (
                  <div className="absolute inset-0 bg-dark bg-opacity-50 flex items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                )}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, idx) => (
                    <div key={idx} className="text-center font-medium text-muted-foreground py-2 text-xs">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {generateCalendarData().map((day, index) => {
                    if (!day) {
                      return <div key={index} className="h-10 sm:h-12"></div>;
                    }
                    
                    const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isPastDate = dayDate < todayStart;
                    const isToday = dayDate.toDateString() === todayStart.toDateString();
                    const isSelected = selectedDate === dateStr;
                    const isClosed = closedDays.includes(dateStr);
                    const isFullyBooked = fullyBookedDays.includes(dateStr);
                    const isPartiallyBooked = partiallyBookedDays.includes(dateStr);
                    const isDisabledDay = isPastDate || isClosed || isFullyBooked;
                    
                    let buttonClasses = 'text-center h-10 sm:h-12 flex flex-col items-center justify-center rounded-md border border-border/70 bg-card text-foreground shadow-sm text-xs sm:text-sm transition-colors duration-200';
                    let dotColor = 'bg-green-500';
                    
                    if (isPastDate) {
                      buttonClasses += ' cursor-not-allowed bg-muted/40 text-muted-foreground border-border/50 opacity-75';
                      dotColor = 'bg-muted-foreground/60';
                    } else if (isClosed) {
                      buttonClasses += ' cursor-not-allowed opacity-65';
                      dotColor = 'bg-red-500';
                    } else if (isFullyBooked) {
                      buttonClasses += ' cursor-not-allowed opacity-70';
                      dotColor = 'bg-red-500';
                    } else if (isPartiallyBooked) {
                      buttonClasses += ' cursor-pointer hover:bg-muted/60';
                      dotColor = 'bg-yellow-500';
                    } else {
                      buttonClasses += ' cursor-pointer hover:bg-muted/60';
                      dotColor = 'bg-green-500';
                    }
                    
                    if (!isPastDate && isSelected) {
                      buttonClasses += ' ring-2 ring-primary ring-opacity-100 font-bold';
                    } else if (!isPastDate && isToday) {
                      buttonClasses += ' ring-2 ring-primary ring-opacity-70';
                    }
                    
                    return (
                      <Button
                        key={index}
                        onClick={() => isDisabledDay ? null : selectDate(day)}
                        disabled={isDisabledDay}
                        className={buttonClasses}
                      >
                        <span>{day}</span>
                        <span className={`h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full mt-0.5 ${dotColor}`}></span>
                      </Button>
                    );
                  })}
                </div>
                
                <div className="mt-4 text-[11px] text-muted-foreground sm:text-xs">
                  <div className="mb-1 flex items-center">
                    <span className="mr-1.5 h-2.5 w-2.5 rounded-full bg-green-500"></span>
                    <span>Disponible</span>
                  </div>
                  <div className="mb-1 flex items-center">
                    <span className="mr-1.5 h-2.5 w-2.5 rounded-full bg-yellow-500"></span>
                    <span>Partiellement réservé</span>
                  </div>
                  <div className="mb-1 flex items-center">
                    <span className="mr-1.5 h-2.5 w-2.5 rounded-full bg-red-500"></span>
                    <span>Complet/Fermé</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Zona derecha: tarjetas sincronizadas por filas */}
            <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 auto-rows-fr gap-6">
              {/* Styliste */}
              {stylistDetail && (
                <div className="bg-secondary rounded-lg shadow-md overflow-hidden h-full min-h-[280px]">
                  <div className="p-4 border-b border-dark">
                    <h2 className="text-lg font-semibold text-foreground">Styliste</h2>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center mb-4">
                      <div className="relative w-16 h-16 mr-4 rounded-full overflow-hidden bg-dark">
                        {stylistDetail.profile_img ? (
                          <Image
                            src={stylistDetail.profile_img}
                            alt={stylistDetail.name}
                            layout="fill"
                            objectFit="cover"
                            onError={(e) => {
                              // Fallback en caso de error
                              e.currentTarget.src = 'https://via.placeholder.com/150?text=Styliste';
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-dark text-light">
                            <FaUser size={24} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-light">{stylistDetail.name}</h3>
                        <p className="text-sm text-light opacity-70">
                          {stylistDetail.specialties && stylistDetail.specialties.length > 0
                            ? stylistDetail.specialties.join(', ')
                            : 'Styliste professionnel'}
                        </p>
                      </div>
                    </div>
                    <p className="text-light text-sm mb-3">
                      {stylistDetail.bio || 'Informations sur le styliste non disponibles.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Service sélectionné */}
              {selectedServiceDetail && (
                <div className="bg-secondary rounded-lg shadow-md overflow-hidden h-full min-h-[280px]">
                  <div className="p-4 border-b border-dark">
                    <h2 className="text-lg font-semibold text-foreground">Service sélectionné</h2>
                  </div>
                  <div className="p-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-light">{selectedServiceDetail.nombre}</h3>
                      <div className="flex justify-between items-center my-2">
                        <span className="text-light text-sm">Durée estimée :</span>
                        <span className="bg-dark text-light text-xs px-2 py-1 rounded">
                          {selectedServiceDuration} min
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-light text-sm">Prix :</span>
                        <span className="text-primary font-bold">
                          {selectedServiceDetail.precio.toFixed(2)} CHF
                        </span>
                      </div>
                      <p className="text-light text-sm mt-3">
                        {selectedServiceDetail.descripcion || 'Aucune description disponible.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Centre */}
              {locationDetail && (
                <div className="bg-secondary rounded-lg shadow-md overflow-hidden h-full min-h-[320px]">
                  <div className="p-4 border-b border-dark">
                    <h2 className="text-lg font-semibold text-foreground">Centre</h2>
                  </div>
                  <div className="relative h-36 w-full border-b border-dark/60 bg-dark/10">
                    {locationDetail.image ? (
                      <Image
                        src={getImageUrl(locationDetail.image)}
                        alt={locationDetail.name}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 33vw, 100vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-light/60">
                        <FaMapMarkerAlt className="mr-2" />
                        <span className="text-sm">Image du centre</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-light mb-2">{locationDetail.name}</h3>
                    <p className="text-light text-sm mb-3">
                      <FaMapMarkerAlt className="inline-block mr-1" />
                      {locationDetail.address || 'Adresse non disponible'}
                    </p>
                    <div className="text-xs text-light opacity-70">
                      <p>E-mail: {locationDetail.email || 'Non disponible'}</p>
                      <p>Téléphone: {locationDetail.phone || 'Non disponible'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Résumé de réservation et action client */}
              {selectedServiceDetail && selectedDate && (
                <div className="bg-secondary rounded-lg shadow-md overflow-hidden h-full min-h-[320px] flex flex-col">
                  <div className="p-4 border-b border-dark">
                    <h2 className="text-lg font-semibold text-foreground">Résumé de réservation</h2>
                  </div>
                  <div className="p-4 flex h-full flex-col">
                    <div className="space-y-2 text-sm text-light">
                      <div className="flex justify-between gap-3">
                        <span className="opacity-70">Styliste :</span>
                        <span className="font-medium text-right">{stylistDetail?.name || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="opacity-70">Centre :</span>
                        <span className="font-medium text-right">{locationDetail?.name || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="opacity-70">Service :</span>
                        <span className="font-medium text-right">{selectedServiceDetail.nombre}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="opacity-70">Date :</span>
                        <span className="font-medium text-right capitalize">{selectedDateLabel || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="opacity-70">Horaire :</span>
                        <span className="font-medium text-right">{selectedTime || 'Non sélectionné'}</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowTimeModal(true)}
                        >
                          Modifier l&apos;horaire
                        </Button>
                        <Button
                          type="button"
                          onClick={openCustomerDataModal}
                          disabled={!selectedTime || !selectedStylist || !selectedLocation || !selectedService}
                          className="text-primary-foreground"
                        >
                          Données du client
                        </Button>
                      </div>

                      {!selectedTime && (
                        <p className="mt-3 text-xs text-light opacity-70">
                          Sélectionnez un horaire pour continuer vers les données du client.
                        </p>
                      )}
                      {selectedTime && (!selectedStylist || !selectedLocation || !selectedService) && (
                        <p className="mt-3 text-xs text-light opacity-70">
                          Sélectionnez aussi styliste, centre et service pour continuer.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
      
      {/* Modal pour sélectionner une heure */}
      <Dialog open={showTimeModal && Boolean(selectedDate)} onOpenChange={setShowTimeModal}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-0 max-h-[85dvh] overflow-hidden">
          <div className="flex h-full max-h-[85dvh] flex-col">
            <DialogHeader className="border-b border-border px-6 py-4 pr-12">
              <DialogTitle className="text-lg sm:text-xl">
                Horaires disponibles pour le{" "}
                {selectedDate
                  ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : ""}
              </DialogTitle>
              <DialogDescription>
                Choisissez un créneau pour continuer avec la réservation.
              </DialogDescription>
            </DialogHeader>

            {loadingSlots ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
                <div className="mb-2 h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
                <p className="text-muted-foreground">Chargement des horaires disponibles...</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-6 py-8 text-center text-muted-foreground">
                Aucun horaire disponible pour cette date
              </div>
            ) : (
              <ScrollArea className="h-[52dvh] px-6 py-4">
                <div className="space-y-5 pr-3">
                  {(Object.keys(timeSlotLabels) as TimeSlotPeriod[]).map((period) => {
                    const periodSlots = groupedSlots[period];
                    if (periodSlots.length === 0) return null;

                    return (
                      <section key={period}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <h4 className="text-sm font-semibold text-foreground">
                            {timeSlotLabels[period]}
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {periodSlots.map((slot, index) => (
                            <Button
                              key={`${period}-${slot.time}-${index}`}
                              onClick={() => bookAppointment(slot.time)}
                              disabled={!slot.available}
                              variant={slot.available ? "outline" : "secondary"}
                              className={`
                                py-2 px-3 rounded-md text-sm font-medium
                                ${
                                  slot.available
                                    ? "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                                    : "cursor-not-allowed border-border bg-muted text-muted-foreground hover:bg-muted"
                                }
                              `}
                            >
                              {slot.time}
                            </Button>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            <DialogFooter className="border-t border-border px-6 py-4">
              <Button
                onClick={() => setShowTimeModal(false)}
                variant="outline"
                className="w-full px-4 sm:w-auto"
              >
                Fermer
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal pour les données du client */}
      <Dialog
        open={showCustomerModal && Boolean(selectedTime)}
        onOpenChange={setShowCustomerModal}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-0 max-h-[85dvh] overflow-hidden">
          <div className="flex h-full max-h-[85dvh] flex-col">
            <DialogHeader className="border-b border-border px-6 py-4 pr-12">
              <DialogTitle className="text-lg sm:text-xl">Informations du client</DialogTitle>
              <DialogDescription>
                Veuillez entrer les informations du client pour compléter la réservation
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                openBookingConfirmationModal();
              }}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <ScrollArea className="h-[52dvh] px-6 py-4">
                <div className="space-y-4 pr-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="block text-sm font-semibold text-foreground">
                        Recherche client existant
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 px-2 text-xs"
                        onClick={openCustomerDirectoryFromCustomerModal}
                      >
                        <FaAddressBook className="h-3 w-3" />
                        Annuaire
                      </Button>
                    </div>
                    <div className="relative">
                      <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        value={customerLookupQuery}
                        onChange={(e) => {
                          setCustomerLookupQuery(e.target.value);
                          setHighlightedLookupIndex(-1);
                        }}
                        onFocus={() => {
                          if (customerLookupQuery.trim().length >= 2) {
                            setShowCustomerLookupDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          window.setTimeout(() => {
                            setShowCustomerLookupDropdown(false);
                          }, 120);
                        }}
                        onKeyDown={handleLookupInputKeyDown}
                        className="w-full pl-10"
                        placeholder="Nom, email ou téléphone"
                      />
                      {showCustomerLookupDropdown && customerLookupQuery.trim().length >= 2 ? (
                        <div className="absolute z-30 mt-1 w-full rounded-xl border border-border bg-card p-1 shadow-[var(--admin-shadow-card)]">
                          {customerLookupLoading ? (
                            <div className="px-3 py-2 text-xs text-muted-foreground">
                              Recherche en cours...
                            </div>
                          ) : customerLookupError ? (
                            <div className="px-3 py-2 text-xs text-destructive">{customerLookupError}</div>
                          ) : customerLookupResults.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-muted-foreground">
                              Aucun client trouvé
                            </div>
                          ) : (
                            <div className="max-h-56 overflow-y-auto">
                              {customerLookupResults.map((customer, index) => (
                                <button
                                  key={customer.customer_key}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => applySelectedExistingCustomer(customer)}
                                  className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                                    index === highlightedLookupIndex
                                      ? 'bg-primary/10 text-foreground'
                                      : 'hover:bg-muted/70'
                                  }`}
                                >
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {customer.customer_name || 'Client sans nom'}
                                  </p>
                                  <p className="truncate text-muted-foreground">
                                    {customer.customer_email || 'Email non renseigné'}
                                  </p>
                                  <p className="truncate text-muted-foreground">
                                    {customer.customer_phone || 'Téléphone non renseigné'}
                                  </p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tapez 2 caractères minimum pour autocompléter rapidement.
                    </p>
                    {selectedExistingCustomer ? (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700">
                        Client existant sélectionné
                        <button
                          type="button"
                          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-700/10 text-emerald-700 hover:bg-emerald-700/20"
                          onClick={clearSelectedExistingCustomer}
                          aria-label="Effacer le client sélectionné"
                        >
                          <FaTimes className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Nom complet*
                    </label>
                    <Input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Téléphone*
                    </label>
                    <Input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Notes supplémentaires
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Commentaires optionnels pour la réservation"
                      rows={3}
                      className="w-full"
                    ></Textarea>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  variant="outline"
                  className="w-full px-4 sm:w-auto"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="w-full px-4 text-primary-foreground sm:w-auto"
                  disabled={!customerName.trim() || !customerPhone.trim()}
                >
                  Continuer au résumé
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <CustomerSearchPanel
        open={showCustomerDirectoryPanel}
        onOpenChange={closeCustomerDirectoryPanel}
        initialQuery={customerLookupQuery}
        onSelect={(customer) => {
          applySelectedExistingCustomer(customer);
          setShowCustomerDirectoryPanel(false);
          setShowCustomerModal(true);
        }}
      />

      {/* Modal final de confirmation */}
      <Dialog
        open={showConfirmModal && Boolean(selectedTime)}
        onOpenChange={setShowConfirmModal}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl p-0 max-h-[85dvh] overflow-hidden">
          <div className="flex h-full max-h-[85dvh] flex-col">
            <DialogHeader className="border-b border-border px-6 py-4 pr-12">
              <DialogTitle className="text-lg sm:text-xl">Confirmer la réservation</DialogTitle>
              <DialogDescription>
                Vérifiez le récapitulatif avant d&apos;enregistrer définitivement la réservation.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[56dvh] px-6 py-4">
              <div className="space-y-4 pr-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background/80 p-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Styliste</p>
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-border bg-muted">
                        {stylistDetail?.profile_img ? (
                          <Image
                            src={getImageUrl(stylistDetail.profile_img)}
                            alt={stylistDetail.name}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <FaUser />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{stylistDetail?.name || '-'}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {stylistDetail?.specialties?.length
                            ? stylistDetail.specialties.join(', ')
                            : 'Spécialités non renseignées'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 p-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Centre</p>
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-border bg-muted">
                        {locationDetail?.image ? (
                          <Image
                            src={getImageUrl(locationDetail.image)}
                            alt={locationDetail.name}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <FaMapMarkerAlt />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{locationDetail?.name || '-'}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {locationDetail?.address || 'Adresse non renseignée'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background/80 p-4">
                  <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Détails du rendez-vous</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Service</span>
                      <span className="font-medium text-foreground text-right">{selectedServiceDetail?.nombre || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Durée</span>
                      <span className="font-medium text-foreground text-right">
                        {selectedServiceDuration ? `${selectedServiceDuration} min` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 sm:col-span-2">
                      <span className="text-muted-foreground">Date et horaire</span>
                      <span className="font-medium text-foreground text-right capitalize">
                        {selectedDateLabel || '-'} · {selectedTime || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background/80 p-4">
                  <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Client</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Nom</span>
                      <span className="font-medium text-foreground text-right">{customerName || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Téléphone</span>
                      <span className="font-medium text-foreground text-right">{customerPhone || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-3 sm:col-span-2">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium text-foreground text-right">{customerEmail || 'Non renseigné'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background/80 p-4">
                  <label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                    Commentaires optionnels
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ajouter un commentaire interne (optionnel)"
                    rows={3}
                    className="w-full"
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowConfirmModal(false);
                  setShowCustomerModal(true);
                }}
                disabled={bookingInProgress}
              >
                Modifier les données client
              </Button>
              <Button
                type="button"
                className="w-full text-primary-foreground sm:w-auto"
                onClick={completeBooking}
                disabled={bookingInProgress}
              >
                {bookingInProgress ? (
                  <>
                    <div className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent align-middle"></div>
                    Confirmation...
                  </>
                ) : (
                  'Confirmer la réservation'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {bookingSuccess && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center" style={{ boxShadow: "var(--admin-shadow-card-strong)" }}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <FaCheck size={32} />
            </div>
            <h3 className="mb-2 text-xl font-bold text-foreground">Réservation confirmée</h3>
            <p className="mb-6 text-muted-foreground">
              La réservation a été créée avec succès
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                onClick={startNewReservation}
                variant="outline"
                className="px-6"
              >
                Nouvelle réservation
              </Button>
              <Button
                onClick={() => {
                  setBookingSuccess(false);
                  router.push('/admin/reservations');
                }}
                className="px-6 text-primary-foreground"
              >
                Retour au calendrier
              </Button>
            </div>
          </div>
        </div>
      )}

      {bookingError && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center" style={{ boxShadow: "var(--admin-shadow-card-strong)" }}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <FaUser size={32} />
            </div>
            <h3 className="mb-2 text-xl font-bold text-foreground">Erreur</h3>
            <p className="mb-6 text-muted-foreground">
              {bookingError}
            </p>
            <Button
              onClick={() => setBookingError(null)}
              variant="destructive"
              className="px-6"
            >
              Réessayer
            </Button>
          </div>
        </div>
      )}
    </main>
  );
} 
