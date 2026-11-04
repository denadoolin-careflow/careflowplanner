# Calmer Dashboard, Projects hub and Project page

Three pages get the Inbox/Planner look: a slim header (serif title, one subtitle line, a ⋯ menu), planner-card surfaces, 44px rows, and Plan/Grow/Care/Let go tints and badges. The Dashboard | Projects switch stays as one segmented control. Every route, feature and piece of data keeps working. Old views are hidden from the switch, not deleted.

Font note: the brand rules name DM Serif Display for headings, but your request says Playfair. I'll keep the app's current heading font unless you confirm Playfair.

## Data changes (checked against the live database)

- **Already there, no change needed:**
  - `tasks.notes`, `tasks.start_time`, `tasks.end_time` and `appointments.notes` cover the inline editor's note and time fields.
  - `notes.project_id` already links notes to a project.
  - `projects.stage`, `is_favorite`, `milestones` (jsonb), `deadline`/`target_date` and `area_id` already exist.
- **Name clash:** a `project_sections` table already exists, but it holds the task sections *inside* a project (it has a `project_id`). I won't touch it. The new per-user sections need a different table.
- **New table `project_groups`:** id, user_id, name, sort_order, created_at, updated_at.
  - Locked to the owner with RLS, plus grants.
  - The first time it loads, it fills in: This month, Next up, Someday.
- **New nullable column `projects.group_id`** (uuid). Deleting a section sets it back to null ("No section"). No project is ever deleted.
- **Files ↔ project:** reuse `entity_links` (source_type 'document' → target_type 'project'), the same way the Filing Cabinet already links files. Upload adds a row to `cabinet_documents` and then creates the link. No new table.
- **Notepad:** a normal note titled "<Project name> notes" with `project_id` set, created on the first keystroke. Its id is stored in `projects.details.notepadNoteId` so the same note is found again.

## Build order

### 1) Dashboard (`src/pages/Dashboard.tsx`)
- Header: greeting · date · moon (ScheduleDayMoon) · weather on one line. The ⋯ menu holds Calendar, Upcoming and the current extra tools.
- "Now" card: the current phase (using the Planner's phase windows), its items as PlannerTaskRow, plus "Open today's plan" and "Focus".
- Capture box using the Inbox quick-capture parser, with the Inbox count as a pill.
- "Your day in four phases": four PhaseCards with live "N of M done".
  - Each card has round phase-colored checkboxes that use the shared toggle, so a task done here is done everywhere.
  - Tapping a title opens an inline editor: title, start/end, type, note. Save, Cancel and Delete. Enter saves, Esc cancels.
  - Changing the start time moves the item to the matching phase.
  - Each card ends with a type-to-add box using the Planner quick-add parser.
- "Projects in motion" (up to 3 Grow/Care projects) and a "Go to" area: a Day·Week·Month·Year segmented row, plus chips for Anytime, Someday, Not today and Logbook, each with a count.
- New pieces: `src/components/dashboard/PhaseDayCard.tsx`, `InlineItemEditor.tsx`, `NowPhaseCard.tsx`, `DashboardHeader.tsx`.

### 2) Projects hub and Group by
- `src/lib/projects/phase.ts`: maps stage to phase (idea→Plan; planning/building→Grow; launching/maintaining→Care; waiting/blocked/paused/wrapping→Let go) and maps a phase back to a default stage when you drag. Includes a small test.
- `ProjectsHub.tsx`:
  - Slim header with a New project button and a ⋯ menu (Folders, Monthly Planning, stage and health filters).
  - "This week's focus" card.
  - One filter row of chips: All, your areas, Waiting.
  - A four-view switch: By phase, Board, Calendar, List.
  - Garden, Journal, Life areas and Gallery are hidden from the switch but their code stays.
  - Removed: stat tiles, Quick Capture chips, Recently Updated and Waiting On shelves, and the floating button.
- New `src/components/projects/hub/`:
  - `ProjectRow.tsx`: looks like an Inbox task row, with a progress ring.
  - `ByPhaseView.tsx`: Plan includes the "Add an idea…" line.
  - `ProjectBoard.tsx`: dnd-kit kanban.
  - `ProjectCalendar.tsx`: month grid. Chips wrap and day cells grow to fit. Coming up list underneath.
  - `ProjectListView.tsx`: each row has a Move to menu.
  - `GroupByControl.tsx` (Phase / My sections / Area) and `useProjectGroups.ts`.
- How dropping works on the board and list:
  - In Phase, the drop updates the stage.
  - In Area, the drop updates the area.
  - In My sections, the drop updates group_id.
  - Sections can be added, renamed (tap the name) and deleted (×).

### 3) Project page (`src/pages/ProjectDetail.tsx`)
- Back link and header: big progress ring, area, phase badge, the project's why, a four-step phase tracker, and a line with done count, due date and milestones.
- "Next step" card with Add to today (`is_top_three`) and Focus.
- Tasks grouped into the four phases (uses the existing `tasks.garden` phase, which falls back to section). Each group has PlannerTaskRow rows, an "N done" fold and type-to-add.
- Side column (stacked below the tasks on phones):
  - Milestones timeline (also feeds the Projects calendar).
  - Notepad with autosave, linked notes and a New note button.
  - Files: type badge, size and date, plus Attach from Files and Upload.
- Your existing sections and milestones stay editable.
- New `src/components/projects/detail/`: `PhaseTracker.tsx`, `ProjectNotepad.tsx`, `ProjectFiles.tsx`, `MilestoneTimeline.tsx`, `PhaseTaskGroup.tsx`.

## Checks
- Browser check signed in at phone (390px) and desktop sizes for each page after its step.
- Tests: stage↔phase mapping, and the start time → phase rule.
- AGENTS.md: add a rule for project_groups/group_id and the stage→phase mapping.
