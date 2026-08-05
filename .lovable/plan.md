# Planner page: recommended improvements

Recommendations based on the current `/planner` page. Grouped by priority so you can pick what to build.

## A. Fix what's inconsistent today (highest value, low risk)

1. **Settings and templates are only reachable in Grid view.** Auto-schedule settings, band colors, reminders and schedule templates live inside the timeline component, so they disappear when you switch to Schedule or Time-of-day. Move them into a single planner preferences popover in the header, available in every view.
2. **Two different headers.** Desktop uses the rhythm header (greeting, progress ring, moon, view toggle, capture) while mobile uses a compact bar with a "more" menu. Range (Day/3-day/Week/Month) and View (Grid/Schedule/Time of day) are one flat menu on mobile but two separate controls on desktop. Unify to one control model: Range pills + View pills, same order and labels on both.
3. **Panel visibility is implicit.** Task panel auto-hides for 3-day/week and re-shows for day, silently overriding the user's own toggle. Make the toggle sticky per range instead of resetting it.
4. **Focus and context panels can't be toggled.** They appear only on desktop day view with no way to collapse. Give both the same show/hide control as the task panel and remember the choice.

## B. UX improvements

5. **Persistent "now" affordance.** Add a "Jump to now" button on the timeline (auto-scroll exists, but there's no way back after scrolling away).
6. **Empty-state guidance.** When a day has nothing scheduled, show one card with three actions: Plan my day, apply a template, pull from tray — instead of an empty grid.
7. **Undo surface.** Undo/redo exists in planner history but has no visible control. Add an undo/redo pair in the header (plus a toast "Undo" after auto-schedule and drag moves).
8. **Drag from every source.** Task panel, tray and mobile inbox rail each drag differently. Standardise one drag preview and one drop highlight so the grid behaves the same regardless of source.
9. **Mobile grid height.** The grid is locked to `70vh`; on short screens this leaves a cramped window. Let it fill the available viewport minus the header, and make the day-part bands collapsible so you can jump to evening quickly.
10. **Keyboard support.** `c` and Cmd+K exist. Add: `t` today, `[` / `]` prev/next day, `1-4` range switch, `g` grid / `s` schedule / `d` time-of-day, and show them in the command bar.

## C. Feature additions

11. **Time-blocking with capacity feedback.** Show planned vs. available minutes for the day (and per band) as a thin capacity bar; warn when a band is overbooked before you drop another task.
12. **Overlap handling.** Conflicting blocks currently stack. Render side-by-side columns for overlapping blocks and keep the one-tap conflict resolve.
13. **Recurring anchors on the grid.** Show habits, routines and meals as light "anchor" blocks that can be toggled on/off from settings, so the grid reflects the real day, not only tasks.
14. **Day review.** An end-of-day card: completed, moved, dropped — with "roll unfinished to tomorrow" as a single action.
15. **Multi-select on the grid.** Shift-click or lasso to move/reschedule several blocks at once.

## D. Visual / UI polish

16. Tighten the desktop header: greeting + rhythm on one row, controls on a second, and let the header shrink on scroll so the grid gets more vertical room.
17. Give scheduled blocks a clearer hierarchy: title, then a single meta line (time · duration · tag) with consistent truncation across grid, schedule list and time-of-day list.
18. Use the band colours as subtle backgrounds behind grid hours (not just labels) so morning/afternoon/evening are readable at a glance.
19. Consistent panel chrome: task, focus and context panels should share the same card border, header style and collapse control.
20. Accessibility: blocks should be focusable and movable with arrow keys, with live-region announcements of the new time.

## Suggested first slice
Items 1-4 (settings/header/panel consistency) plus 5, 7 and 9 — these are contained, mostly presentational, and remove the most day-to-day friction.

## Technical notes
- Extract the settings popover contents from `PlannerTimeline.tsx` into a `PlannerSettingsPopover` used by both mobile and desktop headers.
- Unify header controls in `PlannerRhythmHeader.tsx` + the mobile bar in `Planner.tsx`; keep `PlannerViewToggle` and `PlannerPeriodTabs` as the single source of range/view UI.
- Persist panel visibility per range in `planner-prefs.ts` rather than the ad-hoc localStorage keys in `Planner.tsx`.
- Undo/redo wires to the existing `planner-history.ts`.
- Capacity bar can reuse `capacity.ts` / `planner-metrics.ts`; no schema changes needed for A, B, or D.
