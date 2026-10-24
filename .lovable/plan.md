# Focus Goal, Life Areas redesign, Workspace quiz, Project mockups, Connections

Built in this order, each step checked at phone, tablet and desktop before moving on.

## 1. Today Focus Goal (Step 3)
- A "Today's focus goal" card at the top of My Focus, with a small chip in the Today header that shows the chosen goal.
- Tap to pick one goal using the existing life-area goal picker. Shows the life area, the current Plan/Grow/Care/Let go phase, progress, and linked tasks still open.
- "One step today" quick add: makes a task linked to that goal, dated today.
- Choice is saved per day and syncs across devices. Switch or clear it anytime; past days keep their pick.
- The Planner day view shows the same focus goal for that date.

## 2. Life Areas and Goals redesign
- Life area cards: bigger house icon, phase-colored progress ring, goal count, and the next step, laid out as a calm 2-column grid on phone and 3–4 on desktop.
- Goal cards: clearer title, season and phase badge, progress bar, linked task/habit/project counts, "Nudge today" button (sets the focus goal).
- Compost (retired goals) stays tucked in its own section.
- Only brand tokens and phase colors; no data changes.

## 3. Personal workspace quiz
- 6–8 friendly questions (life season, caregiving role, top life areas, energy rhythm, what to see first, which features to hide).
- Results suggest: priority life areas, starter goals, which Today sections show and in what order, and sidebar pages to pin or hide.
- A review screen lets the user accept all, pick some, or skip. Nothing is removed—hidden pages can come back in Settings.
- Retake from Settings; offered once to new users.

## 4. Project mockups (choose one)
A preview page with three project designs, using sample content:
- A: Garden board — columns by phase (Plan, Grow, Care, Let go).
- B: Project journal — a cover, a timeline of progress, linked notes and library items.
- C: Life-area dashboard — project cards grouped by life area with goal progress.
You pick one (or a mix) before it replaces the current project view; then the preview page is removed.

## 5. Connected web
- A shared "Connections" panel on goals, projects, tasks, habits, notes and library items listing everything linked to it (life area, goal, tasks, habits, projects, notes, library items, rituals).
- "Link…" button to attach anything to anything from one search box.
- Smart suggestions: items in the same life area or sharing tags/words are suggested to link, never auto-linked.
- Life area pages show a roll-up of all connected items.

## Technical details
- Focus goal per date: new small synced table (user, date, goal id), RLS owner-only with grants.
- Generic links: new synced link table (source type/id, target type/id) for library-to-goal/project and other pairs without an existing column; existing links (tasks.goal_id, projects.linked_goal_ids, habits meta, note_links, notes.project_id) are read as-is and merged, not migrated.
- Quiz answers and recommended layout saved per account; applied via existing visibility/layout prefs.
- Suggestions computed in the app from life area, tags and title words; no AI needed initially.
- Mockups page is temporary and removed after you choose.
