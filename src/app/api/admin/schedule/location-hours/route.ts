import { NextResponse } from "next/server";

import { requireStaffAuth } from "@/lib/apiAuth";
import { DaySchedule, validateLocationSchedule } from "@/lib/locationSchedule";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_REGEX.test(value));
}

function badRequest(code: string, error: string, details?: string[]) {
  return NextResponse.json(
    {
      code,
      error,
      ...(details && details.length > 0 ? { details } : {}),
    },
    { status: 400 }
  );
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ["admin"],
      feature: "admin_schedule_location_hours_replace",
    });

    if ("response" in auth) {
      return auth.response;
    }

    const body = await request.json().catch(() => ({}));
    const locationId = typeof body?.locationId === "string" ? body.locationId : null;
    const daySchedules = Array.isArray(body?.daySchedules) ? (body.daySchedules as DaySchedule[]) : null;

    if (!isUuid(locationId)) {
      return badRequest("invalid_location_id", "locationId invalide");
    }

    if (!daySchedules || daySchedules.length !== 7) {
      return badRequest("invalid_day_schedules", "daySchedules doit contenir 7 jours");
    }

    const invalidDays = daySchedules.some((daySchedule) => (
      !Number.isInteger(daySchedule?.dayOfWeek)
      || daySchedule.dayOfWeek < 0
      || daySchedule.dayOfWeek > 6
      || typeof daySchedule?.isClosed !== "boolean"
      || !Array.isArray(daySchedule?.slots)
    ));

    if (invalidDays) {
      return badRequest("invalid_day_schedules", "Structure daySchedules invalide");
    }

    const sortedSchedules = [...daySchedules].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    const uniqueDays = new Set(sortedSchedules.map((daySchedule) => daySchedule.dayOfWeek));
    if (uniqueDays.size !== 7) {
      return badRequest("invalid_day_schedules", "Chaque dayOfWeek doit être fourni une seule fois");
    }

    const validationErrors = validateLocationSchedule(sortedSchedules);
    if (validationErrors.length > 0) {
      return badRequest(
        "invalid_location_schedule",
        "Horaires invalides pour ce centre",
        validationErrors
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("id")
      .eq("id", locationId)
      .maybeSingle();

    if (locationError) {
      console.error("location_hours_location_fetch_error", locationError);
      return NextResponse.json(
        { code: "location_fetch_failed", error: "Impossible de charger le centre" },
        { status: 500 }
      );
    }

    if (!location) {
      return NextResponse.json(
        { code: "location_not_found", error: "Centre introuvable" },
        { status: 404 }
      );
    }

    const rpcPayload = sortedSchedules.map((daySchedule) => ({
      dayOfWeek: daySchedule.dayOfWeek,
      isClosed: daySchedule.isClosed,
      slots: daySchedule.slots
        .filter((slot) => slot.start && slot.end)
        .map((slot) => ({
          start: slot.start,
          end: slot.end,
        })),
    }));

    const { data: saveResult, error: saveError } = await supabase.rpc("save_location_weekly_schedule_v2", {
      p_location_id: locationId,
      p_day_schedules: rpcPayload,
    });

    if (saveError) {
      console.error("location_hours_save_v2_error", saveError);
      return NextResponse.json(
        { code: "location_hours_save_failed", error: "Impossible de sauvegarder les horaires du centre" },
        { status: 500 }
      );
    }

    const resultRow = Array.isArray(saveResult) ? saveResult[0] : saveResult;

    return NextResponse.json(
      {
        updated_location_hours_count: resultRow?.updated_location_hours_count ?? 0,
        closed_days_count: resultRow?.closed_days_count ?? sortedSchedules.filter((daySchedule) => daySchedule.isClosed).length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("location_hours_post_unhandled_error", error);
    return NextResponse.json(
      { code: "internal_error", error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
