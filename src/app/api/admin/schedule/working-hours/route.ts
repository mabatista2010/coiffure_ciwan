import { NextResponse } from "next/server";

import { insertAdminAuditLog } from "@/lib/admin/audit";
import { requireStaffAuth } from "@/lib/apiAuth";
import { canAccessScopedResource, getScopedPermissionFilter, getStaffAccessContext } from "@/lib/permissions/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type WorkingHourInput = {
  locationId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_REGEX.test(value));
}

function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function parseTimeToMinutes(value: string): number {
  const normalized = value.slice(0, 5);
  const [hourStr, minuteStr] = normalized.split(":");
  return Number(hourStr) * 60 + Number(minuteStr);
}

function badRequest(code: string, error: string) {
  return NextResponse.json({ code, error }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ["admin", "staff"],
      feature: "admin_schedule_working_hours_replace",
      requiredPermission: "schedule.working_hours.manage",
    });

    if ("response" in auth) {
      return auth.response;
    }

    const accessContext = await getStaffAccessContext(auth.userId);
    const body = await request.json().catch(() => ({}));
    const stylistId = typeof body?.stylistId === "string" ? body.stylistId : null;
    const rows = Array.isArray(body?.workingHours) ? (body.workingHours as WorkingHourInput[]) : null;

    if (!isUuid(stylistId)) {
      return badRequest("invalid_stylist_id", "stylistId invalide");
    }

    if (!rows || rows.length === 0) {
      return badRequest("invalid_working_hours", "workingHours est obligatoire");
    }

    const permissionScope = getScopedPermissionFilter(accessContext, "schedule.working_hours.manage");
    if (permissionScope.kind === "none") {
      return NextResponse.json(
        { code: "insufficient_scope", error: "Scope insuffisant pour modifier cet agenda styliste" },
        { status: 403 }
      );
    }

    if (
      permissionScope.kind === "stylist" &&
      !canAccessScopedResource(accessContext, "schedule.working_hours.manage", { stylistId })
    ) {
      return NextResponse.json(
        { code: "insufficient_scope", error: "Scope insuffisant pour modifier cet agenda styliste" },
        { status: 403 }
      );
    }

    const normalizedRows = rows.map((row, index) => {
      const locationId = typeof row?.locationId === "string" ? row.locationId : null;
      const dayOfWeek = Number(row?.dayOfWeek);
      const startTimeRaw = typeof row?.startTime === "string" ? row.startTime.trim() : "";
      const endTimeRaw = typeof row?.endTime === "string" ? row.endTime.trim() : "";

      if (!isUuid(locationId)) {
        throw new Error(`invalid_location_id:${index}`);
      }

      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        throw new Error(`invalid_day_of_week:${index}`);
      }

      if (!TIME_REGEX.test(startTimeRaw) || !TIME_REGEX.test(endTimeRaw)) {
        throw new Error(`invalid_time_format:${index}`);
      }

      const startTime = normalizeTime(startTimeRaw);
      const endTime = normalizeTime(endTimeRaw);

      if (parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime)) {
        throw new Error(`invalid_time_order:${index}:${startTime}:${endTime}`);
      }

      return {
        input_index: index,
        location_id: locationId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
      };
    });

    // Detectar solapes internos por centro+día
    const groupedByDay = new Map<string, { start: number; end: number }[]>();
    normalizedRows.forEach((row) => {
      const key = `${row.location_id}|${row.day_of_week}`;
      const start = parseTimeToMinutes(row.start_time);
      const end = parseTimeToMinutes(row.end_time);
      if (!groupedByDay.has(key)) {
        groupedByDay.set(key, []);
      }
      groupedByDay.get(key)?.push({ start, end });
    });

    for (const [key, ranges] of groupedByDay.entries()) {
      const sorted = ranges.sort((a, b) => a.start - b.start);
      for (let i = 1; i < sorted.length; i += 1) {
        if (sorted[i].start < sorted[i - 1].end) {
          return badRequest(
            "working_hours_overlap",
            `Solapes detectados en working_hours para ${key}`
          );
        }
      }
    }

    const uniqueLocationIds = Array.from(new Set(normalizedRows.map((row) => row.location_id)));
    const unauthorizedLocationId = uniqueLocationIds.find((locationId) => (
      !canAccessScopedResource(accessContext, "schedule.working_hours.manage", { stylistId, locationId })
    ));

    if (unauthorizedLocationId) {
      return NextResponse.json(
        {
          code: "insufficient_scope",
          error: `Scope insuffisant pour modifier les horaires du centre ${unauthorizedLocationId}`,
        },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data: previousWorkingHours, error: previousWorkingHoursError } = await supabase
      .from("working_hours")
      .select("id,stylist_id,location_id,day_of_week,start_time,end_time")
      .eq("stylist_id", stylistId)
      .order("day_of_week", { ascending: true })
      .order("location_id", { ascending: true })
      .order("start_time", { ascending: true });

    if (previousWorkingHoursError) {
      console.error("working_hours_previous_fetch_error", previousWorkingHoursError);
      return NextResponse.json(
        { code: "working_hours_previous_fetch_failed", error: "Impossible de charger les horaires actuels du styliste" },
        { status: 500 }
      );
    }

    // Validar que el estilista existe
    const { data: stylist, error: stylistError } = await supabase
      .from("stylists")
      .select("id")
      .eq("id", stylistId)
      .maybeSingle();

    if (stylistError) {
      console.error("working_hours_stylist_fetch_error", stylistError);
      return NextResponse.json(
        { code: "working_hours_stylist_fetch_failed", error: "Impossible de charger le styliste" },
        { status: 500 }
      );
    }

    if (!stylist) {
      return NextResponse.json(
        { code: "stylist_not_found", error: "Styliste introuvable" },
        { status: 404 }
      );
    }

    // Cargar horarios regulares del centro para validación dura
    const { data: centerHours, error: centerHoursError } = await supabase
      .from("location_hours")
      .select("location_id,day_of_week,start_time,end_time")
      .in("location_id", uniqueLocationIds);

    if (centerHoursError) {
      console.error("working_hours_location_hours_fetch_error", centerHoursError);
      return NextResponse.json(
        { code: "working_hours_location_hours_fetch_failed", error: "Impossible de charger les horaires des centres" },
        { status: 500 }
      );
    }

    const centerHoursByDay = new Map<string, { start: number; end: number }[]>();
    (centerHours || []).forEach((slot) => {
      const key = `${slot.location_id}|${slot.day_of_week}`;
      const parsed = {
        start: parseTimeToMinutes(slot.start_time),
        end: parseTimeToMinutes(slot.end_time),
      };
      if (!centerHoursByDay.has(key)) {
        centerHoursByDay.set(key, []);
      }
      centerHoursByDay.get(key)?.push(parsed);
    });

    for (const row of normalizedRows) {
      const key = `${row.location_id}|${row.day_of_week}`;
      const centerRanges = centerHoursByDay.get(key) || [];
      const whStart = parseTimeToMinutes(row.start_time);
      const whEnd = parseTimeToMinutes(row.end_time);

      const fitsCenter = centerRanges.some((slot) => whStart >= slot.start && whEnd <= slot.end);
      if (!fitsCenter) {
        return badRequest(
          "outside_location_hours",
          `Créneau hors horaires centre (index ${row.input_index}): locationId=${row.location_id}, dayOfWeek=${row.day_of_week}, ${row.start_time}→${row.end_time}`
        );
      }
    }

    // Reemplazo completo del horario del estilista
    const { error: deleteError } = await supabase
      .from("working_hours")
      .delete()
      .eq("stylist_id", stylistId);

    if (deleteError) {
      console.error("working_hours_delete_error", deleteError);
      return NextResponse.json(
        { code: "working_hours_delete_failed", error: "Impossible de remplacer les horaires du styliste" },
        { status: 500 }
      );
    }

    const rowsToInsert = normalizedRows.map((row) => ({
      stylist_id: stylistId,
      location_id: row.location_id,
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
    }));

    const { error: insertError } = await supabase
      .from("working_hours")
      .insert(rowsToInsert);

    if (insertError) {
      console.error("working_hours_insert_error", insertError);
      return NextResponse.json(
        { code: "working_hours_insert_failed", error: "Impossible de sauvegarder les horaires du styliste" },
        { status: 500 }
      );
    }

    await insertAdminAuditLog({
      actorUserId: auth.userId,
      entityType: "working_hours",
      entityId: stylistId,
      action: "update",
      before: {
        stylist_id: stylistId,
        working_hours: previousWorkingHours ?? [],
      },
      after: {
        stylist_id: stylistId,
        working_hours: rowsToInsert,
      },
      meta: {
        source: "admin_schedule_working_hours_api",
      },
    });

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const todayKey = `${y}-${m}-${d}`;

    const { count: needsReplanCount, error: replanCountError } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("stylist_id", stylistId)
      .eq("status", "needs_replan")
      .gte("booking_date", todayKey);

    if (replanCountError) {
      console.warn("working_hours_replan_count_warning", replanCountError);
    }

    return NextResponse.json(
      {
        updated_working_hours_count: rowsToInsert.length,
        needs_replan_detected_count: needsReplanCount || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";

    if (message.startsWith("invalid_location_id:")) {
      return badRequest("invalid_location_id", "locationId invalide dans workingHours");
    }

    if (message.startsWith("invalid_day_of_week:")) {
      return badRequest("invalid_day_of_week", "dayOfWeek invalide dans workingHours");
    }

    if (message.startsWith("invalid_time_format:")) {
      return badRequest("invalid_time_format", "Format horaire invalide dans workingHours");
    }

    if (message.startsWith("invalid_time_order:")) {
      const [, index = "?", startTime = "?", endTime = "?"] = message.split(":");
      return badRequest(
        "invalid_time_order",
        `Plage invalide (index ${index}): ${startTime} → ${endTime}. startTime doit être inférieur à endTime`
      );
    }

    console.error("working_hours_post_unhandled_error", error);
    return NextResponse.json(
      { code: "internal_error", error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
