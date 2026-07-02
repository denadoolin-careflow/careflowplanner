
This is a large request. Splitting into two coordinated tracks so we can ship incrementally without regressing what's already working.

## Track A — Today dashboard: real widget-style drag & drop

The xTiles-style tile grid already has hide / show / resize / order arrows. Missing piece is true pointer drag-to-rearrange.

- `src/components/today/tiles/TileFrame.tsx`
  - Add a drag handle (grip) visible in edit mode. On pointer down, capture the tile id and start an HTML5 drag with a translucent preview.
  - Add drop targets between tiles (thin insertion zone) and on tiles themselves (swap). Highlight the active target.
  - Wire touch: use pointer events + a 200ms long-press to start drag on mobile with haptic tick; scroll suppression while dragging.
- `src/lib/today-tiles.ts`
  - Add `moveTo(id, targetIndex)` alongside existing `move(id, dir)`; persist to the same `K_ORDER` key.
- Behavior: reordering only enabled while `editing` is true (keeps normal reading calm). Ordering persists across sessions via existing localStorage.

## Track B — Calendar upgrades (in the order the user suggested)

### 1. Real month grid view (highest priority)
- New file `src/components/calendar/MonthGridView.tsx`
  - 7-col × 5–6 row grid built with `date-fns` (`startOfWeek`, `eachDayOfInterval`).
  - Each cell: date header, up to 3 stacked chips (appointments → time blocks → birthdays → tasks-with-due-date, in that priority), plus `+N more` button that opens a Popover listing every item for that day.
  - Click day → route to day view for that ISO (`navigate('/calendar?view=day&date=…')`).
  - Chip drag: reuse the HTML5 dnd pattern already in `TimeGrid.tsx` (`dataTransfer` with a JSON payload of `{kind, id}`). Drop on a day cell reschedules (`updateAppointment` / `updateTimeBlock` / `updateTask({dueDate})`).
  - Mobile: long-press on a chip starts drag using the same pointer helpers already in `TimeGrid.tsx`.
- `src/components/calendar/CalendarViewToggle.tsx`
  - Add a `"month"` mode next to Schedule / Time-of-day / Agenda. Persisted to the same localStorage key already used.
- `src/pages/CalendarPage.tsx` (or wherever the toggle switch renders): route the new mode to `MonthGridView`. Keep `MonthPlanningDashboard.tsx` mounted only on the existing "Month reflection" tab.

### 2. Recurring events
- Types: add `recurrenceRule?: RecurrenceRule` to `Appointment` and `TimeBlock`.
  ```ts
  type RecurrenceRule = {
    freq: 'daily'|'weekly'|'monthly'|'yearly';
    interval?: number;
    byWeekday?: number[];   // 0=Sun
    until?: string;         // ISO date
    count?: number;
    exdates?: string[];     // per-instance overrides/deletes (ISO)
  }
  ```
- New helper `src/lib/recurrence.ts` — pure functions `expandOccurrences(rule, rangeStart, rangeEnd)`, `nextOccurrence(rule, from)`, `serializeRRule` / `parseRRule` (RFC-5545 subset). No new dep — hand-rolled since we only need a small subset.
- `src/lib/store.ts` — when a query asks for events in a range, expand recurring parents into virtual instances tagged `{parentId, occurrenceDate}`. Persist edits by writing to `exdates` on the parent + optionally creating an override child event.
- UI: new `src/components/calendar/RepeatSelector.tsx` reused inside `AppointmentEditor.tsx` and the block-edit form in `TimeGrid.tsx`.
- Edit/delete recurring: `RecurringInstanceDialog.tsx` prompts "This event / All future events / All events" (Google-style).

### 3. Reminders
- Types: `reminderMinutesBefore?: number` on appointment/time block.
- `src/lib/reminders.ts` — background scheduler (setTimeout per upcoming reminder, refreshed on data change and every 5 min). Uses `Notification.requestPermission()` + `new Notification(...)` when granted; falls back to `toast()` from sonner.
- Options in editor: at-time / 5 / 15 / 30 / 60 min / 1 day before.

### 4. Natural-language quick add
- Reuse `parseTaskInput` from `src/lib/nlp-task.ts` and extend with a small event parser (`src/lib/nlp-event.ts`) that also captures duration ("for 30 min", "1h", "2 hours").
- `src/components/calendar/QuickAddCalendarPopover.tsx` — put a single text field at top; on debounce, populate the existing manual fields (title, date, start time, duration). User can still tweak before saving.

### 5. Keyboard shortcuts
- New `src/hooks/useGlobalShortcuts.ts` mounted once in `src/App.tsx`.
  - `Cmd/Ctrl+K` → open quick add (dispatches custom event; popover listens).
  - `D` / `W` / `M` / `A` → set calendar view mode via the same localStorage-backed setter used by the toggle.
  - `T` → set current date to today.
  - `Esc` → close topmost popover/dialog (dispatches a scoped custom event; components listen if open).
- Discoverable hint: small `?` button near the view toggle opens `ShortcutsPopover.tsx`.

### 6. Smart scheduling suggestions
- `src/lib/schedule-suggest.ts` — given a duration and a day's blocks/appointments, find the next open gap ≥ duration (working-hours window from user settings, default 8am–8pm).
- In `UnscheduledTasksRail.tsx`, for tasks with `estimatedMinutes`, render a "Suggest a time" ghost chip; clicking previews the slot on the day grid and one-tap confirms (same drag-drop path as manual placement).

### 7. Unified calendar/category legend
- New `src/components/calendar/MyCalendarsPanel.tsx` — collapsible list grouped by:
  - Google-synced calendars (source: `GoogleCalendarSection` data).
  - Areas (color from area).
  - Projects (color from project).
  - Birthdays & Holidays.
- Each row: swatch + name + eye toggle. Selection persisted in `localStorage` under `careflow:calendar:visibility:v1`.
- Filter applied to `TimeGrid`, `MonthGridView`, and Agenda so hidden groups disappear everywhere.

### 8. Two-way Google sync polish
- `src/components/calendar/GoogleCalendarSection.tsx` — per-calendar row shows: last-synced relative time, spinner while pending, red dot with tooltip on error (with retry). Uses existing sync state; extend the reducer/store to carry `{calendarId → {lastSyncedAt, status, error}}`.

## Design constraints honored
- Reuse existing cozy card + rounded chip aesthetic from `MonthPlanningDashboard.tsx`; no new fonts/colors, no new deps beyond what's already installed (`date-fns`, `framer-motion`, `lucide-react`, `sonner`, shadcn).
- Mobile-first: every new drag path uses the same long-press pointer pattern already in `TimeGrid.tsx`.
- Nothing existing gets removed. `MonthPlanningDashboard.tsx`, `AppointmentEditor.tsx`, `TimeGrid.tsx`, `UnscheduledTasksRail.tsx`, `GoogleCalendarSection.tsx` are extended in place.

## Suggested delivery order (matches user's list)
1. Widget drag on Today (Track A) — small, unblocks the visible request.
2. Month grid view (#1).
3. Recurring events + reminders (#2, #3).
4. NLP quick add + shortcuts (#4, #5).
5. Legend + smart suggestions (#7, #6).
6. Sync status polish (#8).

Ship each step as its own turn so preview stays green throughout. Reply "go" to start with step 1 (widget drag), or tell me to reorder / cut anything.
