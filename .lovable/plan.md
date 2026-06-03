# Side panels everywhere + Focus option

## Problem
- `WorkspaceShell` (the component that actually renders docked panels) is only used in `Today.tsx`. On every other page, opening a panel from the header picker does nothing visible.
- There's no Focus panel in the picker, and the panel list is a fixed hardcoded order with no way to search it.

## Changes

### 1. Mount WorkspaceShell globally
`src/components/layout/AppLayout.tsx`
- Wrap the `<Outlet />` (inside the `AnimatePresence` block) with `<WorkspaceShell>` so any route gets left/right docked panels.
- When no panels are open, `WorkspaceShell` already returns a plain pass-through, so unaffected pages render identically.
- Remove the now-redundant `WorkspaceShell` wrapper in `src/pages/Today.tsx` to avoid double-nesting.

### 2. Add Focus panel
`src/components/workspace/PanelRegistry.tsx`
- Add `focus` to `PanelId` union.
- Register: `focus: { title: "Focus", icon: Timer, component: lazy(() => import("@/pages/PomodoroPicker")) }`.
- Add `"/focus": "focus"` to `PANEL_BY_ROUTE`.

### 3. Searchable panel picker
`src/components/workspace/PanelPicker.tsx`
- Add `focus` to the `ORDER` array (after `routines`).
- Add a small search `<Input>` at the top of the dropdown content (under the dock-side label) with local `useState` for the query.
- Filter the rendered list by `p.title.toLowerCase().includes(q)`.
- Keep dock-side toggle and existing open/close behavior unchanged.

## Out of scope
- No changes to which panels exist beyond adding Focus.
- No changes to mobile layout (panel picker is already desktop-only via `sm:flex` parent).
- No restyling of `WorkspaceShell`; its existing height/border behavior is preserved.
