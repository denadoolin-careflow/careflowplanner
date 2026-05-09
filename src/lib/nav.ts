import { LayoutDashboard, Sun, CalendarRange, CalendarDays, Calendar, Target, Sparkles, UtensilsCrossed, HeartHandshake, Sparkle, BookHeart, Lightbulb, CalendarCheck, Settings as SettingsIcon } from "lucide-react";

export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/today", label: "Today", icon: Sun },
  { to: "/week", label: "Week", icon: CalendarRange },
  { to: "/month", label: "Month", icon: CalendarDays },
  { to: "/year", label: "Year", icon: Calendar },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/habits", label: "Habits", icon: Sparkles },
  { to: "/meals", label: "Meals", icon: UtensilsCrossed },
  { to: "/caregiving", label: "Caregiving", icon: HeartHandshake },
  { to: "/home-reset", label: "Home Reset", icon: Sparkle },
  { to: "/journal", label: "Journal", icon: BookHeart },
  { to: "/ideas", label: "Ideas", icon: Lightbulb },
  { to: "/calendar", label: "Calendar", icon: CalendarCheck },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export const MOBILE_NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/today", label: "Today", icon: Sun },
  { to: "/week", label: "Week", icon: CalendarRange },
  { to: "/journal", label: "Journal", icon: BookHeart },
  { to: "/settings", label: "More", icon: SettingsIcon },
] as const;
