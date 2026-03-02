'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase, Service, Stylist } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import {
  AdminSidePanel,
  SectionHeader,
} from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type DayConfig = {
  active: boolean;
  useCustomHours: boolean;
};

type TimeRange = {
  start: string;
  end: string;
};

type CenterSlot = TimeRange & {
  active: boolean;
};

type CenterSlotsByLocationDay = Record<string, Record<number, CenterSlot[]>>;
type CustomSlotsByLocationDay = Record<string, Record<number, TimeRange[]>>;
type WorkingConfigByLocationDay = Record<string, Record<number, DayConfig>>;
type TimeOffCategory = 'vacaciones' | 'baja' | 'descanso' | 'formacion' | 'bloqueo_operativo';

type TimeOffEntry = {
  id: string;
  stylist_id: string;
  location_id: string | null;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
  category: TimeOffCategory;
  created_at: string;
};

type ClosureEntry = {
  id: string;
  location_id: string;
  closure_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
  created_by: string | null;
};

type TimeOffFormState = {
  locationId: string;
  startDateTime: string;
  endDateTime: string;
  category: TimeOffCategory;
  reason: string;
};

type ClosureFormState = {
  locationId: string;
  closureDate: string;
  startTime: string;
  endTime: string;
  reason: string;
};

// Define días de la semana para mostrar en la interfaz
const weekdays = [
  { id: 0, name: 'Dimanche' },
  { id: 1, name: 'Lundi' },
  { id: 2, name: 'Mardi' },
  { id: 3, name: 'Mercredi' },
  { id: 4, name: 'Jeudi' },
  { id: 5, name: 'Vendredi' },
  { id: 6, name: 'Samedi' }
];

const defaultRange: TimeRange = { start: '09:00', end: '18:00' };

const TIME_OFF_CATEGORY_LABELS: Record<TimeOffCategory, string> = {
  vacaciones: 'Vacances',
  baja: 'Arrêt maladie',
  descanso: 'Repos',
  formacion: 'Formation',
  bloqueo_operativo: 'Blocage opérationnel',
};

function getTimeOffCategoryLabel(category: TimeOffCategory): string {
  return TIME_OFF_CATEGORY_LABELS[category];
}

interface StylistManagementProps {
  services: Service[];
  locations: Array<{
    id: string;
    name: string;
    address: string;
    active: boolean;
    [key: string]: string | boolean | number | string[] | undefined | Record<string, unknown>;
  }>;
  onUpdate: () => void;
}

function createDefaultWorkingConfig(activeByDefault = true): Record<number, DayConfig> {
  const map: Record<number, DayConfig> = {};
  weekdays.forEach((day) => {
    map[day.id] = {
      active: activeByDefault,
      useCustomHours: false,
    };
  });
  return map;
}

function createDefaultCustomSlots(): Record<number, TimeRange[]> {
  const map: Record<number, TimeRange[]> = {};
  weekdays.forEach((day) => {
    map[day.id] = [{ ...defaultRange }];
  });
  return map;
}

function normalizeTimeValue(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function isValidHourMinute(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function toMinutes(value: string): number {
  const normalized = value.slice(0, 5);
  const [h, m] = normalized.split(':').map(Number);
  return h * 60 + m;
}

function normalizeRangeKey(range: TimeRange): string {
  return `${range.start}-${range.end}`;
}

function sortRanges(ranges: TimeRange[]): TimeRange[] {
  return [...ranges].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

async function getAdminAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) {
    throw new Error('Session admin introuvable');
  }
  return token;
}

async function fetchWithAdminAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await getAdminAccessToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export default function StylistManagement({ services, locations, onUpdate }: StylistManagementProps) {
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleImpactMessage, setScheduleImpactMessage] = useState<string | null>(null);

  // Estado para estilistas y selección
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<string>('');

  // Estado para nuevo/edición estilista
  const [showStylistPanel, setShowStylistPanel] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [stylistImageFile, setStylistImageFile] = useState<File | null>(null);
  const [stylistImagePreview, setStylistImagePreview] = useState<string>('');
  const [newStylist, setNewStylist] = useState<{
    name: string;
    bio: string;
    locationIds: string[];
    serviceIds: string[];
  }>({
    name: '',
    bio: '',
    locationIds: [],
    serviceIds: [],
  });

  const [workingConfig, setWorkingConfig] = useState<WorkingConfigByLocationDay>({});
  const [centerSlots, setCenterSlots] = useState<CenterSlotsByLocationDay>({});
  const [customSlots, setCustomSlots] = useState<CustomSlotsByLocationDay>({});

  // Estado para excepciones del estilista
  const [timeOffEntries, setTimeOffEntries] = useState<TimeOffEntry[]>([]);
  const [closuresEntries, setClosuresEntries] = useState<ClosureEntry[]>([]);

  const [timeOffDialogOpen, setTimeOffDialogOpen] = useState(false);
  const [editingTimeOff, setEditingTimeOff] = useState<TimeOffEntry | null>(null);
  const [timeOffForm, setTimeOffForm] = useState<TimeOffFormState>({
    locationId: '',
    startDateTime: '',
    endDateTime: '',
    category: 'bloqueo_operativo',
    reason: '',
  });

  const [closureDialogOpen, setClosureDialogOpen] = useState(false);
  const [editingClosure, setEditingClosure] = useState<ClosureEntry | null>(null);
  const [closureForm, setClosureForm] = useState<ClosureFormState>({
    locationId: '',
    closureDate: '',
    startTime: '',
    endTime: '',
    reason: '',
  });

  const [pendingDeleteStylistId, setPendingDeleteStylistId] = useState<string | null>(null);
  const [pendingDeleteTimeOffId, setPendingDeleteTimeOffId] = useState<string | null>(null);
  const [pendingDeleteClosureId, setPendingDeleteClosureId] = useState<string | null>(null);

  const selectedLocationOptions = useMemo(
    () => locations.filter((location) => newStylist.locationIds.includes(location.id)),
    [locations, newStylist.locationIds]
  );

  const loadStylists = async () => {
    try {
      const { data, error } = await supabase
        .from('stylists')
        .select('*')
        .order('name');

      if (error) throw error;
      setStylists(data || []);
    } catch (error) {
      console.error('Error al cargar estilistas:', error);
      setErrorMessage('Erreur lors du chargement des stylistes');
    }
  };

  const loadStylistServiceIds = async (stylistId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('stylist_services')
      .select('service_id')
      .eq('stylist_id', stylistId);

    if (error) {
      console.error('Error al cargar servicios del estilista:', error);
      return [];
    }

    return (data || []).map((row) => String(row.service_id));
  };

  const loadCenterSlotsForLocation = async (locationId: string): Promise<Record<number, CenterSlot[]>> => {
    const { data, error } = await supabase
      .from('location_hours')
      .select('day_of_week,start_time,end_time,slot_number')
      .eq('location_id', locationId)
      .order('day_of_week')
      .order('slot_number');

    if (error) {
      console.error('Error al cargar horarios de centro:', error);
      const fallback: Record<number, CenterSlot[]> = {};
      weekdays.forEach((day) => {
        fallback[day.id] = [];
      });
      return fallback;
    }

    const byDay: Record<number, CenterSlot[]> = {};
    weekdays.forEach((day) => {
      byDay[day.id] = [];
    });

    (data || []).forEach((slot) => {
      byDay[slot.day_of_week].push({
        start: String(slot.start_time).slice(0, 5),
        end: String(slot.end_time).slice(0, 5),
        active: false,
      });
    });

    return byDay;
  };

  const loadTimeOffEntries = async (stylistId: string) => {
    try {
      const params = new URLSearchParams({ stylistId, limit: '300' });
      const response = await fetchWithAdminAuth(`/api/admin/schedule/time-off?${params.toString()}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Impossible de charger les indisponibilités');
      }

      setTimeOffEntries((payload.timeOff || []) as TimeOffEntry[]);
    } catch (error) {
      console.error('time_off_load_error', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors du chargement des indisponibilités');
      setTimeOffEntries([]);
    }
  };

  const loadClosureEntries = async (locationIds: string[]) => {
    if (locationIds.length === 0) {
      setClosuresEntries([]);
      return;
    }

    try {
      const responses = await Promise.all(
        locationIds.map(async (locationId) => {
          const params = new URLSearchParams({ locationId, limit: '300' });
          const response = await fetchWithAdminAuth(`/api/admin/schedule/location-closures?${params.toString()}`);
          const payload = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(payload.error || 'Impossible de charger les fermetures des centres');
          }

          return (payload.closures || []) as ClosureEntry[];
        })
      );

      const dedup = new Map<string, ClosureEntry>();
      responses.flat().forEach((entry) => {
        dedup.set(entry.id, entry);
      });

      setClosuresEntries(
        Array.from(dedup.values()).sort((a, b) => {
          if (a.closure_date === b.closure_date) {
            return (a.start_time || '00:00').localeCompare(b.start_time || '00:00');
          }
          return a.closure_date.localeCompare(b.closure_date);
        })
      );
    } catch (error) {
      console.error('closure_load_error', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors du chargement des fermetures');
      setClosuresEntries([]);
    }
  };

  const resetStylistPanelState = () => {
    setShowStylistPanel(false);
    setEditMode(false);
    setSelectedStylist('');
    setStylistImageFile(null);
    setStylistImagePreview('');
    setWorkingConfig({});
    setCenterSlots({});
    setCustomSlots({});
    setScheduleImpactMessage(null);
    setTimeOffEntries([]);
    setClosuresEntries([]);
    setTimeOffDialogOpen(false);
    setEditingTimeOff(null);
    setClosureDialogOpen(false);
    setEditingClosure(null);
    setPendingDeleteTimeOffId(null);
    setPendingDeleteClosureId(null);
    setNewStylist({
      name: '',
      bio: '',
      locationIds: [],
      serviceIds: [],
    });
    setErrorMessage('');
  };

  const openNewStylistPanel = () => {
    setErrorMessage('');
    setEditMode(false);
    setSelectedStylist('');
    setShowStylistPanel(true);
    setScheduleImpactMessage(null);
    setNewStylist({
      name: '',
      bio: '',
      locationIds: [],
      serviceIds: [],
    });
    setWorkingConfig({});
    setCenterSlots({});
    setCustomSlots({});
    setTimeOffEntries([]);
    setClosuresEntries([]);
  };

  const ensureLocationInitialized = async (locationId: string, activeByDefault = true) => {
    const locationCenterSlots = await loadCenterSlotsForLocation(locationId);

    setCenterSlots((prev) => ({
      ...prev,
      [locationId]: locationCenterSlots,
    }));

    setWorkingConfig((prev) => ({
      ...prev,
      [locationId]: prev[locationId] || createDefaultWorkingConfig(activeByDefault),
    }));

    setCustomSlots((prev) => ({
      ...prev,
      [locationId]: prev[locationId] || createDefaultCustomSlots(),
    }));
  };

  const handleLocationChange = async (locationId: string, selected: boolean) => {
    setErrorMessage('');

    if (selected) {
      const locationIds = Array.from(new Set([...newStylist.locationIds, locationId]));
      setNewStylist((prev) => ({ ...prev, locationIds }));
      await ensureLocationInitialized(locationId, true);
      return;
    }

    const locationIds = newStylist.locationIds.filter((id) => id !== locationId);
    setNewStylist((prev) => ({ ...prev, locationIds }));

    setWorkingConfig((prev) => {
      const next = { ...prev };
      delete next[locationId];
      return next;
    });

    setCenterSlots((prev) => {
      const next = { ...prev };
      delete next[locationId];
      return next;
    });

    setCustomSlots((prev) => {
      const next = { ...prev };
      delete next[locationId];
      return next;
    });
  };

  const updateDayConfig = (locationId: string, dayId: number, updates: Partial<DayConfig>) => {
    setWorkingConfig((prev) => {
      const location = prev[locationId] || createDefaultWorkingConfig(false);
      return {
        ...prev,
        [locationId]: {
          ...location,
          [dayId]: {
            ...location[dayId],
            ...updates,
          },
        },
      };
    });
  };

  const toggleCenterSlot = (locationId: string, dayId: number, slotIndex: number) => {
    setCenterSlots((prev) => {
      const next = { ...prev };
      const daySlots = [...(next[locationId]?.[dayId] || [])];
      if (!daySlots[slotIndex]) return prev;
      daySlots[slotIndex] = {
        ...daySlots[slotIndex],
        active: !daySlots[slotIndex].active,
      };
      next[locationId] = {
        ...(next[locationId] || {}),
        [dayId]: daySlots,
      };
      return next;
    });
  };

  const ensureCustomSlotsForDay = (locationId: string, dayId: number) => {
    setCustomSlots((prev) => {
      const location = prev[locationId] || createDefaultCustomSlots();
      const daySlots = location[dayId] || [{ ...defaultRange }];
      if (daySlots.length > 0) {
        return {
          ...prev,
          [locationId]: {
            ...location,
            [dayId]: daySlots,
          },
        };
      }

      return {
        ...prev,
        [locationId]: {
          ...location,
          [dayId]: [{ ...defaultRange }],
        },
      };
    });
  };

  const addCustomSlot = (locationId: string, dayId: number) => {
    setCustomSlots((prev) => {
      const location = prev[locationId] || createDefaultCustomSlots();
      const daySlots = [...(location[dayId] || [{ ...defaultRange }])];
      daySlots.push({ ...defaultRange });
      return {
        ...prev,
        [locationId]: {
          ...location,
          [dayId]: daySlots,
        },
      };
    });
  };

  const removeCustomSlot = (locationId: string, dayId: number, slotIndex: number) => {
    setCustomSlots((prev) => {
      const location = prev[locationId] || createDefaultCustomSlots();
      const daySlots = [...(location[dayId] || [{ ...defaultRange }])];
      const filtered = daySlots.filter((_, index) => index !== slotIndex);
      return {
        ...prev,
        [locationId]: {
          ...location,
          [dayId]: filtered.length > 0 ? filtered : [{ ...defaultRange }],
        },
      };
    });
  };

  const updateCustomSlot = (
    locationId: string,
    dayId: number,
    slotIndex: number,
    field: keyof TimeRange,
    value: string
  ) => {
    setCustomSlots((prev) => {
      const location = prev[locationId] || createDefaultCustomSlots();
      const daySlots = [...(location[dayId] || [{ ...defaultRange }])];
      if (!daySlots[slotIndex]) {
        daySlots[slotIndex] = { ...defaultRange };
      }
      daySlots[slotIndex] = {
        ...daySlots[slotIndex],
        [field]: value,
      };
      return {
        ...prev,
        [locationId]: {
          ...location,
          [dayId]: daySlots,
        },
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStylistImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setStylistImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadFile = async (file: File, bucket: string, folder = '') => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No hay sesión activa. Por favor, inicie sesión de nuevo.');
      }

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600',
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error al subir archivo:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de l\'upload');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const loadStylistForEdit = async (stylistId: string) => {
    const stylist = stylists.find((item) => item.id === stylistId);
    if (!stylist) return;

    setErrorMessage('');
    setScheduleImpactMessage(null);
    setSelectedStylist(stylistId);
    setEditMode(true);
    setShowStylistPanel(true);

    const locationIds = stylist.location_ids || [];

    setNewStylist({
      name: stylist.name,
      bio: stylist.bio || '',
      locationIds,
      serviceIds: await loadStylistServiceIds(stylistId),
    });

    setStylistImagePreview(stylist.profile_img || '');
    setStylistImageFile(null);

    const [workingHoursRes, ...centerHoursResults] = await Promise.all([
      supabase
        .from('working_hours')
        .select('location_id,day_of_week,start_time,end_time')
        .eq('stylist_id', stylistId),
      ...locationIds.map((locationId) =>
        supabase
          .from('location_hours')
          .select('day_of_week,start_time,end_time,slot_number')
          .eq('location_id', locationId)
          .order('day_of_week')
          .order('slot_number')
      )
    ]);

    if (workingHoursRes.error) {
      console.error('Error al cargar working_hours del estilista:', workingHoursRes.error);
      setErrorMessage('Erreur lors du chargement des horaires du styliste');
      return;
    }

    const centerSlotsMap: CenterSlotsByLocationDay = {};
    locationIds.forEach((locationId, index) => {
      const response = centerHoursResults[index];
      const perDay: Record<number, CenterSlot[]> = {};
      weekdays.forEach((day) => {
        perDay[day.id] = [];
      });

      if (!response.error) {
        (response.data || []).forEach((slot) => {
          perDay[slot.day_of_week].push({
            start: String(slot.start_time).slice(0, 5),
            end: String(slot.end_time).slice(0, 5),
            active: false,
          });
        });
      }

      centerSlotsMap[locationId] = perDay;
    });

    const groupedWorkingHours: Record<string, Record<number, TimeRange[]>> = {};
    (workingHoursRes.data || []).forEach((row) => {
      if (!groupedWorkingHours[row.location_id]) {
        groupedWorkingHours[row.location_id] = {};
      }
      if (!groupedWorkingHours[row.location_id][row.day_of_week]) {
        groupedWorkingHours[row.location_id][row.day_of_week] = [];
      }
      groupedWorkingHours[row.location_id][row.day_of_week].push({
        start: String(row.start_time).slice(0, 5),
        end: String(row.end_time).slice(0, 5),
      });
    });

    const nextWorkingConfig: WorkingConfigByLocationDay = {};
    const nextCustomSlots: CustomSlotsByLocationDay = {};

    locationIds.forEach((locationId) => {
      nextWorkingConfig[locationId] = createDefaultWorkingConfig(false);
      nextCustomSlots[locationId] = createDefaultCustomSlots();

      weekdays.forEach((day) => {
        const dayId = day.id;
        const stylistRanges = sortRanges(groupedWorkingHours[locationId]?.[dayId] || []);
        const centerDaySlots = centerSlotsMap[locationId]?.[dayId] || [];
        const centerSet = new Set(centerDaySlots.map((slot) => normalizeRangeKey(slot)));

        if (stylistRanges.length === 0) {
          nextWorkingConfig[locationId][dayId] = {
            active: false,
            useCustomHours: false,
          };
          centerSlotsMap[locationId][dayId] = centerDaySlots.map((slot) => ({ ...slot, active: false }));
          nextCustomSlots[locationId][dayId] = [{ ...defaultRange }];
          return;
        }

        const stylistSet = new Set(stylistRanges.map((range) => normalizeRangeKey(range)));
        const allInCenter = [...stylistSet].every((key) => centerSet.has(key));

        if (allInCenter && centerDaySlots.length > 0) {
          nextWorkingConfig[locationId][dayId] = {
            active: true,
            useCustomHours: false,
          };

          centerSlotsMap[locationId][dayId] = centerDaySlots.map((slot) => ({
            ...slot,
            active: stylistSet.has(normalizeRangeKey(slot)),
          }));

          nextCustomSlots[locationId][dayId] = stylistRanges;
          return;
        }

        nextWorkingConfig[locationId][dayId] = {
          active: true,
          useCustomHours: true,
        };
        centerSlotsMap[locationId][dayId] = centerDaySlots.map((slot) => ({ ...slot, active: false }));
        nextCustomSlots[locationId][dayId] = stylistRanges;
      });
    });

    setCenterSlots(centerSlotsMap);
    setWorkingConfig(nextWorkingConfig);
    setCustomSlots(nextCustomSlots);

    await loadTimeOffEntries(stylistId);
    await loadClosureEntries(locationIds);
  };

  const validateCustomRanges = (ranges: TimeRange[]): string | null => {
    const cleaned = ranges
      .map((range) => ({ start: range.start.trim(), end: range.end.trim() }))
      .filter((range) => range.start && range.end);

    if (cleaned.length === 0) {
      return 'Ajoutez au moins une plage horaire personnalisée valide';
    }

    const sorted = sortRanges(cleaned);

    for (let i = 0; i < sorted.length; i += 1) {
      const range = sorted[i];
      if (toMinutes(range.end) <= toMinutes(range.start)) {
        return 'Chaque plage personnalisée doit avoir une fin après le début';
      }

      if (i > 0 && toMinutes(range.start) < toMinutes(sorted[i - 1].end)) {
        return 'Les plages personnalisées ne doivent pas se chevaucher';
      }
    }

    return null;
  };

  const buildWorkingHoursPayload = (): {
    payload: Array<{ locationId: string; dayOfWeek: number; startTime: string; endTime: string }>;
    validationError: string | null;
  } => {
    const payload: Array<{ locationId: string; dayOfWeek: number; startTime: string; endTime: string }> = [];

    for (const locationId of newStylist.locationIds) {
      const locationConfig = workingConfig[locationId];
      if (!locationConfig) continue;

      for (const day of weekdays) {
        const dayConfig = locationConfig[day.id];
        if (!dayConfig?.active) continue;

        if (dayConfig.useCustomHours) {
          const dayCustomRanges = customSlots[locationId]?.[day.id] || [];
          const validationError = validateCustomRanges(dayCustomRanges);
          if (validationError) {
            return {
              payload: [],
              validationError: `${day.name} (${locations.find((l) => l.id === locationId)?.name || locationId}): ${validationError}`,
            };
          }

          sortRanges(dayCustomRanges)
            .filter((range) => range.start && range.end)
            .forEach((range) => {
              payload.push({
                locationId,
                dayOfWeek: day.id,
                startTime: normalizeTimeValue(range.start),
                endTime: normalizeTimeValue(range.end),
              });
            });

          continue;
        }

        const dayCenterSlots = (centerSlots[locationId]?.[day.id] || []).filter((slot) => slot.active);

        if (dayCenterSlots.length === 0) {
          return {
            payload: [],
            validationError: `${day.name} (${locations.find((l) => l.id === locationId)?.name || locationId}): sélectionnez au moins une plage du centre ou passez en mode personnalisé`,
          };
        }

        const invalidCenterSlot = dayCenterSlots.find((slot) => {
          const start = slot.start.trim();
          const end = slot.end.trim();

          if (!isValidHourMinute(start) || !isValidHourMinute(end)) {
            return true;
          }

          return toMinutes(end) <= toMinutes(start);
        });

        if (invalidCenterSlot) {
          return {
            payload: [],
            validationError:
              `${day.name} (${locations.find((l) => l.id === locationId)?.name || locationId}): ` +
              `plage centre invalide (${invalidCenterSlot.start} → ${invalidCenterSlot.end}). ` +
              `Corrigez les horaires du centre ou passez en mode personnalisé.`,
          };
        }

        dayCenterSlots.forEach((slot) => {
          payload.push({
            locationId,
            dayOfWeek: day.id,
            startTime: normalizeTimeValue(slot.start),
            endTime: normalizeTimeValue(slot.end),
          });
        });
      }
    }

    if (payload.length === 0) {
      return {
        payload: [],
        validationError: 'Chaque centre doit avoir au moins une plage active',
      };
    }

    return {
      payload,
      validationError: null,
    };
  };

  const saveWorkingHoursServerSide = async (
    stylistId: string,
    payload: Array<{ locationId: string; dayOfWeek: number; startTime: string; endTime: string }>
  ) => {
    const response = await fetchWithAdminAuth('/api/admin/schedule/working-hours', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stylistId,
        workingHours: payload,
      }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json.error || 'Impossible de sauvegarder les horaires');
    }

    const impactCount = Number(json.needs_replan_detected_count || 0);
    if (impactCount > 0) {
      setScheduleImpactMessage(`${impactCount} réservation(s) marquée(s) « à replanifier » après mise à jour de l\'agenda.`);
    } else {
      setScheduleImpactMessage('Horaires sauvegardés avec succès. Aucun impact de replanification détecté.');
    }
  };

  const handleStylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setErrorMessage('');
      setIsSavingSchedule(true);

      if (!newStylist.name.trim()) {
        setErrorMessage('Le nom du styliste est obligatoire');
        return;
      }

      if (newStylist.locationIds.length === 0) {
        setErrorMessage('Le styliste doit être associé à au moins un centre');
        return;
      }

      const { payload: workingHoursPayload, validationError } = buildWorkingHoursPayload();
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }

      let profileImgUrl = editMode ? stylists.find((item) => item.id === selectedStylist)?.profile_img || '' : '';

      if (stylistImageFile) {
        const uploadedUrl = await uploadFile(stylistImageFile, 'stylists');
        if (uploadedUrl) {
          profileImgUrl = uploadedUrl;
        }
      }

      let stylistId = selectedStylist;

      if (editMode) {
        const { error } = await supabase
          .from('stylists')
          .update({
            name: newStylist.name.trim(),
            bio: newStylist.bio.trim(),
            location_ids: newStylist.locationIds,
            profile_img: profileImgUrl,
          })
          .eq('id', selectedStylist);

        if (error) {
          throw new Error(`Erreur lors de la mise à jour du styliste: ${error.message}`);
        }
      } else {
        const { data, error } = await supabase
          .from('stylists')
          .insert([
            {
              name: newStylist.name.trim(),
              bio: newStylist.bio.trim(),
              location_ids: newStylist.locationIds,
              profile_img: profileImgUrl,
              active: true,
            },
          ])
          .select('id')
          .single();

        if (error || !data?.id) {
          throw new Error(`Erreur lors de la création du styliste: ${error?.message || 'ID introuvable'}`);
        }

        stylistId = data.id;
      }

      if (!stylistId) {
        throw new Error('Impossible de déterminer l\'ID du styliste');
      }

      // Services: reemplazo completo
      const { error: deleteServiceError } = await supabase
        .from('stylist_services')
        .delete()
        .eq('stylist_id', stylistId);

      if (deleteServiceError) {
        throw new Error(`Erreur lors de la suppression des services actuels: ${deleteServiceError.message}`);
      }

      if (newStylist.serviceIds.length > 0) {
        const toInsert = newStylist.serviceIds.map((serviceId) => ({
          stylist_id: stylistId,
          service_id: Number(serviceId),
        }));

        const { error: insertServiceError } = await supabase
          .from('stylist_services')
          .insert(toInsert);

        if (insertServiceError) {
          throw new Error(`Erreur lors de l\'insertion des services: ${insertServiceError.message}`);
        }
      }

      await saveWorkingHoursServerSide(stylistId, workingHoursPayload);

      await loadStylists();
      onUpdate();

      setSelectedStylist(stylistId);

      // En edición mantenemos panel abierto para seguir gestionando excepciones.
      if (!editMode) {
        await loadStylistForEdit(stylistId);
      } else {
        await loadTimeOffEntries(stylistId);
        await loadClosureEntries(newStylist.locationIds);
      }
    } catch (error) {
      console.error('stylist_submit_error', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inattendue');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleConfirmDeleteStylist = async () => {
    if (!pendingDeleteStylistId) return;

    try {
      const stylistId = pendingDeleteStylistId;
      setPendingDeleteStylistId(null);

      const { error: servicesError } = await supabase
        .from('stylist_services')
        .delete()
        .eq('stylist_id', stylistId);

      if (servicesError) {
        throw new Error(`Erreur lors de la suppression des services du styliste: ${servicesError.message}`);
      }

      const { error } = await supabase
        .from('stylists')
        .delete()
        .eq('id', stylistId);

      if (error) {
        throw new Error(`Erreur lors de la suppression du styliste: ${error.message}`);
      }

      await loadStylists();
      onUpdate();

      if (selectedStylist === stylistId) {
        resetStylistPanelState();
      }
    } catch (error) {
      console.error('stylist_delete_error', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inattendue');
    }
  };

  const openTimeOffDialog = (entry?: TimeOffEntry) => {
    if (!selectedStylist) {
      setErrorMessage('Sélectionnez d\'abord un styliste');
      return;
    }

    if (entry) {
      setEditingTimeOff(entry);
      setTimeOffForm({
        locationId: entry.location_id || '',
        startDateTime: entry.start_datetime.slice(0, 16),
        endDateTime: entry.end_datetime.slice(0, 16),
        category: entry.category,
        reason: entry.reason || '',
      });
    } else {
      setEditingTimeOff(null);
      setTimeOffForm({
        locationId: '',
        startDateTime: '',
        endDateTime: '',
        category: 'bloqueo_operativo',
        reason: '',
      });
    }

    setTimeOffDialogOpen(true);
  };

  const submitTimeOff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedStylist) {
      setErrorMessage('Styliste introuvable');
      return;
    }

    if (!timeOffForm.startDateTime || !timeOffForm.endDateTime) {
      setErrorMessage('Les dates de début et fin sont obligatoires');
      return;
    }

    try {
      const payload = {
        stylistId: selectedStylist,
        locationId: timeOffForm.locationId || null,
        startDateTime: new Date(timeOffForm.startDateTime).toISOString(),
        endDateTime: new Date(timeOffForm.endDateTime).toISOString(),
        category: timeOffForm.category,
        reason: timeOffForm.reason,
      };

      const response = editingTimeOff
        ? await fetchWithAdminAuth(`/api/admin/schedule/time-off/${editingTimeOff.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetchWithAdminAuth('/api/admin/schedule/time-off', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || 'Impossible de sauvegarder l\'indisponibilité');
      }

      setTimeOffDialogOpen(false);
      setEditingTimeOff(null);
      await loadTimeOffEntries(selectedStylist);
      setScheduleImpactMessage('Indisponibilité sauvegardée. Vérifiez les réservations à replanifier si nécessaire.');
    } catch (error) {
      console.error('time_off_submit_error', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde de l\'indisponibilité');
    }
  };

  const confirmDeleteTimeOff = async () => {
    if (!pendingDeleteTimeOffId || !selectedStylist) return;

    try {
      const response = await fetchWithAdminAuth(`/api/admin/schedule/time-off/${pendingDeleteTimeOffId}`, {
        method: 'DELETE',
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || 'Impossible de supprimer l\'indisponibilité');
      }

      setPendingDeleteTimeOffId(null);
      await loadTimeOffEntries(selectedStylist);
      setScheduleImpactMessage('Indisponibilité supprimée. Vérifiez les réservations impactées si nécessaire.');
    } catch (error) {
      console.error('time_off_delete_error', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la suppression de l\'indisponibilité');
    }
  };

  const openClosureDialog = (entry?: ClosureEntry) => {
    if (newStylist.locationIds.length === 0) {
      setErrorMessage('Associez d\'abord au moins un centre au styliste');
      return;
    }

    if (entry) {
      setEditingClosure(entry);
      setClosureForm({
        locationId: entry.location_id,
        closureDate: entry.closure_date,
        startTime: entry.start_time ? entry.start_time.slice(0, 5) : '',
        endTime: entry.end_time ? entry.end_time.slice(0, 5) : '',
        reason: entry.reason || '',
      });
    } else {
      setEditingClosure(null);
      setClosureForm({
        locationId: newStylist.locationIds[0] || '',
        closureDate: '',
        startTime: '',
        endTime: '',
        reason: '',
      });
    }

    setClosureDialogOpen(true);
  };

  const submitClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!closureForm.locationId || !closureForm.closureDate) {
      setErrorMessage('Centre et date sont obligatoires pour la fermeture');
      return;
    }

    if ((closureForm.startTime && !closureForm.endTime) || (!closureForm.startTime && closureForm.endTime)) {
      setErrorMessage('Pour une fermeture partielle, renseignez début et fin');
      return;
    }

    try {
      const payload = {
        locationId: closureForm.locationId,
        closureDate: closureForm.closureDate,
        startTime: closureForm.startTime || null,
        endTime: closureForm.endTime || null,
        reason: closureForm.reason,
      };

      const response = editingClosure
        ? await fetchWithAdminAuth(`/api/admin/schedule/location-closures/${editingClosure.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetchWithAdminAuth('/api/admin/schedule/location-closures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || 'Impossible de sauvegarder la fermeture du centre');
      }

      setClosureDialogOpen(false);
      setEditingClosure(null);
      await loadClosureEntries(newStylist.locationIds);
      setScheduleImpactMessage('Fermeture de centre sauvegardée. Vérifiez les réservations à replanifier.');
    } catch (error) {
      console.error('closure_submit_error', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde de la fermeture');
    }
  };

  const confirmDeleteClosure = async () => {
    if (!pendingDeleteClosureId) return;

    try {
      const response = await fetchWithAdminAuth(`/api/admin/schedule/location-closures/${pendingDeleteClosureId}`, {
        method: 'DELETE',
      });
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || 'Impossible de supprimer la fermeture');
      }

      setPendingDeleteClosureId(null);
      await loadClosureEntries(newStylist.locationIds);
      setScheduleImpactMessage('Fermeture supprimée. Vérifiez les réservations impactées si nécessaire.');
    } catch (error) {
      console.error('closure_delete_error', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de la suppression de la fermeture');
    }
  };

  const closePanel = () => {
    resetStylistPanelState();
  };

  useEffect(() => {
    loadStylists();
  }, []);

  useEffect(() => {
    if (!showStylistPanel || !selectedStylist) {
      return;
    }

    // Refrescar excepciones/cierres cuando panel está abierto en edición.
    loadTimeOffEntries(selectedStylist);
    loadClosureEntries(newStylist.locationIds);
  }, [showStylistPanel, selectedStylist, newStylist.locationIds]);

  return (
    <div className="admin-scope space-y-6 overflow-x-hidden">
      <SectionHeader
        title="Gestion des Stylistes"
        description="Profils, services assignés, horaires de base et exceptions d’agenda."
      />

      {!showStylistPanel && errorMessage ? (
        <div className="rounded-lg border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {!showStylistPanel && scheduleImpactMessage ? (
        <div className="rounded-lg border border-primary/35 bg-primary/10 px-4 py-3 text-sm text-primary">
          {scheduleImpactMessage}
        </div>
      ) : null}

      <Button onClick={openNewStylistPanel}>
        Ajouter nouveau styliste
      </Button>

      <div className="mb-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stylists.length === 0 ? (
            <p className="text-light">Aucun styliste enregistré.</p>
          ) : (
            stylists.map((stylist) => (
              <div
                key={stylist.id}
                className="overflow-hidden rounded-lg border border-border bg-secondary shadow-md transition-all hover:shadow-lg"
              >
                <div className="relative h-48 w-full sm:h-64">
                  {stylist.profile_img ? (
                    <Image
                      src={stylist.profile_img}
                      alt={stylist.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-dark">
                      <span className="text-4xl font-bold text-primary sm:text-6xl">
                        {stylist.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-5">
                  <h4 className="mb-2 text-xl font-bold text-primary">{stylist.name}</h4>

                  {stylist.bio ? (
                    <p className="mb-4 text-sm text-light sm:text-base">
                      {stylist.bio.length > 120 ? `${stylist.bio.substring(0, 120)}...` : stylist.bio}
                    </p>
                  ) : null}

                  <div className="mb-4">
                    <h5 className="mb-2 text-sm font-medium text-primary">Centres:</h5>
                    <div className="flex flex-wrap gap-2">
                      {stylist.location_ids?.map((locId) => (
                        <span key={locId} className="rounded-full bg-dark px-3 py-1 text-xs text-light">
                          {locations.find((loc) => loc.id === locId)?.name || 'Centre inconnu'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-border p-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => loadStylistForEdit(stylist.id)}
                  >
                    Modifier
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setPendingDeleteStylistId(stylist.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AdminSidePanel
        open={showStylistPanel}
        onOpenChange={(open) => {
          if (!open) {
            closePanel();
            return;
          }
          setShowStylistPanel(true);
        }}
        width="xl"
        title={editMode ? "Éditer le styliste" : "Nouveau styliste"}
        description="Profils, services, horaires, indisponibilités et fermetures de centre."
        footer={
          <div className="flex w-full flex-col gap-3">
            {errorMessage ? (
              <div
                className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
                aria-live="polite"
              >
                {errorMessage}
              </div>
            ) : null}
            {scheduleImpactMessage ? (
              <div
                className="rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-sm text-primary"
                role="status"
                aria-live="polite"
              >
                {scheduleImpactMessage}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={closePanel}>
                Fermer
              </Button>
              <Button
                type="submit"
                form="stylist-panel-form"
                disabled={isUploading || isSavingSchedule}
              >
                {isUploading || isSavingSchedule
                  ? 'Enregistrement...'
                  : editMode
                    ? 'Mettre à jour le styliste'
                    : 'Créer le styliste'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="stylist-panel-form" onSubmit={handleStylistSubmit} className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-4">
            <h3 className="text-base font-semibold text-primary">Informations du styliste</h3>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom</label>
              <Input
                type="text"
                value={newStylist.name}
                onChange={(e) => setNewStylist((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Biographie</label>
              <Textarea
                value={newStylist.bio}
                onChange={(e) => setNewStylist((prev) => ({ ...prev, bio: e.target.value }))}
                rows={3}
                className="min-h-[110px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image de profil</label>
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="h-auto py-2 file:mr-3 file:rounded-lg file:border file:border-primary/45 file:bg-primary/12 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format recommandé: JPEG ou PNG, taille maximale 2MB
                  </p>
                </div>

                {stylistImagePreview ? (
                  <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-border">
                    <Image src={stylistImagePreview} alt="Aperçu profil" fill className="object-cover" />
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-4">
            <h3 className="text-base font-semibold text-primary">Centres et services</h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Centres</label>
              <div className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-background p-3 md:grid-cols-2">
                {locations.map((location) => (
                  <div key={location.id} className="flex items-center text-foreground">
                    <Input
                      type="checkbox"
                      id={`location-${location.id}`}
                      checked={newStylist.locationIds.includes(location.id)}
                      onChange={(e) => {
                        void handleLocationChange(location.id, e.target.checked);
                      }}
                      className="mr-2 h-4 w-4 accent-primary"
                    />
                    <label htmlFor={`location-${location.id}`} className="cursor-pointer hover:text-primary">
                      {location.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Services</label>
              <div className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-background p-3 md:grid-cols-2">
                {services.map((service) => {
                  const value = String(service.id);
                  const checked = newStylist.serviceIds.includes(value);
                  return (
                    <div key={service.id} className="flex items-center text-foreground">
                      <Input
                        type="checkbox"
                        id={`service-${service.id}`}
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewStylist((prev) => ({ ...prev, serviceIds: [...prev.serviceIds, value] }));
                            return;
                          }
                          setNewStylist((prev) => ({
                            ...prev,
                            serviceIds: prev.serviceIds.filter((id) => id !== value),
                          }));
                        }}
                        className="mr-2 h-4 w-4 accent-primary"
                      />
                      <label htmlFor={`service-${service.id}`} className="cursor-pointer hover:text-primary">
                        {service.nombre} - {service.precio} CHF
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-4">
            <h3 className="text-base font-semibold text-primary">Horaires de base</h3>
            <p className="text-sm text-muted-foreground">
              Utilisez les plages du centre ou des plages personnalisées multiples par jour.
            </p>

            {newStylist.locationIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sélectionnez au moins un centre pour configurer les horaires.</p>
            ) : (
              <div className="space-y-5">
                {newStylist.locationIds.map((locationId) => {
                  const location = locations.find((item) => item.id === locationId);
                  const locationConfig = workingConfig[locationId] || createDefaultWorkingConfig(false);

                  return (
                    <div key={`schedule-${locationId}`} className="rounded-xl border border-border bg-background p-3">
                      <h4 className="mb-3 text-sm font-semibold text-primary">{location?.name || locationId}</h4>
                      <div className="space-y-3">
                        {weekdays.map((day) => {
                          const dayConfig = locationConfig[day.id] || { active: false, useCustomHours: false };
                          const dayCenterSlots = centerSlots[locationId]?.[day.id] || [];
                          const dayCustomSlots = customSlots[locationId]?.[day.id] || [{ ...defaultRange }];

                          return (
                            <div key={`${locationId}-${day.id}`} className="rounded-lg border border-border p-3">
                              <div className="mb-3 flex flex-wrap items-center gap-3">
                                <div className="flex items-center">
                                  <Input
                                    type="checkbox"
                                    id={`active-${locationId}-${day.id}`}
                                    checked={dayConfig.active}
                                    onChange={(e) => updateDayConfig(locationId, day.id, { active: e.target.checked })}
                                    className="mr-2 h-4 w-4 accent-primary"
                                  />
                                  <label htmlFor={`active-${locationId}-${day.id}`} className="font-medium text-foreground">
                                    {day.name}
                                  </label>
                                </div>

                                {dayConfig.active ? (
                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="radio"
                                        id={`center-mode-${locationId}-${day.id}`}
                                        name={`mode-${locationId}-${day.id}`}
                                        checked={!dayConfig.useCustomHours}
                                        onChange={() => updateDayConfig(locationId, day.id, { useCustomHours: false })}
                                        className="h-4 w-4 accent-primary"
                                      />
                                      <label htmlFor={`center-mode-${locationId}-${day.id}`} className="text-sm text-foreground">
                                        Horaires du centre
                                      </label>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="radio"
                                        id={`custom-mode-${locationId}-${day.id}`}
                                        name={`mode-${locationId}-${day.id}`}
                                        checked={dayConfig.useCustomHours}
                                        onChange={() => {
                                          updateDayConfig(locationId, day.id, { useCustomHours: true });
                                          ensureCustomSlotsForDay(locationId, day.id);
                                        }}
                                        className="h-4 w-4 accent-primary"
                                      />
                                      <label htmlFor={`custom-mode-${locationId}-${day.id}`} className="text-sm text-foreground">
                                        Horaires personnalisés
                                      </label>
                                    </div>
                                  </div>
                                ) : null}
                              </div>

                              {dayConfig.active ? (
                                dayConfig.useCustomHours ? (
                                  <div className="space-y-2 rounded-lg border border-border bg-card p-2">
                                    {dayCustomSlots.map((slot, slotIndex) => (
                                      <div key={slotIndex} className="flex flex-wrap items-center gap-2">
                                        <Input
                                          type="time"
                                          value={slot.start}
                                          onChange={(e) =>
                                            updateCustomSlot(locationId, day.id, slotIndex, 'start', e.target.value)
                                          }
                                          className="w-[140px]"
                                        />
                                        <span className="text-muted-foreground">à</span>
                                        <Input
                                          type="time"
                                          value={slot.end}
                                          onChange={(e) =>
                                            updateCustomSlot(locationId, day.id, slotIndex, 'end', e.target.value)
                                          }
                                          className="w-[140px]"
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => removeCustomSlot(locationId, day.id, slotIndex)}
                                        >
                                          Retirer
                                        </Button>
                                      </div>
                                    ))}
                                    <Button type="button" variant="secondary" onClick={() => addCustomSlot(locationId, day.id)}>
                                      Ajouter une plage
                                    </Button>
                                  </div>
                                ) : dayCenterSlots.length > 0 ? (
                                  <div className="grid gap-2 rounded-lg border border-border bg-card p-2">
                                    {dayCenterSlots.map((slot, slotIndex) => (
                                      <label
                                        key={`${slot.start}-${slot.end}-${slotIndex}`}
                                        className={`flex cursor-pointer items-center rounded border px-2 py-1.5 text-sm ${
                                          slot.active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'
                                        }`}
                                      >
                                        <Input
                                          type="checkbox"
                                          checked={slot.active}
                                          onChange={() => toggleCenterSlot(locationId, day.id, slotIndex)}
                                          className="mr-2 h-4 w-4 accent-primary"
                                        />
                                        {slot.start} - {slot.end}
                                      </label>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                                    Aucune plage de centre configurée pour ce jour. Passez en mode personnalisé.
                                  </p>
                                )
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {editMode ? (
            <>
              <section className="space-y-4 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-primary">Indisponibilités du styliste</h3>
                  <Button type="button" variant="secondary" onClick={() => openTimeOffDialog()}>
                    Ajouter indisponibilité
                  </Button>
                </div>

                {timeOffEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune indisponibilité enregistrée.</p>
                ) : (
                  <div className="space-y-2">
                    {timeOffEntries.map((entry) => {
                      const locationName = entry.location_id
                        ? locations.find((location) => location.id === entry.location_id)?.name || entry.location_id
                        : 'Tous centres';
                      return (
                        <div key={entry.id} className="rounded-lg border border-border bg-background p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {getTimeOffCategoryLabel(entry.category)}
                              </p>
                              <p className="text-xs text-muted-foreground">{locationName}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(entry.start_datetime).toLocaleString('fr-FR')} →{' '}
                                {new Date(entry.end_datetime).toLocaleString('fr-FR')}
                              </p>
                              {entry.reason ? (
                                <p className="mt-1 text-xs text-muted-foreground">{entry.reason}</p>
                              ) : null}
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" onClick={() => openTimeOffDialog(entry)}>
                                Éditer
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => setPendingDeleteTimeOffId(entry.id)}
                              >
                                Supprimer
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="space-y-4 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-primary">Fermetures des centres associés</h3>
                  <Button type="button" variant="secondary" onClick={() => openClosureDialog()}>
                    Ajouter fermeture
                  </Button>
                </div>

                {closuresEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune fermeture enregistrée pour ces centres.</p>
                ) : (
                  <div className="space-y-2">
                    {closuresEntries.map((entry) => {
                      const locationName = locations.find((location) => location.id === entry.location_id)?.name || entry.location_id;
                      return (
                        <div key={entry.id} className="rounded-lg border border-border bg-background p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{locationName}</p>
                              <p className="text-xs text-muted-foreground">
                                {entry.closure_date}{' '}
                                {entry.start_time && entry.end_time
                                  ? `(${entry.start_time.slice(0, 5)} - ${entry.end_time.slice(0, 5)})`
                                  : '(Journée complète)'}
                              </p>
                              {entry.reason ? (
                                <p className="mt-1 text-xs text-muted-foreground">{entry.reason}</p>
                              ) : null}
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" onClick={() => openClosureDialog(entry)}>
                                Éditer
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => setPendingDeleteClosureId(entry.id)}
                              >
                                Supprimer
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="space-y-2 rounded-xl border border-border bg-card p-4">
                <h3 className="text-base font-semibold text-primary">Impact & replanification</h3>
                <p className="text-sm text-muted-foreground">
                  Après sauvegarde des horaires/exceptions, les réservations impactées passent automatiquement en état
                  « à replanifier ».
                </p>
                <Button type="button" variant="outline" onClick={() => window.location.assign('/admin/reservations?status=needs_replan')}>
                  Ouvrir réservations à replanifier
                </Button>
              </section>
            </>
          ) : null}
        </form>
      </AdminSidePanel>

      {/* Dialog: confirmation suppressions */}
      <Dialog open={Boolean(pendingDeleteStylistId)} onOpenChange={(open) => !open && setPendingDeleteStylistId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce styliste ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible et supprimera aussi ses associations de services.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDeleteStylistId(null)}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmDeleteStylist}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDeleteTimeOffId)} onOpenChange={(open) => !open && setPendingDeleteTimeOffId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette indisponibilité ?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDeleteTimeOffId(null)}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteTimeOff}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDeleteClosureId)} onOpenChange={(open) => !open && setPendingDeleteClosureId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette fermeture ?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDeleteClosureId(null)}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteClosure}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: time_off */}
      <Dialog open={timeOffDialogOpen} onOpenChange={setTimeOffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTimeOff ? 'Éditer indisponibilité' : 'Nouvelle indisponibilité'}</DialogTitle>
            <DialogDescription>
              Configurez une absence/vacance/indisponibilité du styliste.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitTimeOff} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Catégorie</label>
              <select
                value={timeOffForm.category}
                onChange={(e) =>
                  setTimeOffForm((prev) => ({
                    ...prev,
                    category: e.target.value as TimeOffFormState['category'],
                  }))
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="vacaciones">Vacances</option>
                <option value="baja">Arrêt maladie</option>
                <option value="descanso">Repos</option>
                <option value="formacion">Formation</option>
                <option value="bloqueo_operativo">Blocage opérationnel</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Centre (optionnel)</label>
              <select
                value={timeOffForm.locationId}
                onChange={(e) => setTimeOffForm((prev) => ({ ...prev, locationId: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Tous centres du styliste</option>
                {selectedLocationOptions.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Début</label>
                <Input
                  type="datetime-local"
                  value={timeOffForm.startDateTime}
                  onChange={(e) => setTimeOffForm((prev) => ({ ...prev, startDateTime: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Fin</label>
                <Input
                  type="datetime-local"
                  value={timeOffForm.endDateTime}
                  onChange={(e) => setTimeOffForm((prev) => ({ ...prev, endDateTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Motif (optionnel)</label>
              <Textarea
                value={timeOffForm.reason}
                onChange={(e) => setTimeOffForm((prev) => ({ ...prev, reason: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTimeOffDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">{editingTimeOff ? 'Mettre à jour' : 'Créer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: closures */}
      <Dialog open={closureDialogOpen} onOpenChange={setClosureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClosure ? 'Éditer fermeture' : 'Nouvelle fermeture'}</DialogTitle>
            <DialogDescription>
              Configurez une fermeture complète ou partielle du centre.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitClosure} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Centre</label>
              <select
                value={closureForm.locationId}
                onChange={(e) => setClosureForm((prev) => ({ ...prev, locationId: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                required
              >
                <option value="" disabled>
                  Sélectionnez un centre
                </option>
                {selectedLocationOptions.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Date</label>
              <Input
                type="date"
                value={closureForm.closureDate}
                onChange={(e) => setClosureForm((prev) => ({ ...prev, closureDate: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Début (optionnel)</label>
                <Input
                  type="time"
                  value={closureForm.startTime}
                  onChange={(e) => setClosureForm((prev) => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Fin (optionnel)</label>
                <Input
                  type="time"
                  value={closureForm.endTime}
                  onChange={(e) => setClosureForm((prev) => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Motif (optionnel)</label>
              <Textarea
                value={closureForm.reason}
                onChange={(e) => setClosureForm((prev) => ({ ...prev, reason: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClosureDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">{editingClosure ? 'Mettre à jour' : 'Créer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
