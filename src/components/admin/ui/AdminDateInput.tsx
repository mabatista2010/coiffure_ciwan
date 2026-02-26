import {
  type ComponentPropsWithoutRef,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FALLBACK_LABEL = "Sélectionner une date";
const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

type AdminDateInputProps = {
  className?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  min?: string;
  max?: string;
  onChange?: (event: { target: { value: string } }) => void;
  onBlur?: ComponentPropsWithoutRef<"button">["onBlur"];
  onFocus?: ComponentPropsWithoutRef<"button">["onFocus"];
};

function parseDateFromKey(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string): string {
  const parsedDate = parseDateFromKey(value);
  if (!parsedDate) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function getMonthGrid(baseMonth: Date): Array<Date | null> {
  const year = baseMonth.getFullYear();
  const month = baseMonth.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const leadingDays = (firstDay + 6) % 7;

  const days: Array<Date | null> = [];

  for (let index = 0; index < leadingDays; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    days.push(new Date(year, month, day));
  }

  const remainingSlots = (7 - (days.length % 7)) % 7;
  for (let index = 0; index < remainingSlots; index += 1) {
    days.push(null);
  }

  return days;
}

function toDayTimestamp(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function isBeforeDay(left: Date, right: Date): boolean {
  return toDayTimestamp(left) < toDayTimestamp(right);
}

function isAfterDay(left: Date, right: Date): boolean {
  return toDayTimestamp(left) > toDayTimestamp(right);
}

function AdminDateInput({
  className,
  value,
  defaultValue,
  disabled,
  id,
  name,
  required,
  min,
  max,
  onChange,
  onBlur,
  onFocus,
}: AdminDateInputProps) {
  const today = useMemo(() => new Date(), []);
  const initialDate = useMemo(() => {
    if (typeof value === "string" && value.length > 0) {
      return parseDateFromKey(value);
    }

    if (typeof defaultValue === "string" && defaultValue.length > 0) {
      return parseDateFromKey(defaultValue);
    }

    return null;
  }, [defaultValue, value]);

  const currentValue = typeof value === "string" ? value : defaultValue ?? "";
  const hasValue = currentValue.length > 0;
  const displayLabel = hasValue ? formatDisplayDate(currentValue) : FALLBACK_LABEL;

  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const initial = initialDate ?? today;
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  const rootRef = useRef<HTMLDivElement | null>(null);

  const minDate = useMemo(() => (min ? parseDateFromKey(min) : null), [min]);
  const maxDate = useMemo(() => (max ? parseDateFromKey(max) : null), [max]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!hasValue) {
      return;
    }

    const selectedDate = parseDateFromKey(currentValue);
    if (!selectedDate) {
      return;
    }

    setViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [currentValue, hasValue]);

  const monthGrid = useMemo(() => getMonthGrid(viewMonth), [viewMonth]);

  const emitChange = (nextValue: string) => {
    onChange?.({ target: { value: nextValue } });
  };

  const setSelectedValue = (date: Date) => {
    const nextValue = formatDateKey(date);
    emitChange(nextValue);
    setIsOpen(false);
  };

  const clearSelection = () => {
    emitChange("");
    setIsOpen(false);
  };

  const goToToday = () => {
    const now = new Date();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedValue(now);
  };

  const goToPreviousMonth = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setViewMonth((prevMonth) => new Date(prevMonth.getFullYear(), prevMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setViewMonth((prevMonth) => new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 1));
  };

  const monthLabel = useMemo(
    () =>
      viewMonth.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      }),
    [viewMonth]
  );

  return (
    <div ref={rootRef} className={cn("relative w-full", isOpen && "z-[320]", className)}>
      <input type="hidden" name={name} value={currentValue} required={required} />

      <Button
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onBlur={onBlur}
        onFocus={onFocus}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "h-10 w-full justify-between rounded-xl px-3 text-sm font-medium",
          hasValue ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground/90" />
      </Button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="Sélection de date"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-[330] w-[min(20rem,calc(100vw-2.5rem))] rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-[var(--admin-shadow-card)]"
        >
          <div className="mb-3 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={goToPreviousMonth}
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <p className="text-sm font-semibold capitalize text-foreground">{monthLabel}</p>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={goToNextMonth}
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((weekdayLabel, index) => (
              <span
                key={`weekday-${weekdayLabel}-${index}`}
                className="flex h-7 items-center justify-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {weekdayLabel}
              </span>
            ))}

            {monthGrid.map((dayDate, index) => {
              if (!dayDate) {
                return <span key={`day-empty-${index}`} className="h-9" aria-hidden="true" />;
              }

              const dayKey = formatDateKey(dayDate);
              const isSelected = dayKey === currentValue;
              const isToday = dayKey === formatDateKey(today);
              const isBeforeMin = minDate ? isBeforeDay(dayDate, new Date(minDate)) : false;
              const isAfterMax = maxDate ? isAfterDay(dayDate, new Date(maxDate)) : false;
              const isUnavailable = isBeforeMin || isAfterMax;

              return (
                <Button
                  key={`day-${dayKey}`}
                  type="button"
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  disabled={isUnavailable}
                  className={cn(
                    "h-9 w-full rounded-lg px-0 text-sm",
                    !isSelected && "font-medium text-foreground/90",
                    isToday && !isSelected && "border border-primary/45 text-primary",
                    isUnavailable && "cursor-not-allowed text-muted-foreground/55"
                  )}
                  onClick={() => setSelectedValue(dayDate)}
                >
                  {dayDate.getDate()}
                </Button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={clearSelection}
              disabled={!hasValue}
            >
              Effacer
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={goToToday}
            >
              Aujourd&apos;hui
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { AdminDateInput };
