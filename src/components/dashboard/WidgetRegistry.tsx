import { ComponentType } from "react";
import {
  ListChecks, Coffee, CalendarHeart, Soup, Flame, HeartHandshake,
  Sparkle, Cake, Sparkles, Target, Lightbulb, NotebookPen, Heart,
  StickyNote, CheckSquare, CloudSun, Moon, Timer, BarChart3,
} from "lucide-react";
import type { WidgetType } from "@/lib/dashboard-layouts";
import { NoteWidget } from "./widgets/NoteWidget";
import { MiniTasksWidget } from "./widgets/MiniTasksWidget";
import {
  Top3Widget, RhythmWidget, AppointmentsTodayWidget, MealsTodayWidget,
  HabitsTodayWidget, FamilyTasksWidget, CareCheckinsWidget, HomeResetWidget,
  BirthdaysWidget, HolidaysWidget, WeeklyResetWidget, GoalsWidget,
  IdeasWidget, JournalPromptWidget, SoftMomentWidget,
} from "./widgets/DashboardWidgets";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { MoonPhaseWidget } from "@/components/widgets/MoonPhaseWidget";
import { TaskProgressBar } from "@/components/cards/TaskProgressBar";
import { PomodoroPanel } from "@/components/tasks/PomodoroPanel";

export interface WidgetSpec {
  type: WidgetType;
  title: string;
  icon: ComponentType<{ className?: string }>;
  defaultSize: { w: number; h: number };
  /** Component receives optional props/onChange. Pass-through is wired in CustomizableGrid. */
  Component: ComponentType<any>;
  /** When true, the widget renders its own card chrome and the frame should not add a title bar. */
  bare?: boolean;
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
  top3: { type: "top3", title: "Today's focus", icon: Target, defaultSize: { w: 4, h: 5 }, Component: Top3Widget },
  weather: { type: "weather", title: "Weather", icon: CloudSun, defaultSize: { w: 8, h: 5 }, Component: WeatherWrap, bare: true },
  moon: { type: "moon", title: "Moon", icon: Moon, defaultSize: { w: 4, h: 5 }, Component: MoonWrap, bare: true },
  pomodoro: { type: "pomodoro", title: "Pomodoro", icon: Timer, defaultSize: { w: 6, h: 4 }, Component: PomodoroWrap, bare: true },
  "task-progress": { type: "task-progress", title: "Task progress", icon: BarChart3, defaultSize: { w: 6, h: 4 }, Component: TaskProgressTodayWrap, bare: true },
  "appointments-today": { type: "appointments-today", title: "Appointments today", icon: CalendarHeart, defaultSize: { w: 4, h: 5 }, Component: AppointmentsTodayWidget },
  "meals-today": { type: "meals-today", title: "Meals today", icon: Soup, defaultSize: { w: 4, h: 5 }, Component: MealsTodayWidget },
  "habits-today": { type: "habits-today", title: "Habit snapshot", icon: Flame, defaultSize: { w: 4, h: 5 }, Component: HabitsTodayWidget },
  rhythm: { type: "rhythm", title: "Daily rhythm", icon: Coffee, defaultSize: { w: 4, h: 5 }, Component: RhythmWidget },
  "family-tasks": { type: "family-tasks", title: "Family / kids tasks", icon: Heart, defaultSize: { w: 4, h: 5 }, Component: FamilyTasksWidget },
  "care-checkins": { type: "care-checkins", title: "Caregiving check-ins", icon: HeartHandshake, defaultSize: { w: 4, h: 5 }, Component: CareCheckinsWidget },
  "home-reset": { type: "home-reset", title: "Home reset progress", icon: Sparkle, defaultSize: { w: 4, h: 5 }, Component: HomeResetWidget },
  birthdays: { type: "birthdays", title: "Upcoming birthdays", icon: Cake, defaultSize: { w: 4, h: 5 }, Component: BirthdaysWidget },
  holidays: { type: "holidays", title: "Upcoming holidays", icon: Sparkles, defaultSize: { w: 4, h: 5 }, Component: HolidaysWidget },
  "weekly-reset": { type: "weekly-reset", title: "Weekly reset checklist", icon: ListChecks, defaultSize: { w: 4, h: 5 }, Component: WeeklyResetWidget },
  goals: { type: "goals", title: "This month's goals", icon: Target, defaultSize: { w: 4, h: 5 }, Component: GoalsWidget },
  ideas: { type: "ideas", title: "Idea inbox", icon: Lightbulb, defaultSize: { w: 4, h: 5 }, Component: IdeasWidget },
  "journal-prompt": { type: "journal-prompt", title: "Journal prompt", icon: NotebookPen, defaultSize: { w: 4, h: 5 }, Component: JournalPromptWidget },
  "soft-moment": { type: "soft-moment", title: "A soft moment", icon: Sparkles, defaultSize: { w: 4, h: 5 }, Component: SoftMomentWidget },
};

export const ALL_WIDGET_TYPES = Object.keys(WIDGET_REGISTRY) as WidgetType[];