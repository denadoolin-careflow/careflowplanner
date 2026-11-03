# Inbox boxes as real tasks + Planner task rail mockup

## 1. Make the four Inbox boxes hold real, checkable tasks (build now)
Right now, tapping Today, This week, Someday or Notes only shows a plain list of titles. Each box will open a list of real items instead:
- **Today / This week / Someday:** each item uses the same task row as the Planner (check circle, wrapping title, time/date hint, phase edge). You can check items off from the box, and they also count as done in Planner, Today and everywhere else. Tapping a row opens the usual task editor.
- Each box also gets a small "Add" line that understands smart typing (for example "call mom 3pm"). It adds the task straight into that box.
- **Notes:** each note shows as a matching row with a note icon instead of a check circle, and opens the note when tapped.
- Box counts only count open items, so checking one off lowers the count right away.
- Checked items stay visible for a moment with a strikethrough, using your existing setting, then drop off the list.

## 2. Inbox inside the Planner + a better task rail: mockup first
I'll make a new preview page at **/task-rail-mockups** with sample items only. You can switch between options live and see each one at phone and desktop size.

**Inbox in the Planner:** a "Inbox" section at the top of the Planner's task side panel, with the four boxes as small tinted tabs. Tasks can be checked off or dragged onto the schedule. Smart typing for capturing goes at the top of the panel.

**Style options (pick one):**
1. **Calm list:** rows with spacing, phase-colored edge, and titles that wrap.
2. **Compact:** tighter single-line rows for long lists.
3. **Cards:** each task is a small rounded card showing its time estimate and project.
4. **Phase-grouped:** tasks grouped under Plan, Grow, Care and Let go headings with soft tint icons.

**Behavior options (toggles):**
- How sections are grouped: by box (Today, This week, Someday, Notes), by time (Today, Upcoming, Someday) or by area/project.
- What happens when you tap a task: check it off, open its details, or select it to place on the schedule.
- Drag onto the schedule vs. a "Schedule" button on each task, for phones.
- Whether finished tasks are hidden, faded or struck through.
- The rail is always open, collapses to icons, or slides in from the edge.
- Text size slider (already in the rail today).

After you choose, I'll build that style and behavior into the real Planner side panel. It is shared with Today, so both pages would change.

## Technical details
- `InboxSortBoxes.tsx`: build box contents from `state.tasks` (open, not inbox, no parent) and render `PlannerTaskRow` for tasks. Notes use the existing sorted-notes list. Inline add uses `parseTaskInput` + `addTask` with the box's fields (`dueDate` today / `status: this_week` / `status: someday`). Checking off uses the existing toggle path, with no schema change.
- New `src/pages/TaskRailMockups.tsx` with a public route in `App.tsx`. It uses page-local state and reuses `.planner-card`, rhythm tokens and the soft-tint phase badge.
- Later step (after you choose): add an Inbox section and the chosen style/behavior prefs (device-local) to `TaskSourcePanel.tsx`.
