# Mobile Planner & Task Editor Fluidity Pass

Four related fixes to make CareFlow's planner feel as fluid as Akiflow / Google Calendar on mobile.

## 1. Inbox entries wrap text
**File:** `src/components/calendar/InboxCapture.tsx`

Inbox rows currently truncate/overflow. Apply the same wrap pattern already used elsewhere:
- Title span: `min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere] line-clamp-2`
- Parent flex row: add `min-w-0` and `items-start` so meta badges don't push text into a single-char column.

Verify same treatment on `PlannerTaskRow.tsx` inbox-mode rows if they share the surface.

## 2. Wrap text in "All tasks under the calendar"
**File:** `src/components/calendar/CalendarAllList.tsx`

Row title spans lose wrapping when project/meta chips are present. Fix:
- Title element → `min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere] line-clamp-2`
- Row container → `items-start` (not `items-center`) and `min-w-0` on the text column
- Meta/chips column → `shrink-0`

## 3. Mobile drag-and-drop: Planner task panel → hourly grid
**Files:** `src/components/planner/PlannerTaskPanel.tsx`, `src/components/planner/PlannerTaskRow.tsx`, `src/components/planner/PlannerTimeline.tsx`

Current drag uses HTML5 `draggable` + `dataTransfer`, which does not fire on iOS/Android touch. Fix by adopting the pointer-based long-press-drag helper already in the repo (`src/lib/long-press-drag.ts` / `src/lib/planner-touch-drag.ts`).

Approach:
- `PlannerTaskRow`: on `pointerdown` start a 300ms long-press timer with haptic; on activation, attach a floating ghost element positioned at pointer, set a global "dragging task" context, prevent scroll (`touch-action: none` while active).
- `PlannerTimeline`: expose hour-slot DOM refs; on `pointermove` while a task drag is active, highlight the hovered slot; on `pointerup` compute the snapped time (15-min steps like desktop) and call the existing `scheduleTaskAt(taskId, iso, hh:mm)` handler.
- Reuse the exact scheduling code path used by desktop `onDrop` so behavior stays identical.
- Cancel on scroll-before-longpress or pointercancel.

Add subtle haptics: `haptics.pickup()` on activation, `haptics.tap()` on slot change, `haptics.success()` on drop.

## 4. Simplify mobile task editor
**Files:** `src/components/tasks/TaskEditor.tsx` (or a new `MobileTaskSheet` variant), `src/components/tasks/mobile/MobileTaskSheet.tsx` (already exists — extend it), `src/components/tasks/GlobalTaskEditor.tsx`

Today, mobile opens the full `/tasks/:id` page. Replace with a lightweight bottom sheet mirroring Akiflow / Google Calendar Quick Event:
- Fields shown by default: **Title**, **Date + time**, **Duration**, **Priority**, **Project/Area**, **Notes** (collapsed).
- Everything else (recurrence, energy, best time, tags, reminders, subtasks, links, atmosphere) hidden behind a single "More options" disclosure → expands the existing full editor inline.
- Sheet chrome: drag-handle at top, sticky Save on bottom, single-column stacked layout, 16px padding, large tap targets (min 44px).
- Route `MobileTaskCard` long-press and `GlobalTaskEditor` mobile path to open this sheet instead of navigating to `/tasks/:id`. Keep the full page reachable via a "Open full editor" link inside the sheet for power users.

## Verification
- Playwright at 384px viewport: open Planner, long-press an inbox task, drag to 2 PM slot, confirm the task appears on the grid and store reflects `startTime`.
- Visual check: Inbox row with a long title wraps to 2 lines with ellipsis; CalendarAllList row with a long title wraps similarly.
- Tap a task on mobile Today → bottom sheet slides up with simplified fields; "More options" expands the rest.

## Out of scope
No changes to desktop planner interactions, no data-model changes, no new backend calls.
