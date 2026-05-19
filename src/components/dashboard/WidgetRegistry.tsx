import { ComponentType } from "react";
import {
  ListChecks, Coffee, CalendarHeart, Soup, Flame, HeartHandshake,
  Sparkle, Cake, Sparkles, Target, Lightbulb, NotebookPen, Heart,
  StickyNote, CheckSquare, CloudSun, Moon, Timer, BarChart3,
  HeartPulse, Scale, Activity, Wallet, CalendarClock, TrendingDown, Users, Wrench,
} from "lucide-react";
import type { WidgetType } from "@/lib/dashboard-layouts";
import { NoteWidget } from "./widgets/NoteWidget";
import { MiniTasksWidget } from "./widgets/MiniTasksWidget";
import { HomeResetChecklistWidget } from "./widgets/HomeResetChecklistWidget";
import {
  Top3Widget, RhythmWidget, AppointmentsTodayWidget, MealsTodayWidget,
  HabitsTodayWidget, FamilyTasksWidget, CareCheckinsWidget, HomeResetWidget,
  BirthdaysWidget, HolidaysWidget, WeeklyResetWidget, GoalsWidget,
  IdeasWidget, JournalPromptWidget, SoftMomentWidget,
} from "./widgets/DashboardWidgets";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { MoonPhaseWidget } from "@/components/widgets/MoonPhaseWidget";
import { CycleWidget } from "@/components/cycle/CycleWidget";
import { RhythmForecastWidget } from "@/components/widgets/RhythmForecastWidget";
import { TaskProgressBar } from "@/components/cards/TaskProgressBar";
import { PomodoroPanel } from "@/components/tasks/PomodoroPanel";
import {
  HealthCheckinWidget, WeightTrendWidget, MovementWeekWidget,
  BudgetSummaryWidget, UpcomingBillsWidget, DebtProgressWidget,
  ChoreTodayWidget, HomeOverdueWidget,
} from "./widgets/HealthWealthHomeWidgets";

export interface WidgetSpec {
  type: WidgetType;
  title: string;
  icon: ComponentType<{ className?: string }>;
  defaultSize: { w: number; h: number };
  /** Component receives optional props/onChange. Pass-through is wired in CustomizableGrid. */
  Component: ComponentType<any>;
  /** When true, the widget renders its own card chrome and the frame should not add a title bar. */
  bare?: boolean;
  /** Source page link rendered as an "open" icon in the widget header. */
  pageHref?: string;
  /** Quick-add event broadcast on click; consumers (pages or the FAB) can react to it. */
  quickAddEvent?: "task" | "appointment" | "meal" | "habit" | "idea" | "journal" | "cleaning" | "care" | "checkin" | "transaction" | "bill" | "goal" | "birthday" | "holiday";
}

/* Wrappers for widgets that already render their own card */
const WeatherWrap = () => <WeatherWidget />;
const MoonWrap = () => <MoonPhaseWidget />;
const PomodoroWrap = () => <PomodoroPanel />;
const TaskProgressTodayWrap = () => <TaskProgressBar scope="today" />;

export const WIDGET_REGISTRY: Record<WidgetType, WidgetSpec> = {
  note: {
    type: "note",
    title: "Note",
    icon: StickyNote,
    defaultSize: { w: 4, h: 5 },
    Component: NoteWidget,
  },
  "mini-tasks": {
    type: "mini-tasks",
    title: "Mini task list",
    icon: CheckSquare,
    defaultSize: { w: 4, h: 5 },
    Component: MiniTasksWidget,
  },
  top3: { type: "top3", title: "Today's focus", icon: Target, defaultSize: { w: 4, h: 5 }, Component: Top3Widget, pageHref: "/today", quickAddEvent: "task" },
  weather: { type: "weather", title: "Weather", icon: CloudSun, defaultSize: { w: 8, h: 5 }, Component: WeatherWrap, bare: true },
  moon: { type: "moon", title: "Moon", icon: Moon, defaultSize: { w: 4, h: 5 }, Component: MoonWrap, bare: true },
  pomodoro: { type: "pomodoro", title: "Pomodoro", icon: Timer, defaultSize: { w: 6, h: 4 }, Component: PomodoroWrap, bare: true },
  "task-progress": { type: "task-progress", title: "Task progress", icon: BarChart3, defaultSize: { w: 6, h: 4 }, Component: TaskProgressTodayWrap, bare: true },
  "appointments-today": { type: "appointments-today", title: "Appointments today", icon: CalendarHeart, defaultSize: { w: 4, h: 5 }, Component: AppointmentsTodayWidget, pageHref: "/calendar", quickAddEvent: "appointment" },
  "meals-today": { type: "meals-today", title: "Meals today", icon: Soup, defaultSize: { w: 4, h: 5 }, Component: MealsTodayWidget, pageHref: "/meals", quickAddEvent: "meal" },
  "habits-today": { type: "habits-today", title: "Habit snapshot", icon: Flame, defaultSize: { w: 4, h: 5 }, Component: HabitsTodayWidget, pageHref: "/habits", quickAddEvent: "habit" },
  rhythm: { type: "rhythm", title: "Daily rhythm", icon: Coffee, defaultSize: { w: 4, h: 5 }, Component: RhythmWidget, pageHref: "/today", quickAddEvent: "task" },
  "family-tasks": { type: "family-tasks", title: "Family / kids tasks", icon: Heart, defaultSize: { w: 4, h: 5 }, Component: FamilyTasksWidget, pageHref: "/today", quickAddEvent: "task" },
  "care-checkins": { type: "care-checkins", title: "Caregiving check-ins", icon: HeartHandshake, defaultSize: { w: 4, h: 5 }, Component: CareCheckinsWidget, pageHref: "/caregiving", quickAddEvent: "care" },
  "home-reset": { type: "home-reset", title: "Home reset progress", icon: Sparkle, defaultSize: { w: 4, h: 5 }, Component: HomeResetWidget, pageHref: "/home-reset", quickAddEvent: "cleaning" },
  "home-reset-checklist": { type: "home-reset-checklist", title: "Home reset checklist", icon: ListChecks, defaultSize: { w: 8, h: 6 }, Component: HomeResetChecklistWidget, pageHref: "/home-reset", quickAddEvent: "cleaning" },
  birthdays: { type: "birthdays", title: "Upcoming birthdays", icon: Cake, defaultSize: { w: 4, h: 5 }, Component: BirthdaysWidget, quickAddEvent: "birthday" },
  holidays: { type: "holidays", title: "Upcoming holidays", icon: Sparkles, defaultSize: { w: 4, h: 5 }, Component: HolidaysWidget, quickAddEvent: "holiday" },
  "weekly-reset": { type: "weekly-reset", title: "Weekly reset checklist", icon: ListChecks, defaultSize: { w: 4, h: 5 }, Component: WeeklyResetWidget, pageHref: "/home-reset", quickAddEvent: "cleaning" },
  goals: { type: "goals", title: "This month's goals", icon: Target, defaultSize: { w: 4, h: 5 }, Component: GoalsWidget, pageHref: "/goals", quickAddEvent: "goal" },
  ideas: { type: "ideas", title: "Idea inbox", icon: Lightbulb, defaultSize: { w: 4, h: 5 }, Component: IdeasWidget, pageHref: "/ideas", quickAddEvent: "idea" },
  "journal-prompt": { type: "journal-prompt", title: "Journal prompt", icon: NotebookPen, defaultSize: { w: 4, h: 5 }, Component: JournalPromptWidget, pageHref: "/journal", quickAddEvent: "journal" },
  "soft-moment": { type: "soft-moment", title: "A soft moment", icon: Sparkles, defaultSize: { w: 4, h: 5 }, Component: SoftMomentWidget },
  "health-checkin": { type: "health-checkin", title: "Health check-in", icon: HeartPulse, defaultSize: { w: 4, h: 5 }, Component: HealthCheckinWidget, pageHref: "/health", quickAddEvent: "checkin" },
  "weight-trend": { type: "weight-trend", title: "Weight trend", icon: Scale, defaultSize: { w: 4, h: 5 }, Component: WeightTrendWidget, pageHref: "/health" },
  "movement-week": { type: "movement-week", title: "Movement this week", icon: Activity, defaultSize: { w: 4, h: 4 }, Component: MovementWeekWidget, pageHref: "/health" },
  "budget-summary": { type: "budget-summary", title: "Budget summary", icon: Wallet, defaultSize: { w: 4, h: 4 }, Component: BudgetSummaryWidget, pageHref: "/wealth", quickAddEvent: "transaction" },
  "upcoming-bills": { type: "upcoming-bills", title: "Upcoming bills", icon: CalendarClock, defaultSize: { w: 4, h: 5 }, Component: UpcomingBillsWidget, pageHref: "/wealth", quickAddEvent: "bill" },
  "debt-progress": { type: "debt-progress", title: "Debt total", icon: TrendingDown, defaultSize: { w: 4, h: 4 }, Component: DebtProgressWidget, pageHref: "/wealth" },
  "chore-today": { type: "chore-today", title: "Chores today", icon: Users, defaultSize: { w: 4, h: 5 }, Component: ChoreTodayWidget, pageHref: "/home-areas", quickAddEvent: "cleaning" },
  "home-overdue": { type: "home-overdue", title: "Overdue maintenance", icon: Wrench, defaultSize: { w: 4, h: 5 }, Component: HomeOverdueWidget, pageHref: "/home-areas" },
  cycle: { type: "cycle", title: "Cyclical living", icon: Heart, defaultSize: { w: 4, h: 5 }, Component: CycleWidget, bare: true, pageHref: "/settings" },
  "rhythm-forecast": { type: "rhythm-forecast", title: "Rhythm forecast", icon: Moon, defaultSize: { w: 4, h: 5 }, Component: RhythmForecastWidget, bare: true, pageHref: "/today" },
};

export const ALL_WIDGET_TYPES = Object.keys(WIDGET_REGISTRY) as WidgetType[];