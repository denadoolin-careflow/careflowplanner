# Habits: detail view, linking, surfacing & analytics

## 1. Habit detail sheet (open a habit)

Add `HabitDetailSheet.tsx` (Radix Sheet, right-side) opened by clicking the plant tile in the Garden or a row in List view.

Sections inside the sheet:
- **Header**: plant illustration, title (editable), category, cadence, streak/forgiving streak.
- **Time of day**: chips for Morning / Midday / Afternoon / Evening / Anytime (multi-select).
- **Schedule**: days-of-week chips (for weekly cadence) + optional reminder time.
- **Linked items**: pickers for Projects, Routines, Tasks, Goals — pulled from `state.projects / routines / tasks / goals`. Renders as chips; click to open that entity.
- **Notes**: reuse existing `LinkedNotesPanel entityType="habit"`.
- **14-day strip + actions** (Tend today / Delete).

## 2. Data model

Extend `Habit` in `src/lib/types.ts`:
```ts
timesOfDay?: ("morning"|"midday"|"afternoon"|"evening"|"anytime")[];
daysOfWeek?: number[];      // 0=Sun..6=Sat, for weekly cadence
reminderTime?: string;      // "HH:mm"
linkedProjectIds?: string[];
linkedRoutineIds?: string[];
linkedTaskIds?: string[];
linkedGoalIds?: string[];
```

Migration: add a single `meta jsonb default '{}'` column on `public.habits` and serialize the new fields into it (keeps migration minimal, avoids many nullable columns). Update `habitFrom` / `addHabit` / `updateHabit` in `src/lib/store.tsx` to read/write `meta`.

## 3. Today page surfacing

New `TodayHabitsCard.tsx` in `src/components/today/`, inserted into `Today.tsx` near the morning/focus area:
- Groups today's due habits by `timesOfDay` (Morning → Evening → Anytime).
- Each row: mini plant glyph, title, linked-project/routine chip, Tend button with haptic.
- Header progress bar (reuses `HabitProgressBar` logic) + "X of Y tended".
- Filters habits where: cadence=daily, OR weekly with today in `daysOfWeek`, OR linked to a task/routine scheduled today.

## 4. Week page surfacing

In `Week.tsx`, add a compact `WeekHabitsStrip` to the `WeekRhythmRow` area:
- 7-day grid: one row per habit, dots per day showing logged completions.
- Click a dot to toggle that day.
- Only shows habits relevant to the week (cadence ≥ weekly).

## 5. Weekly habit review analytics (under Garden)

Replace the current "Weekly habit review" `SectionCard` body in `Habits.tsx` with `HabitWeeklyAnalytics.tsx`:
- **Stacked bar / area chart** (Recharts) — last 7 days, % completion per day across all habits.
- **Per-habit sparkline list** — 28-day completion ratio with growth stage label.
- **Stat tiles**: total tends, best day, most consistent habit, growing vs wilting counts.
- **Time-of-day breakdown** donut.

## 6. AI overview

New edge function `supabase/functions/ai-habit-overview/index.ts`:
- Uses Lovable AI Gateway, `google/gemini-3-flash-preview`, via `streamText` returning a short structured summary (3 gentle observations + 1 suggestion).
- Inputs: 28 days of habit logs, growth stages, linked projects/routines, time-of-day data.
- Client trigger button at the top of `HabitWeeklyAnalytics` with manual refresh + 24h localStorage cache.

## Files

**Create**
- `src/components/habits/HabitDetailSheet.tsx`
- `src/components/habits/HabitWeeklyAnalytics.tsx`
- `src/components/today/TodayHabitsCard.tsx`
- `src/components/week/WeekHabitsStrip.tsx`
- `supabase/functions/ai-habit-overview/index.ts`
- Migration: add `meta jsonb` to `public.habits`

**Edit**
- `src/lib/types.ts` — extend `Habit`
- `src/lib/store.tsx` — `habitFrom`, `addHabit`, `updateHabit` round-trip `meta`
- `src/components/habits/HabitGarden.tsx` — click tile opens detail sheet
- `src/pages/Habits.tsx` — wire list/garden onClick, swap weekly review for analytics
- `src/pages/Today.tsx` — mount `TodayHabitsCard`
- `src/pages/Week.tsx` — mount `WeekHabitsStrip`

## Out of scope
- Cycle/lunar correlation for habits (covered by Insights page).
- Reminders/push notifications (only stored; delivery later).
