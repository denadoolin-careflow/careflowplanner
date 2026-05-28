## Goal

Add a **List view** to the grocery section on the Meals page, alongside the existing Kanban view. The List view exposes filter, sort, and grouping controls so the user can scan the list flat instead of by category columns.

## Current state

- `src/pages/Meals.tsx` renders only `<GroceryKanban />` inside the "Grocery list" section.
- `src/components/meals/GroceryList.tsx` already exists and supports filters (All/Out/Low/In), sort (Default/Low first/Out first/A–Z), and grouping (By category / By meal) — but is not mounted anywhere.

## Plan

### 1. View toggle on the Meals page
- Add a `groceryView` state (`"kanban" | "list"`) persisted to `localStorage` (`meals.groceryView`).
- Render a pill toggle in the `SectionCard` header area (Kanban / List) using the existing pill style.
- Update the `SectionCard` subtitle based on selected view ("Kanban — drag between categories" vs "List — filter, sort & group").

### 2. Refine `GroceryList.tsx` controls
Reorganize the existing controls into a cleaner, collapsible "View settings" bar so filter / sort / grouping feel intentional rather than crammed:
- Group the three sets of pills into labeled rows: **Filter**, **Sort**, **Group by**.
- Add **"Hide bought"** filter toggle (already-checked items hidden) — a missing affordance for shopping mode parity with Kanban.
- Add **"Pantry / In-stock"** grouping option (third group-by mode) so items auto-tagged by the existing automation surface as their own section.
- Persist `filter`, `sortMode`, `groupBy`, and `hideBought` to `localStorage` under `meals.groceryList.*` so settings survive reloads.
- Keep existing Copy / Export / Saved lists actions; move them to the right side of the controls bar.

### 3. Empty / count states
- Show the active filter+sort summary as small muted text ("Showing 12 of 34 · sorted A–Z · grouped by category") so the user knows what they're looking at.
- Keep existing "No items match this filter" empty state.

## Technical notes

- Files touched:
  - `src/pages/Meals.tsx` — add view toggle + conditional render.
  - `src/components/meals/GroceryList.tsx` — reorganize controls, add `hideBought` and `pantry` grouping, persist settings.
- No DB changes, no new dependencies.
- Pantry grouping reuses `PANTRY_TAG` from `src/lib/automations/engine.ts` (already imported in Kanban).
- All styling uses existing semantic tokens; no new colors.

## Out of scope

- No changes to Kanban behavior.
- No changes to grocery generation, automations, or backend.
