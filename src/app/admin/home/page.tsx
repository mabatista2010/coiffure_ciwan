'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { type IconType } from 'react-icons';
import {
  FaArrowRight,
  FaBell,
  FaBuilding,
  FaCalendarAlt,
  FaChartBar,
  FaCheck,
  FaCheckDouble,
  FaClock,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaShoppingBag,
  FaSyncAlt,
  FaTools,
  FaUserCog,
  FaUsers,
} from 'react-icons/fa';
import { Loader2, Settings2, X } from 'lucide-react';
import { useAdminAccess } from '@/components/admin/AdminAccessProvider';
import { AdminCard, AdminCardContent, AdminCardHeader, SectionHeader, StatusBadge } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchWithStaffAuth } from '@/lib/fetchWithStaffAuth';
import { getPermissionScopeFilter, hasPermission } from '@/lib/permissions/helpers';
import type { StaffRole } from '@/lib/permissions/catalog';
import { supabase, type Booking, type Location, type Service, type Stylist } from '@/lib/supabase';

type DashboardRole = StaffRole | 'all';

type BookingWithDetails = Pick<
  Booking,
  | 'id'
  | 'booking_date'
  | 'start_time'
  | 'end_time'
  | 'status'
  | 'customer_name'
  | 'customer_email'
  | 'customer_phone'
  | 'stylist_id'
> & {
  stylist?: Pick<Stylist, 'id' | 'name' | 'profile_img'> | null;
  location?: Pick<Location, 'id' | 'name'> | null;
  service?: Pick<Service, 'id' | 'nombre' | 'precio' | 'duration'> | null;
};

type BookingRelation<T> = T | T[] | null | undefined;

type BookingRowFromQuery = Omit<BookingWithDetails, 'stylist' | 'location' | 'service'> & {
  stylist?: BookingRelation<Pick<Stylist, 'id' | 'name' | 'profile_img'>>;
  location?: BookingRelation<Pick<Location, 'id' | 'name'>>;
  service?: BookingRelation<Pick<Service, 'id' | 'nombre' | 'precio' | 'duration'>>;
};

type QuickActionCommand = 'open_pending_panel' | 'refresh_dashboard';

type DashboardActionBase = {
  id: string;
  title: string;
  description: string;
  icon: IconType;
  role: DashboardRole;
};

type DashboardRouteAction = DashboardActionBase & {
  type: 'route';
  href: string;
};

type DashboardCommandAction = DashboardActionBase & {
  type: 'command';
  command: QuickActionCommand;
};

type DashboardQuickAction = DashboardRouteAction | DashboardCommandAction;

type AlertLevel = 'info' | 'warning' | 'critical';
type AlertActionKey = 'open_pending_panel' | null;

type DashboardAlert = {
  id: string;
  title: string;
  description: string;
  level: AlertLevel;
  actionLabel?: string;
  actionKey?: AlertActionKey;
};

type PendingBookingsResponse = {
  bookings?: BookingWithDetails[];
  scope?: {
    role?: 'admin' | 'staff';
    stylist_id?: string | null;
    location_ids?: string[] | null;
    code?: string;
  };
  code?: string;
  error?: string;
};

type PendingConfirmResponse = {
  updated_count?: number;
  updated_ids?: string[];
  eligible_count?: number;
  requested_count?: number;
  skipped_count?: number;
  code?: string;
  error?: string;
};

const KPI_VALUE_CLASS =
  "mt-1 min-h-[2rem] text-2xl font-semibold leading-[1.2] tracking-tight tabular-nums [font-variant-numeric:tabular-nums] whitespace-nowrap";

const QUICK_ACTIONS: DashboardQuickAction[] = [
  {
    id: 'new-booking',
    type: 'route',
    href: '/admin/reservations/nueva',
    title: 'Nouvelle réservation',
    description: 'Créer une réservation manuellement',
    icon: FaCalendarAlt,
    role: 'all',
  },
  {
    id: 'pending-day',
    type: 'route',
    href: '/admin/reservations?status=pending&view=day',
    title: 'En attente (jour)',
    description: 'Afficher les réservations en attente du jour',
    icon: FaClock,
    role: 'all',
  },
  {
    id: 'week-calendar',
    type: 'route',
    href: '/admin/reservations?view=week',
    title: 'Calendrier semaine',
    description: 'Passer directement à la vue hebdomadaire',
    icon: FaCalendarAlt,
    role: 'all',
  },
  {
    id: 'crm-clients',
    type: 'route',
    href: '/admin/crm',
    title: 'CRM clients',
    description: 'Fiches clients et notes',
    icon: FaUsers,
    role: 'all',
  },
  {
    id: 'open-pending-panel',
    type: 'command',
    command: 'open_pending_panel',
    title: 'Panel en attente',
    description: 'Ouvrir le panneau de validation rapide',
    icon: FaBell,
    role: 'all',
  },
  {
    id: 'refresh-dashboard',
    type: 'command',
    command: 'refresh_dashboard',
    title: 'Actualiser dashboard',
    description: 'Recharger les données du tableau de bord',
    icon: FaSyncAlt,
    role: 'all',
  },
  {
    id: 'config-services',
    type: 'route',
    href: '/admin?section=services',
    title: 'Configurer services',
    description: 'Mettre à jour la carte des prestations',
    icon: FaTools,
    role: 'admin',
  },
  {
    id: 'config-stylists',
    type: 'route',
    href: '/admin?section=stylists',
    title: 'Configurer stylistes',
    description: 'Gérer les profils et disponibilités',
    icon: FaUserCog,
    role: 'admin',
  },
  {
    id: 'config-locations',
    type: 'route',
    href: '/admin?section=locations',
    title: 'Configurer centres',
    description: 'Modifier les informations des centres',
    icon: FaBuilding,
    role: 'admin',
  },
  {
    id: 'config-gallery',
    type: 'route',
    href: '/admin?section=gallery',
    title: 'Configurer galerie',
    description: 'Actualiser les visuels de la galerie',
    icon: FaShoppingBag,
    role: 'admin',
  },
  {
    id: 'stats-stylists',
    type: 'route',
    href: '/admin/stylist-stats',
    title: 'Stats stylistes',
    description: 'Performance par styliste',
    icon: FaChartBar,
    role: 'admin',
  },
  {
    id: 'stats-locations',
    type: 'route',
    href: '/admin/location-stats',
    title: 'Stats centres',
    description: 'Performance par centre',
    icon: FaBuilding,
    role: 'admin',
  },
  {
    id: 'user-management',
    type: 'route',
    href: '/admin/user-management',
    title: 'Utilisateurs',
    description: 'Gestion des accès',
    icon: FaUserCog,
    role: 'admin',
  },
  {
    id: 'boutique',
    type: 'route',
    href: '/admin/boutique',
    title: 'Boutique',
    description: 'Produits et commandes',
    icon: FaShoppingBag,
    role: 'admin',
  },
  {
    id: 'stripe-diagnostics',
    type: 'route',
    href: '/admin/webhook-diagnostics',
    title: 'Diagnostic Stripe',
    description: 'Contrôler webhooks et événements Stripe',
    icon: FaBell,
    role: 'admin',
  },
];

const QUICK_ACTIONS_MAX_VISIBLE = 5;

const STATUS_PRIORITY: Record<Booking['status'], number> = {
  pending: 0,
  needs_replan: 1,
  confirmed: 2,
  completed: 3,
  cancelled: 4,
};

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseBookingDateTime(booking: Pick<BookingWithDetails, 'booking_date' | 'start_time'>): Date | null {
  if (!booking.booking_date || !booking.start_time) return null;
  const [year, month, day] = booking.booking_date.split('-').map(Number);
  const [hour, minute] = booking.start_time.split(':').map(Number);

  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) {
    return null;
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function formatTime(value?: string): string {
  if (!value) return '--:--';
  return value.slice(0, 5);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: 'CHF',
  }).format(value);
}

function formatHumanDate(date: Date): string {
  const label = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function firstRelationItem<T>(value: BookingRelation<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeBookingRows(rows: BookingRowFromQuery[]): BookingWithDetails[] {
  return rows.map((row) => ({
    ...row,
    stylist: firstRelationItem(row.stylist),
    location: firstRelationItem(row.location),
    service: firstRelationItem(row.service),
  }));
}

function getAlertStyles(level: AlertLevel): string {
  if (level === 'critical') {
    return 'border-destructive/40 bg-destructive/10 text-destructive-foreground';
  }

  if (level === 'warning') {
    return 'border-amber-400/45 bg-amber-500/10 text-amber-900';
  }

  return 'border-blue-400/40 bg-blue-500/10 text-blue-900';
}

export default function AdminHomePage() {
  const { accessContext, isLoading: loadingAccess } = useAdminAccess();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string>('Utilisateur');

  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingsToday, setBookingsToday] = useState<BookingWithDetails[]>([]);
  const [bookingsNextDays, setBookingsNextDays] = useState<BookingWithDetails[]>([]);
  const [pendingUpcomingTotal, setPendingUpcomingTotal] = useState<number>(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [isPendingPanelOpen, setIsPendingPanelOpen] = useState(false);
  const [pendingPanelLoading, setPendingPanelLoading] = useState(false);
  const [pendingPanelSubmitting, setPendingPanelSubmitting] = useState(false);
  const [pendingPanelError, setPendingPanelError] = useState<string | null>(null);
  const [pendingPanelSuccess, setPendingPanelSuccess] = useState<string | null>(null);
  const [pendingPanelBookings, setPendingPanelBookings] = useState<BookingWithDetails[]>([]);
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);
  const [confirmApproveAllOpen, setConfirmApproveAllOpen] = useState(false);
  const [isQuickActionsModalOpen, setIsQuickActionsModalOpen] = useState(false);
  const [selectedQuickActionIds, setSelectedQuickActionIds] = useState<string[]>([]);
  const [quickActionsReady, setQuickActionsReady] = useState(false);
  const role = accessContext?.role ?? null;
  const associatedStylistId = accessContext?.associatedStylistId ?? null;

  useEffect(() => {
    const fetchSessionMetadata = async () => {
      const sessionResult = await supabase.auth.getSession();
      const user = sessionResult.data.session?.user || null;

      const rawName =
        (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
        (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
        (user?.email ? user.email.split('@')[0] : '');

      const normalizedName =
        rawName
          .replace(/[._-]+/g, ' ')
          .split(' ')
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ') || 'Utilisateur';

      setCurrentUserId(user?.id ?? null);
      setUserDisplayName(normalizedName);
    };

    void fetchSessionMetadata();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (loadingAccess) return;

    setLoadingData(true);
    setError(null);

    const today = new Date();
    const todayKey = toDateKey(today);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekKey = toDateKey(nextWeek);

    const reservationsScope = getPermissionScopeFilter(accessContext, 'reservations.view');

    if (reservationsScope.kind === 'none') {
      setBookingsToday([]);
      setBookingsNextDays([]);
      setPendingUpcomingTotal(0);
      setLastUpdatedAt(new Date());
      setLoadingData(false);
      return;
    }

    const selection = `
      id,
      booking_date,
      start_time,
      end_time,
      status,
      customer_name,
      customer_email,
      customer_phone,
      stylist_id,
      stylist:stylists(id,name,profile_img),
      location:locations(id,name),
      service:servicios(id,nombre,precio,duration)
    `;

    try {
      const todayQuery = supabase
        .from('bookings')
        .select(selection)
        .eq('booking_date', todayKey);

      const weekQuery = supabase
        .from('bookings')
        .select(selection)
        .gte('booking_date', todayKey)
        .lte('booking_date', nextWeekKey);

      const pendingCountQuery = supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('booking_date', todayKey);

      const scopedTodayQuery =
        reservationsScope.kind === 'stylist'
          ? todayQuery.eq('stylist_id', reservationsScope.stylistId)
          : reservationsScope.kind === 'locations'
            ? todayQuery.in('location_id', reservationsScope.locationIds)
            : todayQuery;
      const scopedWeekQuery =
        reservationsScope.kind === 'stylist'
          ? weekQuery.eq('stylist_id', reservationsScope.stylistId)
          : reservationsScope.kind === 'locations'
            ? weekQuery.in('location_id', reservationsScope.locationIds)
            : weekQuery;
      const scopedPendingCountQuery =
        reservationsScope.kind === 'stylist'
          ? pendingCountQuery.eq('stylist_id', reservationsScope.stylistId)
          : reservationsScope.kind === 'locations'
            ? pendingCountQuery.in('location_id', reservationsScope.locationIds)
            : pendingCountQuery;

      const [todayResponse, weekResponse, pendingResponse] = await Promise.all([
        scopedTodayQuery.order('start_time', { ascending: true }),
        scopedWeekQuery
          .order('booking_date', { ascending: true })
          .order('start_time', { ascending: true }),
        scopedPendingCountQuery,
      ]);

      if (todayResponse.error) {
        throw todayResponse.error;
      }

      if (weekResponse.error) {
        throw weekResponse.error;
      }

      if (pendingResponse.error) {
        throw pendingResponse.error;
      }

      setBookingsToday(normalizeBookingRows((todayResponse.data || []) as BookingRowFromQuery[]));
      setBookingsNextDays(normalizeBookingRows((weekResponse.data || []) as BookingRowFromQuery[]));
      setPendingUpcomingTotal(pendingResponse.count || 0);
      setLastUpdatedAt(new Date());
    } catch (fetchError) {
      console.error('admin_home_dashboard_error', fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Erreur lors du chargement du tableau de bord'
      );
    } finally {
      setLoadingData(false);
    }
  }, [accessContext, loadingAccess]);

  useEffect(() => {
    if (loadingAccess) return;
    void fetchDashboardData();
  }, [fetchDashboardData, loadingAccess]);

  const fetchPendingPanelBookings = useCallback(async () => {
    setPendingPanelLoading(true);
    setPendingPanelError(null);

    try {
      const response = await fetchWithStaffAuth('/api/admin/bookings/pending');
      const payload = (await response.json().catch(() => ({}))) as PendingBookingsResponse;

      if (!response.ok) {
        throw new Error(payload.error || 'Impossible de charger les réservations en attente');
      }

      const fetchedBookings = payload.bookings || [];
      setPendingPanelBookings(fetchedBookings);
      setSelectedPendingIds((previous) =>
        previous.filter((id) => fetchedBookings.some((booking) => booking.id === id))
      );

      if (
        payload.scope?.code === 'employee_without_stylist' ||
        payload.scope?.code === 'missing_associated_stylist'
      ) {
        setPendingPanelError('Aucun styliste associé à ce compte staff. Impossible de valider les réservations.');
      }
    } catch (fetchError) {
      console.error('pending_panel_fetch_error', fetchError);
      setPendingPanelError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Erreur lors du chargement des réservations en attente'
      );
    } finally {
      setPendingPanelLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPendingPanelOpen) return;
    fetchPendingPanelBookings();
  }, [fetchPendingPanelBookings, isPendingPanelOpen]);

  const handleApprovePending = useCallback(
    async (options: { approveAll?: boolean; bookingIds?: string[] }) => {
      if (pendingPanelSubmitting) return;

      const approveAll = Boolean(options.approveAll);
      const bookingIds = Array.from(new Set((options.bookingIds || []).filter(Boolean)));

      if (!approveAll && bookingIds.length === 0) {
        return;
      }

      setPendingPanelSubmitting(true);
      setPendingPanelError(null);
      setPendingPanelSuccess(null);

      try {
        const response = await fetchWithStaffAuth('/api/admin/bookings/pending', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ approveAll, bookingIds }),
        });

        const payload = (await response.json().catch(() => ({}))) as PendingConfirmResponse;

        if (!response.ok) {
          throw new Error(payload.error || 'Impossible de confirmer les réservations');
        }

        const updatedCount = payload.updated_count || 0;
        const skippedCount = payload.skipped_count || 0;

        if (updatedCount === 0) {
          setPendingPanelSuccess('Aucune réservation n’a été validée (déjà traitée ou hors scope).');
        } else if (skippedCount > 0) {
          setPendingPanelSuccess(`${updatedCount} réservation(s) validée(s), ${skippedCount} ignorée(s).`);
        } else {
          setPendingPanelSuccess(`${updatedCount} réservation(s) validée(s) avec succès.`);
        }

        await Promise.all([fetchPendingPanelBookings(), fetchDashboardData()]);
      } catch (approveError) {
        console.error('pending_panel_approve_error', approveError);
        setPendingPanelError(
          approveError instanceof Error
            ? approveError.message
            : 'Erreur lors de la validation des réservations'
        );
      } finally {
        setPendingPanelSubmitting(false);
      }
    },
    [fetchDashboardData, fetchPendingPanelBookings, pendingPanelSubmitting]
  );

  const allPendingSelected =
    pendingPanelBookings.length > 0 && selectedPendingIds.length === pendingPanelBookings.length;

  const availableQuickActions = useMemo(() => {
    if (!accessContext) return [];

    return QUICK_ACTIONS.filter((item) => {
      if (accessContext.role === 'admin') return true;

      switch (item.id) {
        case 'new-booking':
          return hasPermission(accessContext, 'reservations.create');
        case 'pending-day':
        case 'open-pending-panel':
          return hasPermission(accessContext, 'reservations.manage_pending');
        case 'week-calendar':
          return hasPermission(accessContext, 'reservations.view');
        case 'crm-clients':
          return (
            hasPermission(accessContext, 'crm.customers.view') ||
            hasPermission(accessContext, 'crm.customers.edit') ||
            hasPermission(accessContext, 'crm.notes.view') ||
            hasPermission(accessContext, 'crm.notes.create')
          );
        case 'refresh-dashboard':
          return hasPermission(accessContext, 'dashboard.view');
        case 'config-services':
          return hasPermission(accessContext, 'services.view');
        case 'config-stylists':
          return (
            hasPermission(accessContext, 'stylists.profile.view') ||
            hasPermission(accessContext, 'stylists.operations.view')
          );
        case 'config-locations':
          return (
            hasPermission(accessContext, 'locations.profile.view') ||
            hasPermission(accessContext, 'locations.operations.view')
          );
        case 'config-gallery':
          return hasPermission(accessContext, 'gallery.view');
        case 'stats-stylists':
        case 'stats-locations':
          return hasPermission(accessContext, 'stats.view');
        case 'boutique':
          return (
            hasPermission(accessContext, 'boutique.orders.view') ||
            hasPermission(accessContext, 'boutique.catalog.view')
          );
        case 'user-management':
        case 'stripe-diagnostics':
          return false;
        default:
          return item.role === 'all';
      }
    });
  }, [accessContext]);

  const defaultQuickActionIds = useMemo(
    () =>
      availableQuickActions
        .slice(0, QUICK_ACTIONS_MAX_VISIBLE)
        .map((item) => item.id),
    [availableQuickActions]
  );

  const quickActionsStorageKey = useMemo(() => {
    if (!currentUserId || !role) return null;
    return `admin-home:quick-actions:v1:${currentUserId}:${role}`;
  }, [currentUserId, role]);

  useEffect(() => {
    if (!quickActionsStorageKey) {
      setSelectedQuickActionIds([]);
      setQuickActionsReady(false);
      return;
    }

    const availableIds = new Set(availableQuickActions.map((action) => action.id));
    const fallbackIds = defaultQuickActionIds;
    let nextSelection = fallbackIds;

    try {
      const rawValue = window.localStorage.getItem(quickActionsStorageKey);
      if (rawValue) {
        const parsed = JSON.parse(rawValue);
        if (Array.isArray(parsed)) {
          const filtered = Array.from(
            new Set(
              parsed.filter((value): value is string => typeof value === 'string' && availableIds.has(value))
            )
          ).slice(0, QUICK_ACTIONS_MAX_VISIBLE);

          if (filtered.length > 0) {
            nextSelection = filtered;
          }
        }
      }
    } catch (storageError) {
      console.warn('quick_actions_storage_parse_error', storageError);
    }

    setSelectedQuickActionIds(nextSelection);
    setQuickActionsReady(true);
  }, [availableQuickActions, defaultQuickActionIds, quickActionsStorageKey]);

  useEffect(() => {
    if (!quickActionsStorageKey || !quickActionsReady) return;

    window.localStorage.setItem(
      quickActionsStorageKey,
      JSON.stringify(selectedQuickActionIds.slice(0, QUICK_ACTIONS_MAX_VISIBLE))
    );
  }, [quickActionsReady, quickActionsStorageKey, selectedQuickActionIds]);

  const toggleQuickActionSelection = useCallback((actionId: string) => {
    setSelectedQuickActionIds((current) => {
      if (current.includes(actionId)) {
        return current.filter((id) => id !== actionId);
      }

      if (current.length >= QUICK_ACTIONS_MAX_VISIBLE) {
        return current;
      }

      return [...current, actionId];
    });
  }, []);

  const resetQuickActionsSelection = useCallback(() => {
    setSelectedQuickActionIds(defaultQuickActionIds);
  }, [defaultQuickActionIds]);

  const runQuickActionCommand = useCallback(
    (command: QuickActionCommand) => {
      if (command === 'open_pending_panel') {
        setPendingPanelSuccess(null);
        setIsPendingPanelOpen(true);
        return;
      }

      if (command === 'refresh_dashboard') {
        fetchDashboardData();
      }
    },
    [fetchDashboardData]
  );

  const quickActions = useMemo(
    () => {
      const actionById = new Map(availableQuickActions.map((action) => [action.id, action] as const));
      const selectedActions = selectedQuickActionIds
        .map((actionId) => actionById.get(actionId))
        .filter((action): action is DashboardQuickAction => Boolean(action))
        .slice(0, QUICK_ACTIONS_MAX_VISIBLE);

      if (selectedActions.length > 0) {
        return selectedActions;
      }

      return availableQuickActions.slice(0, QUICK_ACTIONS_MAX_VISIBLE);
    },
    [availableQuickActions, selectedQuickActionIds]
  );
  const isQuickActionSelectionFull = selectedQuickActionIds.length >= QUICK_ACTIONS_MAX_VISIBLE;

  const todaySorted = useMemo(() => {
    return [...bookingsToday].sort((a, b) => {
      const left = parseBookingDateTime(a)?.getTime() ?? 0;
      const right = parseBookingDateTime(b)?.getTime() ?? 0;

      if (left !== right) return left - right;
      return STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    });
  }, [bookingsToday]);

  const nextAppointments = useMemo(() => {
    const currentTime = Date.now();

    return todaySorted
      .filter((booking) => {
        const dateTime = parseBookingDateTime(booking);
        return dateTime ? dateTime.getTime() >= currentTime : false;
      })
      .filter((booking) => booking.status !== 'cancelled')
      .slice(0, 8);
  }, [todaySorted]);

  const totals = useMemo(() => {
    const total = bookingsToday.length;
    const pending = bookingsToday.filter((booking) => booking.status === 'pending').length;
    const confirmed = bookingsToday.filter((booking) => booking.status === 'confirmed').length;
    const completed = bookingsToday.filter((booking) => booking.status === 'completed').length;
    const cancelled = bookingsToday.filter((booking) => booking.status === 'cancelled').length;

    const estimatedRevenueToday = bookingsToday.reduce((sum, booking) => {
      if (booking.status === 'cancelled') return sum;
      return sum + Number(booking.service?.precio || 0);
    }, 0);

    const estimatedRevenueWeek = bookingsNextDays.reduce((sum, booking) => {
      if (booking.status === 'cancelled') return sum;
      return sum + Number(booking.service?.precio || 0);
    }, 0);

    const activeToday = total - cancelled;
    const completionRate = activeToday > 0 ? Math.round((completed / activeToday) * 100) : 0;

    return {
      total,
      pending,
      confirmed,
      completed,
      cancelled,
      estimatedRevenueToday,
      estimatedRevenueWeek,
      completionRate,
    };
  }, [bookingsNextDays, bookingsToday]);

  const alerts = useMemo<DashboardAlert[]>(() => {
    const items: DashboardAlert[] = [];
    const reservationsScope = getPermissionScopeFilter(accessContext, 'reservations.view');

    if (
      role === 'staff' &&
      reservationsScope.kind === 'none' &&
      reservationsScope.code === 'missing_associated_stylist'
    ) {
      items.push({
        id: 'staff-without-stylist',
        title: 'Compte staff sans styliste associé',
        description: 'Associez un styliste à ce compte pour activer son scope de réservation.',
        level: 'critical',
      });
    }

    if (totals.total === 0) {
      items.push({
        id: 'no-bookings-today',
        title: 'Aucune réservation aujourd’hui',
        description: 'Vous pouvez anticiper en ajoutant des réservations pour les prochains jours.',
        level: 'info',
      });
    }

    if (pendingUpcomingTotal > 0) {
      items.push({
        id: 'pending-bookings',
        title:
          role === 'staff' && associatedStylistId
            ? `${pendingUpcomingTotal} réservation(s) en attente sur votre planning`
            : `${pendingUpcomingTotal} réservation(s) en attente`,
        description:
          role === 'staff' && associatedStylistId
            ? 'Validez vos demandes en attente pour éviter les pertes de créneaux.'
            : 'Validez les demandes en attente pour éviter les pertes de créneaux.',
        level: 'warning',
        actionLabel: 'Voir les réservations en attente',
        actionKey: 'open_pending_panel',
      });
    }

    const missingContacts = bookingsNextDays.filter(
      (booking) => !booking.customer_email?.trim() || !booking.customer_phone?.trim()
    ).length;

    if (missingContacts > 0) {
      items.push({
        id: 'missing-contact',
        title: `${missingContacts} client(s) sans contact complet`,
        description: 'Complétez e-mail et téléphone pour améliorer le suivi client.',
        level: 'warning',
      });
    }

    const duplicateSlots = new Map<string, number>();
    bookingsNextDays.forEach((booking) => {
      const key = `${booking.booking_date}|${booking.start_time}|${booking.stylist?.id || 'unknown'}`;
      duplicateSlots.set(key, (duplicateSlots.get(key) || 0) + 1);
    });

    const overlaps = Array.from(duplicateSlots.values()).filter((count) => count > 1).length;
    if (overlaps > 0) {
      items.push({
        id: 'potential-overlap',
        title: `${overlaps} conflit(s) potentiel(s) détecté(s)`,
        description: 'Vérifiez les créneaux en doublon sur le même styliste.',
        level: 'critical',
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'healthy',
        title: 'Tout est sous contrôle',
        description: 'Aucune alerte opérationnelle détectée pour le moment.',
        level: 'info',
      });
    }

    return items;
  }, [accessContext, associatedStylistId, bookingsNextDays, pendingUpcomingTotal, role, totals.total]);

  const todayLabel = formatHumanDate(new Date());

  return (
    <>
      <div className="admin-scope min-h-screen overflow-x-hidden bg-background px-4 pb-10 pt-6 text-foreground md:px-6 md:pt-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <SectionHeader
            title="Tableau de bord"
            description="Vision opérationnelle en temps réel: activité du jour, alertes et actions rapides."
            actions={
              <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
                <Button asChild variant="outline" className="gap-2">
                  <Link href="/admin/reservations/nueva">
                    <FaCalendarAlt className="h-4 w-4" />
                    Nouvelle réservation
                  </Link>
                </Button>
                {pendingUpcomingTotal > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPendingPanelSuccess(null);
                      setIsPendingPanelOpen(true);
                    }}
                    className="gap-2"
                  >
                    <FaBell className="h-4 w-4" />
                    En attente ({pendingUpcomingTotal})
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={fetchDashboardData}
                  disabled={loadingData}
                  className="gap-2"
                >
                  {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaSyncAlt className="h-4 w-4" />}
                  Actualiser
                </Button>
              </div>
            }
          />

          <AdminCard tone="highlight" className="border-primary/35">
            <AdminCardContent className="space-y-4 p-5 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary">Bonjour {userDisplayName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-primary/80">
                    {role === 'admin' ? 'Espace administration' : 'Espace équipe'}
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold text-foreground md:text-3xl">{todayLabel}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {nextAppointments.length > 0
                      ? `Prochain rendez-vous à ${formatTime(nextAppointments[0].start_time)} avec ${nextAppointments[0].customer_name || 'client'}.`
                      : 'Aucun rendez-vous restant aujourd’hui.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-card/75 px-4 py-3 text-sm">
                  <p className="font-medium text-foreground">Dernière synchronisation</p>
                  <p className="text-muted-foreground">
                    {lastUpdatedAt
                      ? new Intl.DateTimeFormat('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }).format(lastUpdatedAt)
                      : '--:--:--'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border/80 bg-card px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Rendez-vous aujourd’hui</p>
                  <p key={`kpi-total-${totals.total}`} className={KPI_VALUE_CLASS}>{totals.total}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-card px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">En attente (jour)</p>
                  <p key={`kpi-pending-${totals.pending}`} className={KPI_VALUE_CLASS}>{totals.pending}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-card px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Taux de réalisation</p>
                  <p key={`kpi-rate-${totals.completionRate}`} className={KPI_VALUE_CLASS}>{totals.completionRate}%</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-card px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">CA prévisionnel (jour)</p>
                  <p
                    key={`kpi-revenue-${totals.estimatedRevenueToday}`}
                    className={KPI_VALUE_CLASS}
                  >
                    {formatCurrency(totals.estimatedRevenueToday)}
                  </p>
                </div>
              </div>
            </AdminCardContent>
          </AdminCard>

          {error ? (
            <AdminCard className="border-destructive/35 bg-destructive/10">
              <AdminCardContent className="py-4 text-sm text-destructive-foreground">
                Erreur de chargement du dashboard: {error}
              </AdminCardContent>
            </AdminCard>
          ) : null}

          {loadingAccess || loadingData ? (
            <AdminCard>
              <AdminCardContent className="flex items-center justify-center gap-3 py-12 text-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Chargement du tableau de bord...
              </AdminCardContent>
            </AdminCard>
          ) : (
            <div className="grid min-w-0 gap-6 xl:grid-cols-[1.45fr_1fr]">
              <div className="min-w-0 space-y-6">
                <AdminCard className="overflow-hidden">
                  <AdminCardHeader className="pb-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">Agenda du jour</h2>
                        <p className="text-sm text-muted-foreground">
                          {nextAppointments.length > 0
                            ? `${nextAppointments.length} prochain(s) rendez-vous`
                            : 'Aucun prochain rendez-vous'}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="w-full min-w-0 gap-2 whitespace-normal sm:w-auto">
                        <Link href="/admin/reservations">
                          Ouvrir le calendrier
                          <FaArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </AdminCardHeader>
                  <AdminCardContent className="space-y-3 pt-4">
                    {nextAppointments.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                        Aucun rendez-vous planifié pour le reste de la journée.
                      </div>
                    ) : (
                      nextAppointments.map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-xl border border-border/80 bg-card/70 p-4 shadow-[var(--admin-shadow-soft)]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-semibold text-foreground">{booking.customer_name || 'Client sans nom'}</p>
                              <p className="truncate text-sm text-muted-foreground">
                                {booking.service?.nombre || 'Service non défini'}
                                {' · '}
                                {booking.stylist?.name || 'Styliste non défini'}
                              </p>
                            </div>
                            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                              <div className="rounded-full border border-border px-3 py-1 text-sm font-medium text-foreground">
                                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                              </div>
                              <StatusBadge status={booking.status} />
                            </div>
                          </div>
                          <p className="mt-2 truncate text-xs text-muted-foreground">
                            Centre: {booking.location?.name || 'Centre non défini'}
                          </p>
                        </div>
                      ))
                    )}
                  </AdminCardContent>
                </AdminCard>

                <AdminCard className="overflow-hidden">
                  <AdminCardHeader className="pb-0">
                    <div className="flex items-center gap-2">
                      <FaBell className="h-4 w-4 text-primary" />
                      <h2 className="text-lg font-semibold">Alertes opérationnelles</h2>
                    </div>
                  </AdminCardHeader>
                  <AdminCardContent className="space-y-3 pt-4">
                    {alerts.map((alert) => (
                      <div key={alert.id} className={`rounded-xl border px-4 py-3 text-sm ${getAlertStyles(alert.level)}`}>
                        <p className="break-words font-semibold">{alert.title}</p>
                        <p className="mt-1 break-words opacity-90">{alert.description}</p>
                        {alert.actionLabel && alert.actionKey === 'open_pending_panel' ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-3 h-8 w-full min-w-0 whitespace-normal bg-background/70 sm:w-auto"
                            onClick={() => {
                              setPendingPanelSuccess(null);
                              setIsPendingPanelOpen(true);
                            }}
                          >
                            {alert.actionLabel}
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </AdminCardContent>
                </AdminCard>
              </div>

              <div className="min-w-0 space-y-6">
                <AdminCard className="overflow-hidden">
                  <AdminCardHeader className="pb-0">
                    <h2 className="text-lg font-semibold">Résumé rapide</h2>
                  </AdminCardHeader>
                  <AdminCardContent className="space-y-3 pt-4 text-sm">
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/80 px-3 py-2">
                      <span className="min-w-0 break-words text-muted-foreground">Confirmées</span>
                      <span className="shrink-0 font-semibold text-foreground">{totals.confirmed}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/80 px-3 py-2">
                      <span className="min-w-0 break-words text-muted-foreground">Terminées</span>
                      <span className="shrink-0 font-semibold text-foreground">{totals.completed}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/80 px-3 py-2">
                      <span className="min-w-0 break-words text-muted-foreground">Annulées</span>
                      <span className="shrink-0 font-semibold text-foreground">{totals.cancelled}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/80 px-3 py-2">
                      <span className="min-w-0 break-words text-muted-foreground">En attente (à venir)</span>
                      <span className="shrink-0 font-semibold text-foreground">{pendingUpcomingTotal}</span>
                    </div>
                    {role === 'admin' ? (
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-border/80 px-3 py-2">
                        <span className="min-w-0 break-words text-muted-foreground">CA prévisionnel 7 jours</span>
                        <span className="shrink-0 font-semibold text-foreground">{formatCurrency(totals.estimatedRevenueWeek)}</span>
                      </div>
                    ) : null}
                  </AdminCardContent>
                </AdminCard>

                <AdminCard className="overflow-hidden">
                  <AdminCardHeader className="pb-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="text-lg font-semibold">Actions rapides</h2>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full min-w-0 gap-2 whitespace-normal sm:w-auto"
                        onClick={() => setIsQuickActionsModalOpen(true)}
                      >
                        <Settings2 className="h-4 w-4" />
                        Personnaliser
                      </Button>
                    </div>
                  </AdminCardHeader>
                  <AdminCardContent className="space-y-2 pt-4">
                    {quickActions.map((action) => {
                      const Icon = action.icon;

                      if (action.type === 'route') {
                        return (
                          <Button
                            key={action.id}
                            asChild
                            variant="outline"
                            className="h-auto w-full min-w-0 justify-between gap-3 rounded-xl border-border/80 px-3 py-3 text-left whitespace-normal"
                          >
                            <Link href={action.href}>
                              <span className="flex min-w-0 items-start gap-3">
                                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                  <Icon className="h-3.5 w-3.5" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-foreground">{action.title}</span>
                                  <span className="block truncate text-xs text-muted-foreground">{action.description}</span>
                                </span>
                              </span>
                              <FaArrowRight className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            </Link>
                          </Button>
                        );
                      }

                      return (
                        <Button
                          key={action.id}
                          type="button"
                          variant="outline"
                          onClick={() => runQuickActionCommand(action.command)}
                          className="h-auto w-full min-w-0 justify-between gap-3 rounded-xl border-border/80 px-3 py-3 text-left whitespace-normal"
                        >
                          <span className="flex min-w-0 items-start gap-3">
                            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">{action.title}</span>
                              <span className="block truncate text-xs text-muted-foreground">{action.description}</span>
                            </span>
                          </span>
                          <FaArrowRight className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </Button>
                      );
                    })}
                  </AdminCardContent>
                </AdminCard>

                <AdminCard className="overflow-hidden">
                  <AdminCardHeader className="pb-0">
                    <div className="flex items-center gap-2">
                      <FaMoneyBillWave className="h-4 w-4 text-primary" />
                      <h2 className="text-lg font-semibold">Qualité des données</h2>
                    </div>
                  </AdminCardHeader>
                  <AdminCardContent className="space-y-3 pt-4 text-sm">
                    <div className="rounded-xl border border-border/80 px-3 py-2">
                      <p className="text-muted-foreground">Clients avec contact complet (7 jours)</p>
                      <p className="mt-1 break-words text-base font-semibold text-foreground">
                        {bookingsNextDays.length === 0
                          ? '0 / 0'
                          : `${bookingsNextDays.filter((b) => b.customer_email?.trim() && b.customer_phone?.trim()).length} / ${bookingsNextDays.length}`}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/80 px-3 py-2">
                      <p className="text-muted-foreground">Signal d’attention</p>
                      <p className="mt-1 flex items-start gap-2 text-sm font-medium text-foreground">
                        <FaExclamationTriangle className="h-4 w-4 text-amber-500" />
                        Vérifier les alertes avant clôture de journée.
                      </p>
                    </div>
                  </AdminCardContent>
                </AdminCard>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isQuickActionsModalOpen} onOpenChange={setIsQuickActionsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Personnaliser les actions rapides</DialogTitle>
            <DialogDescription>
              Sélectionnez jusqu&apos;à {QUICK_ACTIONS_MAX_VISIBLE} raccourcis visibles sur le tableau de bord.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border/80 bg-card px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {selectedQuickActionIds.length}/{QUICK_ACTIONS_MAX_VISIBLE} sélectionné(s)
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetQuickActionsSelection}
                disabled={!quickActionsReady}
              >
                Restaurer par défaut
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-[52vh] pr-2">
            <div className="space-y-2">
              {availableQuickActions.map((action) => {
                const Icon = action.icon;
                const isSelected = selectedQuickActionIds.includes(action.id);
                const isDisabled = !isSelected && isQuickActionSelectionFull;

                return (
                  <Button
                    key={action.id}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    className="h-auto w-full justify-between rounded-xl px-3 py-3 text-left"
                    onClick={() => toggleQuickActionSelection(action.id)}
                    disabled={isDisabled}
                  >
                    <span className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{action.title}</span>
                        <span className="block text-xs opacity-80">{action.description}</span>
                      </span>
                    </span>
                    <span className="ml-3 inline-flex items-center gap-1 text-xs font-medium">
                      {isSelected ? <FaCheck className="h-3 w-3" /> : null}
                      {isSelected ? 'Sélectionné' : 'Ajouter'}
                    </span>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Maximum {QUICK_ACTIONS_MAX_VISIBLE} actions affichées.
            </p>
            <Button type="button" onClick={() => setIsQuickActionsModalOpen(false)}>
              Terminer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPendingPanelOpen} onOpenChange={setIsPendingPanelOpen}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[230] bg-transparent data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="admin-scope fixed inset-y-0 right-0 z-[240] h-[100dvh] w-[min(96vw,42rem)] border-l border-border bg-background backdrop-blur-none text-foreground shadow-2xl duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-full">
            <DialogHeader className="sr-only">
              <DialogTitle>Réservations en attente</DialogTitle>
              <DialogDescription>
                Validation rapide des réservations en attente.
              </DialogDescription>
            </DialogHeader>

            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Réservations en attente</h2>
                  <p className="text-sm text-muted-foreground">
                    {pendingPanelBookings.length} réservation(s) affichée(s)
                  </p>
                </div>
                <DialogPrimitive.Close asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl border border-border"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogPrimitive.Close>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={fetchPendingPanelBookings}
                  disabled={pendingPanelLoading || pendingPanelSubmitting}
                >
                  {pendingPanelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaSyncAlt className="h-4 w-4" />}
                  Actualiser
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    setSelectedPendingIds((previous) =>
                      previous.length === pendingPanelBookings.length
                        ? []
                        : pendingPanelBookings.map((booking) => booking.id)
                    );
                  }}
                  disabled={pendingPanelLoading || pendingPanelSubmitting || pendingPanelBookings.length === 0}
                >
                  <FaCheck className="h-4 w-4" />
                  {allPendingSelected ? 'Désélectionner tout' : 'Sélectionner tout'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleApprovePending({ bookingIds: selectedPendingIds })}
                  disabled={
                    pendingPanelLoading ||
                    pendingPanelSubmitting ||
                    selectedPendingIds.length === 0
                  }
                >
                  {pendingPanelSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaCheck className="h-4 w-4" />}
                  Approuver la sélection ({selectedPendingIds.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-2"
                  onClick={() => setConfirmApproveAllOpen(true)}
                  disabled={
                    pendingPanelLoading ||
                    pendingPanelSubmitting ||
                    pendingPanelBookings.length === 0
                  }
                >
                  {pendingPanelSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaCheckDouble className="h-4 w-4" />}
                  Approuver toutes
                </Button>
              </div>

              {pendingPanelSuccess ? (
                <div className="mx-5 mt-3 rounded-xl border border-emerald-500/35 bg-emerald-500/12 px-3 py-2 text-sm text-emerald-700">
                  {pendingPanelSuccess}
                </div>
              ) : null}

              {pendingPanelError ? (
                <div className="mx-5 mt-3 rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                  {pendingPanelError}
                </div>
              ) : null}

              <ScrollArea className="min-h-0 flex-1 px-5 py-4">
                {pendingPanelLoading ? (
                  <div className="flex h-full items-center justify-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Chargement des réservations en attente...
                  </div>
                ) : pendingPanelBookings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                    Aucune réservation en attente dans ce scope.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingPanelBookings.map((booking) => {
                      const isSelected = selectedPendingIds.includes(booking.id);

                      return (
                        <div
                          key={booking.id}
                          className="rounded-xl border border-border/80 bg-card p-4 shadow-[var(--admin-shadow-soft)]"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <label className="flex min-w-0 flex-1 items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedPendingIds((previous) =>
                                    previous.includes(booking.id)
                                      ? previous.filter((id) => id !== booking.id)
                                      : [...previous, booking.id]
                                  );
                                }}
                                className="mt-1 h-4 w-4 rounded border-border"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-foreground">
                                  {booking.customer_name || booking.customer_email || 'Client sans nom'}
                                </p>
                                <p className="truncate text-sm text-muted-foreground">
                                  {booking.service?.nombre || 'Service non défini'}
                                  {' · '}
                                  {booking.stylist?.name || 'Styliste non défini'}
                                </p>
                              </div>
                            </label>

                            <div className="flex items-center gap-2">
                              <div className="rounded-full border border-border px-3 py-1 text-sm font-medium text-foreground">
                                {new Date(booking.booking_date).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                })}
                                {' · '}
                                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                              </div>
                              <StatusBadge status="pending" />
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>Centre: {booking.location?.name || 'Centre non défini'}</span>
                            <span>Email: {booking.customer_email || 'Non renseigné'}</span>
                            <span>Tél: {booking.customer_phone || 'Non renseigné'}</span>
                          </div>

                          <div className="mt-3 flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleApprovePending({ bookingIds: [booking.id] })}
                              disabled={pendingPanelSubmitting}
                            >
                              {pendingPanelSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaCheck className="h-4 w-4" />}
                              Approuver
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      <Dialog open={confirmApproveAllOpen} onOpenChange={setConfirmApproveAllOpen}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[250] bg-black/35 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[260] w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-[0_36px_90px_-30px_rgba(15,23,42,0.45)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <DialogHeader className="text-left">
              <DialogTitle>Confirmer l’approbation globale</DialogTitle>
              <DialogDescription>
                Cette action validera toutes les réservations en attente affichées dans le panneau.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmApproveAllOpen(false)}
                disabled={pendingPanelSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className="gap-2"
                onClick={async () => {
                  setConfirmApproveAllOpen(false);
                  await handleApprovePending({ approveAll: true });
                }}
                disabled={pendingPanelSubmitting}
              >
                {pendingPanelSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaCheckDouble className="h-4 w-4" />}
                Confirmer
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}
