# Calmer inbox task rows + 3 design options

## What changes
1. **Remove the extra circle on the left** of each inbox task (the "select" circle). Only the real check-off circle stays. Selecting several tasks moves to a long-press / "Select" button in the header, so bulk actions still work.
2. **Preview page `/inbox-row-mockups`** (sample tasks, phone + desktop, light/dark) with 3 designs to pick from:
   - **A · Quiet line** — check circle, title wrapping on one or two lines, one soft line below ("Caregiving · Today · Morning"). Priority shown as a tiny colored dot. Repeat/Time/Priority/Energy chips hidden until tapped.
   - **B · Soft card** — rounded card with a phase-colored left edge, title + small chips row (Today · Morning, Medium). "About 23 hours ago" and quick chips tucked behind a ⋯ button.
   - **C · Planner style** — matches the Planner task rows exactly: time pill on the left tinted by phase, title, area label on the right; swipe or ⋯ for Sort/Add to note.
3. After you pick, I build that design into the real inbox and remove the preview page.

## Technical details
- Edit `src/components/inbox/InboxSortableRow.tsx`: drop the select toggle from the row; keep selection state reachable via header "Select" mode.
- New `src/pages/InboxRowMockups.tsx` + public route in `App.tsx`; sample data only.
