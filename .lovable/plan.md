## Goal

In the Month view's day-detail bottom sheet, remove the Morning / Afternoon / Evening / All day grouping and present the day as one continuous, time-ordered timeline.

## Where

`src/pages/Month.tsx` — the day-sheet render block at roughly lines 578–663 (the `PARTS.map(...)` section). No other files need to change.

## What changes

1. **Remove** the `partOf` helper, the `groups` bucketing, and the `PARTS` array.
2. **Build one list** from `eventsOn(sheetISO)`:
   - Split into `timed` (items with a valid `HH:MM` time) and `allDay` (no time).
   - Sort `timed` ascending by time.
   - Render `allDay` first as a compact "All day" cluster, then the timed timeline below.
3. **Timeline layout** for timed items, using existing tokens:
   - Left gutter (~56px) shows the time in 12-hour format (`formatTime12`) and a small dot on a vertical rail (`border-l border-border/60`).
   - Right side: the existing item row (checkbox, label, block colors) reused verbatim — same click handler, same styling, same task strike-through, same block color classes.
   - Add a faint hour separator between items whose hour changes (light divider + greyed hour label) so the timeline still feels structured without the 3-bucket toggle.
4. **Empty state**: when both lists are empty, show a single muted "Nothing scheduled" line.
5. Preserve all current behaviors: tap a task → `setEditingTask`, tap appt → `setEditApptId`, tap block → `openBlockInWeek`, checkbox toggles task done with haptic.

## Out of scope

- No changes to month grid, header toggles (`CalendarViewToggle`, astro overlay), or any other page.
- No data model changes; this is presentation only.
- Mobile and desktop both get the same timeline (the sheet is shared).

```text
Sheet body
├── Day stats (unchanged)
├── DayDetailExtras (unchanged)
└── Timeline
    ├── All-day chips row (if any)
    ├── 09:00  ●──  Drop off kids
    ├── 10:30  ●──  Standup
    ├── ── 12 PM ──
    ├── 12:15  ●──  Lunch with mom
    └── 18:00  ●──  Dinner block
```
