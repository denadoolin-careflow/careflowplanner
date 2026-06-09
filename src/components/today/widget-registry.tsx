import { WhatFitsNow } from "@/components/today/rhythm/WhatFitsNow";
import { TasksWidget } from "@/components/today/rhythm/TasksWidget";
import { FamilySnapshotCard } from "@/components/today/rhythm/FamilySnapshotCard";
import { GrowingSeasonCard } from "@/components/today/rhythm/GrowingSeasonCard";
import { CareLoopCard } from "@/components/today/rhythm/CareLoopCard";
import { UpcomingEventsCard } from "@/components/today/rhythm/UpcomingEventsCard";
import { MealsPlannedWidget } from "@/components/today/widgets/MealsPlannedWidget";
import { TasksTodayWidget } from "@/components/today/widgets/TasksTodayWidget";
import { GroceryWidget } from "@/components/today/widgets/GroceryWidget";
import { NotesTodayWidget } from "@/components/today/widgets/NotesTodayWidget";
import { JournalTodayWidget } from "@/components/today/widgets/JournalTodayWidget";
import { MemoriesTodayWidget } from "@/components/today/widgets/MemoriesTodayWidget";
import { HomeResetWidget } from "@/components/today/widgets/HomeResetWidget";
import { BrainDumpWidget } from "@/components/today/widgets/BrainDumpWidget";
import { CycleSidebarCard } from "@/components/today/widgets/CycleSidebarCard";
import { MoonPrioritiesCard } from "@/components/today/widgets/MoonPrioritiesCard";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { WeeklyWeather } from "@/components/widgets/WeeklyWeather";

/** Options consumed by every sidebar widget. Keep this shape identical across
 *  Today / Week / Month so widgets share one props/options schema. */
export interface SidebarWidgetOptions {
  /** Anchor date for per-day widgets (today on Today, focused day on Week/Month). */
  date: Date;
  /** Opens the task editor when a widget surfaces a task. */
  onTaskClick?: (id: string) => void;
}

export interface SidebarWidgetSpec {
  id: string;
  label: string;
  render: (opts: SidebarWidgetOptions) => JSX.Element | null;
}

/** Canonical, ordered registry shared by Today, Week and Month sidebars. */
export function buildSidebarWidgetRegistry(): SidebarWidgetSpec[] {
  return [
    { id: "brain-dump",       label: "Brain dump",       render: () => <BrainDumpWidget /> },
    { id: "what-fits",        label: "What fits now",    render: ({ date, onTaskClick }) => <WhatFitsNow date={date} onTaskClick={onTaskClick} /> },
    { id: "weather",          label: "Weather",          render: () => <WeatherWidget /> },
    { id: "weekly-weather",   label: "Weekly weather",   render: () => <WeeklyWeather /> },
    { id: "moon-priorities",  label: "Moon & Top 3",     render: ({ date, onTaskClick }) => <MoonPrioritiesCard date={date} onTaskClick={onTaskClick} /> },
    { id: "tasks-today",      label: "Tasks",            render: ({ date }) => <TasksTodayWidget date={date} /> },
    { id: "tasks",            label: "Tasks",            render: ({ date }) => <TasksWidget date={date} /> },
    { id: "meals-planned",    label: "Meals planned",    render: ({ date }) => <MealsPlannedWidget date={date} /> },
    { id: "grocery",          label: "Grocery",          render: () => <GroceryWidget /> },
    { id: "cycle",            label: "Cycle",            render: ({ date }) => <CycleSidebarCard date={date} /> },
    { id: "notes-today",      label: "Notes today",      render: () => <NotesTodayWidget /> },
    { id: "journal-today",    label: "Journal today",    render: () => <JournalTodayWidget /> },
    { id: "memories-today",   label: "Memories today",   render: () => <MemoriesTodayWidget /> },
    { id: "home-reset",       label: "Home reset",       render: () => <HomeResetWidget /> },
    { id: "family-snapshot",  label: "Family snapshot",  render: ({ date }) => <FamilySnapshotCard date={date} /> },
    { id: "growing-season",   label: "Growing season",   render: () => <GrowingSeasonCard /> },
    { id: "care-loop",        label: "Care loop",        render: () => <CareLoopCard /> },
    { id: "upcoming-events",  label: "Upcoming events",  render: ({ date }) => <UpcomingEventsCard date={date} /> },
  ];
}