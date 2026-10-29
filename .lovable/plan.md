# One Today page + easier cycle dates + cycle/moon widget mockups

## 1. One consistent Today page
Today and the Planner's Day view currently show the same day in two different ways. Merge them so there is one page:
- `/today` becomes the single day page: the phase header, Day Flow / Phase Tabs / Quadrants layouts, inline adding and check-offs stay.
- The Planner's Day view adds what Today is missing: the time-blocked schedule (timeline), the all-day row, and the Focus/Notes side panels on desktop, shown as a "Schedule" section in the Today layout (sidebar on desktop, collapsible section on phone).
- Planner "Day" tab and the date links from Month/Week/Year open the same Today page for that date (with back-to-Planner), so there is only one day screen. Week, 3-day, Month, Year and Rhythm stay in the Planner unchanged.
- Today gains a date arrow/picker so any day (not just today) can be opened there.
- No data changes — tasks, appointments, blocks and notes are the same records.

## 2. Easier menstrual cycle date adjustments
- New "Edit cycle dates" sheet (from the cycle widget, Today header chip and Health): list of past periods with editable start/end dates, add a missed period, delete a wrong one.
- Adjust this cycle's phases directly: drag/nudge the phase boundaries (menstrual, follicular, ovulatory, luteal) by ±1 day, or set "ovulation was on…"; the predictions update immediately.
- Quick fixes: "My period started today / yesterday / pick date" and "Period ended".
- Settings for average cycle, period and luteal length shown with plain sliders and a live preview of the coming phases.

## 3. Cycle + Moon widget mockups (preview page, live app unchanged)
A temporary preview page with three options, each showing both cycles' four phases (cycle: Menstrual/Follicular/Ovulatory/Luteal; Moon: Plan/Grow/Care/Let go), today's marker, and phone + desktop sizes:
- A · Twin Rings — two concentric rings, Moon outside, cycle inside, today's dot on both.
- B · Parallel Ribbons — two stacked 28–30 day bars aligned by date, so overlaps are visible at a glance.
- C · Phase Cards — two side-by-side cards with the current phase, day count, days to next phase and a mini 4-segment bar.
You pick one (or a mix) and I'll put it on Today/Planner and remove the preview page.

## Technical notes
- Day-view pieces from `Planner.tsx` (timeline, all-day row, panels) are extracted into a shared day schedule component used by `Today.tsx`; Planner `view="day"` routes to `/today?date=`.
- Cycle edits use the existing period history in `cycle-store` (update/insert/delete period logs); phase-boundary nudges stored as per-cycle overrides in the existing period log `notes`/settings rather than a new table if possible, otherwise a small column addition on the period log.
- Add tests for phase calculation with edited dates/overrides.
