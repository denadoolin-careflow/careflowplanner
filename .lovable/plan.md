## Open recipes, quick add to week, day view, side-by-side DnD

Three connected upgrades across `MealsLibrary` and `Meals`.

### 1) Open recipes from the library

**`src/pages/MealsLibrary.tsx`** + new **`src/components/meals/LibraryRecipeViewer.tsx`**
- Card title and image are now clickable → open a read-only `LibraryRecipeViewer` sheet (cover image, slot/prep/cook/servings/energy/rating chips, ingredients list, numbered steps, tags, notes).
- Footer actions inside the viewer: **Edit**, **Duplicate**, **Add to this week** (opens the same picker described in #2), **Favorite/Unfavorite**, **Archive/Unarchive**.
- Pencil button still opens the existing editor; double-click on title also opens viewer.

### 2) Quick add to weekly slots

**`src/components/meals/AddToWeekDialog.tsx`** (new) + **`src/lib/meals-library.ts`** (small helper)
- Multi-select on library cards: hovering a card reveals a checkbox; once 1+ selected, a sticky action bar slides in at the bottom (`framer-motion`) with: count, **Clear**, **Add to week**.
- **Add to week** opens a compact dialog:
  - **Week**: this week / next week (dropdown).
  - **Days**: 7 day chips (multi-select; defaults to today's day).
  - **Slot**: respects each meal's saved `slot`; meals without a slot get a single picker (Breakfast / Lunch / Dinner / Snack).
  - **Mode**: *Replace existing* | *Only fill empty slots*.
  - **Add groceries** toggle (default ON) — pushes ingredients into `grocery_items` like AI plan does, with `source_meal_*` linkage.
- Inserts directly via `supabase.from("meals").insert(...)`. Toasts `Added N meals` and links to `/meals`.
- Same dialog is reused from the recipe viewer (single-meal mode).

### 3) Day view + side-by-side DnD on `Meals.tsx`

**`src/pages/Meals.tsx`** + new **`src/components/meals/LibrarySidebar.tsx`**

**View toggle** (segmented control near the page header):
- **Week** — current 7-day grid (unchanged).
- **Day** — single day, vertical list of the 4 slots as larger cards with full meal details inline; prev/next day arrows + date pill.
- **2-day** — two adjacent days side by side (today + next, with ◀ ▶ to shift the pair). Drop targets accept DnD between the two days for easy comparison and rearrangement.

State persisted to `localStorage` (`meals.viewMode`, `meals.focusedDate`).

**Library sidebar** (drawer, available in all view modes):
- Toggle button "📚 Library" in header opens a right-side `Sheet` listing favorite + recent library meals (image thumbnail, title, slot chip).
- Each row is a `useDraggable` source with `data: { libraryMealId }`.
- `Meals.tsx`'s existing `DndContext.onDragEnd` is extended: if `active.data.libraryMealId` is set and `over` is a slot droppable, insert a new `meals` row from that library meal (copies title, prep_minutes, ingredients, steps, tags). Existing meal-to-slot drag still works.
- The sidebar stays open while dragging, so users can drop multiple meals into the grid in sequence.

### Files
- **New**: `src/components/meals/LibraryRecipeViewer.tsx`, `src/components/meals/AddToWeekDialog.tsx`, `src/components/meals/LibrarySidebar.tsx`.
- **Edited**: `src/pages/MealsLibrary.tsx` (selection, viewer, add-to-week button), `src/pages/Meals.tsx` (view modes, library sidebar trigger, extended `onDragEnd`), `src/lib/meals-library.ts` (small `addLibraryMealToSlot` helper used by sidebar + dialog).

### Notes
- No DB migration needed — uses existing `meals_library`, `meals`, `grocery_items` tables.
- All visuals stay on-brand: dark plum cards, gold accents on selection bar and CTA, rounded-2xl, soft motion.
- Keyboard: `Esc` clears selection; arrow keys ←/→ in day/2-day view shift the focused date.