# Mobile planner cleanup (day, week, month, year)

I loaded the planner at a 390px phone viewport, signed in, and captured all four ranges. Below is what's actually broken and how I'd fix it — layout and interaction only, no data or business-logic changes.

## What I found

**1. The desktop header leaks onto phones.** On two of four loads the planner rendered the full desktop chrome at 390px: the greeting block, the big "PLANNER / Monday, August 17" title, and three rows of toolbar buttons (view pills, date stepper, Grid/Schedule/Time of day, Tray, panel toggles, keyboard-shortcuts button). The mobile branch only wins after `useIsMobile` resolves, so the first paint is the desktop layout and the switch is visible. Several of those controls run off the right edge and are unreachable.

**2. Greeting text collapses to one word per line.** In that desktop-on-mobile state "Good evening / Let's create a day that aligns with your rhythm." renders in a ~60px column beside the stat cards, eating roughly 400px of vertical space before any planner content appears.

**3. Week grid is unusable at phone width.** Seven columns inside 390px gives ~44px per day. Day headers overlap ("Sagittarius" spills across neighbouring columns), moon/phase text stacks into slivers, and event blocks have no room for a title.

**4. Month calendar is a very long scroll.** Cells are `min-h-[132px]`, so six rows are ~800px tall, and each chip is squeezed to an icon plus a truncated glyph — you can see there's *something* on a day but not what.

**5. Year view wastes the screen.** One mini-month per row at full width, with large empty gaps between date rows, means twelve screens of scrolling; load shading is nearly invisible at that size.

**6. Chrome overlaps content.** The floating add button sits on top of the grid and the bottom nav covers the last rows in month and year.

## The fix

### Shared mobile shell
- Decide the layout before first paint (SSR-safe media query read) so the mobile header is what renders immediately — no desktop flash, no off-screen buttons.
- One compact sticky header row: tasks · prev · date (tap = today) · next · more. Range pills sit directly under it in a single scrollable row with edge fade so it reads as scrollable.
- Everything else that's currently a separate button (Tray, panel toggles, shortcuts, Plan my day, Grid/Overview and Calendar/Overview mode switches) moves into the "more" menu on mobile.
- Bottom padding accounts for the bottom nav; the floating add button shifts clear of grid content.

### Day
- Keep Grid / Schedule / Time of day, but as a single compact segmented row.
- Capacity, moon insight and assistant cards collapse to one compact summary line each, expandable on tap, so the timeline is reachable without long scrolling.
- Timeline keeps its own hour scroll at a comfortable phone height with momentum scrolling and no nested scroll fighting.

### Week (and 3-day)
- On phones the week defaults to **Overview** (day cards stacked, already mobile-shaped) instead of the 7-column grid.
- Grid mode stays available but becomes horizontally scrollable with a real minimum column width (~110px) and a pinned time gutter, so columns stay legible instead of collapsing.
- Day headers switch to a compact variant on small screens: weekday, date, one phase dot — no zodiac word wrap.
- 3-day keeps the grid (three columns fit) with the same minimum-width rule.

### Month
- Compact mobile cell: date number, cycle dot, a row of up to three coloured dots, and a count badge — no text chips. Roughly 72-80px per cell, so the month fits in about one and a half screens.
- Tapping a day opens the existing day sheet, which is where the detail belongs on a phone.
- Chip-style cells remain the desktop rendering.

### Year
- Two mini-months per row on phones, tighter cell spacing, and stronger load shading so busy days read at a glance.
- Month name taps through to that month; day taps open the day.

## Technical notes

- `src/hooks/use-mobile.tsx`: initialise from `window.matchMedia` during first render instead of `undefined`, so `isMobile` is correct on the first paint.
- `src/pages/Planner.tsx`: slim the mobile header to nav row + range pills; move mode tabs, tray, panel toggles and shortcuts into the existing dropdown; add a `mobile` default of `board` for `weekMode`; replace the fixed `GRID_BOX` clamp with a phone-specific height; add safe-area/bottom-nav padding.
- `src/components/planner/PlannerWeekGrid.tsx`: wrap the grid in a horizontal scroller with `minmax(110px, 1fr)` columns and a sticky gutter; pass a `compact` flag to `WeekDayHeader`.
- `src/components/planner/WeekDayHeader.tsx`: compact small-screen variant.
- `src/components/planner/PlannerMonthView.tsx`: dots-and-count cell rendering under `md`, full chips above.
- `src/components/planner/PlannerYearView.tsx`: `grid-cols-2` base, tighter gaps, stronger shading ramp.
- No changes to `src/lib/planner/feed.ts`, the store, or any mutation path.
