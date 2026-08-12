# Planner review: scrolling, layout and UX polish

A pass over every planner surface (Day grid / Schedule / Time of day, 3-day, Week grid + board, Month calendar + overview, Year, and the mobile Today plan tab). No new features, no data or business-logic changes — layout, scrolling and interaction polish only.

## What's wrong today

- **Two scrollbars fight each other on desktop.** The planner body is `overflow-y-auto`, and inside it the timeline, week grid and month grid are `h-full` with their own internal scroll. Depending on the view you get either a nested scrollbar or a grid squeezed to nothing.
- **Magic-number heights.** `h-[calc(100dvh-9rem)]`, `calc(100dvh-250px)`, `calc(100dvh-260px)`, `min-h-[520px]`, and `calc(100vh-300px)` on Today. They drift with the header, so the grid gets clipped or leaves dead space.
- **Long views can't breathe.** Week board, Month overview and Day review are naturally long, but sit inside a fixed-height shell and scroll in a cramped inner box.
- **Day review is stranded.** It renders outside the scroll region as `shrink-0`, stealing height from the grid instead of scrolling with the content.
- **Mobile header is heavy.** A nav row plus a horizontally scrolling pill row of view toggle + mode tabs + kind filter, sticky above every view; on a ~700px-wide screen the pill row always overflows.
- **Inconsistent shortcuts.** `d` means "time of day" while `1` means the day range, `g/s/d` sit alongside `w/m/y`, and none of it is discoverable.
- **Small polish gaps.** Year view silently loses the task panel and filters; the resize handle has no keyboard support; "Jump to now" exists only on the day timeline, not the week grid; scroll position resets when paging dates.

## The plan

### 1. One scroll owner per view

Classify each view as **fixed** (owns its internal scroll: Day grid, 3-day, Week grid, Month calendar) or **flowing** (long content that scrolls in the page body: Schedule, Time of day, Week board, Month overview, Year, Day review).

- Fixed views: the body region becomes `overflow-hidden` and the view fills it via flex, so the only scrollbar is the grid's own hour scroll.
- Flowing views: the body region becomes the single `overflow-y-auto` and the view renders at natural height with no inner scroll box.

This removes nested scrolling in every combination rather than patching one view at a time.

### 2. Remove the magic numbers

- Desktop shell height comes from the app chrome via flex (`min-h-0 flex-1`) instead of `calc(100dvh-9rem)`.
- Mobile: the sticky planner header measures itself and the grid fills the remaining space, replacing `calc(100dvh-250px)` / `-260px`.
- Today's desktop plan view drops `calc(100vh-300px)` for the same flex treatment.

### 3. Day review moves inside the scroll body

On mobile it becomes flowing content under the grid; on desktop it moves into a collapsible card at the bottom of the main column so it never competes with the grid for height.

### 4. Mobile header slimming

- One sticky nav row (tasks · prev · date · next · more).
- View toggle stays visible; per-range mode tabs (Grid/Board, Calendar/Overview) and the kind filter move into the existing "more" menu so the pill row stops overflowing.
- Time-of-day segment pills stay as a single row directly above the lists.

### 5. Consistent, discoverable controls

- Shortcuts: `1-5` for ranges (day, 3-day, week, month, year), `[` `]` to page, `t` today, `c` capture, `⌘K` command bar. Day sub-views move to `Shift+G / Shift+S / Shift+D` so nothing collides. A `?` sheet lists them, and the command bar gains the same entries.
- The task-panel resize handle gains arrow-key resizing and a visible focus ring.
- Year view keeps the task panel and shows filters in a disabled-with-reason state instead of silently dropping the controls.

### 6. Scroll behaviour polish

- Scroll position preserved per view when paging dates; the day timeline auto-scrolls to now on first load only.
- Week grid gets the same "Jump to now" affordance as the day timeline.
- All scroll containers get `overscroll-contain` plus momentum scrolling on touch so mobile drags don't chain to the page.
- Edge auto-scroll while dragging a task near the top/bottom of the timeline and week grid.

## Technical notes

- `src/pages/Planner.tsx`: a `SCROLL_MODE` map keyed by view/mode drives whether the body wrapper is `overflow-hidden` or `overflow-y-auto`. Remove all `calc()` height wrappers and the `min-h-[420px]` / `min-h-[520px]` floors.
- `src/components/today/TodayPlanView.tsx`: desktop branch swaps its inline `style` height for flex.
- `PlannerWeekBoard`, `PlannerMonthOverview`, `PlannerYearView`: drop `h-full`, render at natural height.
- `PlannerTimeline` / `PlannerWeekGrid`: keep internal scroll; add drag edge-autoscroll and a shared "jump to now" helper.
- Shortcut handling stays in `Planner.tsx`; a new small `PlannerShortcutsSheet` renders the list.
- No changes to `src/lib/planner/feed.ts`, the store, or any mutation path.