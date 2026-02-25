import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed";

interface ReservationStatusSelectProps {
  value: ReservationStatus;
  onChange: (value: ReservationStatus) => void;
  className?: string;
}

const STATUS_STYLES: Record<ReservationStatus, string> = {
  pending: "border-amber-500/45 bg-amber-500/15 text-amber-100",
  confirmed: "border-blue-500/45 bg-blue-500/15 text-blue-100",
  cancelled: "border-destructive/45 bg-destructive/15 text-red-100",
  completed: "border-emerald-500/45 bg-emerald-500/15 text-emerald-100",
};

function ReservationStatusSelect({
  value,
  onChange,
  className,
}: ReservationStatusSelectProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as ReservationStatus)}>
      <SelectTrigger className={cn("h-9 text-xs md:h-10 md:text-sm", STATUS_STYLES[value], className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">En attente</SelectItem>
        <SelectItem value="confirmed">Confirmé</SelectItem>
        <SelectItem value="completed">Terminé</SelectItem>
        <SelectItem value="cancelled">Annulé</SelectItem>
      </SelectContent>
    </Select>
  );
}

export { ReservationStatusSelect, type ReservationStatus };
