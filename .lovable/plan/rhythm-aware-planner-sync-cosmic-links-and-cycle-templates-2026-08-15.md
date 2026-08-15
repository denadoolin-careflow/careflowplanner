# Rhythm-aware planner: sync, cosmic links, and cycle templates

## 1. Planner ↔ Today sync
Today's plan surface and the Planner day view currently keep separate local state for range/view mode, selected day part, and panel collapse. Move that into one shared preference store so switching view on Today reflects on `/planner` and back, and both read the same day feed.

- Shared prefs (view mode, day part, kind filters, collapsed sections) in one module, persisted per user.
- Today's `TodayPlanView` mounts the same timeline/schedule/period components already used by the planner (no duplicate logic), plus the overdue, capacity and moon-insight cards so the two pages stay in step.

## 2. Text wrapping on day, week and month
Titles currently truncate or overflow in several places. Apply consistent wrapping (2-line clamp with break-words) to: schedule rows, time-of-day rows, timeline blocks, week grid/overview items, month chips, and all-day row items. Purely visual; no layout or drag changes.

## 3. Clickable cosmic events with quick-info popup
Cosmic chips (transits, moon phase, zodiac ingress) shown on the planner and week/month headers become buttons. Clicking opens a compact popover: event name, glyph, exact time, one-line meaning, and "how this may land today". Footer actions: "Open in Cosmic Flow" (deep-links to the existing event detail route) and "Add to journal".

## 4. Past-days comparison mode
Extend the Rhythm review chart with a compare toggle:
- Pick a comparison window (previous lunar cycle, previous cycle phase, or a custom past range).
- Overlay planned vs completed hours and logged energy/mood as a ghost series against the current range.
- A short delta summary ("You completed 18% more during the last waxing week").

## 5. Cycle-based planning templates
New template set keyed to cycle phase + element rather than a fixed day shape:
- Each phase (menstrual / follicular / ovulatory / luteal) gets a suggested day and week shape: priority count, block lengths, protected rest windows, and suggested areas.
- Element (fire/earth/air/water) tunes the nudge tone and suggested activity mix.
- Surfaced as "Suggested for this phase" in the templates menu and the empty-day state; applying it fills the timeline like existing templates. Nudges respect the existing nudge-tone preference.

## 6. Auto-link cosmic themes to tasks
Tasks already carry a `cosmic_tag` field. When a task is created or scheduled on a day, stamp it with that day's phase/sign/element theme, and show a small cosmic glyph chip on the task row and in quick edit. Clicking the chip opens the same quick-info popover from section 3. A filter lets you see all tasks influenced by a given phase or element.

## 7. Phase-aware habit prompts on the timeline
Habits get an optional phase affinity. On the timeline and in the tray's Habits tab, show a gentle phase-specific nudge card at the relevant time of day with a one-tap check-in that writes to the existing habit log. Nudge wording follows the phase + element tone and the user's nudge preference.

## Technical notes
- New: `src/lib/planner/cosmic-link.ts` (day theme → task stamp + lookup), `src/lib/planner/cycle-templates.ts` (phase/element template + nudge derivation), `src/lib/planner/compare.ts` (past-window series builder), `src/components/planner/CosmicEventPopover.tsx`, `src/components/planner/PhaseHabitNudge.tsx`.
- Reuses: `day-rhythm.ts`, `day-theme.ts`, `moon-history.ts`, `time-allocation.ts`, `cycle-planning.ts`, `nudge-prefs.ts`, `planner-templates.ts`.
- Data: `tasks.cosmic_tag` already exists (no migration). Habit phase affinity stored on the existing habits row as a nullable text/array column — a small migration.
- No changes to drag-and-drop behaviour or existing persisted preference keys.
