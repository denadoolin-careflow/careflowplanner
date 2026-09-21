# Reminder Center, Habits/Routines/Goals in the Planner, and a Bigger Calendar Grid

## 1. Reminder Center
A single place that gathers everything that wants your attention, reachable from the planner header (bell icon with a count) and opening as a side sheet on desktop and a bottom sheet on phones.

Grouped sections:
- **Now / Overdue** — reminders whose time has passed and were not acted on.
- **Today** — upcoming planner reminders (tasks, appointments, meals, caregiving routines).
- **Rhythm** — moon phase moments (New, First Quarter, Full, Last Quarter) and cycle milestones (period start, fertile window, phase changes).
- **Journal prompts** — saved prompts from the Monthly Moonscape and daily moon insight.
- **Later this week** — a collapsed look-ahead.

Each row shows an icon, title, time, and source, with actions:
- **Snooze** (10 min, 1 hour, this evening, tomorrow) — persisted so it follows across devices.
- **Done / Dismiss** — completes the underlying task where one exists, otherwise marks the reminder handled.
- **Open** — jumps to the item's existing editor, note, or journal entry.

Quiet hours, channel choices, and category toggles keep using the existing reminder preferences; the center gets a small link to those settings.

## 2. Habits, routines, and goals in the planner
- Habits and routines appear on the planner day as their own gentle lanes on Day, 3 Day, and Week, with one-tap check-off that writes to the existing habit/routine logs. Month shows a small completion marker per day rather than individual rows.
- Routines with times sit in the timeline at their scheduled hour; untimed ones stay in an all-day rhythm row.
- Goals show up as a compact "Goals in focus" area in the Month overview and as an optional pin in the Top Priorities strip, with progress and the ability to attach a task to a goal.
- Planner filters gain habit, routine, and goal toggles so these lanes can be hidden.
- Existing habit garden, routine, and goal pages remain the source of truth — the planner reads and updates them, nothing is duplicated.

## 3. Moon phase and cycle sign in Month and Week
- Month calendar cells show the moon glyph on key phase days plus the moon sign abbreviation, and the cycle phase emoji (🌸 🌻 🍂 🥀) at each phase start.
- Week and 3 Day day headers show the day's moon glyph, moon sign, and cycle phase emoji in one quiet line.
- A single legend explains glyphs without crowding the grid.

## 4. Bigger, more accessible grid
- Add a zoom control (compact / comfortable / large) for the Week and 3 Day timeline that changes hour height and card text size, persisted per device.
- Let the grid grow beyond the current fixed window height: taller usable area on desktop, and on phones a "full screen grid" toggle that hides surrounding planner cards so the schedule uses the whole screen.
- Keep the existing two-axis scrolling behaviour: the frame scrolls horizontally across days, the timeline scrolls vertically, and the page resumes scrolling at the top and bottom.
- Larger Month cells on desktop with more visible items before the "+N more" roll-up.

## Technical notes
- New owner-scoped table for reminder instances (source kind, source id, fire time, snoozed-until, handled-at) with RLS and grants, so snooze/dismiss state syncs across devices; the existing local scheduler reads from it instead of its localStorage-only fired/snooze maps.
- Moon and cycle reminder rows are derived from existing lunar and cycle helpers; journal prompt rows come from `planner_saved_prompt_reminders`.
- Habits/routines/goals surface through `usePlannerFeed` as new feed kinds so filters, lanes, and the Month markers all share one data path; no new schema needed.
- Grid sizing changes live in `PlannerWeekGrid` (hour-height variable plus persisted zoom) and the month grid CSS; scroll ownership attributes stay as they are.

## Verification
- Reminder center on phone and desktop: snooze persists after reload, Done completes the task, Open lands on the right editor.
- Habits, routines, and goals appear and check off from the planner and stay in sync with their own pages.
- Moon/cycle markers render in Month and Week without overflow.
- Zoom and full-screen grid keep horizontal and vertical scrolling smooth with normal page scroll at the boundaries.
- Type check, database security check, and an authenticated pass over Day, 3 Day, Week, and Month.
