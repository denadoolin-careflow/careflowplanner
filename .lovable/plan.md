# CareFlow Planner — Implementation Plan

A new `/planner` route offering an Akiflow-inspired daily planning workspace, built entirely on existing CareFlow primitives (tasks, appointments, time blocks, lunar, Carey, atmosphere tokens). No brand or data-model changes.

## Scope & non-goals

- **In scope:** new `/planner` page + a `src/components/planner/` folder of composable pieces, keyboard shortcuts, a Plan-My-Day overlay, mobile/tablet layouts.
- **Out of scope:** touching existing `/plan`, `/today`, `/calendar-v2`, or the sidebar taxonomy; new DB tables; changes to the Task type. Existing routes stay intact — Planner is additive.

## Layout

```text
Desktop (≥1200px)
┌──────────┬───────────────────────────┬──────────┐
│  Tasks   │      Daily timeline       │ Day rail │
│ 320px    │  flex, hourly grid 5–22   │ 300px    │
└──────────┴───────────────────────────┴──────────┘

Tablet (768–1199px): task panel collapsible; right rail as slide-over Sheet.
Mobile (<768px):     segmented top nav Tasks | Day | Insights, FAB capture.
```

## Files to add

Under `src/components/planner/`:
- `PlannerTaskPanel.tsx` — search/filter/sort header, sections: Inbox, Today, Upcoming, Someday, then collapsible CareFlow areas (Family/Health/Home/Meals/Self Care/Money) derived from `state.tasks[].area`.
- `PlannerTaskRow.tsx` — checkbox, title (line-clamp-2), area dot, duration chip, star, due date, recurring glyph, drag handle. Reuses `resolveTaskIcon` and opens `openTaskEditor(id)`.
- `PlannerTimeline.tsx` — vertical hour rail 5 AM–10 PM, 15-min subgrid, current-time indicator, drop target that converts x/y → `{date, startTime}`. Wraps the existing `TimeGrid` styling patterns but is planner-scoped so we can add drag-to-resize and overlap side-by-side layout.
- `PlannerTimeBlock.tsx` — one block: title, time range, icon, category tint. Drag to move, bottom-edge resize (updates `estMinutes` for tasks / `endTime` for appointments), context menu (Open, Complete, Duplicate, Move to…, Unschedule).
- `PlannerHeader.tsx` — prev/today/next, date label, Day/3-Day/Week toggle, `DayPickerButton`, planning menu (Plan my day, Ask Carey, Focus timer).
- `PlannerContextPanel.tsx` — wraps the right rail sections below.
- `PlannerMiniCalendar.tsx` — month grid with dots where `tasks.dueDate` or `appointments.date` exist.
- `PlannerPriorities.tsx` — top 3 starred tasks for the day; reorder via drag; star/complete.
- `PlannerInboxPreview.tsx` — count + first 5 inbox tasks + "View all → /inbox".
- `PlannerFocusTimer.tsx` — thin wrapper around existing `pomodoro-store` with 25/50/90 presets and an optional bound task id.
- `PlannerLunarCard.tsx` — reuses `MoonPhaseBadge` / `getKeyPhaseInfo`, single-line invitation, "View Lunar Guide" → `/cosmic-flow`.
- `PlannerIntentionCard.tsx` — editable daily intention persisted through existing `daily-intention.ts`.
- `PlannerQuickCapture.tsx` — command-style dialog (shadcn `Command`), placeholder "Capture anything…", parses via existing `nlp-task.ts`, hotkey `C`.
- `PlannerCommandBar.tsx` — shadcn `CommandDialog`, hotkey ⌘/Ctrl-K, routes to the actions listed in the brief.
- `PlanMyDayFlow.tsx` — 4-step Sheet: Capture → Anchor → Rhythm → Exhale. Uses existing inbox, appointments, capacity math (`src/lib/capacity.ts`) and `schedule-suggest.ts` for the Rhythm placement helper. Final Exhale summary computes planned focus / care / home minutes from placed blocks; "Start My Day" navigates to `/today`.
- `usePlannerDnd.ts` — shared drag context: task ↔ timeline, block ↔ block, using native HTML5 DnD (same MIME approach as `TASK_DRAG_MIME`) to stay consistent with `TimeGrid` and `UnscheduledTasksRail`. No new dnd library.

Page:
- `src/pages/Planner.tsx` — composes the three columns, owns `selectedDate`, `view` (day/3day/week), and Plan-My-Day / Quick Capture / Command Bar open state.

Route:
- Add `<Route path="/planner" element={<Planner/>} />` in `src/App.tsx`; add a "Planner" entry to the sidebar under Planner group in `src/lib/nav.ts` (does not remove existing Today/Calendar entries).

## Reuse (no duplication)

- Tasks: `useStore` (`addTask`, `updateTask`, `toggleTask`), `Task` type, `resolveTaskIcon`, `openTaskEditor`.
- Calendar data: `appointments`, `useTimeBlocks`, `colorClasses`.
- Scheduling helpers: `suggestSlotForDay`, `nlp-task.ts`, `schedule-suggest.ts`.
- Lunar: `getMoonPhase`, `getKeyPhaseInfo`, `MoonPhaseBadge`.
- Focus timer: `pomodoro-store`, `pomodoro-defaults`.
- Carey: existing `carey-chat` edge function via a "Ask Carey" button that opens the existing Carey drawer (`src/pages/Carey.tsx` pattern).
- Design tokens only — `--background`, `--card`, `--primary`, `--muted`, atmosphere semantic tokens. No hex.

## Interaction details

- **Timeline drop:** on drop of a task, call `updateTask(id, { dueDate, startTime, estMinutes: est ?? 30, inbox: false })`; on drop of an inbox capture, hydrate via `addTask`.
- **Resize:** pointerdown on block bottom edge → track dy → snap to 15-min → commit on pointerup.
- **Overlap:** compute lanes with a simple greedy algorithm; render side-by-side with equal-width columns inside the hour cell.
- **Overplanned nudge:** when total scheduled minutes exceed available minutes in the visible day, show a soft banner in Plan-My-Day Rhythm step ("Your day is getting full…"). Never blocks the action.
- **No destructive AI:** Carey suggestions render as chips that require an explicit "Apply" tap.

## Mobile / tablet

- Mobile: `Planner.tsx` detects `useIsMobile` and renders `PlannerMobile.tsx` with a segmented top nav (Tasks | Day | Insights) and a FAB that opens Quick Capture. "Schedule" action on a task opens a bottom `Sheet` with Today / Tomorrow / Pick date / Pick time / Duration.
- Tablet: task panel collapsible via a chevron; right rail moves into a `Sheet` triggered by a "Day panel" button in the header.

## Verification

1. Route loads at `/planner` on desktop, tablet, mobile viewports (`preview_ui--set_preview_device_viewport`).
2. Drag from Inbox → 10:00 slot creates a scheduled block with the task's duration.
3. Resize block adjusts `estMinutes`; refresh persists.
4. ⌘K opens the command bar; `C` opens quick capture with NL parsing.
5. Plan-My-Day 4-step flow reaches the Exhale summary and "Start My Day" routes to `/today`.
6. No regressions on `/plan`, `/today`, `/calendar-v2` — smoke via Playwright screenshots.
