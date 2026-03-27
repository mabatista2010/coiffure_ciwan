export type DaySlot = {
  start: string;
  end: string;
};

export type DaySchedule = {
  dayOfWeek: number;
  isClosed: boolean;
  slots: DaySlot[];
};

export const WEEKDAYS = [
  { id: 0, name: "Dimanche" },
  { id: 1, name: "Lundi" },
  { id: 2, name: "Mardi" },
  { id: 3, name: "Mercredi" },
  { id: 4, name: "Jeudi" },
  { id: 5, name: "Vendredi" },
  { id: 6, name: "Samedi" },
] as const;

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function createEmptyDaySlot(): DaySlot {
  return { start: "", end: "" };
}

export function createDefaultLocationSchedule(): DaySchedule[] {
  return WEEKDAYS.map((day) => ({
    dayOfWeek: day.id,
    isClosed: true,
    slots: [createEmptyDaySlot()],
  }));
}

export function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isValidTimeFormat(value: string): boolean {
  return TIME_REGEX.test(value);
}

export function validateLocationSchedule(daySchedules: DaySchedule[]): string[] {
  const errors: string[] = [];

  daySchedules.forEach((daySchedule) => {
    const dayLabel = WEEKDAYS.find((day) => day.id === daySchedule.dayOfWeek)?.name ?? `Jour ${daySchedule.dayOfWeek}`;

    if (daySchedule.isClosed) {
      return;
    }

    const filledSlots = daySchedule.slots.filter((slot) => slot.start || slot.end);

    if (filledSlots.length === 0) {
      errors.push(`${dayLabel}: ajoutez au moins une plage horaire.`);
      return;
    }

    const normalizedRanges = filledSlots.map((slot, index) => {
      if (!slot.start || !slot.end) {
        errors.push(`${dayLabel}: la plage ${index + 1} doit contenir une heure de début et de fin.`);
        return null;
      }

      if (!isValidTimeFormat(slot.start) || !isValidTimeFormat(slot.end)) {
        errors.push(`${dayLabel}: format horaire invalide sur la plage ${index + 1}.`);
        return null;
      }

      const startMinutes = parseTimeToMinutes(slot.start);
      const endMinutes = parseTimeToMinutes(slot.end);

      if (endMinutes <= startMinutes) {
        errors.push(`${dayLabel}: la plage ${index + 1} doit avoir une heure de fin supérieure au début.`);
        return null;
      }

      return {
        index,
        start: startMinutes,
        end: endMinutes,
      };
    }).filter((range): range is { index: number; start: number; end: number } => Boolean(range));

    const sortedRanges = [...normalizedRanges].sort((a, b) => a.start - b.start);
    for (let index = 1; index < sortedRanges.length; index += 1) {
      const previous = sortedRanges[index - 1];
      const current = sortedRanges[index];

      if (current.start < previous.end) {
        errors.push(
          `${dayLabel}: chevauchement détecté entre les plages ${previous.index + 1} et ${current.index + 1}.`
        );
      }
    }
  });

  return errors;
}
