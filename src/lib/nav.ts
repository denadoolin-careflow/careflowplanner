import {
  LayoutDashboard, Sun, CalendarRange, CalendarDays, Calendar, Target, Sparkles,
  UtensilsCrossed, HeartHandshake, Sparkle, BookHeart, Lightbulb, CalendarCheck,
  Timer, Settings as SettingsIcon, BookOpen, HeartPulse, Wallet, Home,
  ShoppingBasket, Compass, Leaf, Flower2, Inbox, FolderOpen, NotebookPen, BadgeCheck, Repeat,
  Wind, PenLine, Coffee,
} from "lucide-react";

export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/care", label: "CARE Loop", icon: Flower2 },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/projects", label: "Projects", icon: FolderOpen },
  { to: "/today", label: "Today", icon: Sun },
  { to: "/week", label: "Week", icon: CalendarRange },
  { to: "/month", label: "Month", icon: CalendarDays },
  { to: "/year", label: "Year", icon: Calendar },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/habits", label: "Habits", icon: Sparkles },
  { to: "/meals", label: "Meals", icon: UtensilsCrossed },
  { to: "/meals/library", label: "Meals Library", icon: BookOpen },
  { to: "/caregiving", label: "Caregiving", icon: HeartHandshake },
  { to: "/routines", label: "Routines", icon: Repeat },
  { to: "/health", label: "Health", icon: HeartPulse },
  { to: "/wealth", label: "Wealth", icon: Wallet },
  { to: "/mental-load", label: "Mental Load", icon: Leaf },
  { to: "/home-areas", label: "Home", icon: Home },
  { to: "/home-reset", label: "Home Hub", icon: Sparkle },
  { to: "/journal", label: "Journal", icon: BookHeart },
  { to: "/journal-flow", label: "Journal & Flow", icon: Wind },
  { to: "/ideas", label: "Ideas", icon: Lightbulb },
  { to: "/calendar", label: "Calendar", icon: CalendarCheck },
  { to: "/focus", label: "Focus", icon: Timer },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export const MOBILE_NAV = [
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/today", label: "Today", icon: Sun },
  { to: "/calendar", label: "Calendar", icon: CalendarCheck },
  { to: "/home-areas", label: "Home", icon: Home },
  { to: "/meals", label: "Meals", icon: UtensilsCrossed },
  { to: "/notes", label: "Notes", icon: NotebookPen },
] as const;

/** Grouped navigation for the categorized sidebar. */
export const NAV_GROUPS = [
  {
    id: "overview",
    label: "Overview",
    icon: Compass,
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/care", label: "CARE Loop", icon: Flower2 },
      { to: "/projects", label: "Projects", icon: FolderOpen },
    ],
  },
  {
    id: "planning",
    label: "Planning",
    icon: CalendarDays,
    items: [
      { to: "/plan", label: "Daily Plan", icon: Sparkles },
      { to: "/week", label: "Week", icon: CalendarRange },
      { to: "/month", label: "Month", icon: CalendarDays },
      { to: "/year", label: "Year", icon: Calendar },
      { to: "/calendar", label: "Calendar", icon: CalendarCheck },
      { to: "/not-today", label: "Not Today", icon: Coffee },
    ],
  },
  {
    id: "home",
    label: "Home",
    icon: Home,
    items: [
      { to: "/meals", label: "Meals", icon: UtensilsCrossed },
      { to: "/meals/library", label: "Meals Library", icon: BookOpen },
      { to: "/home-areas", label: "Home", icon: Home },
      { to: "/home-reset", label: "Home Hub", icon: Sparkle },
    ],
  },
  {
    id: "care",
    label: "Care",
    icon: HeartHandshake,
    items: [
      { to: "/caregiving", label: "Caregiving", icon: HeartHandshake },
      { to: "/routines", label: "Routines", icon: Repeat },
      { to: "/health", label: "Health", icon: HeartPulse },
      { to: "/habits", label: "Habits", icon: Sparkles },
      { to: "/goals", label: "Goals", icon: Target },
      { to: "/mental-load", label: "Mental Load", icon: Leaf },
    ],
  },
  {
    id: "reflect",
    label: "Reflect",
    icon: Flower2,
    items: [
      { to: "/journal", label: "Journal", icon: BookHeart },
      { to: "/journal-flow", label: "Journal & Flow", icon: Wind },
      { to: "/notes", label: "Notes", icon: NotebookPen },
      { to: "/whiteboards", label: "Whiteboards", icon: PenLine },
      { to: "/review", label: "Reviews Timeline", icon: BadgeCheck },
      { to: "/reset/week", label: "Weekly Reset", icon: CalendarRange },
      { to: "/reset/month", label: "Monthly Reset", icon: CalendarDays },
      { to: "/ideas", label: "Ideas", icon: Lightbulb },
      { to: "/focus", label: "Focus", icon: Timer },
      { to: "/wealth", label: "Wealth", icon: Wallet },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: SettingsIcon,
    items: [
      { to: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
] as const;
