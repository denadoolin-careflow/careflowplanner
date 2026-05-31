## Goal

Make the pantry drag-and-drop feel like a real kanban board (Things 3 / Linear class) and bring drag to the List view too. Four improvements: feel & polish, reorder within a column, multi-select drag, and category-drag in the List view.

## 1. Feel & polish (Kanban)

`src/components/meals/PantryKanban.tsx`

- Add proper `@dnd-kit/core` **sensors** with activation constraints:
  - PointerSensor: `activationConstraint: { distance: 6 }` so a 6px move starts the drag (clicks on trash/Shop pass through cleanly).
  - TouchSensor: `activationConstraint: { delay: 200, tolerance: 8 }` — long-press to drag on mobile.
  - KeyboardSensor with `sortableKeyboardCoordinates` for accessibility.
- Add a **`DragOverlay`** that renders a floating, tilted clone of the dragged card (`rotate-2`, `shadow-2xl`, semi-transparent ring in the column's status color). The source card becomes a soft placeholder (`opacity-30`, dashed border) instead of disappearing.
- **Column drop affordance**: when `isOver`, elevate with `ring-2 ring-[status-color]/40`, `bg-[status]/8`, and a pulsing dashed "Drop here" hint that replaces the static "Drag items here" text only while a drag is in progress.
- **Card lift**: on `isDragging`, scale to 1.02 and apply a `cursor-grabbing` body class (via `useDndMonitor`) so the cursor reads correctly across the whole document.
- **Drag handle vs. action buttons**: stop the whole row from being the drag handle. Add a small `GripVertical` handle on the left of each card (visible on hover / always on touch); only the handle gets `attributes`/`listeners`. Trash + ShopMenu become reliably clickable.
- **Haptics**: call `navigator.vibrate?.(8)` on drag-start and `(12)` on a successful drop (mobile only).
- **Optimistic + rollback**: keep the optimistic state update but on Supabase error, revert and `toast.error("Could not move — reverted")`.
- Replace the green check toast with a subtle inline status-color toast (`toast.success` with the column's accent in the description), and debounce repeated drops within 600 ms so multi-drops don't spam.

## 2. Reorder within a column

- Schema: add a `sort_order integer` column to `pantry_items` (default `0`, indexed by `(user_id, stock_status, sort_order)`). Backfill existing rows with `row_number() over (partition by user_id, stock_status order by name)`.
- Wrap each column's list in `SortableContext` (`verticalListSortingStrategy`) and swap `useDraggable` for `useSortable`.
- On `onDragEnd`:
  - Same-column drop → `arrayMove`, then bulk-update `sort_order` for the affected column (single RPC `update_pantry_order(ids uuid[])` or a batched `upsert`).
  - Cross-column drop → set `stock_status` + append to the end of the target column (max `sort_order` + 1) and re-pack the source column's `sort_order`.
- Load order now uses `.order('sort_order', { ascending: true }).order('name')` as a tiebreaker.

## 3. Multi-select drag

- Local state: `selectedIds: Set<string>`. Toggle with Cmd/Ctrl+click, range with Shift+click (within a column). Clicking elsewhere or pressing Esc clears the selection.
- Visual: selected cards show a `ring-2 ring-primary/60` and a small count badge.
- During drag, if the active id is in `selectedIds`, the `DragOverlay` renders a **stacked card preview** ("3 items") and `onDragEnd` moves the whole set in one Supabase `update ... in (ids)` call.
- If the active id is not in the selection, the selection is ignored for that drag (no surprise multi-moves).

## 4. DnD in List view (`PantryPanel`)

- Wrap the categories in a single `DndContext`. Each `<section>` becomes a droppable keyed by category; each `<li>` becomes a `useSortable` item.
- Cross-section drop calls `updatePantryCategory(it.id, targetCategory)` (already exists). Same-section drop reorders — requires the same `sort_order` column from step 2 (scoped per category in this view, per status in the kanban view; both use the same column, sort context is just `(user_id, scope_field, sort_order)`).
- Use the same sensors, handle, overlay, and haptics as kanban for consistency.
- Show an inline "Drop to move to **{category}**" caption on the hovered section header during drag.

## Technical details

```text
Files
├─ src/components/meals/PantryKanban.tsx     (rewrite DnD: sensors, sortable, overlay, handle, multi-select)
├─ src/components/meals/PantryPanel.tsx      (add DndContext + sortable list, drag handle)
├─ src/components/meals/DragOverlayCard.tsx  (new — shared floating card preview)
├─ src/lib/meal-ai.ts                        (add reorderPantry(ids, scope) + bulkSetStatus)
└─ supabase migration                        (add sort_order column + backfill + composite index)
```

Libraries already installed: `@dnd-kit/core`, plus `@dnd-kit/sortable` (will be added) and `@dnd-kit/utilities`.

## Out of scope

- No realtime sync of kanban order across devices (still loads on mount).
- No drag-to-grocery-list bridge (separate request).
- No bulk delete or bulk status changes outside the multi-select drag flow.
