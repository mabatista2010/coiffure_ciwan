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
  pending: "border-amber-300 bg-amber-50 text-amber-700",
  confirmed: "border-blue-300 bg-blue-50 text-blue-700",
  cancelled: "border-red-300 bg-red-50 text-red-700",
  completed: "border-emerald-300 bg-emerald-50 text-emerald-700",
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
