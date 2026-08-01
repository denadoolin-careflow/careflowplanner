# Delete the v2 prototypes

Confirmed by search: nothing outside the prototypes themselves links to them, apart from the routes and one "Try v2" button.

## What gets deleted
- `src/components/calendar-v2/` (11 files)
- `src/lib/calendar-v2/recovery.ts` (and the now-empty `src/lib/calendar-v2/` folder)
- `src/pages/CalendarV2.tsx`
- `src/pages/TodayV2.tsx`

## Wiring to clean up
- `src/App.tsx`: remove the `CalendarV2` and `TodayV2` imports and the `/calendar-v2` and `/today-v2` routes.
- `src/pages/Today.tsx`: remove the "Try v2" link pointing at `/today-v2`.
- `src/lib/dashboard-layouts.ts`: drop `"today-v2"` from `PAGE_KEYS` and remove its default layout block.

## Kept (not part of the prototypes)
- `src/components/today-v2/widgets.tsx` — still imported by the live `WidgetRegistry`, so it stays, along with the `tasks-today-v2` widget type.
- Everything in `src/components/calendar/` — that is the production calendar used by `/calendar`, `/week`, and `/plan/:date`.

## Notes
Any saved dashboard layout rows named `today-v2::*` become inert; no migration needed and no other page reads them. A typecheck after the deletions confirms no dangling imports.