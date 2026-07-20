# Expand filters on the calendar's all-items list

Enhance `src/components/calendar/CalendarAllList.tsx` (the unified list under the calendar grid) with a date-range filter and support for every calendar category — not just tasks & appointments.

## 1. Date-range filter

Add a "Date" filter control (pill group or `Select`) next to the existing Area / Project filters with presets:

- All (default)
- Today
- Tomorrow
- This week (current Sun–Sat / Mon–Sun, matching app's week start)
- Next week
- This month
- Custom… → opens a shadcn `Calendar` in range mode via `Popover`

State persists to `localStorage` (key `calendar-all-daterange`). A row passes when its `date` (ISO `yyyy-MM-dd`) falls inside the resolved range; items without a date are hidden unless "All" is selected. Active non-default filter shows a clear (×) chip.

## 2. Broader category support

Today the list only builds rows from `state.tasks` and `state.appointments`. Extend it to also include the same kinds the calendar grid already surfaces via `KIND_META`:

- **Birthdays** — from `state.people` / loved-ones with `birthday`, projected to current year
- **Meals** — from `state.meals` / planned meals (breakfast/lunch/dinner) per date
- **Cosmic** — moon phases + notable transits from `src/lib/moon-phase.ts` / cosmic sources already feeding the grid
- **Holidays** — from `src/lib/us-holidays.ts` (+ any user list)
- **Celebrations** — from `state.celebrations` (Seasons)
- **Caregiving** — from `state.caregivingEvents` / care check-ins already shown on the calendar

Reuse whichever selectors `CalendarPage` currently uses to render these on the month grid so the list stays in sync with the grid. Each row carries a `kind` matching `KIND_META` and renders its colored dot via `useKindColors`.

Add a **Category filter** (multi-select dropdown, same pattern as sort menu) with all 8 kinds — Tasks, Appointments, Birthdays, Meals, Cosmic, Holidays, Celebrations, Caregiving — defaulting to all on. Persist selection to `localStorage`.

For non-editable kinds (birthdays, holidays, cosmic), the row's Edit/Delete/Reschedule actions are hidden; selection checkbox is disabled so bulk ops still only apply to tasks/appointments.

## 3. Grouping/sorting

Existing group-by and sort controls keep working; new kinds slot into Area/Project groups as "No area / No project" when they lack those fields, and into Date groups normally.

## Technical notes

- New helpers in `CalendarAllList.tsx`: `resolveDateRange(preset, custom)` returning `{start, end}` ISO strings; `buildExtraRows(state)` producing `Row[]` for the six extra kinds.
- Extend `Row.kind` union to the full `KIND_META` key set; add optional `editable: boolean`.
- Row dot color pulled from `useKindColors()[row.kind]` (already imported elsewhere).
- No schema/data changes — pure frontend read of existing store slices.
