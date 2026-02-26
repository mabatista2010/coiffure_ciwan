"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaChartLine,
  FaCut,
  FaEuroSign,
  FaMapMarkerAlt,
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
  | "mes"
  | "año"
  | "personalizado"
  | "semana_anterior"
  | "mes_anterior"
  | "año_anterior";

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
    return "https://placehold.co/400x400/212121/FFD700.png?text=Styliste";
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

const getMonthName = (monthYearStr: string): string => {
  const month = monthYearStr.split("/")[0];
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
  return monthNames[parseInt(month, 10) - 1];
};

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
    case "semana_anterior": {
      const currentDay = today.getDay();
      const diffToMonday = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const startDate = new Date(monday);
      startDate.setDate(monday.getDate() - 7);

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

export default function StylistStatsPage() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<string | null>(null);
  const [selectedStylistData, setSelectedStylistData] = useState<Stylist | null>(null);
  const [stats, setStats] = useState<StylistStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [dateRangeType, setDateRangeType] = useState<DateRangeType>("mes");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    buildDateRange("mes", "", "")
  );

  useEffect(() => {
    async function loadStylists() {
      try {
        const { data, error: stylistsError } = await supabase
          .from("stylists")
          .select("id, name, profile_img")
          .eq("active", true)
          .order("name");

        if (stylistsError) {
          throw stylistsError;
        }

        setStylists(data || []);

        if (data && data.length > 0) {
          setSelectedStylist(data[0].id);
        }
      } catch (err) {
        console.error("Error al cargar estilistas:", err);
        setError("Error al cargar la lista de estilistas");
      } finally {
        setLoading(false);
      }
    }

    void loadStylists();
  }, []);

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
    if (!selectedStylist) {
      return;
    }

    async function loadStylistStats() {
      setLoading(true);

      try {
        const startDateStr = dateRange.startDate.toISOString();
        const endDateStr = dateRange.endDate.toISOString();

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

        const monthsMap: Record<string, number> = {};
        const startMonth = new Date(dateRange.startDate);
        const endMonth = new Date(dateRange.endDate);

        const currentMonth = new Date(startMonth);
        while (currentMonth <= endMonth) {
          const monthYear = `${currentMonth.getMonth() + 1}/${currentMonth.getFullYear()}`;
          monthsMap[monthYear] = 0;
          currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

        bookingsWithService?.forEach((booking) => {
          if (booking.booking_date) {
            const date = new Date(booking.booking_date);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
            if (monthsMap[monthYear] !== undefined) {
              monthsMap[monthYear] = (monthsMap[monthYear] || 0) + 1;
            }
          }
        });

        const bookingsByMonth = Object.entries(monthsMap)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => {
            const [aMonth, aYear] = a.month.split("/").map(Number);
            const [bMonth, bYear] = b.month.split("/").map(Number);
            return aYear * 12 + aMonth - (bYear * 12 + bMonth);
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
          bookingsByMonth,
        });
      } catch (err) {
        console.error("Error al cargar estadisticas:", err);
        setError("Error al cargar las estadisticas del estilista");
      } finally {
        setLoading(false);
      }
    }

    void loadStylistStats();
  }, [selectedStylist, dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "CHF",
    }).format(amount);
  };

  const selectedDateRangeLabel = useMemo(
    () => `${dateRange.startDate.toLocaleDateString("fr-FR")} - ${dateRange.endDate.toLocaleDateString("fr-FR")}`,
    [dateRange]
  );

  return (
    <main className="admin-scope min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <SectionHeader
          title="Statistiques des Stylistes"
          description="Vue consolidee des performances par styliste sur la periode selectionnee."
        />

        <AdminCard>
          <AdminCardContent className="space-y-4 pt-6">
            <FilterBar>
              <div className="space-y-2">
                <label htmlFor="stylist-select" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Styliste
                </label>
                <Select
                  value={selectedStylist || "none"}
                  onValueChange={(value) =>
                    setSelectedStylist(value === "none" ? null : value)
                  }
                >
                  <SelectTrigger id="stylist-select">
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

              {dateRangeType === "personalizado" ? (
                <div className="space-y-2">
                  <label htmlFor="start-date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                  <label htmlFor="end-date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Periode active
                </p>
                <p className="rounded-xl border border-primary/20 bg-card px-3 py-2 text-sm text-primary">
                  {selectedDateRangeLabel}
                </p>
              </div>

              <div className="space-y-2 md:col-span-2 xl:col-span-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Raccourcis de periode
                </p>
                <div className="flex flex-wrap gap-2">
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={dateRangeType === option.value ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setDateRangeType(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </FilterBar>

            {selectedStylistData ? (
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-primary/70">
                  <Image
                    src={getImageUrl(selectedStylistData.profile_img)}
                    alt={selectedStylistData.name}
                    fill
                    style={{ objectFit: "cover" }}
                    className="rounded-full"
                    onError={(event) => {
                      (event.target as HTMLImageElement).src =
                        "https://placehold.co/400x400/212121/FFD700.png?text=Styliste";
                    }}
                  />
                </div>
                <p className="text-lg font-semibold text-primary">
                  {selectedStylistData.name}
                </p>
              </div>
            ) : null}
          </AdminCardContent>
        </AdminCard>

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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminCard>
                <AdminCardContent className="space-y-2 pt-6">
                  <p className="flex items-center gap-2 text-foreground">
                    <FaCalendarCheck className="text-primary" />
                    Reservations
                  </p>
                  <p className="text-3xl font-semibold text-primary">
                    {stats.totalBookings}
                  </p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Completees: {stats.completedBookings}</p>
                    <p>Confirmees: {stats.confirmedBookings}</p>
                    <p>En attente: {stats.pendingBookings}</p>
                    <p>Annulees: {stats.cancelledBookings}</p>
                  </div>
                </AdminCardContent>
              </AdminCard>

              <AdminCard>
                <AdminCardContent className="space-y-2 pt-6">
                  <p className="flex items-center gap-2 text-foreground">
                    <FaEuroSign className="text-primary" />
                    Revenus
                  </p>
                  <p className="text-3xl font-semibold text-primary">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                  <p className="text-sm text-muted-foreground">
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
                  <p className="flex items-center gap-2 text-foreground">
                    <FaCut className="text-primary" />
                    Services populaires
                  </p>
                  <div className="space-y-2 text-sm">
                    {stats.topServices.slice(0, 3).map((service, index) => (
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
                <AdminCardContent className="space-y-2 pt-6">
                  <p className="flex items-center gap-2 text-foreground">
                    <FaMapMarkerAlt className="text-primary" />
                    Centres
                  </p>
                  <div className="space-y-2 text-sm">
                    {stats.bookingsByLocation.slice(0, 3).map((location, index) => (
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
                  {stats.bookingsByMonth.length > 0
                    ? `${formatMonthYear(stats.bookingsByMonth[0].month)} - ${formatMonthYear(
                        stats.bookingsByMonth[stats.bookingsByMonth.length - 1].month
                      )}`
                    : "Aucune donnee"}
                </p>
              </AdminCardHeader>
              <AdminCardContent>
                {stats.bookingsByMonth.length > 0 ? (
                  <div className="flex h-64 items-end gap-2 overflow-x-auto pb-3">
                    {stats.bookingsByMonth.map((item, index) => {
                      const maxCount = Math.max(...stats.bookingsByMonth.map((month) => month.count));
                      const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      const isCompact = stats.bookingsByMonth.length > 6;

                      return (
                        <div key={index} className="flex min-w-[44px] flex-1 flex-col items-center gap-2">
                          <div
                            className="w-full rounded-t bg-primary transition-all"
                            style={{ height: `${height}%` }}
                          />
                          <span className="text-[10px] text-muted-foreground sm:text-xs">
                            {isCompact ? getMonthName(item.month) : formatMonthYear(item.month)}
                          </span>
                          <span className="text-xs font-semibold text-primary">
                            {item.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
                    Aucune reservation trouvee pour cette periode.
                  </div>
                )}
              </AdminCardContent>
            </AdminCard>
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
