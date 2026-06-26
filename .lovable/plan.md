# Improve mobile Task Editor

The task editor dialog (`src/components/tasks/TaskEditor.tsx`) is the screen shown in the screenshot. On mobile it has horizontal overflow: the title input runs past the right edge, the pill row clips "Medium", the notes/attachment cards extend beyond the viewport, and Cancel/Save look misaligned with the rest of the content. We'll tighten the mobile layout without changing behavior or desktop styles.

## Changes (frontend only, `src/components/tasks/TaskEditor.tsx`)

1. **Stop horizontal overflow at the root**
   - `DialogContent`: add `overflow-x-hidden` alongside the existing `overflow-hidden`, and ensure mobile uses `w-screen max-w-[100vw]` so the dialog never exceeds the viewport.
   - Wrap the scrollable body with `min-w-0 w-full` and add `min-w-0` to the inner grid so children can shrink.

2. **Title row wraps cleanly**
   - Keep the title input on its own row on mobile (`basis-full`), but add `min-w-0 w-full` and `truncate`-safe sizing so long titles don't push the row wider than the screen.
   - Reduce header horizontal padding on mobile (`px-3` → `px-4`) to match the body and align with Cancel/Save below.

3. **Pill row: edge-faded horizontal scroller**
   - Keep `overflow-x-auto` scrolling on mobile but:
     - Add left/right padding so the first and last pill aren't flush against the edge.
     - Add a subtle right-edge mask (`mask-image: linear-gradient(...)`) so a clipped "Medium" pill clearly looks scrollable instead of cut off.
   - Make pill labels shrink-safe (`max-w-[10rem] truncate`) so a long project/area name doesn't blow out the row.

4. **Body cards align to one consistent gutter**
   - Use a shared `px-4 sm:px-5` on header, body, and footer so the left edges of pills, cards, and Cancel/Save line up perfectly.
   - Add `min-w-0` to each `Card` and to the left/right grid columns to prevent any nested input/select from forcing horizontal growth.

5. **Footer Cancel / Save / Delete**
   - On mobile, render the footer as a sticky `bottom-0` bar with a 2-column grid (`grid-cols-2 gap-2`) for Cancel + Save (Save = primary, full-width within its column), and the Delete link centered underneath in muted-destructive style. This matches the spacing of the body and keeps tap targets ≥ 44px.
   - Add `pb-[env(safe-area-inset-bottom)]` so it clears the home indicator.

6. **Notes & Attachments cards**
   - Add `min-w-0` and `overflow-hidden` on each `Card` wrapper so the inner `BlockEditor` toolbar and `AttachmentsField` "Drag & drop…" caption wrap instead of pushing width.
   - On mobile, allow the formatting toolbar in `BlockEditor` to wrap (`flex-wrap`) so the B/I/U/S/</>/✏️ row never overflows.

## Out of scope
- No changes to TaskEditor logic, data model, or the mobile `/tasks/:id` `TaskDetail` page (separate surface).
- No design-token changes; uses existing semantic colors.

## Verification
- Reload `/inbox` on a 411px viewport, open a long-title task, confirm: no horizontal page scroll, pills scroll within their own row with a fade, title wraps to one row that fits, Notes/Attachments cards stay inside the viewport, Cancel/Save/Delete are aligned to the same gutter as the cards and reachable above the gesture bar.
- Spot-check desktop (≥ sm breakpoint) — layout should be unchanged.
