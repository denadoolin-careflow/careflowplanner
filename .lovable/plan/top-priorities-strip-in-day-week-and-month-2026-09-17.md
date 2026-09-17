# Top Priorities strip in Day, Week and Month

A pinned strip at the top of the planner showing up to three priorities for whatever you are looking at — this day, this week, or this month. Each period keeps its own set, so a monthly priority does not crowd out today's.

## What you will see

- A compact band directly under the planner header, above the calendar, in Day, Week and Month views.
- Label matches the view: "Top 3 today", "Top 3 this week", "Top 3 this month", with the date range next to it.
- Up to three numbered rows. Each shows the title, a check circle to mark it done, and an x to unpin it.
- An inline "Add priority" field appears while there are fewer than three. Typing and pressing Enter creates a task dated in that period and pins it.
- Tapping a priority opens the existing task editor.
- Empty state: "Nothing pinned yet — name up to three things that matter this week."
- Drag any planner card onto the strip to pin it as a priority.
- On phones the strip stays but condenses to single-line rows; it scrolls away with the page rather than covering the calendar.

## How priorities are stored

A new private table keeps one row per pinned priority: the period kind (day / week / month), the period start date, the linked task, and its position. Only the owner can read or write their own rows. Weeks start Monday, matching the rest of the planner. Today's existing "Top Priorities" card in the side panel reads from the same day-scoped set, so the two stay in sync.

## Technical notes

- Migration: `planner_priorities` (id, user_id, period_kind, period_start date, task_id fk to tasks, position int, created_at) with GRANTs for authenticated/service_role, RLS enabled, owner-only policies, and a unique index on (user_id, period_kind, period_start, task_id).
- New hook `src/lib/planner/use-priorities.ts`: `usePriorities(date, scope)` returns `{ items, add(title), pin(taskId), unpin(id), toggleDone(taskId), reorder(ids) }`, resolving period_start via `startOfDay` / `startOfWeek(Monday)` / `startOfMonth`.
- New `src/components/planner/PlannerPriorityStrip.tsx` with a `scope: "day" | "week" | "month"` prop; drop target registered through the existing `useDropZone` from `src/lib/planner/planner-dnd.tsx` (id `priority:${scope}:${iso}`), accepting task and appointment items.
- Mount in `src/pages/Planner.tsx` just above the `flex min-w-0 flex-col gap-3` view container, rendered for `view === "day" | "week" | "month"` with the scope mapped from `view`.
- `TopPrioritiesCard.tsx` switches from the `isTopThree` task flag to the day-scoped hook; the `isTopThree` flag stays written for backward compatibility with the Today widgets.
