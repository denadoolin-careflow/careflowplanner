## CareFlow Planner Upgrade — Cohesive Implementation Plan

Deepen the existing `/planner` route (Planner.tsx, PlannerTaskPanel, PlannerTimeline, PlannerContextPanel, PlannerQuickCapture) without rebuilding. Reuse `useStore`, `parseTaskInput`, `TASK_DRAG_MIME`, atmosphere tokens, existing Focus Timer, `openTaskEditor`, and lunar/weather libs.

### Phase 1 — Views & Day Rhythm (foundation)
- Add `src/components/planner/PlannerViewToggle.tsx` — segmented Day / 3 Days / Week / Month, persisted in `localStorage` (`careflow:planner:view`).
- Extend `PlannerTimeline.tsx`:
  - Overlay soft **Morning (5–12)**, **Afternoon (12–17)**, **Evening (17–22)** rhythm bands (background tints + left-edge labels). Not separate views — visual regions.
  - Optional meal anchor blocks (Breakfast/Lunch/Dinner) rendered as translucent Meals-styled blocks; draggable + resizable using existing block logic; hooked into `MealsPlannedWidget` store.
- New `src/components/planner/Planner3DayView.tsx`, `PlannerWeekView.tsx`, `PlannerMonthView.tsx`:
  - 3-Day: 3 stacked timelines sharing hour rail, cross-day DnD.
  - Week: compact 7-day grid reusing block logic.
  - Month: grid with per-day dots for tasks/appts/meals/routines; click → Day view.
- `Planner.tsx` renders the active view; TaskPanel + ContextPanel stay for Day/3Day, hide for Month.

### Phase 2 — Plan My Day flow
- `src/components/planner/PlanMyDayDialog.tsx` — 4-step wizard: Capture → Anchor → Rhythm → Exhale.
  - **Capture**: rapid input (reuses `parseTaskInput`), Enter to add, optional area + est minutes.
  - **Anchor**: shows appointments/routines/meals for the day; user marks up to 3 Top Priorities (toggles `isTopThree`); tags fixed vs flexible.
  - **Rhythm**: embedded `PlannerTimeline` (compact) + unscheduled list, drag or "Schedule" quick action.
  - **Exhale**: computes planned focus min, caregiving blocks, open time. Load state: Light / Balanced / Full / Overloaded (thresholds by total scheduled minutes). Actions: Lighten My Day (unschedule lowest-priority flexible), Move Flexible Tasks (to tomorrow with confirm), Looks Good.
- Prominent but calm "Plan My Day" button in Planner header.

### Phase 3 — Command Bar
- `src/components/planner/PlannerCommandBar.tsx` using existing shadcn `Command` primitive.
- Global ⌘K / Ctrl+K listener in `Planner.tsx` (extend existing hotkey effect).
- Actions: Create task, Schedule task, Plan My Day, Go to Today, Open Inbox, View Top Priorities, Start Focus Timer, switch views, Ask Carey. Fuzzy search built into `cmdk`.

### Phase 4 — Task panel filtering / sorting
- Extend `PlannerTaskPanel.tsx`:
  - Multi-select **Tag filter** popover populated from `state.tasks[].tags` (dynamic; no hardcoded tags).
  - Sort dropdown: Manual, Priority, Due, Duration, Category, Recently Added. Persisted (`careflow:planner:sort`).
  - Manual preserves existing `sortOrder`.

### Phase 5 — Hover / context actions
- `src/components/planner/TaskQuickActions.tsx` — Complete, Schedule, Edit, Duplicate, Move, Delete. Show on hover (desktop) / long-press → popover (mobile).
- `src/components/planner/BlockQuickActions.tsx` for calendar blocks — Complete, Edit, Duplicate, Unschedule (confirm), Move to Another Day (Tomorrow / Next Week / Choose Date via shadcn Calendar), Delete. Duplicate preserves duration; unschedule clears `startTime` but keeps task; move preserves duration.

### Phase 6 — Mobile Planner
- `src/components/planner/PlannerMobile.tsx` gated by `useIsMobile()`.
- Bottom tabs: **Tasks | Day | Insights**.
- Tasks tab reuses PlannerTaskPanel content; Day tab reuses PlannerTimeline; Insights tab reuses Exhale calculations as a static panel.
- Floating rounded `+` FAB → PlannerQuickCapture.
- Touch DnD via long-press (reuse `use-draggable-fab` patterns / `long-press-drag`), fallback tap → Schedule → date → time sheet.

### Phase 7 — Focus Timer link + polish
- Add `activeFocusTaskId` to pomodoro store; when task selected in Planner, show "FOCUSING ON [task]" strip in `PlannerContextPanel`. Highlight linked timeline block with subtle "Focus in progress" ring.
- On timer completion: sheet asking Complete Task / Add Another Session / Take a Break / Done for Now.
- Persist active timer across navigation (already partially in pomodoro-store; verify).

### Phase 8 — Text wrapping + a11y sweep
- Audit all planner blocks/task rows for `min-w-0`, `overflow-wrap: anywhere`, `white-space: normal`. Week blocks: `line-clamp-2`. Day blocks: `line-clamp-3`. No horizontal overflow.
- Icon-only buttons get `aria-label`; hover actions duplicated on keyboard focus; respect `prefers-reduced-motion` on wizard transitions; 44px touch targets on mobile.

### Design tokens
Reuse existing atmosphere / sage / cream tokens. No new palettes. Rhythm bands = `bg-amber-50/40` (morning), `bg-sky-50/30` (afternoon), `bg-violet-50/30` (evening) with dark-mode variants via existing token conventions.

### Rollout order (single cohesive PR, incremental commits per phase)
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Each phase leaves the Planner fully functional.

### Files (new)
`PlannerViewToggle.tsx`, `Planner3DayView.tsx`, `PlannerWeekView.tsx`, `PlannerMonthView.tsx`, `PlanMyDayDialog.tsx`, `PlannerCommandBar.tsx`, `TaskQuickActions.tsx`, `BlockQuickActions.tsx`, `PlannerMobile.tsx`, `planner-prefs.ts` (view/sort/filter persistence).

### Files (modified)
`Planner.tsx`, `PlannerTaskPanel.tsx`, `PlannerTimeline.tsx`, `PlannerContextPanel.tsx`, `pomodoro-store.ts`.
