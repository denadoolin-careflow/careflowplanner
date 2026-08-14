# Moon insight, today's journal & note, and a smart scheduling assistant

## 1. Moon insight on the planner

Today the planner shows one compact atmosphere pill (weather · moon glyph · cycle dot) with a small popover. That stays, but the moon gets its own presence on the day view.

- A **Moon insight card** sits above the grid on the day/today view: phase glyph, phase name, % illuminated, days to the next full/new moon, and the phase's gentle invitation line (already in the moon library).
- The card is a **dropdown**: tapping it expands a panel with three tabs — **Journal**, **Daily Note**, **Template**.
- Collapsed by default, remembered per user (local preference), so it never crowds the grid.
- Cycle phase and the day's weather stay in the existing pill; the moon card doesn't duplicate them beyond a one-line footer.

## 2. Today's journal (tab 1)

- Loads today's journal entry if one exists; otherwise offers "Start today's entry".
- Inline editor: optional title + body, autosaving as you type (same behaviour as the Journal Flow page), with a saved/saving indicator.
- The entry is stamped with today's date and moon phase so it shows up in the moon/journal history you already have.
- "Open in Journal" link for the full-page experience.

## 3. Today's daily note (tab 2)

- Loads today's Daily Note (a note of kind "daily" dated today); if there isn't one, a **Create today's note** button makes it from your template.
- Inline markdown editing of the note body with autosave, plus "Open note" to jump to the full editor.
- Title follows the existing daily-note convention (the date).

## 4. Editable daily note template (tab 3)

- The daily note skeleton is currently hard-coded. It becomes an **editable template** you own, edited right there in the dropdown.
- A simple text area with the template markdown, supporting placeholders that fill in on creation:
  `{{date}}`, `{{weekday}}`, `{{weather}}`, `{{moon}}`, `{{illumination}}`, `{{cycle}}`
- Buttons: Save, Reset to default, and a small live preview of what today's note would look like.
- Saved per user and used everywhere a daily note is created (planner, Notes page), so behaviour stays consistent.

## 5. Smart scheduling assistant

A new **Assistant** panel on the planner (day view; reachable from the planner header on other ranges). Rules-first, AI on request.

**Instant, rule-based suggestions (no AI cost):**
- Scans today's unscheduled tasks plus your existing blocks, appointments and meals.
- Proposes a placement per task using your saved auto-schedule preferences: energy windows (high → morning, low → late afternoon), buffers, day window, "skip past times", priority or duration ordering.
- Each suggestion is a card: task title, proposed time range, duration, and a plain-language reason ("first open slot after your 10:30 appointment", "high-energy work before noon").
- Actions per card: **Place**, **Pick another slot** (next free option), **Skip**. Header actions: **Place all** and a **Dismiss** for the whole batch.
- Also surfaces day-level nudges: overbooked warnings, no-break stretches over ~3 hours, conflicts, and tasks with no estimate.

**Ask Carey (AI pass):**
- A button that sends the day's context (tasks, energy/capacity, appointments, moon & cycle tone) to the existing planner AI function and returns a re-ordered, gentler plan with short reasoning per item.
- Results render in the same suggestion cards, so applying them is identical.
- Streams while it thinks; falls back to the rule-based list if AI is unavailable or rate-limited.

**Safety:**
- Every placement (single or batch) goes through the existing planner undo history, with an Undo action on the confirmation toast.
- Nothing is written until you tap Place or Place all.

## Technical notes

- New `src/components/planner/PlannerMoonInsight.tsx` (card + dropdown + three tab panels), mounted in `PlannerTimeline.tsx` next to `PlannerAtmosphereStrip` and in `TodayPlanView.tsx` for mobile.
- Journal tab uses the existing store journal API (`addJournal` / `updateJournal`) with a debounced autosave; note tab uses `src/lib/notes.ts` (`createNote`, `updateNote`) filtered on `kind: "daily"` + today's date.
- `src/lib/daily-note-template.ts` gains a stored user template (persisted preference) plus a placeholder renderer; `buildDailyNoteTemplate` keeps its signature so `NoteDetail.tsx` behaviour is unchanged, just template-driven.
- New `src/lib/planner/schedule-assistant.ts`: pure functions producing suggestions from tasks + busy ranges + `AutoSchedulePrefs`, reusing the free-gap logic already in the timeline so results match auto-schedule.
- New `src/components/planner/PlannerAssistantPanel.tsx` renders suggestions and calls `applyPlacements`, which reuses the timeline's `scheduleTaskAt` history entries so undo/redo works unchanged.
- AI pass calls the existing `ai-planner` edge function through `aiInvoke`; no new function, no schema changes.
- No database migrations: template and panel state live in user preferences; journal and notes use existing tables.
