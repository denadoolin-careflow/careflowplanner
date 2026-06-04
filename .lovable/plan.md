# Today page upgrades — header conditions, scheduled tasks, person filter, meal quick view

Four focused additions, each isolated to a small set of files.

## 1. Show conditions text in the static header

`HeaderNowStrip` already pulls `WeatherSnapshot.conditionLabel` but only exposes it via the button `title`. Add a visible label next to the temp pill (e.g. "72° · Partly cloudy") on `md:` and up; keep the existing icon + temp combo on smaller screens.

- Edit `src/components/layout/HeaderNowStrip.tsx:47-61` to render `snap.conditionLabel` in a sibling `<span>` with `hidden lg:inline text-sidebar-foreground/70`.
- Keep tooltip + location label unchanged.

## 2. "Scheduled today" panel on the right of the Today page

New widget `ScheduledTodayWidget` mounted as the first child in the Today aside (`src/pages/Today.tsx:117`, above `TasksWidget`).

- Source: `useStore()` tasks where `t.dueDate === todayISO && !!t.startTime && !t.completedAt`, sorted by `startTime` (string compare is fine — all "HH:MM" 24h).
- Render: ordered list of rows with `startTime` chip, title, optional `endTime`, area dot. Empty state: "Nothing scheduled · drag a task to a time."
- Click row → `openTaskEditor(task.id)` (reuse `src/lib/open-task-editor.ts`).
- File: `src/components/today/widgets/ScheduledTodayWidget.tsx` (new).
- Mount: insert before `<TasksWidget />` in `Today.tsx`.

No data-model changes; uses existing `Task.startTime`/`endTime`/`dueDate`.

## 3. Per-person routine dropdown per reset section

`RhythmSection` already reads `PERSON_KEY` from localStorage but has no UI to change it. Add a `<Select>` in each section's Routines column header.

- Edit `src/components/today/rhythm/RhythmSection.tsx:263-273` (routine column header).
- Use `routines.people()` for options + an "All people" option (empty string).
- Local state: `const [person, setPerson] = useState(readPerson())`. On change, write to `localStorage` and `setPerson(next)`.
- Also dispatch a `window` event (`careflow:routine-person-changed`) so the other two `RhythmSection` instances (morning/afternoon/evening) update without a manual refresh — subscribe via a small `usePersonFilter()` hook colocated in `RhythmSection.tsx`.
- Routine list filter stays driven by the same `person` value already used downstream.

Selection persists across reloads via the existing localStorage key. No schema work.

## 4. Meal quick view with ingredients per timeframe

For each meal slot in `RhythmSection`'s meal column, show the ingredient preview (already partially there) and add a "Recipe" trigger that opens the existing `RecipeDrawer`.

- Edit `src/components/today/rhythm/RhythmSection.tsx:236-260` (meal column).
- Keep the existing `meal.ingredients.slice(0,3)` preview; add "+N more" when longer.
- Add a button (icon + "Recipe") next to the meal name that sets `quickMeal` state and opens `<RecipeDrawer meal={quickMeal} onClose={() => setQuickMeal(null)} onChanged={() => {}} />` mounted once per `RhythmSection`.
- Also do the same in `MealsPlannedWidget` so the sidebar widget can open the drawer.
- Guard: only show the Recipe button when `meal.ingredients?.length > 0 || meal.steps?.length > 0` (otherwise the drawer is empty).
- Reuse `RecipeDrawer` as-is — no changes needed there.

## Out of scope

- No new tables, edge functions, or store changes.
- No fuzzy match to `LibraryMeal` (no `library_id` exists; `RecipeDrawer` works directly off the `Meal` copy).
- No changes to `TasksWidget` behavior (the new widget is additive).
- No global person store — stays in localStorage + a window event for cross-section sync.

## Files

- edit: `src/components/layout/HeaderNowStrip.tsx`
- edit: `src/pages/Today.tsx`
- edit: `src/components/today/rhythm/RhythmSection.tsx`
- edit: `src/components/today/widgets/MealsPlannedWidget.tsx`
- new:  `src/components/today/widgets/ScheduledTodayWidget.tsx`

## Acceptance

- Header shows "72° · Partly cloudy · City" on desktop; condition icon stays on narrow screens.
- A "Scheduled today" card sits at the top of the Today right column listing timed tasks in chronological order.
- Each reset section's Routines column has a person picker; choosing a person filters that section immediately and the other two sections follow on next render.
- Each meal slot shows ingredients preview and a Recipe button that opens the existing drawer; same in the sidebar Meals widget.
