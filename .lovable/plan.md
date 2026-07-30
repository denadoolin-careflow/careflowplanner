## Goal

Turn `/today` into a calm, glanceable caregiver dashboard matching the reference screenshot. The new layout becomes the **default** Today mode; the existing Rhythm / Time of day / Plan / Schedule / Custom modes stay selectable from the preferences popover and the "Plan with" segmented control.

## What exists today (verified)

- `src/pages/Today.tsx` (363 lines) renders a `ScopeHero`, three collapsible sections (Rhythm / Capacity / Debrief), a "Plan with" view switcher, a preferences popover (Carey nudges, quick add, pinned default route, pinned default view, template gallery), then one of five view bodies.
- Capacity already exists as `src/lib/burnout-checkin.ts` — 4 levels (`spacious` / `steady` / `tender` / `depleted`) with a load `multiplier`, saved per-day in localStorage only. UI: `src/components/today/BurnoutCheckIn.tsx`.
- CARE Loop pieces exist: `src/components/care/CareLoopIndicator.tsx`, `AnchorFlowCard.tsx`, `src/components/today/rhythm/CareLoopCard.tsx`, `ExhaleFlow.tsx`, `RhythmDashboard.tsx`.
- Data comes from the single `useStore()` state (tasks, appointments, routines, habits, goals, notes, meals, loved ones, cleaning/reset items) plus `useEnsureWeather` / `weather-store`, `lib/moon`, `lib/cycle`, `lib/greeting`, `lib/affirmations`.
- Reusable card widgets already exist under `src/components/today/widgets/` (tasks, journal, meals, home reset, grocery, moon, cycle) and can back the three columns.

## Plan

### 1. New default view: `dashboard`
- Add `"dashboard"` to `TodayView` in `src/lib/today-view.ts` with label "Dashboard", and make it the fallback default (existing users' pinned view is respected).
- In `Today.tsx`, when `view === "dashboard"` render a new `<TodayDashboard date={day} … />`; all other branches stay untouched. Keep the preferences popover and view switcher above it.

### 2. New components (all under `src/components/today/dashboard/`)
- `TodayDashboard.tsx` — the composition + capacity context provider.
- `GreetingBlock.tsx` — greeting + time-of-day emoji, date + weather line, rotating quote (reuse `lib/greeting`, `lib/affirmations`, `weather-store`).
- `ScopeSegmented.tsx` — Today / Week / Month segmented control; Week and Month **navigate** to `/week` and `/month` (existing routes), with `animate-fade-in` on the Today panel.
- `CareLoopRow.tsx` — four equal cards (Capture / Anchor / Rhythm / Exhale) with purple / gold / sage / blue accents, stacking on mobile. Wires to existing actions: add-task dialog, `/planner`, `/rhythm` overview, `ExhaleFlow`.
- `CapacityCard.tsx` — restyled 4-option capacity picker (😊 Full → `spacious`, 🙂 Good → `steady`, 😐 Low → `tender`, 😞 Barely surviving → `depleted`), plus `AnchorTodayCard.tsx` for the day's top item.
- `PlanColumn.tsx` (Morning/Afternoon/Evening checklist + "3 of 4 done" + Upcoming), `CareColumn.tsx` (People / Home / Health), `GrowColumn.tsx` (Intention / Goals / Notes preview) — each reusing existing widgets and store selectors, not new queries.
- `RoutinesCard.tsx` + `HabitsCard.tsx` for the bottom row (day-of-week dots, duration, `6/7` streaks) — built on existing routines/habits state and `lib/habit-consistency.ts`.

### 3. Capacity → adaptive behavior
- A small `CapacityContext` in `TodayDashboard` exposes the selected level + multiplier.
- Plan column trims its suggested/optional items and Care column hides stretch rows (deep cleaning, meal prep, projects) on `tender` / `depleted`; `spacious` surfaces an extra "stretch" group. Routines list shortens on low capacity. No task data is mutated — display filtering only.

### 4. Capacity persistence (requires a schema change for review)
- Currently device-local. To sync: first inspect the existing `daily_checkins` table; if it has a suitable per-day row per user, add a nullable `capacity_level text` column there. If not a clean fit, create `public.daily_capacity (id, user_id, day date, level text, updated_at)` with unique `(user_id, day)`, GRANTs for `authenticated` + `service_role`, RLS enabled, and `auth.uid() = user_id` policies.
- `burnout-checkin.ts` gains a read-through/write-through sync: localStorage stays the instant source of truth, Supabase is the cross-device store. Existing local entries are migrated on first load. `BurnoutCheckIn.tsx` keeps working unchanged.

### 5. Design
- Reuse the existing tokens and `cozy-card` styling; 24px radius (`rounded-3xl`), soft shadows, minimal borders, generous padding. Accent colors added as semantic tokens in `index.css` / `tailwind.config.ts` (`--care-capture`, `--care-anchor`, `--care-rhythm`, `--care-exhale`) rather than hardcoded classes. Existing Playfair + Nunito display/body fonts, no new fonts.
- `animate-fade-in` / `scale-in` for card entry and view switches; subtle leaf/gradient accent in the greeting block only.

### 6. Out of scope
- No changes to Calendar, Home, Meals, Notes pages, the bottom nav, or `/today-v2`. No new data models beyond the capacity column/table above.

## Technical notes

- The migration is proposed and approved separately before any code that reads the new column.
- `TodayView` gains a value, so `TODAY_VIEW_LABELS` and any persisted pinned-view value need a safe fallback for unknown keys.
- Three columns: `grid-cols-1 lg:grid-cols-3`; CARE loop `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`.
