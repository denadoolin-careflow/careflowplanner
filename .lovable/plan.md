# Routines, Garden & Person Dashboard Overhaul

A multi-part plan covering six related changes to the routines, habit garden, and caregiving experience.

---

## 1. Fix routine card layout (no more overlap)

The header in `RoutineCard` (src/pages/Routines.tsx) stacks the Focus/AI/Pomo/Time/Cadence buttons in a row that overflows the card at narrow widths, sliding under the title chips (visible in the screenshot).

Changes in `src/pages/Routines.tsx`:
- Split the card header into two rows: row 1 = identity chips (person · slot · time · cadence · duration) with a hamburger overflow on the right; row 2 = action toolbar (Focus, AI, Wand, Timer, Time picker, Cadence select).
- Move the inline `Input type="time"` and `Select` (cadence) into a single line under the title so they no longer wrap into the chip row.
- Add `min-w-0` and `flex-wrap` guards so chips truncate (`truncate` on person name) instead of pushing buttons.
- Tighten gaps and shrink Focus button to `icon` size when card width < `sm`.

## 2. Per-step scheduled time on routine items

Currently each step only has `durationMin`. Items can show an explicit start time too.

Schema (`RoutineItem` in `src/lib/routines.ts`):
- Add optional `startTime?: string` (HH:mm). When set, the step is anchored to that clock time instead of being chained off the previous step's duration.
- Update `computeNowNext` to honor `startTime` when present (use as the block's `startsAt` and recompute cursor).
- Update `routineTotalMinutes` unchanged.

UI (`src/components/routines/RoutineItemRow.tsx`):
- Add a small clock icon button that opens a popover with `<Input type="time">` for the item's start time, plus a "clear" action.
- Show `formatTime12(startTime)` as a subtle chip on the row when set.
- Persist via `routines.updateItem(person, slot, id, { startTime })`.

## 3. Sync Pomodoro side panel with active routine

Today `PomodoroDialog` and `RoutineFocusMode` start independent timers. The user wants the side panel timer to show what's being focused on inside a routine.

Changes:
- Extend `pomodoro-store.ts` session with `routineId?: string | null` and `routineItemId?: string | null` so the global session knows the routine context.
- In `RoutineFocusMode`, when the user starts focusing on an item, call `pomodoro.startTemplate({ label, focusSeconds, templateId: "routine", routineId, routineItemId })` instead of (or in addition to) a local timer.
- Update the side-panel widget (`src/components/focus/FocusPanel.tsx`) to render the linked routine: person, slot, current step text, progress (item N of M), and a "Mark step done" button that calls `routines.toggleItem` and advances the timer to the next item.
- When a step is completed via the side panel, auto-load the next un-done step into the timer.

## 4. Habit garden integration with routines

Add routines into `HabitGarden` so the user sees what's growing vs. lacking.

Changes in `src/components/habits/HabitGarden.tsx`:
- Below the habit tiles, render a "Rituals" section that maps each routine into a "plant" tile using a derived consistency metric:
  - Growth = % of today's steps completed (current day) blended with last 7 days completion (stored either by deriving from `Logbook`/per-step completion history, or by adding a lightweight `routine_log` table — see Technical notes).
- Tiles show person · slot, stage label ("Sprouting", "Blooming", etc.) reused from `habit-consistency.ts`, and a quick "tend" action that opens the routine focus mode.
- Header summary updates to "X habits · Y rituals tended today".

## 5. Edit / remove people on routines + per-person cards in Caregiving

The People row at the top of `/routines` currently has no remove/edit affordance, and there is no link between routine "people" and caregiving recipients beyond a manual select.

Changes:
- `PersonQuickAdd` (Routines.tsx): each chip becomes a `Popover` trigger with Rename and Remove actions. Rename calls a new `routines.renamePerson(old, next)` (updates all rows for that user). Remove calls existing `routines.removePerson` with a confirm.
- `routines.ts`: add `renamePerson(oldName, newName)` that updates all rows server-side and re-emits cache.
- `src/components/caregiving/CareProfile.tsx`: add a new "Routines" tab that renders `PersonRoutinesPanel` (already exported from Routines.tsx) for the recipient, so each caregiving person has their own routine card surface.
- When a recipient is created/renamed, auto-link routines: if there's a routine `person_name` matching, set its `recipient_id` automatically.

## 6. Per-person dashboard overview ("Developmental plan")

New page: `/caregiving/:recipientId/overview` (or as a new tab on the existing Caregiving recipient view). For each person it surfaces an AI-curated developmental plan based on profile signals.

Sections:
- **Snapshot**: name, age, zodiac, diagnoses (from medical history), love languages.
- **Developmental plan**: AI suggestions calibrated for age band (infant / toddler / child / teen / adult / elder), diagnosis tags, and cycle phase if applicable.
- **Foods**: top suggested foods + foods to limit, with "Add to meal library" buttons.
- **Habits**: suggested habits to start (creatable into `state.habits` via existing `addHabit`).
- **Care plan & activities**: daily/weekly care tasks and enriching activities.
- **Routines**: links to (and previews) the person's routine cards.
- **Cycle awareness**: only shown when cycle data exists; phase-aware tips.

Components / files (new):
- `src/pages/PersonOverview.tsx`
- `src/components/caregiving/PersonOverview/*` (Snapshot, DevPlanSection, FoodSection, HabitSection, CareSection, RoutineSection, CycleSection)
- `supabase/functions/ai-person-overview/index.ts` — accepts `{ recipient }` profile blob and returns structured JSON sections. Uses the existing `_shared/ai-meter.ts` with weight `5` (heavy generation).
- Hook `useAIPersonOverview(recipient)` that caches results in a new `person_overviews` table.

Routing: add a route entry and a "Overview" CTA on the recipient card in `Caregiving.tsx` (and a tab in `CareProfile` as a shortcut).

---

## Technical notes

- **Routine step completion history (for §4 garden)**: simplest path is to compute consistency from `Routine.items` `done` state per day, requiring a new table `routine_completions(user_id, routine_id, item_id, completed_on date)` so we have history. Migration:
  ```
  CREATE TABLE public.routine_completions (...);
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_completions TO authenticated;
  GRANT ALL ON public.routine_completions TO service_role;
  ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
  CREATE POLICY ... auth.uid() = user_id ...;
  ```
  `routines.toggleItem` writes/clears a row for `today` when toggled.

- **Person overview cache table**:
  ```
  CREATE TABLE public.person_overviews (
    id uuid pk, user_id uuid, recipient_id uuid,
    payload jsonb, generated_at timestamptz, signature text
  );
  ```
  `signature` is a hash of inputs (birthDate, diagnoses, loveLanguages, cycle phase, zodiac) so we only regenerate when inputs change.

- **AI meter**: `ai-person-overview` uses `meterRequest(req, 5)`; client uses `aiInvoke` so 402 triggers the upgrade prompt.

- **No changes to** `src/integrations/supabase/client.ts` or `types.ts` (auto-generated).

- **Backwards compatibility**: `RoutineItem.startTime` is optional; old items continue to chain by duration.

---

## Suggested execution order

1. Routine card layout fix (§1) — fastest win, no schema.
2. Per-step start time (§2) — small frontend + helper update.
3. People management on routines (§5) — frontend + tiny `renamePerson` helper.
4. Pomodoro side-panel sync (§3) — small store + Focus panel work.
5. Garden integration (§4) — needs migration for completions table.
6. Per-person overview dashboard (§6) — largest piece, ends with new edge function + migration + page.

I can execute these in this order across follow-up turns, or bundle 1–3 in the first pass and 4–6 in the next. Let me know if you'd like to drop or re-order anything.