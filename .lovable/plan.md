## 1. Today — Morning / Afternoon / Evening view

- Extend `CalendarViewToggle` with a third option `dayparts` (`Schedule | Agenda | Day Parts`).
- New `DayPartsView.tsx` (in `src/components/calendar/`): three stacked sections — Morning (5–12), Afternoon (12–17), Evening (17–23).
  - Each section lists that day's appointments + due/scheduled tasks, sorted by time, with checkbox for tasks and click-to-open editor for events.
  - Drop targets: dragging a task from `UnscheduledTasksRail` onto a section sets `dueDate` and a default start time (8:00 / 13:00 / 19:00).
  - Empty state: "Nothing planned for the morning — drag a task here."
- Wire into `Today.tsx` so when `view === "dayparts"` we render `DayPartsView` instead of `TimeGrid`/`AgendaView`.

## 2. Home — single dashboard with collapsible sections + Reset tab

Rebuild `src/pages/HomeAreas.tsx` as one scrollable page using `Collapsible` sections (default-open: Reset, Zones; collapsed: Maintenance, Documents, Notes). Keep current `/home-areas` route; remove the inner `Tabs`.

Sections (top to bottom):

1. **Reset** — embeds `ChecklistTree` for the active weekly/daily reset checklist (same component used on `/home-reset`). "Open full Reset" link to `/home-reset`.
2. **Zones** — inline-editable grid:
   - Each zone = one `cleaning_tasks.zone` group, header is editable text (rename updates `zone` on all tasks in the group).
   - "+ Add zone" button creates an empty group (stored as a placeholder task or in a small new `zones` setting — simplest: create a hidden seed task so the zone appears).
   - Per-zone "+" quick-add input adds a `cleaning_tasks` row directly in that zone (title only; defaults: weekly cadence, no due date).
   - Each row: checkbox (toggle done), inline-editable title (blur → save), trash icon.
3. **Maintenance** — keep current `MaintenancePanel`.
4. **Documents** — keep current `DocumentsPanel`.
5. **Home notes** — keep current `HomeNotesPanel`.

## 3. Daily / Weekly / Monthly notes with AI + slash-linking

**Schema** (migration):

- Extend `notes.kind` enum-style values to allow `'weekly' | 'monthly'` in addition to `'note' | 'daily'`. Store ISO week / month start in `notes.date`.
- Add helpers in `src/lib/notes.ts`: `getOrCreateWeeklyNote(weekStartISO)`, `getOrCreateMonthlyNote(monthStartISO)`.

**UI**

- In `src/pages/Notes.tsx`, add a top "Periodic notes" strip with three pill buttons: **Today**, **This Week**, **This Month** → opens the corresponding daily/weekly/monthly note.
- AI editing: add an "AI" button in `NoteDetail.tsx` header that opens a popover with actions (Summarize, Expand, Rewrite, Tidy). Calls a new edge function `notes-ai` using Lovable AI Gateway (`google/gemini-3-flash-preview`) — non-streaming `supabase.functions.invoke` returning replacement body, applied to a selected range or whole note.

**Slash command — link to existing entity**

- New `src/components/notes/SlashLinkMenu.tsx`: floating popover anchored at caret. Triggered when user types `/` at start of a word in the `Textarea` (or any position with whitespace before).
- Tabs/categories: Date, Note, Task, Project, Area, Goal, Habit, Event (appointment).
- Search input filters across the chosen category (uses store + supabase queries).
- Selecting an item inserts a markdown link at the caret using existing route conventions:
  - Note → `[[Title]]` (already supported by `NoteMarkdown`)
  - Project → `@ProjectName` (already supported)
  - Task → `[task: title](/today?task=ID)`
  - Area → `[area: name](/home-areas#zone-Name)`
  - Goal → `[goal: title](/goals#ID)`
  - Habit → `[habit: title](/habits#ID)`
  - Event → `[event: title](/calendar?appt=ID)`
  - Date → `[Mon, May 14](/today?d=YYYY-MM-DD)`
- Extend `NoteMarkdown` link handler so these internal `/...` links keep working as `<Link>`s.

## 4. Calendar — click-to-edit + drag-to-move everything

- **Tasks on grid**: extend `TimeGrid` so task chips are draggable (same drag mechanism as the rail) — drop on a different time slot updates `due_date` + a stored start time (reuse `start_time` on task or write to a calendar block); drop on a different day updates `due_date`.
- **Appointments on grid**: already draggable for time; add cross-day drop in week view (`days.length > 1`) — `onApptDropAt` already accepts `dateISO`.
- **Click-to-edit**: 
  - Appointments → `AppointmentEditor` (already wired on Today; ensure same wiring on `/calendar` Week/Month views).
  - Tasks on grid/agenda → open `TaskEditor` dialog (already exists). Add `onTaskClick` prop to `TimeGrid`/`AgendaView`/`DayPartsView` and Month cells.
- **Month view**: make each event/task pill clickable → opens its editor. Add HTML5 drag to drop a pill onto another day cell → updates `due_date` (task) or `date` (appointment).
- **Week view**: same as Month for cross-day drags; intra-day uses `TimeGrid`.

## Out of scope

- Recurring-task edit semantics (move only this occurrence vs series) — single-occurrence move only.
- Real-time multi-device sync.
- Resize-by-drag for time blocks (only move).
- AI on slash menu (separate feature).

## Files

**New**
- `src/components/calendar/DayPartsView.tsx`
- `src/components/notes/SlashLinkMenu.tsx`
- `supabase/functions/notes-ai/index.ts`
- migration: extend allowed `notes.kind` values, add helpful index on `(user_id, kind, date)`.

**Edited**
- `src/components/calendar/CalendarViewToggle.tsx` — add `dayparts`.
- `src/pages/Today.tsx` — render `DayPartsView` when selected.
- `src/pages/HomeAreas.tsx` — full rewrite to collapsible dashboard with Reset + inline-edit Zones.
- `src/components/calendar/TimeGrid.tsx` — task drag, click handlers.
- `src/components/calendar/AgendaView.tsx` — task click handler.
- `src/pages/Week.tsx`, `src/pages/Month.tsx`, `src/pages/CalendarPage.tsx` — wire click-to-edit + cross-day drag for tasks & appointments.
- `src/lib/notes.ts` — weekly/monthly helpers.
- `src/pages/Notes.tsx` — periodic strip.
- `src/pages/NoteDetail.tsx` — AI button, mount `SlashLinkMenu` on textarea.
- `src/components/notes/NoteMarkdown.tsx` — handle new internal link prefixes.