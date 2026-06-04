## Goal

Replace the current Today page with a calm "Daily Rhythm" layout matching the attached mockup. Reuse CareFlow's existing atmosphere, rhythm, meals, routines, recipients, and care-loop systems rather than introducing parallel data.

## Page structure

```text
┌──────────────────────────────────────────────┬──────────────────┐
│ HEADER                                       │ Family Snapshot  │
│  Good morning, Laura 🌿                      │  Aerie · Isaac   │
│  Today · Wed, Jun 3, 2026                    │  Nana  · Alex    │
│  [Sage Sanctuary ▼]   "affirmation"          ├──────────────────┤
├──────────────────────────────────────────────┤ Growing This     │
│ DAILY SNAPSHOT  (6 glance chips)             │ Season (goals)   │
│ ✓Tasks ⭐Wins 🌙Moon ⚡Energy 📈% 🔥Streak    ├──────────────────┤
├──────────────────────────────────────────────┤ Care Loop        │
│ WHAT FITS RIGHT NOW   [✨ Do One Thing]      │ Capture·Anchor·  │
│ 🌱 Water plants  🧺 Fold laundry  💌 Reply   │ Rhythm·Exhale    │
├──────────────────────────────────────────────┼──────────────────┤
│ ☀️ MORNING                                   │ Upcoming Events  │
│   Tasks │ Meal │ Routine                     │  Jun 4 …         │
│ 🌤 AFTERNOON                                 │  Jun 5 …         │
│   Tasks │ Meal │ Routine                     │  Jun 7 …         │
│ 🌙 EVENING                                   │                  │
│   Tasks │ Meal │ Routine                     │                  │
├──────────────────────────────────────────────┴──────────────────┤
│ END OF DAY · "What would make today feel successful?" [Journal]│
└────────────────────────────────────────────────────────────────┘
```

Layout shell: `grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6`, sidebar sticky from `md:` and stacks below content at `<md`. Daily snapshot stays visible at top on mobile.

## New components (`src/components/today/rhythm/`)

- `RhythmHeader.tsx` — greeting, day, atmosphere chip (reuses `AtmosphereChip` from `CalendarHeroChips`), `AffirmationHeader`, day nav arrows.
- `DailySnapshotRow.tsx` — 6 chips. Counts from store + `getMoonData` + current `EnergyToggle` value + streak from existing momentum logic.
- `WhatFitsNow.tsx` — 3 suggestion cards + "Do One Thing" CTA. Reuses Upcoming's micro-plan engine (extract the recommender from `UpcomingHub` into `src/lib/micro-plan.ts` if not already shared; call with `{ date: today, slot: currentSlot, limit: 3 }`).
- `RhythmSection.tsx` — one block for Morning/Afternoon/Evening:
  - Header: icon + label + "Set the tone…" subtitle + counts (`4 Tasks · 1 Meal · 1 Routine`) + collapse chevron.
  - 3-column grid (`md:grid-cols-3`, stacks on mobile):
    - `RhythmTasksColumn` — tasks where `dayPart === slot`. Reuses `CalendarItemCard` compact variant, supports drop target via existing `useLongDropListener`.
    - `RhythmMealColumn` — pulls from existing meal-plan store for that slot (breakfast/lunch/dinner). Tapping opens recipe (existing Meals route). Shows image when available.
    - `RhythmRoutineColumn` — bound routine for slot (Morning Reset / Midday Reset / Evening Wind Down). Reuses `RoutinesPanel` item rendering; shows `3/5 complete` progress.
- `FamilySnapshotCard.tsx` — iterates `state.recipients`; computes routine/tasks remaining per recipient for today.
- `GrowingSeasonCard.tsx` — reads pinned goals (existing pinned list / Goals page source); progress bar + next-step text.
- `CareLoopCard.tsx` — reuses `CareLoopIndicator` styling, four-step dotted progress, "You're in Rhythm today" copy.
- `UpcomingEventsCard.tsx` — next 3–5 appointments after today from `state.appointments`.
- `EndOfDayCard.tsx` — soft lavender band, prompt + button → opens existing journal sheet.

## Page rewrite

`src/pages/Today.tsx` becomes a thin composition:

1. `TaskSelectionProvider` wrapper retained.
2. Renders `RhythmHeader`, `DailySnapshotRow`, `WhatFitsNow`, three `RhythmSection`s (Morning/Afternoon/Evening), `EndOfDayCard` in the main column.
3. Right column: `FamilySnapshotCard`, `GrowingSeasonCard`, `CareLoopCard`, `UpcomingEventsCard`.
4. Keeps existing editors (`TaskEditor`, `AppointmentEditor`, `CycleLogSheet`) and `UnscheduledTasksRail` so drag-to-schedule still works.

## What gets removed from Today

Retired from this page (components stay in the codebase, just not mounted here): `AuroraClock` hero, Schedule/Plan toggle, `TimeGrid`/`DayPartsView`/`AgendaView`, `CalendarTasksPanel`, `DailyBrief` section, `TodayHabitsCard`, `CustomizableGrid` widgets drawer, `TopThreeStrip`, `RhythmForecastCard`, `TransitStrip`, `WeatherHeroCard`, `CarePriorities` (its content folds into the rhythm sections + What Fits Now).

## Mobile

- Sidebar collapses to a vertical stack below the rhythm sections.
- Snapshot row becomes a horizontal scroll of chips.
- Meal and Routine columns inside each section become expandable cards (default expanded for the current slot, collapsed for the others).

## Design tokens

All colors via existing semantic tokens (sage, cream, blush, lavender, warm gold). Section cards use existing `cozy-card` + `gradient-calm`. No new hex values.

## Non-goals

- No backend or schema changes.
- No new meal/routine/goal data model — strictly UI over existing store.
- Drag-and-drop meal planning beyond what `UnscheduledTasksRail` already supports is out of scope for this pass.

## Files

- New: 9 components under `src/components/today/rhythm/`.
- Edited: `src/pages/Today.tsx` (full rewrite of body).
- Possibly extracted: `src/lib/micro-plan.ts` if the Upcoming recommender isn't already a shared module.
