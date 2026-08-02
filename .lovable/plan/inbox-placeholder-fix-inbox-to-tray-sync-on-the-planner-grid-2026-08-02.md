# Inbox placeholder fix + Inbox-to-Tray sync on the planner grid

## 1. Placeholder no longer cut off
The capture field reserves a wide left icon gutter and an even wider right action gutter, which squeezes the placeholder on a narrow phone so "What needs your attention?" gets clipped.

Changes:
- Tighten the capture input's left/right gutters on mobile (smaller icon well, narrower right action cluster reserve), keeping desktop spacing as-is.
- Let the placeholder shrink gracefully instead of clipping: allow ellipsis-free display by reducing placeholder size slightly on the smallest widths and matching the mirror layer's padding exactly so text and placeholder occupy the same box.
- Verify at 384px wide that the full sentence renders for every capture kind (task, home, care, meal, connect, commute, journal).

## 2. Inbox tasks visible in the Task Tray
Today the tray only holds items the user manually parks. Add a live Inbox section:
- The tray's "Tray" tab gets two groups: **Parked** (existing manual items) and **Inbox** (all open, unscheduled inbox tasks, read from the store — no duplication, no writes).
- Inbox rows use the same drag behaviour as parked rows (drag to planner grid, tap to quick-edit), plus a small "park" action to pin one into Parked.
- Counter badge reflects parked + inbox counts.

## 3. Tray reachable from the planner grid
- Add a Tray toggle in the planner/Today Plan view header (icon button with count badge) that opens the same TrayDock panel.
- On desktop, the dock sits beside the grid so tasks can be dragged straight onto time slots; on mobile it opens as the existing bottom sheet, positioned above the grid so drag-to-slot still works.
- Dropping a tray/inbox task on the grid schedules it exactly as the current drag path does; scheduled tasks drop out of the Inbox group automatically.

## Technical notes
- `src/components/inbox/NlpHighlightedInput.tsx`: responsive `leftPad`/`rightPad` defaults; keep mirror and input padding identical so no drift.
- `src/pages/Inbox.tsx`: shrink the left icon well and right action cluster on mobile.
- `src/components/tray/TrayDock.tsx`: derive inbox tasks from `useStore()` with the same filter the mobile inbox rail uses (`!done && !parentTaskId && status !== "parked" && !startTime && (inbox || !dueDate)`); render grouped lists reusing `TrayRow`.
- `src/lib/tray-store.ts`: no schema change needed; optionally add a `showInbox` flag persisted with the rest of tray state.
- Planner header (Today Plan view / Planner page): mount a tray toggle calling `tray.setOpen(true)` + `tray.setTab("tray")`.
