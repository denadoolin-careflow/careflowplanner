# Project journal view, simpler phone Projects, and project-page mockups

## 1. Project journal view in the switcher
- Add a **Journal** option beside Garden, Life areas, Cards, List and Gallery. It's remembered like the others.
- Layout: a list of projects on the left (desktop/tablet) or a swipeable project picker at the top (phone). The active project is the one you picked last, or the most recently updated one if you haven't picked one.
- The active project shows as one journal page:
  - A cover with the name, life area, phase (Plan/Grow/Care/Let go) and task progress
  - **Milestones** you can tick off
  - **Timeline** of the last 14 days (tasks finished and added)
  - **Linked notes** and journal entries
  - **Library items** linked through Connections
  - An "Open project" button to see the full project page
- Your existing projects and data stay as they are.

## 2. Simpler Projects page on phones
- Shorter header with the view switcher as one row of small icon pills you swipe sideways.
- Search and filters tucked behind one "Filter" button with a count badge.
- Single-column cards with bigger tap areas (44px+), progress bar, phase chip and next task. Fewer badges.
- Garden columns get full width with snap swiping and a small dot indicator for the 4 phases.
- More space at the bottom so the floating buttons don't cover the last card.
- Checked at 384px, tablet and desktop with no sideways overflow.

## 3. Mockups of the inside of a project (preview only)
A temporary preview page with sample content and three designs for the project page:
- **A: Journal page:** cover on top, then a timeline that mixes milestones, notes, library items and finished tasks by date.
- **B: Garden page:** the project's tasks in Plan / Grow / Care / Let go columns, with milestones as "seeds" along the top.
- **C: Journal + Garden:** tabs for Journal and Garden, with a shared summary card (progress, next step, linked goal) above both.
Each one shown at phone and desktop size. The real project page stays the same until you pick one; then the preview is removed.

## Technical details
- `View` in ProjectsHub gets `"journal"`. New `ProjectsJournalView` reuses MilestonesCard, ProjectProgressTimeline, ProjectJournalPanel and useConnections (library + note targets, plus notes.project_id). The active project id is saved on the device (localStorage).
- Phone tidy-up stays in the ProjectsHub/ProjectGroupedViews presentation code only.
- Mockups at `/projects/detail-mockups`. The old `/projects/mockups` page gets removed now that the switcher replaces it.
- No database changes.
