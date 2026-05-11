## Meals & Grocery Upgrade Plan

The Meals page already has a "Reset Meal Plan" button with confirmation + optional regenerate — that requirement is already complete and will be left as-is. Everything else below is new.

### 1. Database changes (single migration)

- `meals_library` table — the reusable meals database, separate from the planned `meals` table:
  - `title`, `description`, `slot` (nullable), `prep_minutes`, `cook_minutes`, `servings`, `ingredients` (jsonb), `steps` (jsonb), `tags` (text[]), `notes`, `image_url`, `icon`, `color`, `energy_level` (low/medium/high), `family_rating` (1–5), `is_favorite`, `is_archived`, `sort_order`
  - RLS: `auth.uid() = user_id`
- Extend `pantry_items`: add `stock_status` (`in_stock` | `low` | `out`), `notes`, `qty`
- Extend `grocery_items`: add `sort_order`, `notes` (for kanban ordering + ingredient notes)
- New `grocery_categories` table for user-defined kanban columns: `name`, `color`, `sort_order`, `is_default`
- New `user_pantry_colors` table (1 row per user) for custom status colors: `in_stock_color`, `low_color`, `out_color` (HSL strings)

### 2. Meals page — inline editing + dropdown picker + DnD

`src/pages/Meals.tsx` + new components:

- New `MealCell.tsx`: replaces the current button/prompt slot. Shows meal name with hover glow. Click → inline `Input` (autofocus, Enter saves, Esc cancels). Empty cell shows soft "+" placeholder.
- New `MealPickerPopover.tsx`: small chevron next to each cell opens a popover with:
  - Search input
  - Tabs: Favorites · Recent · Library · Quick (≤15m) · Low-energy · Kid-friendly
  - Items pulled from `meals_library` + `favorite_meals` + recent `meals`
  - Footer actions: Create new · Duplicate · Save as favorite
- Drag & drop using `@dnd-kit/core` (already installed): meals draggable between any (day, slot) cell. On drop → update `date` + `slot`.
- Smooth motion via existing `framer-motion`.

### 3. Meals Database page

- New route `/meals/library` → `src/pages/MealsLibrary.tsx`
- Add nav entry in `src/lib/nav.ts` + sidebar
- Filters bar: search, slot chips (Breakfast/Lunch/Dinner/Snack), tag chips (Freezer · Low-energy · Sensory-safe · Quick), favorite toggle, archived toggle
- View toggle: Cards (responsive grid) ↔ Table
- Card: image placeholder (color/icon), title, prep/cook time, rating stars, tags, hover elevation
- Row actions: Edit · Duplicate · Archive · Favorite
- New `MealLibraryEditor.tsx` drawer (reuses `RecipeEditor` styling) for full CRUD

### 4. Kanban Grocery List

- Rewrite `src/components/meals/GroceryList.tsx` into a horizontally-scrollable kanban:
  - Columns from `grocery_categories` (seed defaults: Produce, Dairy, Frozen, Pantry, Meat, Snacks, Household)
  - Collapsible columns, custom column color, "+ Add category"
  - DnD between columns updates `category`; within column updates `sort_order`
  - Inline rename of items, check-off with Framer Motion strike + scale
  - Progress bar per column + overall
  - "Shopping mode" toggle: hides bought, larger touch targets

### 5. Ingredient popup + pantry status

- New `IngredientPopover.tsx`: triggered from ingredient text in `RecipeDrawer`, grocery items, and library cards
- Shows: linked meals (query `meals` + `meals_library` for matching ingredient), qty, notes, category select, pantry status segmented control (In Stock · Low · Out) with color dots
- Status changes upsert into `pantry_items` immediately
- Add a reset button to remove all ingredients from grocery list

### 6. Custom status colors

- New section in `src/pages/Settings.tsx`: 3 color pickers for In Stock / Low / Out (HSL via simple swatch + hex input)
- Persist to `user_pantry_colors`; expose via `usePantryColors()` hook
- Apply via CSS vars `--pantry-in-stock` / `--pantry-low` / `--pantry-out` set on `<body>` so all pill badges/dots theme automatically (light + dark)

### 7. AI suggestions

- Extend existing `ai-meal-plan` edge function to accept `mode`: `use_pantry` | `low_budget` | `sensory_safe` | `low_energy`. Each tweaks the prompt; reuses existing tool schema.
- Add a "Suggest" dropdown next to "Plan my week" with the four options.

### 8. Empty states + polish

- Replace empty grocery/meal areas with `EmptyState` lines:
  - "Nothing planned yet."
  - "Drag meals here when ready."
  - "Your future self will thank you."
- Hover glow utility class (gold accent), shadow elevation on cards, Framer Motion on drag/check/save.

### Files

**New:** `src/pages/MealsLibrary.tsx`, `src/components/meals/MealCell.tsx`, `src/components/meals/MealPickerPopover.tsx`, `src/components/meals/MealLibraryEditor.tsx`, `src/components/meals/IngredientPopover.tsx`, `src/components/meals/GroceryKanban.tsx`, `src/components/settings/PantryColorPicker.tsx`, `src/lib/meals-library.ts`, `src/lib/grocery-categories.ts`, `src/lib/pantry-colors.ts`

**Edited:** `src/pages/Meals.tsx`, `src/pages/Settings.tsx`, `src/components/meals/GroceryList.tsx` (replaced by kanban), `src/components/meals/RecipeDrawer.tsx` (ingredient popovers), `src/lib/nav.ts`, `src/App.tsx` (route), `supabase/functions/ai-meal-plan/index.ts`

### Design

Stays on dark plum gradients + warm gold accents + rounded cozy cards using existing semantic tokens. No raw colors.

Approve to proceed with the migration + implementation.