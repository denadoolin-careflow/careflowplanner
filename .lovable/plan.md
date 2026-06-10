## Goal
Make task priority instantly readable on Today, Week, and Anytime list rows using the selected **right-side priority badge** direction (with soft glow on high-priority dots and the left accent bar).

## Visual spec (per row)
- **Left accent bar** — replaces today's thin area-color dot column.
  - High → 6×32 rounded bar, `priority-high` color, soft outer glow.
  - Medium → 6×32 bar, `priority-med` color, no glow.
  - Low / none → 6×32 bar in the row's **area color** (so areas stay scannable when priority isn't set).
- **Right-side priority badge** — a rounded chip pinned to the row end.
  - High: filled tint `bg-high/10`, border `border-high/20`, 3 stacked dots + uppercase label "URGENT", dots get the soft glow.
  - Medium: lighter `bg-med/5`, 2 lit + 1 dim dot, label "MED".
  - Low / none: badge hidden by default (configurable later) to keep low-priority rows calm.
- **Meta row** — remove the now-redundant inline priority dots; keep area name, smart-due chip, and tags.
- **Hover/selection** — badge hides while `TaskHoverActions` is visible so the action cluster has room. On small screens (`< sm`) the badge shows dots only, no text.
- **Glow** — single utility class `shadow-priority-high` defined in Tailwind config; applied only to the high-priority bar and its dot cluster (perf-friendly, no per-row variants needed).

## Where it lives
Only `src/components/cards/TaskRow.tsx` (used by Today's Top 3, Week, Anytime list, and project lists — single change covers all surfaces).

## Tokens to add
In `src/index.css`:
- `--priority-high: 351 83% 61%` (rose)
- `--priority-med: 38 92% 50%` (amber)
- `--priority-low: 220 9% 46%` (slate/muted)
- `--priority-high-glow: 351 83% 61% / 0.35`

In `tailwind.config.ts` extend:
- `colors.priority = { high, med, low }` mapped to the tokens.
- `boxShadow['priority-high'] = '0 0 12px hsl(var(--priority-high) / 0.35)'`.

This keeps the component free of hardcoded `rose-500`/`amber-500` and matches the project's existing semantic-token rule.

## TaskRow changes (technical)
1. Replace `PRIORITY_TONE` map with a `priorityStyles` map returning `{ bar, badgeBg, badgeBorder, dot, label, glow }` keyed off `task.priority`.
2. Swap the existing left area-color dot for the new vertical bar element; fall back to `areaColor` inline style when `priority === 'low'`.
3. Add the badge JSX right before `TaskHoverActions`, wrapped in `hidden group-hover:flex sm:flex` logic so hover actions take precedence on hover.
4. Remove lines 305–322 inline priority dots in the meta row.
5. Click on the badge cycles priority (preserves the existing `priority cycle` interaction currently bound to the meta dots) and shows a tooltip "Click to change priority".
6. Subtask rows (`isSubtask`) render a slimmer 4×20 bar and skip the badge to avoid clutter.

## Out of scope
- No backend / data-model changes (priority field already exists).
- No board / kanban card restyle (this PR is list rows only).
- Filter-by-priority controls — separate request.

## Acceptance
- A high-priority task on Today, Week, and Anytime shows a glowing rose bar + "URGENT" badge.
- A medium task shows an amber bar + "MED" badge.
- Low/unset tasks look the same as today minus the tiny meta dots, with the area color preserved on the left bar.
- Hovering a row hides the badge so hover actions don't overlap; mobile shows compact dots-only badge.
