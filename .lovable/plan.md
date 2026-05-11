## Drag-to-calendar from Library + Day Themes

Two additions, both on top of the existing Meals planner and Library.

### 1) Drag library recipes onto a specific calendar date

Today the library sidebar (`LibrarySidebar.tsx`) only drops onto the existing week/day grid slots in `Meals.tsx`. We will add a **calendar drop surface** so users can target any future date directly — same Replace / Add-to-grocery options as the popover.

**New component**: `src/components/meals/CalendarDropPanel.tsx`
- Mini month calendar (reuse `Calendar` from `ui/calendar.tsx`, single-month, navigable).
- Each day cell becomes a `useDroppable` zone with id `cal-day-{YYYY-MM-DD}`.
- Below the calendar: a row of 4 slot droppables — Breakfast / Lunch / Dinner / Snack — labeled "Drop on slot for {selected date}".
- Persistent options (saved to `localStorage`):
  - `Replace if taken` toggle
  - `Add to grocery list` toggle (default on)
- When a library row is dropped on a day cell → use the recipe's saved `slot` (fallback Dinner) for that date.
- When dropped on a slot chip → use the currently selected day + that slot.
- Visual feedback: hovered day gets gold ring; dropping flashes a confirmation toast with Undo.

**Changes in `src/pages/Meals.tsx`**
- Mount `<CalendarDropPanel/>` inside the existing `LibrarySidebar` Sheet (compact, collapsible "Drop on a date" section above the recipe list) so the same drag gesture works for both grid slots and the calendar.
- Extend `onDragEnd`:
  - If `over.id` starts with `cal-day-` → call `addLibraryMealsToWeek([lib], [{date, slot: lib.slot ?? "Dinner"}], { mode, addGroceries })`.
  - If `over.id` starts with `cal-slot-` → use selected date + that slot.
- Reuse the existing snapshot/Undo toast pattern already used for slot replacement.

### 2) Day themes (Taco Tuesday, Meat Monday…)

Themes are reusable "tags" the user assigns to a weekday and to recipes; the planner can fill that day from the matching pool.

**DB migration** (one new table)
```text
meal_themes
  id uuid pk
  user_id uuid (RLS: own only)
  name text                  e.g. "Taco Tuesday"
  emoji text nullable        🌮
  color text nullable        hsl token name
  weekday int nullable       0–6, optional auto-suggest
  meal_ids uuid[]            references meals_library.id (array, app-managed)
  notes text nullable
  sort_order int default 0
  created_at, updated_at
```
RLS: standard `auth.uid() = user_id` ALL policy. No FK to `meals_library` (array of ids managed in app).

**New library/helpers**: `src/lib/meal-themes.ts`
- `useMealThemes()` hook (list/create/update/remove/reorder).
- `addThemeToDay(themeId, date, opts)` — picks a recipe from the theme's pool (random or round-robin), inserts into `meals` for the chosen slot, optional `addGroceries`.
- `addThemeToWeek(themeId, weekStart, opts)` — applies to its `weekday` (or asks).

**New UI**:
1. `src/components/meals/ThemesManager.tsx` — modal/sheet to CRUD themes:
   - Name, emoji, color swatch, optional weekday pin, default slot.
   - Multi-select recipes from the user's `meals_library` (search + checkbox grid). Shows selected count.
2. `src/components/meals/ThemeChip.tsx` — small draggable chip used in:
   - The new "Themes" rail at the top of `LibrarySidebar` (horizontal scroll of chips).
   - A "Themes" row above the planner header with quick "Apply to this week" buttons.
3. `MealsLibrary.tsx`:
   - New "Themes" button in the header opens `ThemesManager`.
   - Per-recipe action menu gains "Add to theme…" → choose existing or create.

**Planner integration in `Meals.tsx`**
- Theme chips are also `useDraggable` with `data: { themeId }`.
- `onDragEnd` handles `themeId` drops onto:
  - a slot in the grid → pick a recipe from the pool, insert there.
  - a `cal-day-*` cell from the new calendar panel → same.
- Right-click / "..." on a planner day shows "Apply theme → …".
- When the focused date's weekday matches a theme's `weekday`, show a subtle "🌮 Taco Tuesday — Apply" suggestion banner with one-click apply.

### Files
- **New**: `src/components/meals/CalendarDropPanel.tsx`, `src/components/meals/ThemesManager.tsx`, `src/components/meals/ThemeChip.tsx`, `src/lib/meal-themes.ts`, migration for `meal_themes`.
- **Edited**: `src/components/meals/LibrarySidebar.tsx` (mount calendar panel + themes rail), `src/pages/Meals.tsx` (extend `onDragEnd`, theme suggestion banner), `src/pages/MealsLibrary.tsx` ("Themes" button + per-card "Add to theme").

### Notes
- No change to `meals` schema — themes only insert into existing `meals` rows.
- Same `addLibraryMealsToWeek` reused for calendar drops to keep replace/grocery logic in one place.
- Toasts keep the existing Undo pattern from drag-replace.
- Empty themes are blocked from being applied (toast prompts adding recipes first).