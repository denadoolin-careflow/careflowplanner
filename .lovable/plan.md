# CareFlow Workspace Refactor — Phased Plan

This is a very large refactor. Doing it all in one pass would destabilize the app. I'll ship it in 4 focused phases, each independently usable and reviewable. You can approve the whole plan or ask me to start with a specific phase.

I'll also quietly fix the current AuroraClock runtime error (assigning to a readonly DOM property) as part of phase 1.

---

## Phase 1 — Foundation: stability, inline edit, panel system primitives

Goal: kill the jank, make Today's Schedule inline-editable, and lay down the multi-panel primitives everything else builds on.

- **Fix AuroraClock runtime error** (readonly assignment at line 87) — root cause fix, not a workaround.
- **Inline task editing in Today's Schedule view**
  - Click a task block in `TimeGrid` to edit title in place (no modal).
  - Enter to save, Esc to cancel, blur to save.
  - Double-click still opens full `TaskEditor` for advanced fields.
- **Workspace layout primitive** (`src/components/workspace/`)
  - `WorkspaceShell` using `react-resizable-panels` (already in deps via `resizable.tsx`).
  - Supports left dock, center, right dock; each dock holds a stack of `PanelTab`s.
  - Persisted to `localStorage` (`careflow.workspace.layout.v1`): panel sizes, which panels open, tab order.
  - Smooth open/close (framer-motion width animation, 200ms).
- **Dockable panel registry**
  - Panels registered by id: `inbox`, `projects`, `goals`, `areas`, `calendar`, `notes`, `agenda`, `meals`.
  - Each panel = `{ id, title, icon, component }`.
- **Sidebar shift-click**
  - Normal click → navigate (current behavior).
  - Shift+click on sidebar item → open as side panel in current workspace instead of navigating.
  - Cmd/Ctrl+click → open in right dock specifically.

Deliverable: Today page renders inside `WorkspaceShell`. Shift-clicking sidebar items docks panels. No regressions to existing routes.

---

## Phase 2 — Drag-and-drop overhaul

Goal: Todoist/TickTick-grade DnD across calendar, inbox, projects, and panels.

- **Replace ad-hoc long-press-drag with `@dnd-kit/core`** (industry standard, accessible, performant).
  - Unified `DragContext` at workspace root.
  - Custom collision detection: pointer-within for slots, rectangle-intersection for lists.
  - `DragOverlay` for the drag shadow (one shared visual, no ghosting).
- **Calendar DnD precision**
  - 15-minute snap by default; hold Alt for 5-minute snap.
  - Drop placeholder shows exact target slot + computed time label.
  - Resize handles on event blocks (top + bottom), 15-min snap.
  - Auto-scroll when dragging within 60px of viewport edges (requestAnimationFrame loop, not setInterval).
  - Collision: stack overlapping events into columns (Google Calendar style) instead of full overlap.
- **Cross-panel DnD**
  - Drag from Inbox panel → Calendar slot (schedules with time).
  - Drag from Inbox → Project panel (assigns project).
  - Drag from Calendar → Inbox (unschedules).
  - Drag between project panels (reassigns).
- **Layout stability**
  - All draggable blocks use `transform` only (no layout thrash).
  - `will-change: transform` only during active drag.

Deliverable: All drag interactions feel smooth at 60fps; no jumps, flickers, or accidental drops.

---

## Phase 3 — Persistent task drawer + filters

Goal: TickTick-style always-available task sidebar next to the calendar.

- **`TaskDrawer` panel** (new, dockable via panel registry)
  - Tabs: Inbox · Today · Upcoming · Project picker · Filtered.
  - Quick search (fuzzy, client-side).
  - Quick filters: tag, area, priority, due date chips.
  - Group by: project / area / day / priority.
  - Drag handle on every row → drops into calendar slots or other panels.
- **Floating collapse toggle** on the drawer edge (Linear-style chevron tab).
- **Keyboard shortcuts**
  - `[` toggle left dock, `]` toggle right dock.
  - `Cmd+\` toggle task drawer.
  - `Cmd+K` already exists (CommandPalette).
- **Replace `UnscheduledTasksRail`** on Today with the new `TaskDrawer` mounted in the right dock by default.

Deliverable: Persistent, filterable task sidebar that drives planning workflows.

---

## Phase 4 — Editor consistency + polish

Goal: Every task/appointment/note editor feels like one product.

- **Unified `EditorSheet` primitive**
  - Same header, same field rhythm, same animation (slide-in from right, 180ms).
  - Used by `TaskEditor`, `AppointmentEditor`, `BirthdayHolidayEditor`, `RecipeEditor`.
- **Inline-first philosophy**
  - Click title → inline edit.
  - Click date/time chip → popover, not full modal.
  - Full editor only via "Open editor" affordance or double-click.
- **Right-pane editor mode**
  - Optionally open editors as a docked right panel instead of a sheet (toggle in settings).
- **Visual polish pass**
  - Consistent border-radius (`rounded-xl` for panels, `rounded-md` for inputs).
  - Consistent shadow tokens (`shadow-soft`, `shadow-elevated` from design system).
  - Consistent spacing scale on all editor fields.

Deliverable: Editor surfaces look and behave identically across task, appointment, note, and meal flows.

---

## Technical notes

- **New dependencies**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`. `react-resizable-panels` already present. `framer-motion` already in use.
- **Files created** (approx):
  - `src/components/workspace/WorkspaceShell.tsx`
  - `src/components/workspace/PanelDock.tsx`
  - `src/components/workspace/PanelRegistry.ts`
  - `src/components/workspace/useWorkspaceLayout.ts`
  - `src/components/dnd/DragRoot.tsx`
  - `src/components/dnd/DragOverlayContent.tsx`
  - `src/components/dnd/useAutoScroll.ts`
  - `src/components/tasks/TaskDrawer.tsx`
  - `src/components/tasks/InlineTaskTitle.tsx`
  - `src/components/editors/EditorSheet.tsx`
- **Files refactored** (approx): `TimeGrid`, `UnscheduledTasksRail`, `AgendaView`, `Today`, `Week`, `Month`, `CalendarPage`, `Sidebar`, `AppLayout`, `TaskEditor`, `AppointmentEditor`, `AuroraClock`.
- **Migration safety**: workspace layout state is additive; existing routes keep working if `WorkspaceShell` is bypassed. DnD swap is gated per surface so phase 2 can ship view-by-view.
- **Effort**: roughly 1 large change-set per phase. Phase 2 is the heaviest.

---

## What I need from you

1. Approve the plan as-is, or
2. Tell me which phase to start with (recommend Phase 1), or
3. Trim scope — e.g., skip Phase 4, or skip cross-panel DnD in Phase 2.

I'll wait for your call before writing code.
