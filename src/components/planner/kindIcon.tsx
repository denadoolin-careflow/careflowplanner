import type { LucideIcon } from "lucide-react";
import {
  CheckSquare,
  Clock,
  UtensilsCrossed,
  Gift,
  PartyPopper,
  CalendarCheck,
  Sparkles,
  Heart,
  Flower2,
} from "lucide-react";
import type { KindKey } from "@/lib/calendar-colors";

export const KIND_ICONS: Record<KindKey, LucideIcon> = {
  task: CheckSquare,
  appt: Clock,
  care: Heart,
  meal: UtensilsCrossed,
  bday: Gift,
  hol: PartyPopper,
  gcal: CalendarCheck,
  season: Flower2,
  cosmic: Sparkles,
};

