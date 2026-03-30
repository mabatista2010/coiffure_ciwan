"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
} from "react";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import Image from "next/image";
import { Maximize2 } from "lucide-react";
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaChartLine,
  FaCut,
  FaEuroSign,
  FaMapMarkerAlt,
} from "react-icons/fa";

import {
  AdminDateInput,
  AdminCard,
  AdminCardContent,
  AdminCardHeader,
  FilterBar,
  SectionHeader,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPermissionScopeFilter } from "@/lib/permissions/helpers";
import { supabase } from "@/lib/supabase";

type DateRangeType =
  | "semana"
  | "mes"
  | "año"
  | "personalizado"
  | "semana_proxima"
  | "mes_proximo"
  | "año_anterior";

const PRIMARY_DATE_RANGE_OPTIONS: {
  value: DateRangeType;
  label: string;
  compactLabel?: string;
}[] = [
  { value: "semana", label: "Semaine", compactLabel: "Sem." },
  { value: "mes", label: "Mois" },
  { value: "año", label: "Année", compactLabel: "An." },
];

const SECONDARY_DATE_RANGE_OPTIONS: {
  value: DateRangeType;
  label: string;
  compactLabel?: string;
}[] = [
  { value: "semana_proxima", label: "Semaine prochaine", compactLabel: "Sem. suiv." },
  { value: "mes_proximo", label: "Mois prochain", compactLabel: "Mois suiv." },
];

const DATE_RANGE_SHORTCUT_OPTIONS: {
  value: DateRangeType;
  label: string;
  compactLabel?: string;
}[] = [
  ...PRIMARY_DATE_RANGE_OPTIONS,
  ...SECONDARY_DATE_RANGE_OPTIONS,
  { value: "personalizado", label: "Personnalisé", compactLabel: "Perso" },
];

const TREND_Y_MAX = 15;
const TREND_TICKS = [0, 5, 10, 15];
const TREND_CHART_HEIGHT_PX = 224;
const TREND_MIN_SEGMENT_PX = 5;
const FILTER_LABEL_CLASSNAME =
  "text-xs font-semibold uppercase tracking-wide leading-none text-muted-foreground";

const getImageUrl = (path: string | null): string => {
  if (!path) {
    return "/placeholder-profile.jpg";
  }

  if (path.startsWith("http")) {
    return path;
  }

  if (path.includes("storage/v1/object")) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/${path}`;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  if (path.startsWith("stylists/") || path.startsWith("estilistas/")) {
    return `${supabaseUrl}/storage/v1/object/public/${path}`;
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDayLabel = (dateKey: string, compactMonth: boolean): string => {
  const parsedDate = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateKey;
  }

  if (compactMonth) {
    return String(parsedDate.getDate());
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(parsedDate);
};

const formatTrendSheetDate = (dateKey: string): string => {
  const parsedDate = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateKey;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
};

interface Stylist {
  id: string;
  name: string;
  profile_img: string | null;
  location_ids?: string[] | null;
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
  bookingsByDay: {
    date: string;
    label: string;
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  }[];
}

type TrendDayStats = StylistStats["bookingsByDay"][number];

interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

function buildDateRange(
  dateRangeType: DateRangeType,
  customStartDate: string,
  customEndDate: string
): DateRange {
  const today = new Date();

  switch (dateRangeType) {
    case "semana": {
      const current = new Date(today);
      const day = current.getDay();
      const diff = current.getDate() - day + (day === 0 ? -6 : 1);
      const startDate = new Date(current.setDate(diff));
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      return { startDate, endDate, label: "Semaine actuelle" };
    }
    case "semana_proxima": {
      const currentDay = today.getDay();
      const diffToMonday = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const startDate = new Date(monday);
      startDate.setDate(monday.getDate() + 7);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      return { startDate, endDate, label: "Semaine prochaine" };
    }
    case "mes": {
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate, label: "Mois actuel" };
    }
    case "mes_proximo": {
      const startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate, label: "Mois prochain" };
    }
    case "año": {
      const startDate = new Date(today.getFullYear(), 0, 1);
      const endDate = new Date(today.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate, label: "Annee actuelle" };
    }
    case "año_anterior": {
      const startDate = new Date(today.getFullYear() - 1, 0, 1);
      const endDate = new Date(today.getFullYear() - 1, 11, 31);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate, label: "Annee precedente" };
    }
    case "personalizado": {
      if (customStartDate && customEndDate) {
        const startDate = new Date(customStartDate);
        const endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
        return {
          startDate,
          endDate,
          label: `${startDate.toLocaleDateString("fr-FR")} - ${endDate.toLocaleDateString("fr-FR")}`,
        };
      }

      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate, label: "Periode personnalisee" };
    }
    default: {
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate, label: "Mois actuel" };
    }
  }
}

export default function StylistStatsPage() {
  const { accessContext, isLoading: loadingAccess } = useAdminAccess();
  const statsScope = useMemo(() => getPermissionScopeFilter(accessContext, "stats.view"), [accessContext]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<string | null>(null);
  const [selectedStylistData, setSelectedStylistData] = useState<Stylist | null>(null);
  const [stats, setStats] = useState<StylistStats | null>(null);
  const [trendPopover, setTrendPopover] = useState<{
    day: TrendDayStats;
    x: number;
    y: number;
  } | null>(null);
  const [isReservationSummaryOpen, setIsReservationSummaryOpen] =
    useState<boolean>(false);
  const [expandedTrendDay, setExpandedTrendDay] = useState<TrendDayStats | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const trendChartRef = useRef<HTMLDivElement | null>(null);
  const trendPopoverHostRef = useRef<HTMLDivElement | null>(null);

  const [dateRangeType, setDateRangeType] = useState<DateRangeType>("mes");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    buildDateRange("mes", "", "")
  );

  useEffect(() => {
    if (loadingAccess) {
      return;
    }

    if (statsScope.kind === "none") {
      setStylists([]);
      setSelectedStylist("");
      setError("Votre compte n'a pas accès aux statistiques de stylistes.");
      setLoading(false);
      return;
    }

    async function loadStylists() {
      try {
        let query = supabase
          .from("stylists")
          .select("id, name, profile_img, location_ids")
          .eq("active", true)
          .order("name");

        if (statsScope.kind === "stylist") {
          query = query.eq("id", statsScope.stylistId);
        }

        const { data, error: stylistsError } = await query;

        if (stylistsError) {
          throw stylistsError;
        }

        const scopedStylists = (data || []).filter((stylist) => {
          if (statsScope.kind !== "locations") {
            return true;
          }

          const locationIds = stylist.location_ids || [];
          return locationIds.some((locationId: string) => statsScope.locationIds.includes(locationId));
        });

        setStylists(scopedStylists);
        setSelectedStylist((current) => {
          if (statsScope.kind === "stylist") {
            return statsScope.stylistId;
          }
          if (current && scopedStylists.some((stylist) => stylist.id === current)) {
            return current;
          }
          return scopedStylists[0]?.id ?? "";
        });
        setError(scopedStylists.length === 0 ? "Aucun styliste autorisé pour ce scope." : null);
      } catch (err) {
        console.error("Error al cargar estilistas:", err);
        setError("Error al cargar la lista de estilistas");
      } finally {
        setLoading(false);
      }
    }

    void loadStylists();
  }, [loadingAccess, statsScope]);

  useEffect(() => {
    if (selectedStylist && stylists.length > 0) {
      const stylistData = stylists.find((stylist) => stylist.id === selectedStylist);
      setSelectedStylistData(stylistData || null);
    } else {
      setSelectedStylistData(null);
    }
  }, [selectedStylist, stylists]);

  useEffect(() => {
    setDateRange(buildDateRange(dateRangeType, customStartDate, customEndDate));
  }, [dateRangeType, customStartDate, customEndDate]);

  useEffect(() => {
    setTrendPopover(null);
    setIsReservationSummaryOpen(false);
    setExpandedTrendDay(null);
  }, [dateRange, loadingAccess, selectedStylist, statsScope, stylists]);

  const openTrendPopover = (
    event:
      | MouseEvent<HTMLButtonElement>
      | FocusEvent<HTMLButtonElement>,
    day: TrendDayStats
  ) => {
    const targetRect = event.currentTarget.getBoundingClientRect();
    const popoverWidth = 256;
    const popoverHeight = 176;
    const padding = 12;
    const gap = 12;

    const visualViewport = window.visualViewport;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const viewportOffsetLeft = visualViewport?.offsetLeft ?? 0;
    const viewportOffsetTop = visualViewport?.offsetTop ?? 0;
    const preferredRightX = targetRect.right + gap;
    const preferredLeftX = targetRect.left - popoverWidth - gap;
    const rawX =
      preferredRightX + popoverWidth <= viewportOffsetLeft + viewportWidth - padding
        ? preferredRightX
        : preferredLeftX;
    const minX = viewportOffsetLeft + padding;
    const maxX = Math.max(minX, viewportOffsetLeft + viewportWidth - popoverWidth - padding);

    const preferredAboveY = targetRect.top - popoverHeight - gap;
    const preferredBelowY = targetRect.bottom + gap;
    const rawY = preferredAboveY >= viewportOffsetTop + padding ? preferredAboveY : preferredBelowY;
    const minY = viewportOffsetTop + padding;
    const maxY = Math.max(minY, viewportOffsetTop + viewportHeight - popoverHeight - padding);

    setTrendPopover({
      day,
      x: Math.min(Math.max(rawX, minX), maxX),
      y: Math.min(Math.max(rawY, minY), maxY),
    });
  };

  useEffect(() => {
    if (loadingAccess || !selectedStylist || statsScope.kind === "none") {
      return;
    }

    if (statsScope.kind === "stylist" && selectedStylist !== statsScope.stylistId) {
      setError("Styliste non autorisé pour le scope courant.");
      return;
    }

    if (statsScope.kind === "locations") {
      const selectedStylistRow = stylists.find((stylist) => stylist.id === selectedStylist);
      const locationIds = selectedStylistRow?.location_ids || [];
      if (!locationIds.some((locationId: string) => statsScope.locationIds.includes(locationId))) {
        setError("Styliste non autorisé pour le scope courant.");
        return;
      }
    }

    async function loadStylistStats() {
      setLoading(true);

      try {
        const startDateStr = toDateKey(dateRange.startDate);
        const endDateStr = toDateKey(dateRange.endDate);

        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("id, status, service_id, booking_date")
          .eq("stylist_id", selectedStylist)
          .gte("booking_date", startDateStr)
          .lte("booking_date", endDateStr);

        if (bookingsError) {
          throw bookingsError;
        }

        const { data: servicesData, error: servicesError } = await supabase
          .from("servicios")
          .select("id, nombre, precio");

        if (servicesError) {
          throw servicesError;
        }

        const { data: bookingsWithService, error: bookingsWithServiceError } =
          await supabase
            .from("bookings")
            .select(
              `
              id,
              status,
              service_id,
              servicios:service_id (nombre),
              location_id,
              locations:location_id (name),
              booking_date
            `
            )
            .eq("stylist_id", selectedStylist)
            .gte("booking_date", startDateStr)
            .lte("booking_date", endDateStr);

        if (bookingsWithServiceError) {
          throw bookingsWithServiceError;
        }

        const totalBookings = bookingsData?.length || 0;
        const completedBookings =
          bookingsData?.filter((booking) => booking.status === "completed").length || 0;
        const cancelledBookings =
          bookingsData?.filter((booking) => booking.status === "cancelled").length || 0;
        const pendingBookings =
          bookingsData?.filter((booking) => booking.status === "pending").length || 0;
        const confirmedBookings =
          bookingsData?.filter((booking) => booking.status === "confirmed").length || 0;

        let totalRevenue = 0;
        const completedBookingsWithService =
          bookingsWithService?.filter((booking) => booking.status === "completed") || [];

        completedBookingsWithService.forEach((booking) => {
          const service = servicesData?.find((item) => item.id === booking.service_id);
          if (service) {
            totalRevenue += service.precio;
          }
        });

        const serviceCountMap: Record<string, number> = {};
        bookingsWithService?.forEach((booking) => {
          if (
            booking.servicios &&
            typeof booking.servicios === "object" &&
            "nombre" in booking.servicios
          ) {
            const serviceName = booking.servicios.nombre as string;
            serviceCountMap[serviceName] = (serviceCountMap[serviceName] || 0) + 1;
          }
        });

        const topServices = Object.entries(serviceCountMap)
          .map(([service_name, count]) => ({ service_name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const locationCountMap: Record<string, number> = {};
        bookingsWithService?.forEach((booking) => {
          if (
            booking.locations &&
            typeof booking.locations === "object" &&
            "name" in booking.locations
          ) {
            const locationName = booking.locations.name as string;
            locationCountMap[locationName] = (locationCountMap[locationName] || 0) + 1;
          }
        });

        const bookingsByLocation = Object.entries(locationCountMap)
          .map(([location_name, count]) => ({ location_name, count }))
          .sort((a, b) => b.count - a.count);

        const dailyMap: Record<
          string,
          {
            date: string;
            label: string;
            total: number;
            pending: number;
            confirmed: number;
            completed: number;
            cancelled: number;
          }
        > = {};
        const currentDate = new Date(dateRange.startDate);
        currentDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(0, 0, 0, 0);
        const isSingleMonthRange =
          dateRange.startDate.getFullYear() === dateRange.endDate.getFullYear() &&
          dateRange.startDate.getMonth() === dateRange.endDate.getMonth();

        while (currentDate <= endDate) {
          const dateKey = toDateKey(currentDate);
          dailyMap[dateKey] = {
            date: dateKey,
            label: formatDayLabel(dateKey, isSingleMonthRange),
            total: 0,
            pending: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
          };
          currentDate.setDate(currentDate.getDate() + 1);
        }

        bookingsData?.forEach((booking) => {
          if (!booking.booking_date) {
            return;
          }

          const bookingDateKey = booking.booking_date.slice(0, 10);
          if (!dailyMap[bookingDateKey]) {
            return;
          }

          dailyMap[bookingDateKey].total += 1;

          if (booking.status === "pending") {
            dailyMap[bookingDateKey].pending += 1;
          } else if (booking.status === "confirmed") {
            dailyMap[bookingDateKey].confirmed += 1;
          } else if (booking.status === "completed") {
            dailyMap[bookingDateKey].completed += 1;
          } else if (booking.status === "cancelled") {
            dailyMap[bookingDateKey].cancelled += 1;
          }
        });

        const bookingsByDay = Object.entries(dailyMap)
          .sort(([aDate], [bDate]) => aDate.localeCompare(bDate))
          .map(([, dayData]) => dayData);

        setStats({
          totalBookings,
          completedBookings,
          cancelledBookings,
          pendingBookings,
          confirmedBookings,
          totalRevenue,
          topServices,
          bookingsByLocation,
          bookingsByDay,
        });
      } catch (err) {
        console.error("Error al cargar estadisticas:", err);
        setError("Error al cargar las estadisticas del estilista");
      } finally {
        setLoading(false);
      }
    }

    void loadStylistStats();
  }, [dateRange, loadingAccess, selectedStylist, statsScope, stylists]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "CHF",
    }).format(amount);
  };

  const formatRatio = (value: number, total: number): string => {
    if (!total) {
      return "0%";
    }
    return `${Math.round((value / total) * 100)}%`;
  };

  const selectedDateRangeLabel = useMemo(
    () => `${dateRange.startDate.toLocaleDateString("fr-FR")} - ${dateRange.endDate.toLocaleDateString("fr-FR")}`,
    [dateRange]
  );

  const reservationInsights = useMemo(() => {
    if (!stats) {
      return null;
    }

    const daysCount = Math.max(stats.bookingsByDay.length, 1);
    const averagePerDay = stats.totalBookings / daysCount;
    const activeDays = stats.bookingsByDay.filter((day) => day.total > 0).length;
    const busiestDay = stats.bookingsByDay.reduce<TrendDayStats | null>(
      (max, day) => (max === null || day.total > max.total ? day : max),
      null
    );
    const quietestDay = stats.bookingsByDay.reduce<TrendDayStats | null>(
      (min, day) => {
        if (day.total === 0) {
          return min;
        }
        if (min === null || day.total < min.total) {
          return day;
        }
        return min;
      },
      null
    );

    return {
      averagePerDay,
      activeDays,
      completionRate: formatRatio(stats.completedBookings, stats.totalBookings),
      pendingRate: formatRatio(stats.pendingBookings, stats.totalBookings),
      confirmedRate: formatRatio(stats.confirmedBookings, stats.totalBookings),
      cancelledRate: formatRatio(stats.cancelledBookings, stats.totalBookings),
      busiestDay,
      quietestDay,
    };
  }, [stats]);

  return (
    <main className="admin-scope min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <SectionHeader
          title="Statistiques des Stylistes"
          description="Vue consolidee des performances par styliste sur la periode selectionnee."
        />

        <AdminCard>
          <AdminCardContent className="space-y-3 p-4 pt-4 sm:p-5 sm:pt-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border-4 border-primary/70 sm:h-20 sm:w-20">
                  <Image
                    src={getImageUrl(selectedStylistData?.profile_img || null)}
                    alt={selectedStylistData?.name || "Styliste"}
                    fill
                    style={{ objectFit: "cover" }}
                    className="rounded-full"
                    onError={(event) => {
                      (event.target as HTMLImageElement).src =
                        "/placeholder-profile.jpg";
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-3xl font-semibold leading-tight text-foreground">
                    {selectedStylistData?.name || "Sélectionnez un styliste"}
                  </h3>
                  <p className="mt-0.5 text-base text-muted-foreground">
                    {selectedStylistData ? "Styliste" : "Aucun styliste sélectionné"}
                  </p>
                </div>
              </div>
              <div className="inline-flex max-w-full items-center rounded-lg border border-primary/20 bg-card px-3 py-1.5 text-sm text-primary">
                <span className="truncate">{selectedDateRangeLabel}</span>
              </div>
            </div>

            <FilterBar
              className="border-primary/10 bg-muted/20 p-3 shadow-none"
              fieldsClassName="md:[grid-template-columns:minmax(150px,190px)_minmax(0,1fr)] lg:[grid-template-columns:minmax(180px,220px)_minmax(0,1fr)] xl:grid-cols-4"
            >
              <div className="space-y-1.5 xl:col-span-1">
                <p className={FILTER_LABEL_CLASSNAME}>
                  Styliste
                </p>
                <div className="md:max-w-[170px] lg:max-w-[200px]">
                  <Select
                    value={selectedStylist || "none"}
                    onValueChange={(value) =>
                      setSelectedStylist(value === "none" ? null : value)
                    }
                  >
                    <SelectTrigger
                      id="stylist-select"
                      className="h-9"
                      aria-label="Sélectionner un styliste"
                    >
                      <SelectValue placeholder="Selectionner un styliste" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selectionner un styliste</SelectItem>
                      {stylists.map((stylist) => (
                        <SelectItem key={stylist.id} value={stylist.id}>
                          {stylist.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5 xl:col-span-3">
                <p className={FILTER_LABEL_CLASSNAME}>
                  Raccourcis de periode
                </p>
                <div className="min-w-0 overflow-x-auto pb-1 lg:overflow-visible lg:pb-0">
                  <div className="flex min-w-max flex-nowrap gap-1 md:gap-1.5 lg:gap-2">
                    {DATE_RANGE_SHORTCUT_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={dateRangeType === option.value ? "default" : "secondary"}
                        size="sm"
                        className="h-7 justify-center px-1.5 text-[10px] sm:text-xs md:px-2 lg:h-8 lg:px-3 lg:text-sm"
                        onClick={() => setDateRangeType(option.value)}
                      >
                        <span className="hidden lg:inline">{option.label}</span>
                        <span className="lg:hidden">
                          {option.compactLabel || option.label}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {dateRangeType === "personalizado" ? (
                <div className="space-y-2">
                  <label htmlFor="start-date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Date de debut
                  </label>
                  <AdminDateInput
                    id="start-date"
                    className="w-full"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                  />
                </div>
              ) : null}

              {dateRangeType === "personalizado" ? (
                <div className="space-y-2">
                  <label htmlFor="end-date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Date de fin
                  </label>
                  <AdminDateInput
                    id="end-date"
                    className="w-full"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                  />
                </div>
              ) : null}
            </FilterBar>
          </AdminCardContent>
        </AdminCard>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminCard>
            <AdminCardContent className="space-y-2 p-4 pt-3">
              <div className="flex items-start justify-between gap-2">
                <p className="flex items-center gap-2 text-base text-foreground">
                  <FaCalendarCheck className="text-primary" />
                  Reservations
                </p>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setIsReservationSummaryOpen(true)}
                  title="Voir le résumé détaillé"
                  aria-label="Voir le résumé détaillé"
                  disabled={!stats}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-4xl font-semibold leading-none text-primary">
                {stats ? stats.totalBookings : "--"}
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <p className="flex items-center justify-between gap-2">
                  <span>Completees</span>
                  <span className="font-medium text-foreground">{stats?.completedBookings || 0}</span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span>Confirmees</span>
                  <span className="font-medium text-foreground">{stats?.confirmedBookings || 0}</span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span>En attente</span>
                  <span className="font-medium text-foreground">{stats?.pendingBookings || 0}</span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span>Annulees</span>
                  <span className="font-medium text-foreground">{stats?.cancelledBookings || 0}</span>
                </p>
              </div>
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardContent className="space-y-2 p-4 pt-3">
              <p className="flex items-center gap-2 text-base text-foreground">
                <FaEuroSign className="text-primary" />
                Revenus
              </p>
              <p className="text-4xl font-semibold leading-none text-primary">
                {stats ? formatCurrency(stats.totalRevenue) : "--"}
              </p>
              <p className="text-sm text-muted-foreground">
                Moyenne / reservation:{" "}
                <span className="font-medium text-foreground">
                  {stats
                    ? formatCurrency(
                      stats.totalBookings ? stats.totalRevenue / stats.totalBookings : 0
                    )
                    : "--"}
                </span>
              </p>
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardContent className="space-y-2 p-4 pt-3">
              <p className="flex items-center gap-2 text-base text-foreground">
                <FaCut className="text-primary" />
                Services populaires
              </p>
              <div className="space-y-1.5 text-sm">
                {(stats?.topServices || []).slice(0, 3).map((service, index) => (
                  <p key={index} className="flex justify-between gap-3 text-foreground">
                    <span className="truncate" title={service.service_name}>
                      {service.service_name}
                    </span>
                    <span className="font-semibold text-primary">{service.count}</span>
                  </p>
                ))}
              </div>
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardContent className="space-y-2 p-4 pt-3">
              <p className="flex items-center gap-2 text-base text-foreground">
                <FaMapMarkerAlt className="text-primary" />
                Centres
              </p>
              <div className="space-y-1.5 text-sm">
                {(stats?.bookingsByLocation || []).slice(0, 3).map((location, index) => (
                  <p key={index} className="flex justify-between gap-3 text-foreground">
                    <span className="truncate" title={location.location_name}>
                      {location.location_name}
                    </span>
                    <span className="font-semibold text-primary">{location.count}</span>
                  </p>
                ))}
              </div>
            </AdminCardContent>
          </AdminCard>
        </div>

        {loading ? (
          <AdminCard>
            <AdminCardContent className="flex min-h-56 items-center justify-center gap-3 text-foreground">
              <FaCalendarAlt className="h-5 w-5 animate-spin text-primary" />
              Chargement des statistiques...
            </AdminCardContent>
          </AdminCard>
        ) : error ? (
          <AdminCard className="border-destructive/35 bg-destructive/10">
            <AdminCardContent className="py-4 text-sm text-destructive-foreground">
              {error}
            </AdminCardContent>
          </AdminCard>
        ) : stats ? (
          <>
            <Dialog
              open={isReservationSummaryOpen}
              onOpenChange={setIsReservationSummaryOpen}
            >
              <DialogContent className="max-h-[90vh] w-[95vw] max-w-5xl overflow-y-auto border-slate-200 bg-white p-6 text-slate-900 sm:p-7">
                <DialogHeader>
                  <DialogTitle>Résumé détaillé des réservations</DialogTitle>
                  <DialogDescription className="text-slate-500">
                    {selectedStylistData?.name || "Styliste"} · {selectedDateRangeLabel}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                      <p className="mt-1 text-2xl font-semibold text-blue-600">
                        {stats.totalBookings}
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        En attente
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-amber-600">
                        {stats.pendingBookings}
                      </p>
                      <p className="text-xs text-slate-500">
                        {reservationInsights?.pendingRate || "0%"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Confirmées
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-sky-600">
                        {stats.confirmedBookings}
                      </p>
                      <p className="text-xs text-slate-500">
                        {reservationInsights?.confirmedRate || "0%"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Terminées
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-emerald-600">
                        {stats.completedBookings}
                      </p>
                      <p className="text-xs text-slate-500">
                        {reservationInsights?.completionRate || "0%"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Annulées
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-rose-600">
                        {stats.cancelledBookings}
                      </p>
                      <p className="text-xs text-slate-500">
                        {reservationInsights?.cancelledRate || "0%"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Moyenne / jour
                      </p>
                      <p className="mt-1 text-lg font-semibold text-blue-600">
                        {(reservationInsights?.averagePerDay || 0).toFixed(1)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Jours actifs
                      </p>
                      <p className="mt-1 text-lg font-semibold text-blue-600">
                        {reservationInsights?.activeDays || 0} / {stats.bookingsByDay.length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Pic journée
                      </p>
                      <p className="mt-1 text-lg font-semibold text-blue-600">
                        {reservationInsights?.busiestDay
                          ? `${formatTrendSheetDate(reservationInsights.busiestDay.date)} (${reservationInsights.busiestDay.total})`
                          : "N/A"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Journée la plus calme
                      </p>
                      <p className="mt-1 text-lg font-semibold text-blue-600">
                        {reservationInsights?.quietestDay
                          ? `${formatTrendSheetDate(reservationInsights.quietestDay.date)} (${reservationInsights.quietestDay.total})`
                          : "Aucune"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-3 text-sm font-semibold text-slate-800">
                        Top services (période)
                      </p>
                      <div className="space-y-2">
                        {stats.topServices.length > 0 ? (
                          stats.topServices.slice(0, 5).map((service) => (
                            <div
                              key={service.service_name}
                              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            >
                              <span className="truncate text-slate-700">
                                {service.service_name}
                              </span>
                              <span className="font-semibold text-blue-600">
                                {service.count}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">Aucune donnée.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-3 text-sm font-semibold text-slate-800">
                        Top centres (période)
                      </p>
                      <div className="space-y-2">
                        {stats.bookingsByLocation.length > 0 ? (
                          stats.bookingsByLocation.slice(0, 5).map((location) => (
                            <div
                              key={location.location_name}
                              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            >
                              <span className="truncate text-slate-700">
                                {location.location_name}
                              </span>
                              <span className="font-semibold text-blue-600">
                                {location.count}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">Aucune donnée.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <AdminCard>
                <AdminCardHeader>
                  <h3 className="text-lg font-semibold text-foreground">
                    Services les plus demandes
                  </h3>
                </AdminCardHeader>
                <AdminCardContent className="space-y-3">
                  {stats.topServices.map((service, index) => {
                    const topValue = stats.topServices[0]?.count || 1;
                    const width = (service.count / topValue) * 100;

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-sm text-foreground">
                          <span className="truncate" title={service.service_name}>
                            {service.service_name}
                          </span>
                          <span className="font-semibold text-primary">{service.count}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted/40">
                          <div
                            className="h-2.5 rounded-full bg-primary transition-all"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </AdminCardContent>
              </AdminCard>

              <AdminCard>
                <AdminCardHeader>
                  <h3 className="text-lg font-semibold text-foreground">
                    Reservations par centre
                  </h3>
                </AdminCardHeader>
                <AdminCardContent className="space-y-3">
                  {stats.bookingsByLocation.map((location, index) => {
                    const topValue = stats.bookingsByLocation[0]?.count || 1;
                    const width = (location.count / topValue) * 100;

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-sm text-foreground">
                          <span className="truncate" title={location.location_name}>
                            {location.location_name}
                          </span>
                          <span className="font-semibold text-primary">{location.count}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted/40">
                          <div
                            className="h-2.5 rounded-full bg-primary transition-all"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </AdminCardContent>
              </AdminCard>
            </div>

            <AdminCard>
              <AdminCardHeader>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaChartLine className="text-primary" />
                  Tendance des reservations
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedDateRangeLabel}
                </p>
              </AdminCardHeader>
              <AdminCardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                    En attente
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                    Confirmée
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                    Terminée
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                    Annulée
                  </span>
                </div>

                {stats.bookingsByDay.length > 0 ? (
                  <div className="relative overflow-visible pb-3" ref={trendPopoverHostRef}>
                    <div className="overflow-x-auto pb-5" onScroll={() => setTrendPopover(null)}>
                      <div className="min-w-max">
                        <div className="relative pl-8" ref={trendChartRef}>
                          <div className="relative h-56">
                            {TREND_TICKS.map((tick) => (
                              <div
                                key={tick}
                                className="absolute inset-x-0 border-t border-border/45"
                                style={{ bottom: `${(tick / TREND_Y_MAX) * 100}%` }}
                              >
                                <span
                                  className={`absolute -left-7 text-[10px] text-muted-foreground ${tick === TREND_Y_MAX ? "translate-y-0" : "-translate-y-1/2"}`}
                                >
                                  {tick}
                                </span>
                              </div>
                            ))}

                            <div className="absolute inset-0 flex items-end gap-2.5">
                              {stats.bookingsByDay.map((item) => {
                                const trackedTotal =
                                  item.pending +
                                  item.confirmed +
                                  item.completed +
                                  item.cancelled;
                                const scale =
                                  trackedTotal > TREND_Y_MAX
                                    ? TREND_Y_MAX / trackedTotal
                                    : 1;

                                const pendingHeight =
                                  item.pending > 0
                                    ? Math.max(
                                      (item.pending * scale * TREND_CHART_HEIGHT_PX) /
                                        TREND_Y_MAX,
                                      TREND_MIN_SEGMENT_PX
                                    )
                                    : 0;
                                const confirmedHeight =
                                  item.confirmed > 0
                                    ? Math.max(
                                      (item.confirmed * scale * TREND_CHART_HEIGHT_PX) /
                                        TREND_Y_MAX,
                                      TREND_MIN_SEGMENT_PX
                                    )
                                    : 0;
                                const completedHeight =
                                  item.completed > 0
                                    ? Math.max(
                                      (item.completed * scale * TREND_CHART_HEIGHT_PX) /
                                        TREND_Y_MAX,
                                      TREND_MIN_SEGMENT_PX
                                    )
                                    : 0;
                                const cancelledHeight =
                                  item.cancelled > 0
                                    ? Math.max(
                                      (item.cancelled * scale * TREND_CHART_HEIGHT_PX) /
                                        TREND_Y_MAX,
                                      TREND_MIN_SEGMENT_PX
                                    )
                                    : 0;
                                const confirmedBottom = pendingHeight;
                                const completedBottom = pendingHeight + confirmedHeight;
                                const cancelledBottom =
                                  pendingHeight + confirmedHeight + completedHeight;
                                const isActive = trendPopover?.day.date === item.date;

                                return (
                                  <div key={item.date} className="flex h-full w-7 items-end">
                                    <button
                                      type="button"
                                      data-trend-day-button="true"
                                      className={`relative block h-full w-full overflow-hidden rounded-t-sm border transition ${isActive ? "border-primary/70 shadow-[0_0_0_1px_rgba(212,160,23,0.35)]" : "border-transparent"} bg-muted/20`}
                                      onMouseEnter={(event) => openTrendPopover(event, item)}
                                      onMouseLeave={() =>
                                        setTrendPopover((prev) =>
                                          prev && prev.day.date === item.date
                                            ? null
                                            : prev
                                        )
                                      }
                                      onFocus={(event) => openTrendPopover(event, item)}
                                      onBlur={() =>
                                        setTrendPopover((prev) =>
                                          prev && prev.day.date === item.date
                                            ? null
                                            : prev
                                        )
                                      }
                                      onClick={() => {
                                        setExpandedTrendDay(item);
                                        setTrendPopover(null);
                                      }}
                                      aria-label={`Détails du ${item.date}`}
                                    >
                                      {pendingHeight > 0 ? (
                                        <div
                                          className="absolute inset-x-0 bottom-0 bg-amber-400"
                                          style={{ height: `${pendingHeight}px` }}
                                        />
                                      ) : null}
                                      {confirmedHeight > 0 ? (
                                        <div
                                          className="absolute inset-x-0 bg-blue-500"
                                          style={{
                                            bottom: `${confirmedBottom}px`,
                                            height: `${confirmedHeight}px`,
                                          }}
                                        />
                                      ) : null}
                                      {completedHeight > 0 ? (
                                        <div
                                          className="absolute inset-x-0 bg-emerald-500"
                                          style={{
                                            bottom: `${completedBottom}px`,
                                            height: `${completedHeight}px`,
                                          }}
                                        />
                                      ) : null}
                                      {cancelledHeight > 0 ? (
                                        <div
                                          className="absolute inset-x-0 bg-red-500"
                                          style={{
                                            bottom: `${cancelledBottom}px`,
                                            height: `${cancelledHeight}px`,
                                          }}
                                        />
                                      ) : null}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-2 flex gap-2.5">
                            {stats.bookingsByDay.map((item) => (
                              <div key={`${item.date}-label`} className="w-7 text-center">
                                <span className="block text-[10px] text-muted-foreground">
                                  {item.label}
                                </span>
                                <span className="block text-[10px] font-semibold text-primary">
                                  {item.total}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {trendPopover ? (
                      <div
                        className="pointer-events-none fixed z-[120] w-64 rounded-xl border border-slate-200 bg-white/98 p-3 text-xs text-slate-800 shadow-[0_18px_42px_-24px_rgba(15,23,42,0.45)] backdrop-blur-sm"
                        style={{
                          left: `${trendPopover.x}px`,
                          top: `${trendPopover.y}px`,
                        }}
                      >
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-900 capitalize">
                            {formatTrendSheetDate(trendPopover.day.date)}
                          </p>
                          <div className="space-y-1">
                            <p className="flex items-center justify-between gap-3 text-slate-600">
                              <span className="font-medium">Total</span>
                              <span className="font-semibold text-primary">
                                {trendPopover.day.total}
                              </span>
                            </p>
                            <p className="flex items-center justify-between gap-3 text-slate-600">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                                En attente
                              </span>
                              <span className="font-semibold text-slate-800">
                                {trendPopover.day.pending}
                              </span>
                            </p>
                            <p className="flex items-center justify-between gap-3 text-slate-600">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                                Confirmée
                              </span>
                              <span className="font-semibold text-slate-800">
                                {trendPopover.day.confirmed}
                              </span>
                            </p>
                            <p className="flex items-center justify-between gap-3 text-slate-600">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                                Terminée
                              </span>
                              <span className="font-semibold text-slate-800">
                                {trendPopover.day.completed}
                              </span>
                            </p>
                            <p className="flex items-center justify-between gap-3 text-slate-600">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                                Annulée
                              </span>
                              <span className="font-semibold text-slate-800">
                                {trendPopover.day.cancelled}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
                    Aucune reservation trouvee pour cette periode.
                  </div>
                )}
              </AdminCardContent>
            </AdminCard>

            <Dialog
              open={Boolean(expandedTrendDay)}
              onOpenChange={(open) => {
                if (!open) {
                  setExpandedTrendDay(null);
                }
              }}
            >
              <DialogContent className="max-h-[90vh] w-[95vw] max-w-5xl overflow-y-auto border-slate-200 bg-white p-6 text-slate-900 sm:p-7">
                {expandedTrendDay ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>
                        Détail des réservations - {formatTrendSheetDate(expandedTrendDay.date)}
                      </DialogTitle>
                      <DialogDescription className="text-slate-500">
                        {selectedStylistData?.name || "Styliste"} · {selectedDateRangeLabel}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Total
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-blue-600">
                            {expandedTrendDay.total}
                          </p>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            En attente
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-amber-600">
                            {expandedTrendDay.pending}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatRatio(expandedTrendDay.pending, expandedTrendDay.total)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Confirmées
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-sky-600">
                            {expandedTrendDay.confirmed}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatRatio(expandedTrendDay.confirmed, expandedTrendDay.total)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Terminées
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-emerald-600">
                            {expandedTrendDay.completed}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatRatio(expandedTrendDay.completed, expandedTrendDay.total)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Annulées
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-rose-600">
                            {expandedTrendDay.cancelled}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatRatio(expandedTrendDay.cancelled, expandedTrendDay.total)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">
                            Répartition de la journée
                          </p>
                          <p className="text-xs text-slate-500">
                            {expandedTrendDay.total} réservation
                            {expandedTrendDay.total > 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                          {expandedTrendDay.total > 0 ? (
                            <div className="flex h-full w-full">
                              <div
                                className="h-full bg-amber-400"
                                style={{
                                  width: `${(expandedTrendDay.pending / expandedTrendDay.total) * 100}%`,
                                }}
                              />
                              <div
                                className="h-full bg-blue-500"
                                style={{
                                  width: `${(expandedTrendDay.confirmed / expandedTrendDay.total) * 100}%`,
                                }}
                              />
                              <div
                                className="h-full bg-emerald-500"
                                style={{
                                  width: `${(expandedTrendDay.completed / expandedTrendDay.total) * 100}%`,
                                }}
                              />
                              <div
                                className="h-full bg-red-500"
                                style={{
                                  width: `${(expandedTrendDay.cancelled / expandedTrendDay.total) * 100}%`,
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                          <p className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                            En attente
                          </p>
                          <p className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                            Confirmée
                          </p>
                          <p className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                            Terminée
                          </p>
                          <p className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                            Annulée
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-3 text-sm font-semibold text-slate-800">
                          Contexte de période
                        </p>
                        <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-3">
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-xs uppercase tracking-wide">Moyenne / jour</p>
                            <p className="mt-1 text-lg font-semibold text-blue-600">
                              {(stats.bookingsByDay.reduce((sum, day) => sum + day.total, 0) / Math.max(stats.bookingsByDay.length, 1)).toFixed(1)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-xs uppercase tracking-wide">Écart vs moyenne</p>
                            <p className="mt-1 text-lg font-semibold text-blue-600">
                              {(expandedTrendDay.total - (stats.bookingsByDay.reduce((sum, day) => sum + day.total, 0) / Math.max(stats.bookingsByDay.length, 1))).toFixed(1)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-xs uppercase tracking-wide">Pic période</p>
                            <p className="mt-1 text-lg font-semibold text-blue-600">
                              {Math.max(...stats.bookingsByDay.map((day) => day.total))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <AdminCard>
            <AdminCardContent className="py-8 text-center text-muted-foreground">
              Selectionnez un styliste pour afficher ses statistiques.
            </AdminCardContent>
          </AdminCard>
        )}
      </div>
    </main>
  );
}
