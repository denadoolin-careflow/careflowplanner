# Today layouts: Day Flow (default), Phase Tabs, Four-Quadrant

## What you'll get
- A layout picker on Today (and in Settings) with three choices: **Day Flow** (default), **Phase Tabs**, **Four-Quadrant**. Your pick is remembered on each device.
- The existing **Plan** and **Board** grid views stay as they are, alongside the new layouts.
- Every phase section (Plan, Grow, Care, Let go) gets an inline "Add…" line that understands natural language, e.g. "Call Dr. Lee tomorrow 3pm" becomes an appointment, "Buy milk Friday" becomes a task. A small preview chip shows what it will create (task vs appointment, date/time) before you press Enter.
- Tasks and appointments in each section show a checkbox to mark them done, using the same done-state, sounds and strikethrough setting as elsewhere.
- Everything added on Today shows up in the Planner immediately (same tasks and appointments), and tapping an item's date/time opens that day in the Planner.

## Layout details
- **Day Flow**: one scrolling stream Plan, Grow, Care, Let go; past phases of the day fold automatically (can be reopened); schedule rail beside it on desktop.
- **Phase Tabs**: current mobile tabs, plus a phase menu and schedule sidebar on desktop.
- **Four-Quadrant**: four phase tiles on phone, 2x2 quadrants on desktop.
- All three reuse today's existing cards (rituals, focus goal, habits, care, journal, Cosmic check-in) — no content is removed.

## After building
- Remove the mockups preview page.
- Check phone and desktop: add a task and an appointment by typing, check them off, confirm they appear in the Planner, then remove the test items.

## Technical details
- Extend `src/lib/today-view.ts`: `TodayView = "plan" | "board" | "flow" | "tabs" | "quadrant"`, default `flow`; legacy values migrate unchanged.
- New `src/components/today/layouts/{DayFlowLayout,PhaseTabsLayout,QuadrantLayout}.tsx` sharing a `phaseSections(day)` builder extracted from `Today.tsx`.
- New `PhaseInlineAdd.tsx`: parses with existing quick-add/date parsing (`QuickAddBar` logic + `task-auto-detect`), creates tasks via `addTask` (phase-appropriate defaults) or appointments via the store's appointment add; Enter to save, keeps focus for the next line.
- `PhaseItemList.tsx`: per-phase tasks/appointments for the day with checkboxes (`toggleTask`; appointments use existing done flag if present, otherwise a visual "attended" check via the existing appointment completion path).
- Phase assignment for items: time of day / task garden phase, falling back to Plan.
- Picker added to Today header ViewPills and Settings default-view control.
