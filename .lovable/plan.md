# Today page: one rhythm card, chosen people, dinner & cleaning cards, connections

## 1. One combined Rhythm card

Today currently shows rhythm information in scattered places (an atmosphere strip in the focus rail, separate moon/cycle widgets) while the planner has the fuller guidance. Replace this with a single **Rhythm** card on Today that reuses the planner's content so both pages always say the same thing.

The card shows, top to bottom:
- Moon phase glyph, label and illumination, plus the day's planning tip.
- Cycle phase (day X of Y, next period), its invitation line, and the suggested day shape (priority count, block length, protected window).
- Zodiac/solar season: the current sign, its theme and pacing, with the same suggested focus/habit/meal items — including any customisations made on the planner.

Collapsible sections inside the card so it stays compact, with links out to Cosmic Flow and Health. Content comes from the same modules the planner uses, so editing the season guide on the planner changes Today too.

## 2. Choose which people show in Care

The Care column currently shows the first few care recipients automatically. Add a small "Choose people" control in the Care header:
- A checklist of your people with drag-free ordering by the order they appear in Care.
- Selection is saved per user and respected on both mobile and desktop Today.
- When nothing is selected, behaviour stays as today (first few, capacity-aware).
- Low-capacity days still trim the list, as now.

## 3. "What's for dinner" and "What needs cleaned" cards

Two new cards on Today (Plan section on mobile, secondary grid on desktop):

**What's for dinner** — tonight's dinner if planned, with prep time and a one-tap way to pick from your meal library or type one in; a "nothing planned" state that suggests a favourite or opens the dinner picker. Links to Meals.

**What needs cleaned** — the day's open cleaning tasks grouped by zone, with checkboxes and haptic confirm, capped to a handful and trimmed further on low-capacity days. Includes the existing low-energy essentials filter so it matches the planner sidebar. Links to Home reset.

## 4. Connections context on tasks

A new **Connection** context so a task can be about a person you want to check in with, call back, or respond to.

- One merged people picker drawing from both Loved ones and Care recipients.
- Available in the task editor and quick-edit, shown as a small avatar/name chip on task rows.
- A **Connections** card on Today lists people with an open connection task, plus people you haven't logged a connection with recently, each with a one-tap "Add check-in" that creates a task linked to that person.
- Tasks can be filtered by connection person from the tags/filters surfaces that already support area and person filtering.

## Technical notes

- New: `src/components/today/RhythmTodayCard.tsx` (reuses `moon-planning-tip.ts`, `cycle-templates.ts`, `solar-season.ts` + `solar-season-custom.ts`, `day-rhythm.ts`), `src/components/today/DinnerTonightCard.tsx`, `src/components/today/CleaningTodayCard.tsx`, `src/components/today/ConnectionsCard.tsx`, `src/components/people/PersonPicker.tsx` (merged loved ones + recipients), `src/lib/people-directory.ts`, `src/lib/today-care-people.ts` (persisted selection).
- Edited: `src/pages/Today.tsx`, `src/components/today/TodayFocusRail.tsx` (drop the standalone atmosphere strip in favour of the rhythm card), `src/components/today/dashboard/CareColumn.tsx`, task editor + quick-edit components, `src/lib/store.tsx` (map the new task field).
- Migration: add `connection_id uuid` and `connection_kind text` to `public.tasks` (nullable, no FK since the id can point at either loved ones or care recipients), plus an index on `connection_id`. Existing RLS on `tasks` already covers it.
- Care people selection stored on the profile settings JSON so it follows the user across devices; cleaning/meal cards reuse existing store data with no new tables.
