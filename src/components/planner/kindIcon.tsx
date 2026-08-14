import type { LucideIcon } from "lucide-react";
import {
  CheckSquare,
  Clock,
  UtensilsCrossed,
  Gift,
  PartyPopper,
  CalendarCheck,
  Sparkles,
} from "lucide-react";
import type { KindKey } from "@/lib/calendar-colors";

export const KIND_ICONS: Record<KindKey, LucideIcon> = {
  task: CheckSquare,
  appt: Clock,
  meal: UtensilsCrossed,
  bday: Gift,
  hol: PartyPopper,
  gcal: CalendarCheck,
  cosmic: Sparkles,
};
