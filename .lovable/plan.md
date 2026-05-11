## AI-Generated Meals for Library

Add an "AI Generate" button to the Meals Library page that creates new recipes (with AI-generated cover images) and saves them directly to the library.

### UI changes — `src/pages/MealsLibrary.tsx`
- Add a gold-accented **"✨ AI Generate"** button in the header next to "New recipe".
- Opens a small dialog (`AIGenerateMealsDialog.tsx`):
  - **Count**: 1 / 3 / 5 / 10 recipes
  - **Slot**: Any / Breakfast / Lunch / Dinner / Snack
  - **Vibe / prompt** (optional textarea): e.g. "freezer-friendly low-energy dinners"
  - **Tags toggles**: low-energy, sensory-safe, kid-friendly, quick, freezer
  - **Generate images** toggle (default ON)
  - Honors existing `meal_preferences` (diets, allergies, family size) automatically.
- Shows progress while running ("Cooking up 5 recipes…", then "Painting 5 plates…"), then refreshes the library and toasts success.

### New edge function — `supabase/functions/ai-library-meals/index.ts`
- Auth-validated (Bearer token → `getUser`).
- Loads the user's `meal_preferences`.
- Calls Lovable AI gateway (`google/gemini-3-flash-preview`) with a `return_library_meals` tool returning an array of recipes: `title, description, slot, prep_minutes, cook_minutes, servings, ingredients[], steps[], tags[], energy_level, icon` (single emoji).
- For each meal, if `with_images` is true:
  - Calls `google/gemini-2.5-flash-image` with a cozy food-photography prompt built from the title + description.
  - Extracts the base64 PNG and uploads to a new public Storage bucket `meal-images` at `{user_id}/{uuid}.png`.
  - Stores the public URL on `meals_library.image_url`.
- Inserts all rows into `meals_library` via service-role client and returns `{ created, failed }`.

### Storage / DB — single migration
- Create public bucket `meal-images` with RLS:
  - Public `SELECT` on objects where `bucket_id = 'meal-images'`.
  - Authenticated users can `INSERT/UPDATE/DELETE` only inside their own `{auth.uid()}/…` folder.
- (No table changes — `meals_library.image_url` already exists.)

### Card rendering tweak — `MealsLibrary.tsx`
- If `image_url` is set, render it inside the existing `h-20` thumbnail (object-cover, rounded) instead of the emoji fallback. Emoji stays as fallback.

### Files
- **New**: `src/components/meals/AIGenerateMealsDialog.tsx`, `supabase/functions/ai-library-meals/index.ts`, migration for `meal-images` bucket + policies.
- **Edited**: `src/pages/MealsLibrary.tsx` (button, image rendering).

### Notes
- Uses Lovable AI (no extra keys needed); surfaces 429 / 402 errors as toasts.
- Image generation runs sequentially per meal to avoid rate-limit spikes; the dialog stays open with a progress bar.
- Generated meals default to `is_favorite: false`, `is_archived: false`, and current max `sort_order + 1`.