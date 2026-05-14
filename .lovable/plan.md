## 1. Bottom navigation

Replace the current 5 + More layout with **6 tabs + More**:

```
Inbox · Today · Calendar · Home · Meals · Notes · More
```

- `MOBILE_NAV` in `src/lib/nav.ts` becomes the six items above. `Calendar` points to `/calendar` (the existing combined view) instead of separate Week/Month/Year tabs — those stay reachable from More and the desktop sidebar.
- `BottomNav.tsx`: switch the grid from `grid-cols-6` to `grid-cols-7`, tighten icon/label sizing so 7 cells still fit on small phones (icon 16px, label 10px, reduced gap). More sheet keeps full nav.

## 2. Home page reset section

Home is already an editable customizable grid (drag/resize/add/remove, presets, themes). Two changes:

- **Default layout**: add the existing `home-reset` widget plus a new `home-reset-checklist` widget to the Home preset in `src/lib/dashboard-layouts.ts` so they appear out of the box. Existing users get them via a one-time migration that appends them if missing.
- **New widget `home-reset-checklist`** (`src/components/dashboard/widgets/HomeResetChecklistWidget.tsx`): inline interactive checklist showing the user's primary reset list — check off items, add quickly, drag to reorder, expand/collapse subtasks. Reuses `useResetChecklists` and a trimmed `ChecklistTree`. Registered in `WidgetRegistry.tsx` with `pageHref="/home-reset"` and `quickAddEvent="cleaning"`. Default size 8×6 so it reads as a proper section, not a tile.

The mobile section grouping in `CustomizableGrid.tsx` already has a "Weekly Reset" section — both widgets land there automatically.

## 3. Reset items behave as tasks (two-way unified)

Each `reset_items` row gets an optional mirrored task; the two stay in sync.

### Schema

- Add `linked_task_id uuid` to `reset_items` (nullable, FK to `tasks.id` with `ON DELETE SET NULL`).
- Add `reset_item_id uuid` to `tasks` (nullable, indexed) so a task knows it came from a reset item.
- A Postgres trigger keeps `title`, `notes`, `done`, `due_date`, `est_minutes` in sync in both directions; updating one side updates the other without recursion (guarded by a session variable).
- Backfill: existing reset items get a mirrored task in area `Home` with `inbox = false`. Items already done stay done on both sides.

### Behavior

- Editing a reset item's title/notes/done from the Home Reset page updates the linked task.
- Editing or completing the task in Inbox/Today/Upcoming/Calendar updates the reset item — checkbox feedback flows through the trigger.
- Scheduling a task on the calendar (drag onto a day/time) writes `due_date` back to the reset item.
- Deleting the reset item nulls the task's `reset_item_id` but leaves the task in place; deleting the task nulls the reset item's link but leaves it in place. Users can sever or re-link from a small badge on each row.

### UI surfacing

- In task rows (`TaskListPage`, `Inbox`, `Today`, `Upcoming`), show a small `Sparkle` badge "Reset" when `reset_item_id` is set, linking to `/home-reset`.
- In `ChecklistTree` rows, show a "Task" badge when `linked_task_id` exists, linking to the task.

## Out of scope

- Recurrence rules on reset items don't propagate to recurring tasks yet — they remain reset-side only.
- No bulk "convert all reset items to tasks" UI; the backfill handles existing data once.
- No realtime cross-device push; sync happens on next refresh / mutation.

## Files

**New**
- `src/components/dashboard/widgets/HomeResetChecklistWidget.tsx`
- `supabase/migrations/<ts>_reset_task_link.sql` (columns, trigger, backfill, default-layout patch)

**Edited**
- `src/lib/nav.ts` — new `MOBILE_NAV`
- `src/components/layout/BottomNav.tsx` — 7-cell grid, tighter sizing
- `src/lib/dashboard-layouts.ts` — add reset widgets to Home default
- `src/components/dashboard/WidgetRegistry.tsx` — register new widget
- `src/components/dashboard/CustomizableGrid.tsx` — include new widget type in the "Weekly Reset" mobile section
- `src/lib/reset-checklists.ts` — pass `linked_task_id` through; helper to read it
- `src/lib/store.tsx` — when toggling a task's `done`, no extra work needed (trigger handles it); expose `reset_item_id` on the Task type
- `src/lib/types.ts` — add `resetItemId?: string` to `Task`
- `src/components/reset/ChecklistTree.tsx` — render "Task" badge
- Task row components in `src/components/tasks/` — render "Reset" badge
