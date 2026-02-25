"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaChartLine,
  FaCut,
  FaEuroSign,
  FaUserTie,
} from "react-icons/fa";

import {
  AdminCard,
  AdminCardContent,
  AdminCardHeader,
  FilterBar,
  SectionHeader,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

type DateRangeType =
  | "semana"
  | "semana_anterior"
  | "mes"
  | "mes_anterior"
  | "año"
  | "año_anterior"
  | "personalizado";

const DATE_RANGE_OPTIONS: { value: DateRangeType; label: string }[] = [
  { value: "semana", label: "Semaine actuelle" },
  { value: "semana_anterior", label: "Semaine precedente" },
  { value: "mes", label: "Mois actuel" },
  { value: "mes_anterior", label: "Mois precedent" },
  { value: "año", label: "Annee actuelle" },
  { value: "año_anterior", label: "Annee precedente" },
  { value: "personalizado", label: "Personnalise" },
];

const getImageUrl = (path: string | null): string => {
  if (!path) {
    return "https://placehold.co/640x360/212121/FFD700.png?text=Centre";
  }

  if (path.startsWith("http")) {
    return path;
  }

  if (path.includes("storage/v1/object")) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/${path}`;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  if (path.startsWith("locations/") || path.startsWith("centros/")) {
    return `${supabaseUrl}/storage/v1/object/public/${path}`;
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const formatMonthYear = (monthYearStr: string): string => {
  const [month, year] = monthYearStr.split("/");
  const monthNames = [
    "Jan",
    "Fev",
    "Mar",
    "Avr",
    "Mai",
    "Jun",
    "Jul",
    "Aou",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
};

const getDayName = (dayIndex: number): string => {
  const days = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];
  return days[dayIndex];
};

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
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay() + 1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      return { startDate, endDate, label: "Semaine actuelle" };
    }
    case "semana_anterior": {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay() - 6);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      return { startDate, endDate, label: "Semaine precedente" };
    }
    case "mes": {
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate, label: "Mois actuel" };
    }
    case "mes_anterior": {
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate, label: "Mois precedent" };
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

export default function LocationStatsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedLocationData, setSelectedLocationData] = useState<Location | null>(null);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [dateRangeType, setDateRangeType] = useState<DateRangeType>("mes");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    buildDateRange("mes", "", "")
  );

  useEffect(() => {
    async function loadLocations() {
      try {
        const { data, error: locationsError } = await supabase
          .from("locations")
          .select("id, name, image")
          .eq("active", true)
          .order("name");

        if (locationsError) {
          throw locationsError;
        }

        setLocations(data || []);

        if (data && data.length > 0) {
          setSelectedLocation(data[0].id);
        }
      } catch (err) {
        console.error("Error al cargar centros:", err);
        setError("Error al cargar la lista de centros");
      } finally {
        setLoading(false);
      }
    }

    void loadLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation && locations.length > 0) {
      const locationData = locations.find((location) => location.id === selectedLocation);
      setSelectedLocationData(locationData || null);
    } else {
      setSelectedLocationData(null);
    }
  }, [selectedLocation, locations]);

  useEffect(() => {
    setDateRange(buildDateRange(dateRangeType, customStartDate, customEndDate));
  }, [dateRangeType, customStartDate, customEndDate]);

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    async function loadLocationStats() {
      setLoading(true);

      try {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("id, status, service_id, booking_date")
          .eq("location_id", selectedLocation)
          .gte("booking_date", dateRange.startDate.toISOString())
          .lte("booking_date", dateRange.endDate.toISOString());

        if (bookingsError) {
          throw bookingsError;
        }

        const { data: servicesData, error: servicesError } = await supabase
          .from("servicios")
          .select("id, nombre, precio");

        if (servicesError) {
          throw servicesError;
        }

        const { data: bookingsWithDetails, error: bookingsWithDetailsError } =
          await supabase
            .from("bookings")
            .select(
              `
              id,
              status,
              service_id,
              servicios:service_id (nombre),
              stylist_id,
              stylists:stylist_id (name),
              booking_date
            `
            )
            .eq("location_id", selectedLocation)
            .gte("booking_date", dateRange.startDate.toISOString())
            .lte("booking_date", dateRange.endDate.toISOString());

        if (bookingsWithDetailsError) {
          throw bookingsWithDetailsError;
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
        const completedBookingsWithDetails =
          bookingsWithDetails?.filter((booking) => booking.status === "completed") || [];

        completedBookingsWithDetails.forEach((booking) => {
          const service = servicesData?.find((item) => item.id === booking.service_id);
          if (service) {
            totalRevenue += service.precio;
          }
        });

        const stylistCountMap: Record<string, number> = {};
        bookingsWithDetails?.forEach((booking) => {
          if (
            booking.stylists &&
            typeof booking.stylists === "object" &&
            "name" in booking.stylists
          ) {
            const stylistName = booking.stylists.name as string;
            stylistCountMap[stylistName] = (stylistCountMap[stylistName] || 0) + 1;
          }
        });

        const topStylists = Object.entries(stylistCountMap)
          .map(([stylist_name, count]) => ({ stylist_name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const serviceCountMap: Record<string, number> = {};
        bookingsWithDetails?.forEach((booking) => {
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

        const monthsMap: Record<string, number> = {};
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);

        let year = startDate.getFullYear();
        let month = startDate.getMonth();

        while (new Date(year, month, 1) <= endDate) {
          const monthYear = `${month + 1}/${year}`;
          monthsMap[monthYear] = 0;

          month += 1;
          if (month === 12) {
            month = 0;
            year += 1;
          }
        }

        bookingsWithDetails?.forEach((booking) => {
          if (booking.booking_date) {
            const bookingDate = new Date(booking.booking_date);
            const monthYear = `${bookingDate.getMonth() + 1}/${bookingDate.getFullYear()}`;
            if (monthsMap[monthYear] !== undefined) {
              monthsMap[monthYear] = (monthsMap[monthYear] || 0) + 1;
            }
          }
        });

        const bookingsByMonth = Object.entries(monthsMap)
          .map(([monthYear, count]) => ({ month: monthYear, count }))
          .sort((a, b) => {
            const [aMonth, aYear] = a.month.split("/").map(Number);
            const [bMonth, bYear] = b.month.split("/").map(Number);
            return aYear * 12 + aMonth - (bYear * 12 + bMonth);
          });

        const uniqueDays = new Set(bookingsData?.map((booking) => booking.booking_date) || []);
        const averageBookingsPerDay = uniqueDays.size > 0 ? totalBookings / uniqueDays.size : 0;

        const dayCountMap: Record<string, number> = {};
        bookingsData?.forEach((booking) => {
          if (booking.booking_date) {
            const bookingDate = new Date(booking.booking_date);
            const dayName = getDayName(bookingDate.getDay());
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
          busyDays,
        });
      } catch (err) {
        console.error("Error al cargar estadisticas:", err);
        setError("Error al cargar las estadisticas del centro");
      } finally {
        setLoading(false);
      }
    }

    void loadLocationStats();
  }, [selectedLocation, dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const selectedDateRangeLabel = useMemo(
    () => `${dateRange.startDate.toLocaleDateString("fr-FR")} - ${dateRange.endDate.toLocaleDateString("fr-FR")}`,
    [dateRange]
  );

  return (
    <main className="admin-scope min-h-screen bg-dark px-4 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <SectionHeader
          title="Statistiques des Centres"
          description="Suivi des performances, revenus et activite des centres sur la periode selectionnee."
        />

        <AdminCard>
          <AdminCardContent className="space-y-4 pt-6">
            <FilterBar>
              <div className="space-y-2">
                <label htmlFor="location-select" className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Centre
                </label>
                <Select
                  value={selectedLocation || "none"}
                  onValueChange={(value) =>
                    setSelectedLocation(value === "none" ? null : value)
                  }
                >
                  <SelectTrigger id="location-select">
                    <SelectValue placeholder="Selectionner un centre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selectionner un centre</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {dateRangeType === "personalizado" ? (
                <div className="space-y-2">
                  <label htmlFor="start-date" className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Date de debut
                  </label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                  />
                </div>
              ) : null}

              {dateRangeType === "personalizado" ? (
                <div className="space-y-2">
                  <label htmlFor="end-date" className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Date de fin
                  </label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Periode active
                </p>
                <p className="rounded-xl border border-primary/20 bg-black/35 px-3 py-2 text-sm text-primary">
                  {selectedDateRangeLabel}
                </p>
              </div>

              <div className="space-y-2 md:col-span-2 xl:col-span-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Raccourcis de periode
                </p>
                <div className="flex flex-wrap gap-2">
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={dateRangeType === option.value ? "default" : "secondary"}
                      onClick={() => setDateRangeType(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </FilterBar>

            {selectedLocationData ? (
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="relative h-36 w-64 overflow-hidden rounded-xl border-4 border-primary/70">
                  <Image
                    src={getImageUrl(selectedLocationData.image)}
                    alt={selectedLocationData.name}
                    fill
                    style={{ objectFit: "cover" }}
                    className="rounded-xl"
                    onError={(event) => {
                      (event.target as HTMLImageElement).src =
                        "https://placehold.co/640x360/212121/FFD700.png?text=Centre";
                    }}
                  />
                </div>
                <p className="text-lg font-semibold text-primary">
                  {selectedLocationData.name}
                </p>
              </div>
            ) : null}
          </AdminCardContent>
        </AdminCard>

        {loading ? (
          <AdminCard>
            <AdminCardContent className="flex min-h-56 items-center justify-center gap-3 text-zinc-300">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminCard>
                <AdminCardContent className="space-y-2 pt-6">
                  <p className="flex items-center gap-2 text-zinc-300">
                    <FaCalendarCheck className="text-primary" />
                    Reservations
                  </p>
                  <p className="text-3xl font-semibold text-primary">
                    {stats.totalBookings}
                  </p>
                  <div className="space-y-1 text-sm text-zinc-400">
                    <p>Completees: {stats.completedBookings}</p>
                    <p>Confirmees: {stats.confirmedBookings}</p>
                    <p>En attente: {stats.pendingBookings}</p>
                    <p>Annulees: {stats.cancelledBookings}</p>
                  </div>
                </AdminCardContent>
              </AdminCard>

              <AdminCard>
                <AdminCardContent className="space-y-2 pt-6">
                  <p className="flex items-center gap-2 text-zinc-300">
                    <FaEuroSign className="text-primary" />
                    Revenus
                  </p>
                  <p className="text-3xl font-semibold text-primary">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Moyenne par reservation: {" "}
                    {formatCurrency(
                      stats.completedBookings
                        ? stats.totalRevenue / stats.completedBookings
                        : 0
                    )}
                  </p>
                </AdminCardContent>
              </AdminCard>

              <AdminCard>
                <AdminCardContent className="space-y-2 pt-6">
                  <p className="flex items-center gap-2 text-zinc-300">
                    <FaUserTie className="text-primary" />
                    Stylistes actifs
                  </p>
                  <div className="space-y-2 text-sm">
                    {stats.topStylists.slice(0, 3).map((stylist, index) => (
                      <p key={index} className="flex justify-between gap-3 text-zinc-300">
                        <span className="truncate" title={stylist.stylist_name}>
                          {stylist.stylist_name}
                        </span>
                        <span className="font-semibold text-primary">{stylist.count}</span>
                      </p>
                    ))}
                  </div>
                </AdminCardContent>
              </AdminCard>

              <AdminCard>
                <AdminCardContent className="space-y-2 pt-6">
                  <p className="flex items-center gap-2 text-zinc-300">
                    <FaCut className="text-primary" />
                    Services populaires
                  </p>
                  <div className="space-y-2 text-sm">
                    {stats.topServices.slice(0, 3).map((service, index) => (
                      <p key={index} className="flex justify-between gap-3 text-zinc-300">
                        <span className="truncate" title={service.service_name}>
                          {service.service_name}
                        </span>
                        <span className="font-semibold text-primary">{service.count}</span>
                      </p>
                    ))}
                  </div>
                </AdminCardContent>
              </AdminCard>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <AdminCard>
                <AdminCardHeader>
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Stylistes les plus actifs
                  </h3>
                </AdminCardHeader>
                <AdminCardContent className="space-y-3">
                  {stats.topStylists.map((stylist, index) => {
                    const topValue = stats.topStylists[0]?.count || 1;
                    const width = (stylist.count / topValue) * 100;

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-sm text-zinc-300">
                          <span className="truncate" title={stylist.stylist_name}>
                            {stylist.stylist_name}
                          </span>
                          <span className="font-semibold text-primary">{stylist.count}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-black/55">
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
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Services les plus demandes
                  </h3>
                </AdminCardHeader>
                <AdminCardContent className="space-y-3">
                  {stats.topServices.map((service, index) => {
                    const topValue = stats.topServices[0]?.count || 1;
                    const width = (service.count / topValue) * 100;

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-sm text-zinc-300">
                          <span className="truncate" title={service.service_name}>
                            {service.service_name}
                          </span>
                          <span className="font-semibold text-primary">{service.count}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-black/55">
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

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <AdminCard>
                <AdminCardHeader>
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Jours les plus occupes
                  </h3>
                </AdminCardHeader>
                <AdminCardContent className="space-y-4">
                  <p className="text-sm text-zinc-400">
                    Moyenne de reservations par jour: {" "}
                    <span className="font-semibold text-primary">
                      {stats.averageBookingsPerDay.toFixed(1)}
                    </span>
                  </p>

                  <div className="space-y-3">
                    {stats.busyDays.map((day, index) => {
                      const topValue = stats.busyDays[0]?.count || 1;
                      const width = (day.count / topValue) * 100;

                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between gap-3 text-sm text-zinc-300">
                            <span>{day.day}</span>
                            <span className="font-semibold text-primary">{day.count}</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-black/55">
                            <div
                              className="h-2.5 rounded-full bg-primary transition-all"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AdminCardContent>
              </AdminCard>

              <AdminCard>
                <AdminCardHeader>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
                    <FaChartLine className="text-primary" />
                    Tendance des reservations
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {stats.bookingsByMonth.length > 0
                      ? `${formatMonthYear(stats.bookingsByMonth[0].month)} - ${formatMonthYear(
                          stats.bookingsByMonth[stats.bookingsByMonth.length - 1].month
                        )}`
                      : "Aucune donnee"}
                  </p>
                </AdminCardHeader>
                <AdminCardContent>
                  {stats.bookingsByMonth.length > 0 ? (
                    <div className="flex h-56 items-end gap-2 overflow-x-auto pb-3">
                      {stats.bookingsByMonth.map((item, index) => {
                        const maxCount = Math.max(...stats.bookingsByMonth.map((month) => month.count));
                        const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                        return (
                          <div key={index} className="flex min-w-[48px] flex-1 flex-col items-center gap-2">
                            <div
                              className="w-full rounded-t bg-primary transition-all"
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-[10px] text-zinc-400 sm:text-xs">
                              {formatMonthYear(item.month)}
                            </span>
                            <span className="text-xs font-semibold text-primary">
                              {item.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-28 items-center justify-center text-sm text-zinc-400">
                      Aucune reservation trouvee pour cette periode.
                    </div>
                  )}
                </AdminCardContent>
              </AdminCard>
            </div>
          </>
        ) : (
          <AdminCard>
            <AdminCardContent className="py-8 text-center text-zinc-400">
              Selectionnez un centre pour afficher ses statistiques.
            </AdminCardContent>
          </AdminCard>
        )}
      </div>
    </main>
  );
}
