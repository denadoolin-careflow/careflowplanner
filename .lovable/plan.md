# Weekly and monthly notes, linked to daily notes

Give every week and every month its own note, sitting alongside the daily notes you already have, and make it obvious where each one lives and what happened during that span.

## What you'll get

**1. Weekly and monthly notes (one per week / per month, created on first open)**
- A weekly note is keyed by the Sunday that starts the week; a monthly note by the first of the month. Titles read like "Week of Sep 7, 2026" and "September 2026".
- Same layout picker as daily notes, with span-appropriate templates: Weekly (Week intentions, Wins, What was hard, Next week) and Monthly (Focus, Highlights, Lessons, Next month), plus Blank. A starred default per kind.
- Open them from: the week view header (notebook mark next to the week label), the month view header / seasonal banner, the Notes page (new "Weekly" and "Monthly" filters plus "This week's note" / "This month's note" actions), and the quick-add menu.

**2. A "Period" panel at the top of every daily, weekly and monthly note**
Shows what belongs to that span, pulled live from your existing data (nothing duplicated):
- The parent chain as breadcrumbs: Sep 7 → Week of Sep 7 → September 2026 — tap to jump; missing ones show as "Create".
- For weekly/monthly notes: the child notes as a row of day chips (week) or a mini month grid (month), solid when written, faded when empty, tap to open/create.
- Tasks due or completed, appointments/events, and cosmic events (moon phases, ingresses, etc.) in the span, grouped by day, with links to the planner day and to tasks.
- Collapsible, remembers its open/closed state.

**3. Planner indicators**
- Week view: notebook mark in the week header for the weekly note (solid/faded like day cells).
- Month view: notebook mark in the month header for the monthly note.
- Both reuse the existing tap-to-pick-a-layout behaviour.

**4. Notes page: "Notebook" view**
- New grouping mode that nests notes by Month → Week → Day so you can see the whole hierarchy at a glance, with missing weeks/days shown as quiet "+" placeholders.
- The Timeline page gets "Weekly" / "Monthly" badges on those notes.

## Technical details

- **Data**: extend `NoteKind` to `"note" | "daily" | "weekly" | "monthly"`. The `notes.kind` column is free text and `date` already exists, so no migration is needed — weekly uses `date` = week start (Sunday, matching the app's `weekStartsOn: 0`), monthly uses `date` = first of month. Add `getOrCreatePeriodNote(kind, dateISO)` in `src/lib/notes.ts` generalising `getOrCreateDailyNote`.
- **Templates/marks**: generalise `src/lib/notes/daily.ts` into per-kind template lists, per-kind default preference keys, `openPeriodNoteWithTemplate`, and `usePeriodNoteMarks(kind, dates)`; keep the existing daily exports as thin wrappers so `DailyNoteDot` and its call sites keep working. Add `PeriodNoteDot` (kind prop) in `src/components/notes/`.
- **Span helpers**: `src/lib/notes/periods.ts` — `weekKeyFor(date)`, `monthKeyFor(date)`, `spanFor(kind, dateISO)`, `parentsOf(note)`, `childrenKeys(note)`.
- **Period panel**: `src/components/notes/PeriodContextPanel.tsx` mounted in `NoteDetail.tsx` for daily/weekly/monthly notes. Sources: `useStore()` tasks/appointments filtered by span, `buildCosmicCalendarIndex(from, days)` for cosmic events, `usePeriodNoteMarks` for child notes. Reuse `PlannerDayReferences` styling.
- **Planner hooks**: `WeekDayHeader`/`PlannerWeekGrid` week label and `PlannerMonthView`/`PlannerMonthOverview` header get a `PeriodNoteDot`. `CombinedFab` gains "Weekly note" / "Monthly note" next to "Daily note".
- **Notes page**: extend `kindFilter` union, add "notebook" grouping in `Notes.tsx`, header formatting for weekly/monthly titles in `NoteDetail.tsx` (read-only like daily), and `NotesTimeline` badges.
- **Verification**: type-check, then an authenticated Playwright pass creating a weekly and monthly note from the planner, confirming breadcrumbs and child chips resolve, and that marks refresh after writing.
