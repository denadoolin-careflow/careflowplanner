# Inbox quick actions, planner scrolling, month day detail

## 1. Quick edit actions on inbox rows

Today each inbox row (`InboxSortableRow`) only offers the "When" popover (date + morning/afternoon/evening). Everything else requires the full task editor.

Add a compact action strip to the right of the existing meta row:

- **When** — keep the current `WhenPopover` (date + day part presets, snoozes, calendar).
- **Time** — new small popover with a time input plus quick chips (8:00, 12:00, 3:00, 6:00, Clear) writing the task's start time; wired to the same field the planner grid reads so a timed inbox task lands on the grid.
- **Priority** — icon button cycling / menu with Low, Medium, High, None; colored dot reflects the current value.
- **Energy** — menu with Low, Medium, High (leaf/spark icons), matching the values already used elsewhere in the app.

Behavior: each control writes immediately via `updateTask` (no save button), fires a haptic tap and a short toast, and shows the current value inline so the row reads as a status line. On mobile the strip wraps under the title and uses 32px touch targets; controls stay keyboard reachable with aria-labels.

## 2. Planner page scrolling

The planner root is locked to a fixed height (`h-[calc(100vh-140px)]` on desktop, `min-h-[70vh]` on mobile) and every pane (grid, schedule list, morning/afternoon/evening lists) scrolls internally inside that box, so the page itself can't scroll and long content feels stuck — especially on mobile where the stacked time-of-day lists all compete for one 70vh box.

Fix:
- **Mobile:** remove the fixed-height shell. Panes render at natural height and the page scrolls normally; the timeline grid keeps its own vertical scroll (it is a fixed 24-hour canvas) but stops fighting the page. Schedule and time-of-day lists grow with their content.
- **Desktop:** keep the app-shell height for the grid view (so the hour canvas stays anchored), but let the list-style views scroll within a properly sized flex column so nothing is clipped at the bottom.
- Preserve the existing sticky mobile header, "jump to now" behavior, and drag-and-drop.

## 3. Month page — day detail redesign

Clicking a day currently opens a side/bottom sheet that leads with moon phase and cycle, then extras, then tasks, then a timeline list. The astrology block dominates and the actual plan for the day sits far below.

Redesign the sheet as a day brief, ordered by usefulness:

```text
┌─────────────────────────────────────┐
│ Thu, Aug 6            [Open day →]  │  header: date + jump to planner
│ 3 tasks · 2 events · 1 meal         │  one-line summary chips
├─────────────────────────────────────┤
│ Quick add  [ + task for this day ]  │  inline capture, defaults to this date
├─────────────────────────────────────┤
│ Schedule                            │  timed items on a compact rail
│  9:00  Neurology appointment        │
│  1:00  Pick up prescriptions        │
├─────────────────────────────────────┤
│ Tasks                               │  checkboxes, tap to quick-edit
│  ☐ Call pharmacy         [when ▾]   │
├─────────────────────────────────────┤
│ Meals / Home                        │  collapsed if empty
├─────────────────────────────────────┤
│ ☾ Waning gibbous · Moon in Leo      │  collapsed rhythm row, expandable
└─────────────────────────────────────┘
```

Details:
- Header gets a primary "Open in planner" action and a secondary "Open week".
- Summary chips (tasks / events / meals / free time) sit under the date so the day reads at a glance.
- Inline quick-add creates a task already dated to that day.
- Task rows get the same quick actions from part 1 (when, priority) so the sheet is actionable without leaving it.
- Moon, key phase, cycle and "Lunar guidance" collapse into a single expandable footer row instead of the current two-card grid at the top.
- Empty state becomes one calm line plus the quick-add, not a bordered "Nothing scheduled" box.

## Technical notes

- New: `src/components/tasks/TaskQuickActions.tsx` (time / priority / energy popovers) reused by the inbox row and the month day sheet.
- Edit: `src/components/inbox/InboxSortableRow.tsx` to mount the strip.
- Edit: `src/pages/Planner.tsx` height shell, plus `h-full` assumptions in `PlannerScheduleList` / `PlannerPeriodList` so they work in both fixed and auto height modes.
- Edit: `src/pages/Month.tsx` sheet body (reordering existing `DayDetailExtras` / `DayTasksPanel` / timeline sections, adding the summary strip, quick-add and collapsible rhythm footer). No schema or backend changes.
