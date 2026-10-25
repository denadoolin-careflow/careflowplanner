# Redesigned project page (Plan / Grow / Care / Let go)

Replace the current project page (header buttons row, Connections strip, hero card, 9 tabs) with one calm page that matches the mockup. All existing projects, tasks, sections, milestones, notes and links are kept.

## What you'll see
1. **Header** — "Projects / [name]" breadcrumb, project icon, title and description you can edit in place, a green "+ Add task" button, and a "…" menu holding Edit, Carey, Favorite, Share (copy link) and Archive.
2. **Our intention** (wider card) — "Why it matters" and "Enough for now", each editable, with "Decide what matters and choose one small step."
3. **Project details** — Target date ("Add a date" when empty), Energy (Gentle / Moderate / Focused), People ("Just me" or people from the existing sharing).
4. **Next small step strip** — pale sage, one chosen task, its time estimate, and "Add to Today". Empty: "Choose one small step" with a picker. If that task is finished, let go or deleted, the strip clears and asks you to pick again.
5. **View toolbar** — Garden (default), List (same tasks grouped by phase), Journal (dated project notes and reflections), plus a "Completed · N" toggle that opens finished tasks with a restore option.
6. **Board** — four equal columns with icon, count, subtitle, cards, empty-state prompt and add button:
   - Plan (sprout, sage) "+ Add a decision"
   - Grow (flower, soft yellow) "+ Add a step"
   - Care (heart, terracotta) "+ Add a check-in"
   - Let go (wind, muted coral) "Set something down" — asks Released or Maybe later, optional reason, optional review date for Maybe later.
7. **Cards** — title, checkbox (not on Let go), time or date, "Next step" badge, "…" menu: Edit, Move to…, Set/remove next step, Add to Today, Delete. Let go cards show a Released / Maybe later badge and "Restore to Plan / Grow / Care". Drag between columns on desktop; "Move to…" works everywhere.
8. **Below the board** — collapsible "Notes & ideas" (existing project notes, add inline), collapsible "Connections · N" (existing links panel), and "Carey's gentle nudge" with "Help me plan" opening Carey's existing project chat. Suggestions are only shown, never added automatically.

Counts show open work only; finished and let-go items don't count as outstanding.

## Phone, tablet, desktop
- Desktop: two overview cards side by side, four columns.
- Tablet: overview cards stack, board in two columns.
- Phone: everything stacks, next step stays near the top, and phase tabs with counts show one column at a time. No sideways page scrolling. 44px tap targets, visible focus rings, labelled icons.

## Look
Page-scoped tokens only on this page (rest of the app's theme untouched): warm ivory background, white cards, forest-green text and buttons, Cormorant Garamond headings, Karla body, thin borders, small shadows, outline icons, the four phase colors with Care and Let go clearly different. No foliage, big gradients or floating buttons on this page.

## Removed from this page
The old 9-tab bar, hero card, stats tiles, "Focus this week" box, AI summary card and the header Connections strip (Connections moves to the collapsible section). The underlying data stays; milestones, files and activity remain reachable from the Journal view and the "…" menu.

## Checks
Edit intention/details and reload; move a task through all four spaces; complete vs. let go stay separate; next step clears when its task is done; Add to Today twice creates no duplicate; screenshots at phone and desktop. Small tests for phase fallback, counts and next-step clearing.

## Technical details
- Migration: `projects.details jsonb default '{}'` (whyItMatters, enoughForNow, energy, nextStepTaskId) and `tasks.garden jsonb default '{}'` (phase, letGo: released|later, letGoReason, reviewDate). Store mapping in `store.tsx` goalTo/goalFrom style; no other column changes.
- Phase = `tasks.garden.phase`, else existing section-name match (`phaseOfSection`), else Plan — fallback is display-only, never written back. Completion stays `done`; restore clears `letGo`.
- Add to Today sets the existing `isTopThree` Today focus flag (idempotent, no new task, `dueDate` untouched).
- People reads `household_users` / existing sharing; shows "Just me" when none.
- New `src/components/projects/detail/garden/*` (Header, Overview, NextStepStrip, Board, PhaseColumn, TaskCard, LetGoDialog, ListView, JournalView reusing ProjectJournalPanel, Supporting). `ProjectDetail.tsx` page body replaced; old tab components left in place unused only where other pages import them.
- Fonts: add Karla to index.html; scoped `.project-garden` tokens in index.css.
- Update AGENTS.md rule for project garden data.
