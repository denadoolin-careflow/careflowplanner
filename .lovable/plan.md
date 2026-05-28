# Project Dashboard Upgrade

Turn the existing project detail page into a dashboard with milestones, a budget panel that links to your wealth-hub records, start/end dates, and an animated sidebar for scheduling project tasks onto the calendar.

## 1. Data model

Extend `Project` (in `src/lib/types.ts` + store):

- `startDate?: string` (ISO date)
- `endDate?: string` (ISO date; replaces/augments existing `deadline`)
- `budgetCents?: number` (optional planned budget)
- `milestones?: ProjectMilestone[]`
- `linkedTransactionIds?: string[]` (wealth-hub transactions tagged to this project)
- `linkedWealthGoalIds?: string[]` (savings goals tied to this project)

New type:
```ts
ProjectMilestone {
  id: string;
  title: string;
  date?: string;
  done: boolean;
  notes?: string;
}
```

All persisted client-side in the existing store (no Supabase migration — matches current Project storage pattern).

## 2. Dashboard layout

Refactor `src/pages/ProjectDetail.tsx` into a responsive grid of cards (top stats row + 2-column body on desktop, stacked on mobile):

```text
+----------------------------------------+
| Header: name, status, dates, progress  |
+----------------------------------------+
| Overview / Notes  |  Milestones        |
|                   |                    |
+-------------------+--------------------+
| Tasks             |  Resources & Budget|
|                   |  (linked tx, goals)|
+----------------------------------------+
```

Cards:
- **Timeline card**: shadcn DatePickers for Start and Finish, computed duration, progress bar from milestones + tasks done.
- **Notes / Overview**: existing notes editor.
- **Milestones**: list with add/edit/toggle-done, optional date, sorted by date.
- **Tasks**: existing task list, plus a "Schedule" button that opens the scheduling sidebar (see §4).
- **Resources & Budget**: planned budget input, totals pulled from linked wealth-hub transactions (spent vs remaining), list of linked savings goals with progress, "Link transaction" / "Link goal" pickers that read from the wealth-hub store.

## 3. Budget integration

New helper `src/lib/project-finance.ts`:
- `getProjectSpend(projectId, transactions)` — sums linked transactions.
- `getProjectGoals(projectId, wealthGoals)` — returns linked savings goals + progress.

Resources card uses these to show: **Budget · Spent · Remaining** and a stacked bar. Buttons open small popovers to select existing transactions/goals (no new entities created in the wealth-hub).

## 4. Scheduler sidebar

New component `src/components/projects/ProjectScheduleSidebar.tsx`:
- shadcn `Sheet` from the right, animated via existing slide-in classes.
- Lists project tasks without a `dueDate` on top, scheduled tasks below.
- For each task: date picker + optional time → sets `dueDate` / `startAt` so it appears on the Today/Week/Calendar views (uses existing task store mutations).
- "Send to calendar" action reuses the existing Google Calendar push if connected; otherwise just sets the in-app due date.

Trigger: a "Schedule tasks" button in the Tasks card and a floating chip in the page header.

## 5. Small touches

- Replace the old single "deadline" field everywhere it's read with `endDate ?? deadline` for backward compat.
- Animate card mount with `animate-fade-in`; sidebar uses `slide-in-right` / `slide-out-right`.
- Mobile: cards stack, sidebar becomes full-width sheet.

## Technical notes

- Files added: `src/components/projects/ProjectDashboard.tsx`, `MilestonesCard.tsx`, `ResourcesCard.tsx`, `TimelineCard.tsx`, `ProjectScheduleSidebar.tsx`, `src/lib/project-finance.ts`.
- Files changed: `src/lib/types.ts`, `src/lib/store.tsx` (new mutations: `updateProject` already exists; add `addMilestone/updateMilestone/removeMilestone`, `linkTransactionToProject`, etc.), `src/pages/ProjectDetail.tsx` (rewritten to compose dashboard cards).
- No DB migration — projects persist in the existing local/store layer used today.

## Open questions

1. Should linking a transaction to a project also tag it in the wealth-hub UI, or only show inside the project page? (Default: tag both sides.)
2. Should the scheduler sidebar create calendar events automatically when Google Calendar is connected, or only on explicit "Push to Google"? (Default: explicit push.)
