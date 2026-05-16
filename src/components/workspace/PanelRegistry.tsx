import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { Inbox, FolderOpen, Target, Compass, CalendarDays, NotebookPen, CalendarRange, UtensilsCrossed, BookHeart } from "lucide-react";

export type PanelId =
  | "inbox" | "projects" | "goals" | "areas"
  | "calendar" | "notes" | "agenda" | "meals" | "journal";

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
};