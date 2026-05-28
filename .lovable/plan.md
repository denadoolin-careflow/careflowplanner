Add a per-day context strip (lunar phase + zodiac sign, menstrual phase, weather) to every day shown in the Week views, and ensure tasks group into Morning / Afternoon / Evening. Extend the Kanban board with a new "By day" mode that lays the same per-day cards out as columns.

## New shared component

`src/components/calendar/DayContextStrip.tsx`
- Props: `date: Date`, `compact?: boolean`.
- Renders a single horizontal strip with four glyph + label chips:
  - **Moon**: `MoonGlyph` + phase label (uses `getMoonPhase`).
  - **Sign**: zodiac glyph + sign name (from `getRhythmForecast(date).sign`).
  - **Cycle**: dot + phase name (uses `useCycle` + `phaseForDate` / `PHASE_META`, hidden when cycle tracking disabled).
  - **Weather**: condition icon + high/low and precip % (uses `useWeekForecast` for any day in the visible week; falls back to "—" when out of forecast range).
- Click on moon/sign opens the existing `DayLunarSheet` via an `onLunar?: (d: Date) => void` callback.

## Week view changes (`src/pages/Week.tsx` + sub-views)

1. **Schedule (TimeGrid)** — add `DayContextStrip` above each day's column header in `src/components/calendar/TimeGrid.tsx` (compact mode, hides labels under ~sm so it stays readable).
2. **Day parts** — `DayPartsView` already groups by Morning / Afternoon / Evening; insert `DayContextStrip` just below the day title that is rendered in `Week.tsx` around the `<DayPartsView>` map.
3. **Agenda (`AgendaView`)** — two changes:
   - Add `DayContextStrip` inside each day's group header (right under the date row).
   - Replace the flat `<ul>` with three labeled sub-sections (Morning / Afternoon / Evening / All day) using the same `partOf` logic already in `Month.tsx`'s day sheet.

## Kanban changes (`src/components/tasks/KanbanBoard.tsx` + consumers)

1. Add a new `groupBy` option: `"status" | "day"`.
   - `"status"` is the current 5-column layout (no behavior change).
   - `"day"` renders 7 columns for the current week. Each column:
     - **Header**: `EEE M/d` plus `DayContextStrip` (compact).
     - **Body**: three stacked groups labeled Morning / Afternoon / Evening, with a fourth "All day" group when present.
     - Cards = existing `KanbanCard`; bucket by `task.dueDate === iso` and the existing `dayPart` field, or by `partOf(time)` if scheduled via a time block.
     - Drop on a group sets `dueDate` to that ISO and `dayPart` to the matching part.
2. `TaskListPage.tsx` gets a small "Group by · Status / Day" toggle next to the view switcher when `view === "kanban"`. Default stays `status`.

## Files touched

- New: `src/components/calendar/DayContextStrip.tsx`
- Edited: `src/pages/Week.tsx`, `src/components/calendar/TimeGrid.tsx`, `src/components/calendar/AgendaView.tsx`, `src/components/tasks/KanbanBoard.tsx`, `src/pages/TaskListPage.tsx`

## Notes / out of scope

- Weather coverage: limited to whatever `useWeekForecast` returns (typically the current 7-day window). Out-of-range days show "—" rather than a fake value.
- Menstrual phase chip only renders when cycle tracking is enabled in settings — same rule already used in `Month.tsx`.
- No DB or schema changes.
- The existing `WeekRhythmRow` above the week stays as-is; the new strip lives per-day inside the view itself.
