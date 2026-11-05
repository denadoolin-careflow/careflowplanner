# Drag and drop everywhere, smaller pills, board cards, choose focus project

## What you'll get

1. **Drag and drop on every project/task view**
   - **Projects page**
     - By phase: drag a project row into another phase section. This changes its stage.
     - Board: drag cards between columns, whether grouped by Phase, My sections or Area. This already works; I'll make it more reliable on phones (press and hold, then drag).
     - List: drag rows between group headers. The Move to menu stays.
     - Calendar: drag a project chip to another day to change its due date. Drag a milestone chip to move that milestone's date.
   - **Dashboard**
     - Drag a task between the four phase cards. This moves its start time into that phase's window.
     - Drag a project in "Projects in motion" onto a phase to change its stage.
   - **Project page**
     - Drag tasks between the Plan / Grow / Care / Let go groups.
     - Drag tasks to reorder them within a group.
     - Drag a milestone to reorder it.
   - **Feedback while dragging:** a drop zone glows in its phase tint and shows a short label ("Move to Grow"). Every drop shows a confirmation with an Undo option.
   - **Without dragging:** each item keeps a Move to menu, so you can do the same moves by tapping.

2. **Smaller pill selectors.** The view switch (By phase/Board/Calendar/List), Group by, filter chips and the Dashboard|Projects switch get shorter, tighter pills with smaller text. The tappable area still meets the 44px rule through padding around each pill.

3. **Board view as real cards.** Each project becomes a rounded card with:
   - a phase-colored top edge
   - the area badge
   - the name, which wraps onto more lines
   - a progress bar
   - the next task
   - a due pill
   - a small focus star

   Columns get a soft phase tint and a count.

4. **Choose this week's focus project.**
   - The focus card gets a "Change" button that opens a picker with search and phase badges.
   - Each project card, row and project page gets a "Set as this week's focus" option.
   - Your pick holds for the current week.
   - With no pick, the card falls back to your favorite project, then the one you touched most recently (as now).

## Technical details
- Drag library: the app's existing @dnd-kit, with pointer, touch (long-press) and keyboard sensors. One shared drag layer per page.
- Drop rules:
  - phase drop → `projects.stage` (the first stage mapped to that phase)
  - section drop → `projects.group_id`
  - area drop → area
  - calendar drop → `deadline` / milestone date
  - task phase drop on the Project page → `tasks.garden` phase
  - task phase drop on the Dashboard → start time shifted to the phase window
- The weekly focus is stored on the project in `projects.details.weeklyFocus = "YYYY-Www"`. Setting it clears the flag on the other projects. The data structure doesn't change.
- Files to change:
  - `ProjectsHub.tsx`
  - `ProjectPhaseViews.tsx`
  - `ProjectGroupedViews.tsx`
  - `Dashboard.tsx` (phase cards)
  - `ProjectDetail.tsx` / project page task groups and milestones
  - a new shared `ProjectDnd` helper
  - a new `FocusProjectPicker`
- Tests: drop-target → field mapping, and focus selection (pick, then favorite, then recent).
