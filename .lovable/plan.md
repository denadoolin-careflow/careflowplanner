## Goal
Make the Inbox a place where you can not just capture, but *schedule* — using the planner pieces that already exist (`PlannerTimeline`, `PlannerTaskPanel`, `PlanMyDayDialog`, `PlannerQuickCapture`, touch drag).

## Recommendations (what I'd do, and what I'd skip)

**Recommended — "Schedule mode" in the Inbox**
Add a view toggle in the Inbox toolbar: **List** (today's default overview) and **Schedule**. In Schedule mode the page splits: inbox items on the left, the planner day timeline on the right. Drag an inbox item onto an hour to schedule it; it leaves the inbox and lands on the day. This reuses `PlannerTimeline` and the existing `TASK_DRAG_MIME` drop plumbing, so no new scheduling logic.

**Recommended — per-row "Schedule" quick action**
On each inbox row, next to the existing when/date control, a small clock button opens a compact time picker (Morning / Afternoon / Evening / pick a time) so scheduling works with one tap on mobile. This matters because your current viewport is phone-sized — drag-and-drop alone isn't enough.

**Recommended — "Plan my day" from the Inbox**
Reuse `PlanMyDayDialog` behind a button in the Inbox header so a full inbox can be triaged into the day in one guided flow, instead of item-by-item.

**Recommended — mobile behaviour**
On phones, don't split the screen. Keep the list, and open the timeline as a bottom sheet ("Drop into day") when you tap Schedule on a row or the Schedule toggle. Same components, sheet container.

**Skip for now (my advice)**
- Don't embed the full 3-column planner (task panel + timeline + context rail) in the Inbox — it duplicates `/planner` and makes the Inbox heavy. The Inbox's job is capture-and-clear; only the timeline half earns its place.
- Don't add multi-day / week views here. If you want to schedule across days, jump to `/planner` with the item preselected.

## Implementation

1. **Inbox view preference** — add a small persisted toggle (`list` | `schedule`), same localStorage pattern as `planner-prefs` / `calendar-prefs`.
2. **`src/pages/Inbox.tsx`** — toolbar gains the List/Schedule toggle plus a "Plan my day" button. In Schedule mode, wrap the overview and a new right pane in a flex layout (desktop) or Sheet (mobile).
3. **New `src/components/inbox/InboxSchedulePane.tsx`** — thin wrapper around `PlannerTimeline` for the selected date, with a day stepper header.
4. **`src/components/inbox/InboxOverview.tsx`** — make rows drag sources using the existing `TASK_DRAG_MIME` payload and the `planner-touch-drag` hook for touch, and add the per-row clock/schedule button. Scheduling sets `dueDate` + `startTime` and clears `inbox`.
5. **`PlanMyDayDialog`** — mounted from Inbox, seeded with the selected date; no changes to the dialog itself.

### Technical notes
No data model changes: scheduling an inbox item just writes `dueDate`, `startTime`, `estMinutes` and flips `inbox` to false, which is exactly what the planner already does. All existing drag/drop and haptics code is reused, so behaviour stays consistent between `/inbox`, `/planner`, and `/calendar`.
