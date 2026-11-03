# Build your chosen task designs into the real app

Your picks from the preview pages become the real design, using your real tasks. Repeating tasks are included by default design. 

## 1. Task side panel (Planner and Today)

- **Style:** Cards. Each task is a rounded card with a soft phase-colored edge.
- **Sections:** By area (for example Caregiving, Kids, Home). Each area is a group you can fold.
- **Tapping a task:** opens its details.
- **Placing on the schedule:** both ways:
  - **Drag** a card onto a time in the Day or Week schedule. It snaps to the nearest 15 minutes.
  - **Click to schedule:** a small clock button on each card. Tap it, then tap a time on the schedule (or pick from a short time list on phones). A hint bar says "Tap a time to place this task" with Cancel.
- **Finished tasks:** fade to a softer look and stay in place.
- **Panel:** folds down to a slim strip of icons; tap an icon to open it again.
- **Text size:** 13px.

## 2. Held in your inbox

- **B · Grouped by age:** New today, This week, then Older. Older items sit on a soft shaded background. Each row keeps its check circle and Sort button.

## 3. Today & Upcoming

- **B · Two columns:** a "from earlier" note at the top with Done, then Today (grouped by Plan, Grow, Care, Let go) beside Upcoming on desktop. On phones, Today and Upcoming become two tabs.

## Afterwards

The /task-rail-mockups preview page is removed. Your choices are saved on this device, so they come back each time.

## Technical details

- Move the selected variants from `TaskRailMockups.tsx` / `TaskViewMockups.tsx` into real components fed by `useStore` tasks; reuse `toggleTask` and the task detail sheet.
- Drag uses native pointer drag (with a long-press start on touch, respecting the deliberate-swipe rule) onto `PlannerTimeline` and schedule-style slots; drop and click both call `updateTask({ due_date, due_time })`.
- Click-to-schedule: a shared "placing task" state (context) that schedule slots read to show tappable targets.
- Rail collapse state and text size: device-local prefs. No database changes.
- Add a test for the 15-minute snap.