# Touch-friendly note & journal time blocks

## What changes

**1. Create a block by touch, with the time frame you choose**
- Press and drag on empty grid space to paint a time range (start → end snaps to 15 min). Release opens the composer already set to that range — works with finger, pen and mouse.
- A quick tap still works and defaults to 30 min.
- While dragging, a live ghost shows `9:00–10:15 · 75m` so the length is obvious before releasing.

**2. Composer redesigned for thumbs**
- On mobile the composer opens as a bottom sheet (not a popover pinned to the tap point), so it never gets clipped in a narrow week column.
- Mode pills Task / Note / Journal stay at the top, sized to 44px touch targets.
- Time frame row: start time stepper (−15 / +15), duration pills (15/30/45/60/90/120) plus a "Custom" end-time picker, and an end-time readout that updates live.
- Larger text field, sticky primary action ("Write note" / "Journal" / "Add").

**3. Week grid parity**
- The same press-drag-to-create gesture works in each day column of the week grid; the composer opens as a sheet on mobile and as a wider popover anchored to the column on desktop.
- Note/journal blocks render with their icon and soft color in week columns and open the writing sheet on tap.

**4. Writing sheet polish**
- Mobile: full-height sheet from the bottom with a drag handle instead of the right-side panel; keyboard-safe padding so the editor isn't hidden behind the keyboard.
- Save state made explicit ("Saving…" → "Saved"), and closing always flushes the pending save.

## Verification after building
Create a note block on the day grid and one on the week grid, tap each to open the new editor, type, close, then confirm the entries appear under Notes and Journal Flow with the same date — with screenshots at each step.

## Technical notes
- `PlannerTimeline.tsx`: replace `onGridClick` with pointer handlers (`onPointerDown/Move/Up` on the grid background) that build a drag range; keep the click fallback. Reuse `SNAP_MIN` / `yToMin`.
- Composer state gains `endAbsMin`; render inside a `Sheet` when `useIsMobile()` is true and keep the existing `Popover` on desktop.
- Write-block creation continues through `createWriteBlock` in `src/lib/planner/write-blocks.ts` — no schema changes.
- `WriteBlockSheet.tsx`: `side={isMobile ? "bottom" : "right"}` with height and safe-area classes; explicit saved/saving indicator.
