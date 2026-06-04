## Goals
1. On the Today view, let each planned meal expand inline to an editable ingredient checklist; tapping the meal name opens the existing recipe detail drawer.
2. Make the hourly weather tiles in each slot's `SlotWeather` card large enough to fill the widget area evenly (no horizontal scroll on the standard mobile width).
3. Restore the original full Weather widget and weekly weather strip to the Today sidebar, plus a combined Moon + Top‑3 priorities sidebar widget.

## Changes

### 1. Meals widget — inline ingredient checklist + detail link
File: `src/components/today/widgets/MealsPlannedWidget.tsx`
- Add per-slot `expanded` state. Add a chevron toggle on each filled meal row to expand/collapse an ingredient checklist beneath it.
- Render `meal.ingredients` (array of strings) as a list of `<Checkbox>` rows. Local per-meal "checked" state is stored in `localStorage` under `careflow:meal-ingredients:<mealId>` so checks persist for the day; reset key includes the meal date so a new day starts fresh.
- Inline editing: each ingredient row is an editable text input (commit on blur / Enter). A small "+ Add ingredient" row appends new items. Save via `updateMeal(id, { ingredients: [...] })`.
- Tapping the meal title (existing inline input) currently edits the name; change behavior so:
  - The meal title becomes a button that opens `RecipeDrawer` (sets `quickMeal`).
  - A small "edit" pencil icon allows renaming inline (keeps existing rename flow).
- The existing `BookOpen` button stays for quick access; remove only if redundant — keep for consistency.

### 2. Hourly weather tiles — fill widget width
File: `src/components/today/rhythm/SlotWeather.tsx`
- Replace the horizontal-scroll `flex gap-1 overflow-x-auto` strip with a `grid` whose column count equals `slotHours.length` (e.g. `style={{ gridTemplateColumns: 'repeat(N, minmax(0, 1fr))' }}`). Tiles stretch to fill the card width.
- Bump tile padding (`px-2 py-1.5`) and text sizes one notch (`text-[11px]`, icon `h-4 w-4`) so the larger area reads cleanly.
- Keep the "no rain expected" footer.

### 3. Sidebar widgets — restore weather + add moon/priorities combo
Files:
- New: `src/components/today/widgets/WeatherSidebarCard.tsx` — wraps `<WeatherWidget compact />` in the standard `cozy-card` shell with a "Weather" header.
- New: `src/components/today/widgets/WeeklyWeatherCard.tsx` — wraps the existing `WeeklyWeather` component.
- New: `src/components/today/widgets/MoonPrioritiesCard.tsx` — single card containing:
  - `MoonPhaseWidget` (full version) at the top.
  - A "Top 3 today" section that reuses the same `pickTopThree` logic from `TopThreeStrip` (extract to `src/lib/top-three.ts` so both files import it) and renders 3 checkbox rows. Toggling a checkbox calls `toggleTask` and plays the existing completion chime/haptic (mirroring `TasksTodayWidget`).
- Edit `src/pages/Today.tsx`:
  - Add the three new widgets to `widgetRegistry`:
    - `weather` → `<WeatherSidebarCard />`
    - `weekly-weather` → `<WeeklyWeatherCard />`
    - `moon-priorities` → `<MoonPrioritiesCard date={day} onTaskClick={setEditTaskId} />`
  - Remove the standalone `moon-phase` entry (replaced by combined card). Cycle card stays.
  - Default order: insert `weather`, `weekly-weather`, `moon-priorities` near the top of the sidebar.

### Notes
- All changes stay frontend/presentation only. No DB schema or RLS work.
- Existing `useSidebarOrder` will pick up the new IDs automatically (its registry is canonical-based).
- Completion sound/visual + haptics use existing helpers (`playCompletionChime`, `haptics.success`, completion-visual settings) — no new infra.
