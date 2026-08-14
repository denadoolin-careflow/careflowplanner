# Planner: smarter assistant, richer day context, sharable moon insight

Seven connected upgrades to the Planner day view. Everything builds on what already exists (auto-schedule prefs, moon insight card, capacity bar, meal lane, day review) — no rebuilds.

## 1. More scheduling constraints + instant regenerate

Extend auto-schedule preferences with:
- **No-schedule windows** — repeatable time ranges (e.g. 12:00–13:00 lunch, 15:00–16:00 school run) the assistant never places into. Add/remove rows with a label.
- **Energy windows** — already partly there (high/medium/low preferred hours); upgrade to ranges instead of a single start hour, so "high energy 8–11" is respected as a band.
- **Person tags** — using the existing people-tag system, choose people whose tasks should be grouped near each other (e.g. all "Mom" tasks in one stretch) and optional per-person preferred windows.

The suggestion engine reads these; a **Regenerate** button re-runs the rules instantly (it's local math, no network) and a small chip row shows which constraints are active so it's obvious why a slot was chosen.

## 2. Journal + daily note attached to the timeline

Today's journal entry and today's daily note become visible in context on the day grid:
- A slim **context marker** on the timeline at the time a journal entry was written, and note-linked tasks show a small note icon.
- Tapping a marker opens a peek popover with the entry text and a link into the existing Moon insight tabs for full editing.
- Blocks can be linked to a note section, so a scheduled block can carry "note context" inline under its title.

## 3. Accept / partially apply / edit proposals with diffs

The assistant list becomes a review queue. Each proposal shows a clear before → after diff (`Unscheduled → 2:15p–3:00p`, or `9:00a → 11:30a` when it's a move), plus:
- **Accept** (apply just this one), **Edit** (inline time + duration tweak before applying), **Skip**.
- **Apply selected** with checkboxes, alongside the existing Place all.
- Everything routes through the existing planner history, so one Undo reverts the whole batch.

## 4. Customizable nudges

New nudge preferences: tone (gentle / neutral / direct), quiet mode (hide all nudges), and per-type toggles — overbooked, no-break stretch, conflicts, missing estimates, energy mismatch. Nudge copy is generated from the chosen tone.

## 5. Shareable PDF of Moon insight today

An **Export** action on the Moon insight card produces a one-page PDF: date, moon phase + invitation, today's journal entry, today's daily note, and the planned-vs-completed summary (with the category breakdown). Rendered client-side and downloaded; also offers the native share sheet on mobile.

## 6. Meals: type a new meal, auto-generate the recipe

In the planner meal picker, typing a name that doesn't match the library shows **"Create '<name>' + generate recipe"**. That saves the meal to the library, schedules it on the day, and calls AI in the background to fill in ingredients, steps and time. The lane shows a generating state and updates in place; the recipe stays editable.

## 7. Capacity: mood + energy per day part, cosmic card, gentle check-in

- Under each of Morning / Afternoon / Evening in the capacity section, add compact **mood** and **energy** loggers (reusing the existing per-part energy store, plus a new mood store keyed the same way).
- A **Cycle + moon/zodiac card** on top of the planner: current cycle phase, moon phase and its zodiac sign, with today's cosmic events.
- Cosmic events become tappable: each opens a short gentle check-in ("this transit invites…") with a one-tap journal prompt that writes into today's journal entry.

## Technical notes

- Prefs extended in `src/lib/auto-schedule-prefs.ts` (no-schedule windows, energy bands, person rules) and a new `src/lib/planner/nudge-prefs.ts`; both localStorage-backed like today.
- `src/lib/planner/schedule-assistant.ts` gains window-blocking, person grouping and diff metadata on each `Suggestion`; nudge builder takes tone + enabled types.
- `PlannerAssistantPanel.tsx` becomes the diff review queue; applies go through `planner-history`.
- Timeline markers added in `PlannerTimeline.tsx`, reading journal entries from the store and notes from `src/lib/notes.ts`.
- PDF via a client-side generator into a print-styled layout; data from `src/lib/planner/time-allocation.ts`.
- Meal creation reuses the meal library API plus an AI recipe call on the Lovable AI gateway (existing `ai-library-meals` pattern), run async after the meal is scheduled.
- Mood store mirrors `src/lib/energy-by-part.ts`; cosmic card reuses `src/lib/moon.ts`, `zodiac.ts`, `transits.ts` and `cycle-store.tsx`.

## Order of work

1. Constraints + regenerate, 2. diff review queue, 3. nudge prefs, 4. capacity mood/energy + cosmic card, 5. journal/note on timeline, 6. meal create + recipe, 7. PDF export.
