## Goal

Make the Planner timeline reliable and personal: nothing disappears, everything schedulable shows up, and the day can be pre-filled from templates.

## 1. Fix: task disappears after saving a dragged duration

Unverified root cause — first step is to reproduce and diagnose. Known facts from the code: the resize gesture mutates the block's inline `height` directly on the DOM node, and `setTaskDuration` writes `estMinutes` on the task plus `end_time` on any paired time block. The timeline only renders a task if it has a `due_date` matching the day *and* a start time (from a time block or `start_time`).

Diagnosis order: confirm whether the update drops `start_time`/`due_date`, whether the paired time-block write fails, or whether the block is rendered but collapsed/off-grid. Then fix the actual cause and make duration writes patch-only (never touch date/time), clamp duration to the visible grid, and clear the temporary inline height after commit.

## 2. Persist undo history

Move the session-only undo/redo stack to localStorage, keyed per date, with a version tag and a cap (30 entries). Entries expire after a day so a stale stack can never replay onto changed data; each entry re-validates that the target task/block still exists before applying.

## 3. Schedule templates

New "Templates" menu in the planner header with starters: School day, Appointment day, Low-energy day, plus user-created ones.

- A template is a named list of items: title, day part or start time, duration, area, optional energy.
- "Apply to this day" creates/schedules the tasks on the timeline in one action, recorded as a single undo entry.
- "Save today as template" captures the current day's scheduled items.
- Stored in the backend per user so templates follow the account, with row-level access limited to the owner.

## 4. One-tap conflict resolve

Add a single "Resolve all" button next to the header conflict count that applies the best fix per conflict (move to next free slot, else shorten to fit), as one undoable batch. Individual blocks keep the existing popover, with the top suggestion promoted to a one-tap primary button.

## 5. Reminder notifications

Extend the existing in-browser reminder scheduler to cover scheduled tasks (not just appointments): a per-task reminder lead time, a global default in planner settings, permission prompt handled once, and rescheduling whenever the day's items change.

## 6. Day-part tasks appear on the grid

Tasks that have a day part but no clock time currently never render. They will be placed in a slim "unscheduled in this band" row pinned at the top of each Morning / Afternoon / Evening band, draggable down onto a real time. Same treatment on the mobile grid.

## 7. Meals on the grid

Breakfast / Lunch / Dinner appear as dedicated lightweight lanes anchored to their band, populated from the day's planned meals. Tapping opens the meal; empty slots offer "Plan breakfast/lunch/dinner". Meal lanes are visually distinct from tasks and never counted as conflicts.

## 8. Mobile: inbox rail above the grid

On mobile, replace the left drawer with a horizontally scrollable inbox rail docked directly above the timeline, collapsible, with long-press drag from a chip onto the grid (reusing the existing touch-drag drop listener). Auto-scrolls the grid while dragging near its edges.

## 9. More planner views

Add to the existing Day / 3-day / Week / Month toggle:
- **Schedule** — a compact agenda list of everything on the day in time order.
- **Time of day** — three stacked band columns (morning/afternoon/evening) with drag between bands.

## 10. Day-part colors in planner settings

Add color pickers for the morning, afternoon and evening bands in the planner settings popover, alongside the existing auto-schedule prefs. Colors are stored as theme-safe tokens (a preset palette rather than raw hex) so light/dark both stay legible, and they drive the band backgrounds and the day-part views.

## 11. Weather, moon and cycle on the planner

Reuse the existing slot-weather strip and moon/cycle modules: a compact single-row header under the planner date bar showing morning/afternoon/evening weather, the moon phase, and the cycle phase, collapsible and remembered.

## Technical notes

- Timeline coordinate system stays `START_H = 5` → `END_H = 22`, 60px/hour, 15-min snap.
- New persistence: templates in the database (owner-scoped); undo stack, band colors, view mode and reminder defaults in localStorage alongside existing planner prefs.
- All new mutations (template apply, resolve-all, band moves) push a single history entry so one undo reverts the whole action.
- Work is split so the bug fix (section 1) lands and is verified in the preview before the larger features.
