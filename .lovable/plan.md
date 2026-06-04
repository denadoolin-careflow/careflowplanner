## Today page upgrade

A focused pass over `src/pages/Today.tsx`, the rhythm components, and the right sidebar to add the requested widgets, restore Exhale, and tighten existing UI.

### 1. Shrink "Do One Thing"
- In `src/components/today/rhythm/WhatFitsNow.tsx`, downsize the CTA from a full-height stacked button to a compact pill (icon + label on one line, smaller padding, `text-xs`). Keep behavior unchanged.

### 2. Per-slot "Add a task"
- In `src/components/today/rhythm/RhythmSection.tsx` Tasks column, add an inline `+ Add a task` row under the list. Submitting creates a task with `dueDate = current day` and `dayPart = Morning/Afternoon/Evening` so it lands in the same slot. Works for all three slots.

### 3. Clock + weather in the Today header
- Update `src/components/today/rhythm/RhythmHeader.tsx` to render a small live clock (HH:MM, auto-updating each minute) and a compact weather chip (temp + icon from the existing `useEnsureWeather` data) next to the date.
- Remove the standalone "Show/Hide weather" toggle from `Today.tsx` since weather is now always visible in the header; per-slot weather (`SlotWeather`) stays controlled by its existing prop, defaulted on.

### 4. Bring back End-of-Day Exhale
- Re-mount `ExhaleFlow` (already in `src/components/today/ExhaleFlow.tsx`) at the bottom of the main column, after `EndOfDayCard`, wrapped in a collapsible "End of day exhale" card so it doesn't dominate the page.

### 5. Cycle + moon on the Today card
- In `RhythmHeader.tsx`, add a small badge row showing today's moon phase (from `src/lib/moon.ts` / `lunar-phases.ts`) and current cycle day/phase (from `src/lib/cycle.ts` + `cycle-store`). Hidden gracefully if cycle tracking is off.

### 6. Top 3 tasks
- Re-mount `src/components/today/TopThreeStrip.tsx` directly under `RhythmHeader` in the main column so the user's pinned top 3 are always at eye level.

### 7. Right sidebar — new widget stack
Reorder `aside` in `Today.tsx` to: Clock/Weather summary (compact mirror is in header, so sidebar starts with Tasks) → Tasks → Meals Planned → Grocery → Notes → Journal → Memories → Family/Cycle cards → Home Reset.

New widgets to add (each a small `cozy-card` with a header, today-scoped content, quick-add input, and a "View all" link to the full page):

- **HomeResetWidget** (`src/components/today/widgets/HomeResetWidget.tsx`): pulls current Home Reset checklist progress from `HomeReset` data, shows next 3 unchecked items with checkboxes, link to `/reset` (or `/home-reset`).
- **MealsPlannedWidget** (`src/components/today/widgets/MealsPlannedWidget.tsx`): three rows (Breakfast / Lunch / Dinner) for today's date from `state.meals`; each shows the planned meal name or an inline "Add" input that opens `MealSlotCard` quick-pick. Link to `/meals`.
- **GroceryWidget** (`src/components/today/widgets/GroceryWidget.tsx`): renders the current active grocery list from `src/lib/grocery-lists.ts`, top ~6 items with checkbox toggle and inline add. Link to `/meals` grocery view.
- **NotesTodayWidget**, **JournalTodayWidget**, **MemoriesTodayWidget** (`src/components/today/widgets/*.tsx`): each lists today's entries (filter by `createdAt`/`date === today`), inline-editable title, `+ New` quick-add row, tap to open the corresponding detail page (`/notes`, `/journal`, `/memories`).

All widgets are editable in place (optimistic updates via existing store/hooks) and link to their source page.

### Technical notes

- New files live under `src/components/today/widgets/`. No new routes, no schema changes.
- Reuse existing store and hooks: `useStore` (tasks, meals), `useRoutines`, `src/lib/grocery-lists.ts`, notes/journal/memories hooks already used by their pages.
- Clock uses a `useEffect` interval set to `60_000` ms with cleanup; no extra deps.
- Moon/cycle badges read from existing helpers; nothing new in `src/lib`.
- `Today.tsx` stays the single layout source; widget rendering is conditional on data availability so empty states stay calm.
- Mobile: each widget keeps `min-w-0 max-w-full`; sidebar still stacks below the main column under `md`.

### File touch list

- `src/pages/Today.tsx` — sidebar reorder, mount new widgets, drop weather toggle, add TopThree + Exhale.
- `src/components/today/rhythm/RhythmHeader.tsx` — clock, weather chip, moon + cycle badges.
- `src/components/today/rhythm/RhythmSection.tsx` — per-slot add task form.
- `src/components/today/rhythm/WhatFitsNow.tsx` — smaller Do One Thing button.
- `src/components/today/widgets/HomeResetWidget.tsx` (new)
- `src/components/today/widgets/MealsPlannedWidget.tsx` (new)
- `src/components/today/widgets/GroceryWidget.tsx` (new)
- `src/components/today/widgets/NotesTodayWidget.tsx` (new)
- `src/components/today/widgets/JournalTodayWidget.tsx` (new)
- `src/components/today/widgets/MemoriesTodayWidget.tsx` (new)

### Verification
After implementation, load `/today` at 390px and desktop, verify each new widget renders, quick-add works for tasks/notes/journal/memories/grocery, clock ticks, weather chip shows, moon + cycle render when data present, and Exhale opens at end of day.
