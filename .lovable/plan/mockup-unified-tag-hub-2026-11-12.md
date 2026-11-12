# Mockup: Unified Tag Hub

A preview-only page at `/tag-hub-mockups` showing how one tag (e.g. "#nana-care") gathers everything across CareFlow. Uses sample data only; nothing in your real tags, tasks or notes changes.

## What the page shows
- **Header:** tag name with its color dot, item counts (projects · tasks · notes), and a ⋯ menu (rename, change color, merge).
- **Three layout options** to compare, switched with pills at the top:
  - **A · Stacked sections** — Projects cards, then open tasks grouped by Plan / Grow / Care / Let go, then notes.
  - **B · Two columns** — tasks on the left, notes and projects on the right (desktop), stacked on phone.
  - **C · Timeline** — everything with this tag in date order, with a filter chip row (All, Tasks, Notes, Projects).
- **Quick-peek card:** tapping any tag chip shows a small floating card with counts and "Open hub" / "Add task with tag".
- **Related tags** row and an "Add to this tag" capture box.
- Phone / desktop and light / dark toggles, like the other mockup pages.

## Style
Same planner-card surfaces, shared task cards, phase tints and slim header used in Inbox and Planner.

## Technical details
- New `src/pages/TagHubMockups.tsx`, public route added in `src/App.tsx` next to the other mockup routes.
- Reuses `TaskCard`, `ViewPills`, phase tint helpers; static sample data in the file.
