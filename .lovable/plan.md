## Today page sidebar upgrades

Five focused additions to the right-hand sidebar of `/today`, plus an hourly forecast inside each rhythm section.

### 1. Planned Tasks panel (Today / This Week / This Month) with drag-to-today

New widget `PlannedTasksWidget.tsx` mounted near the top of the sidebar.

- Three tabs: **Today**, **This Week**, **This Month**.
  - Today = `dueDate === todayISO`
  - This Week = `dueDate` within `startOfWeek..endOfWeek` (excluding today)
  - This Month = `dueDate` within current month (excluding this week)
- Each row is `draggable` and emits the existing `TASK_DRAG_MIME` payload so it works with the calendar grid and day-part lanes already in the app.
- A "Drop to move to Today" zone at the top of the widget. Dropping a Week/Month task sets `dueDate = todayISO` via `updateTask`.
- Click row → `openTaskEditor(task.id)`. Reuses the same row pattern as `TasksWidget`.
- No schema changes. Pure read/write through `useStore()`.

### 2. Brain Dump widget (top-right)

New `BrainDumpWidget.tsx` pinned as the first sidebar card.

- Single textarea with auto-grow, a "Capture" button, and a list of the last 5 entries.
- Each captured line creates a task via `addTask({ title, inbox: true })` (same path used elsewhere in the app) so dumps land in Inbox and can be triaged.
- Local "recently captured" cache in `localStorage` for instant feedback; the truth lives in the task store.
- Cmd/Ctrl+Enter to capture; Esc to clear.

### 3. Reorderable sidebar widgets

Make the sidebar in `Today.tsx` user-reorderable.

- Introduce `useSidebarOrder()` hook backed by `localStorage` key `careflow:today:sidebar-order` storing an array of widget IDs.
- Replace the static JSX list in the `<aside>` with a registry: `{ id, render }` pairs for every widget (BrainDump, PlannedTasks, ScheduledToday, Tasks, MealsPlanned, Grocery, Notes, Journal, Memories, HomeReset, MoonPhase, Cycle, FamilySnapshot, GrowingSeason, CareLoop, UpcomingEvents).
- Reorder UI: small drag handle on each widget header (uses HTML5 drag, same pattern as existing draggable rows — no new dep). A "Reset order" item in the sidebar footer.
- New widgets users haven't seen yet are appended automatically.

### 4. Hourly forecast in each rhythm section

Extend `SlotWeather.tsx` (already shows rainy hours only).

- Replace the rainy-hours strip with a full hourly strip for that slot's hour range (`SLOT_HOURS[slot]`).
- Each chip: hour label, condition icon (reuse `ConditionIcon`), temp in current unit, precip % if ≥ 10%.
- Horizontally scrollable; keeps current "No rain expected" subtle copy underneath when applicable.
- No data fetching changes — `snap.todayHourly` already carries condition + temp + precip.

### 5. Moon Phase & Cycle widgets in sidebar

Two new sidebar cards that link to their full pages.

- **MoonPhase card**: reuse existing `MoonPhaseWidget` (compact variant) and wrap in a `<Link to="/rhythm">` (or whichever route hosts lunar — confirm during implementation by checking `nav.ts`). Tap-through visible affordance.
- **Cycle card**: lightweight summary built from `cycle-store` — current phase, day of cycle, days-to-next-period, and a "View cycle" link to the Cycle page route from `nav.ts`. No new schema; reads existing cycle state.

### Files

**New**
- `src/components/today/widgets/PlannedTasksWidget.tsx`
- `src/components/today/widgets/BrainDumpWidget.tsx`
- `src/components/today/widgets/MoonPhaseSidebarCard.tsx`
- `src/components/today/widgets/CycleSidebarCard.tsx`
- `src/lib/today-sidebar-order.ts` (hook + registry helpers)

**Edited**
- `src/pages/Today.tsx` — switch `<aside>` to registry-driven render with reorder.
- `src/components/today/rhythm/SlotWeather.tsx` — full hourly strip.

### Out of scope

- No changes to backend tables, edge functions, or auth.
- No changes to the main column layout or non-sidebar pages.
- No new drag-and-drop libraries (uses native HTML5 DnD already in use across the app).
