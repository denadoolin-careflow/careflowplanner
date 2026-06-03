import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { Inbox, FolderOpen, Target, Compass, CalendarDays, NotebookPen, CalendarRange, UtensilsCrossed, BookHeart, Repeat, Timer, Sun, Calendar } from "lucide-react";

export type PanelId =
  | "inbox" | "projects" | "goals" | "areas"
  | "calendar" | "notes" | "agenda" | "meals" | "journal" | "routines" | "focus"
  | "today" | "week" | "month" | "year";

export interface PanelDef {
  id: PanelId;
  title: string;
  icon: ComponentType<{ className?: string }>;
  component: LazyExoticComponent<ComponentType<any>>;
}

/** Light-weight panel surfaces — render an existing page inside a docked column. */
export const PANELS: Record<PanelId, PanelDef> = {
  inbox:    { id: "inbox",    title: "Inbox",    icon: Inbox,           component: lazy(() => import("@/pages/Inbox")) },
  projects: { id: "projects", title: "Projects", icon: FolderOpen,      component: lazy(() => import("@/pages/Projects")) },
  goals:    { id: "goals",    title: "Goals",    icon: Target,          component: lazy(() => import("@/pages/Goals")) },
  areas:    { id: "areas",    title: "Areas",    icon: Compass,         component: lazy(() => import("@/pages/HomeAreas")) },
  calendar: { id: "calendar", title: "Calendar", icon: CalendarDays,    component: lazy(() => import("@/pages/CalendarPage")) },
  notes:    { id: "notes",    title: "Notes",    icon: NotebookPen,     component: lazy(() => import("@/pages/Notes")) },
  agenda:   { id: "agenda",   title: "Agenda",   icon: CalendarRange,   component: lazy(() => import("@/pages/Upcoming")) },
  meals:    { id: "meals",    title: "Meals",    icon: UtensilsCrossed, component: lazy(() => import("@/pages/Meals")) },
  journal:  { id: "journal",  title: "Journal",  icon: BookHeart,       component: lazy(() => import("@/pages/Journal")) },
  routines: { id: "routines", title: "Routines", icon: Repeat,          component: lazy(() => import("@/pages/Routines")) },
  focus:    { id: "focus",    title: "Focus",    icon: Timer,           component: lazy(() => import("@/pages/PomodoroPicker")) },
  today:    { id: "today",    title: "Today",    icon: Sun,             component: lazy(() => import("@/pages/Today")) },
  week:     { id: "week",     title: "Week",     icon: CalendarRange,   component: lazy(() => import("@/pages/Week")) },
  month:    { id: "month",    title: "Month",    icon: CalendarDays,    component: lazy(() => import("@/pages/Month")) },
  year:     { id: "year",     title: "Year",     icon: Calendar,        component: lazy(() => import("@/pages/Year")) },
};

export const PANEL_BY_ROUTE: Record<string, PanelId> = {
  "/inbox": "inbox",
  "/projects": "projects",
  "/goals": "goals",
  "/home-areas": "areas",
  "/calendar": "calendar",
  "/notes": "notes",
  "/upcoming": "agenda",
  "/meals": "meals",
  "/journal": "journal",
  "/routines": "routines",
  "/focus": "focus",
  "/today": "today",
  "/week": "week",
  "/month": "month",
  "/year": "year",
};