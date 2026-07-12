## Goal

Bring the Planner workspace inside `/calendar-v2` as a first-class view mode alongside Day / Week / Month, without disrupting the existing calendar surfaces.

## Changes

### 1. Extend the view toggle
- `src/components/calendar-v2/CalendarV2ViewToggle.tsx`
  - Add `"planner"` to `CV2View` union and to the toggle buttons (order: Planner · Day · Week · Month).
  - Persisted key stays `careflow.cv2.view` so the choice sticks.

### 2. Wire the Planner view into CalendarV2
- `src/pages/CalendarV2.tsx`
  - When `view === "planner"`, render a Planner-shaped layout in place of the current Day grid:
    - Left rail: `PlannerTaskPanel` (replaces `UniversalInbox` in this mode) with a resizable / collapsible column, mirroring `Planner.tsx` behavior (persist width + hidden state under `careflow.cv2.planner.*` so it doesn't clobber `/planner`'s own prefs).
    - Center: `PlannerTimeline` for today.
    - Right rail: `PlannerContextPanel` (mini calendar, priorities, focus timer, moon phase).
  - Keep the existing `CommandBar`, `FlowStages`, `CareySuggestions`, `RecoveryStrip`, `TimeContainers`, `FamilyLanes` stack above/below so the Planner view still benefits from Calendar 2.0 signals. Family lanes and Time containers render under the Planner grid; Carey + Recovery render above it (same as Day view).
  - Add hotkeys local to this page: `C` opens `PlannerQuickCapture`, `⌘/Ctrl+K` opens `PlannerCommandBar`, only active while `view === "planner"` to avoid colliding with other calendar surfaces.
  - Mobile: collapse the task rail into a `Sheet` triggered from the header, matching `Planner.tsx`.

### 3. Header controls in Planner mode
- Add "Capture" and "Plan my day" buttons to the CalendarV2 header row when `view === "planner"` (reuse `PlannerQuickCapture` and `PlanMyDayDialog`).
- Keep `CalendarV2ViewToggle` and the existing "Classic calendar" link.

### 4. Non-goals / preserved behavior
- `/planner` route stays exactly as-is; this is additive.
- Day / Week / Month modes on `/calendar-v2` continue to render `DayCanvas` / `WeekView` / `MonthView` unchanged.
- No data model or store changes — everything reuses existing components and hooks.

### 5. Technical notes
- New components are not required; all pieces exist (`PlannerTaskPanel`, `PlannerTimeline`, `PlannerContextPanel`, `PlannerQuickCapture`, `PlanMyDayDialog`, `PlannerCommandBar`).
- Namespace planner-in-calendar prefs under `careflow.cv2.planner.taskPanelHidden` / `...taskPanelWidth` so `/planner` and `/calendar-v2` remember independent layouts.
- Grid template mirrors `Planner.tsx`: `[panelWidth]px 6px minmax(0,1fr) 300px`, with the right rail dropping on mobile and the left rail dropping in a `Sheet`.

## Acceptance
- `/calendar-v2` shows a 4-option view toggle; selecting **Planner** renders the full planner workspace inline.
- Task panel is resizable, collapsible, and hidden by default on small screens.
- Capture (`C`) and Command Bar (`⌘K`) work while in Planner view.
- Switching to Day / Week / Month restores the existing Calendar 2.0 layouts untouched.
