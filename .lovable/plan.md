## Goal
Tighten the Planner so scheduled tasks stay in sync, drag-and-drop works on touch as well as mouse, empty timeline slots become tap-to-create, and the task list has an always-visible inline quick add.

## Changes

### 1. Inline Quick Add in the task panel
File: `src/components/planner/PlannerTaskPanel.tsx`
- Replace the small `+` icon in the header with a persistent inline input row: "Add a task…" with an area-color pill.
- Enter → parse with `parseTaskInput` and `addTask` (`dueDate = selectedDate`, `inbox: false`). Keep the existing modal capture reachable via a small "Advanced ⌘K" affordance.
- Show live NLP chips below the input (same style as Quick Capture) so `p1 tomorrow 3pm #tag @area 30m` metadata is visible before saving.

### 2. Tap-to-create on the timeline grid
File: `src/components/planner/PlannerTimeline.tsx`
- Add `onPointerUp` on the grid: if the pointer landed on empty space (not on a block, not after a drag/resize), open a lightweight popover anchored at the click point with a single Input.
- Enter creates a task with `dueDate = iso`, `startTime = snapped HH:MM`, `estMinutes = 30`, parsed through `parseTaskInput` so shortcuts still work.
- Ignore taps that occur during resize / drag (track a drag flag) so it never fires accidentally.

### 3. Touch drag-and-drop for tasks (mobile + web)
Files: `src/components/planner/PlannerTaskRow.tsx`, `src/components/planner/PlannerTimeline.tsx`, plus a new `src/lib/planner-touch-drag.ts`.
- Introduce a small pointer-based drag layer (using `pointerdown` + `setPointerCapture`) that fires on **long-press (250ms)** for touch and immediate for mouse — reusing the existing `long-press-drag` utility pattern.
- On drag start: haptics `pickup`, render a floating ghost of the task title following the pointer.
- On drag over the timeline grid: highlight the snapped 15-min slot (blue guideline) using the same `yToMin` math the HTML5 drop path uses; `haptics.magnet` on slot change.
- On drop inside the grid: call the same update path (`updateTask({ dueDate, startTime, estMinutes, inbox:false })`) already used by `onDrop`, plus `haptics.drop` and toast.
- Keep the existing HTML5 drag path for desktop drops from other lists (Calendar rail, etc.) — the new layer is additive.

### 4. Rhythm step of Plan My Day works on touch too
No new file — `PlanMyDayDialog` already embeds `PlannerTimeline` and `PlannerTaskRow`, so the touch-drag work in step 3 automatically applies to the Rhythm step. Verify inside the dialog by:
- Ensuring pointer capture is scoped to `window`, not the dialog root (so drops still register when the pointer moves over the timeline inside the dialog).
- Rendering the ghost via a portal (`document.body`) so it isn't clipped by dialog overflow.

### 5. Keep planned tasks synced with the planner
Files: `src/components/planner/PlannerTimeline.tsx`, `src/components/planner/PlannerTaskPanel.tsx`
- Extend the timeline item builder to also project `time_blocks` whose `task_id` matches a task, so blocks scheduled from Home Reset / Daily Plan show on the Planner grid (via `useTimeBlocks(iso, iso)`).
- When dropping a task onto the grid, if a matching `time_block` exists for that task on that day, update the block's `start_time`/`end_time`; otherwise update the task's `startTime` as today. This keeps both sources in sync in one action.
- In the task panel's "Today" section, mark rows scheduled through `time_blocks` with a small clock chip and treat them as scheduled (they'll no longer appear under "Inbox").

## Technical notes
- Snap grid: reuse `SNAP_MIN = 15` and `HOUR_PX = 60`; all new interactions share `yToMin`.
- Long-press threshold: 250ms; movement > 6px before the timer cancels it → treat as scroll.
- Ghost element: absolutely positioned, `pointer-events: none`, `will-change: transform`, cleaned up on `pointerup`/`pointercancel`.
- No schema changes. No new backend calls beyond the existing `useTimeBlocks` hook.
- No changes to Calendar v2, Home Reset, or the shared store shape.
