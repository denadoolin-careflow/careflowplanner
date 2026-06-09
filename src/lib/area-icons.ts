import type { Area } from "./types";
import {
  User, Users, Baby, HeartHandshake, Home, UtensilsCrossed,
  CalendarDays, PartyPopper, Palette, Wallet,
} from "lucide-react";

export const AREA_ICONS: Record<Area, typeof User> = {
  Personal: User,
  Family: Users,
  Kids: Baby,
  Caregiving: HeartHandshake,
  Home: Home,
  Meals: UtensilsCrossed,
  Appointments: CalendarDays,
  "Holidays & Birthdays": PartyPopper,
  "Creative Projects": Palette,
  Money: Wallet,
};
