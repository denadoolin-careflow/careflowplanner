# Day-part boards are back, with Trello-style drag and drop everywhere

## What you get

1. **Day board in the planner** — the three-column Morning / Afternoon / Evening layout from your first screenshot returns as a "Board" tab on the Day view: weather card per part, Breakfast / Lunch / Dinner slot, quick-add task, the part's task list, and a Home & Cleaning section, with the Priority sort and Split Home controls.
2. **Week board rebuilt as day rows** — the Week "Board" tab becomes the layout from your second screenshot: one row per day (date, moon phase, sign, weather chips), each with Morning 5 AM–12 PM / Afternoon 12–5 PM / Evening 5 PM–late cards showing count, "+" quick-add, "Nothing planned. Drop a task here." empty state, and the meal slot under each part.
3. **Trello-style dragging** — pick up a card with the mouse (or long-press on touch), a floating ghost follows your pointer, the column or day you're over lifts and highlights with a dashed placeholder, and the card drops in place with a soft haptic and an Undo toast. You can also reorder cards inside a part column.
4. **Drag works across every weekly and monthly view** — Schedule grid, Board, Overview, List, Table, Month calendar, the month Day schedule / Upcoming side panel, and Month overview all accept the same cards. Drag a task from the month calendar onto a week-board part, from the List into the Schedule grid, or from the side panel onto a month day.
5. **Tasks, appointments and meals move** — tasks reschedule (with the existing conflict dialog), appointments move day, meals move day and slot (dropping a meal on Afternoon makes it Lunch). Dropping onto a day that is already very full asks first, as the month view does today.

## Current state confirmed

- `TimeOfDayBoard.tsx` (Today's 3-column board) and `DayPartsView.tsx` (per-day Morning/Afternoon/Evening cards with meals and weather) still exist in the codebase but are not mounted anywhere.
- The current Week "Board" (`PlannerWeekBoard.tsx`) is a column-per-day layout without meals, quick-add, or weather.
- Week Board/List/Table use native HTML5 drag (mouse only) through `useScheduleDrop`; the Month calendar uses its own `useMonthMove` plus a separate long-press touch hook, so month drops skip conflict handling and week drops have no touch support.
- Meals are draggable in the month view but `useScheduleDrop` rejects anything that isn't a task or appointment.
- `@dnd-kit` is already installed (used by the pantry).

## Technical approach

- **One drag engine** — new `src/lib/planner/planner-dnd.tsx`: a `PlannerDndProvider` built on `@dnd-kit/core` (PointerSensor with a small distance threshold for mouse, TouchSensor with 200 ms long-press, KeyboardSensor for accessibility) wrapping the planner content in `Planner.tsx`. `useDraggableCard(item)` and `useDropZone({ dateISO, part?, time?, slot? })` hooks replace the per-view `draggable`/`onDrop` handlers. A `DragOverlay` renders the ghost card; drop zones get `data-drop-active` for the placeholder style. Native HTML5 drag is kept as a fallback so external rails (`UnscheduledTasksRail`, inbox) keep working.
- **One drop handler** — extend `use-schedule-drop.ts`: accept `meal` (update `date` + `slot` from the target part), accept a `time` target for the Schedule grid, add the month capacity check from `month-move.ts` (`dayLoad` ≥ 450 min prompts), and emit an Undo action on every success toast (reverting the prior date/time/slot). `month-move.ts` becomes a thin wrapper so the month calendar and side panel use the same path.
- **Day board** — new `PlannerDayBoard.tsx` adapted from `TimeOfDayBoard.tsx` (feed-based, uses `useDayPartLabels`, `MealSlotCard`, `SlotWeather`, quick-add via `addTask` with `dayPart`), mounted as a new `board` option in `PlannerPeriodTabs` on the Day view.
- **Week board** — rewrite `PlannerWeekBoard.tsx` as stacked day rows adapted from `DayPartsView.tsx` (date header with moon/sign chips from `day-rhythm.ts`, three part cards each a drop zone with capacity bar, `MealSlotCard`), sortable cards inside each part via `@dnd-kit/sortable` with order persisted in a `careflow:planner:board-order:v1` map keyed by `date:part`. Mobile stacks the three parts vertically per day.
- **Wire drop zones into existing views** — `PlannerWeekGrid` (day header = day drop, hour cells = time drop), `PlannerWeekList` (day headers), `PlannerWeekTable` (day rows), `WeekPlanningDashboard` day cards, `PlannerMonthView` day cells, `MonthPlannerPanel` rows and upcoming days, `PlannerMonthOverview` day chips. Draggable cards: week/month items, side-panel rows, `PlannerTaskRow`.
- **Styling** — `src/index.css` additions for `.planner-dnd-ghost`, `.planner-dropzone--active` (dashed outline + lift), and card `grabbing` cursor; uses existing semantic tokens.
- **Verification** — type-check; authenticated Playwright at 1280 px and 390 px covering: day board renders with meals and quick-add; week board rows render; drag task month → week part, list → schedule grid, panel → month day; meal drop changes slot; Undo reverts; touch long-press drag on the week board.

## Out of scope

- Google Calendar events, birthdays, holidays and cosmic items remain read-only (not draggable).
- Recurring-series "this occurrence vs all" choices are not added in this pass.
