## Scope
Redesign only `src/components/inbox/InboxOverview.tsx` — the three planning cards (Today, Upcoming, Needs Scheduling) on the Inbox page. Quick Capture, nav, top bar, and the "Held in your inbox" buckets below remain untouched.

## Visual Language (shared across all three)
- Soft translucent cards: `bg-card/60 backdrop-blur-md` with a faint inner highlight (top gradient) and `rounded-[20px]`.
- Atmospheric accent gradients per card derived from semantic tokens (no hardcoded colors): Today = warm amber/sun, Upcoming = primary/cool, Needs Scheduling = amber/glow.
- Soft elevation `shadow-[0_8px_30px_-12px_hsl(var(--foreground)/0.08)]`, 1px hairline border `border-border/50`.
- Larger row height (44–48px), rounded metadata pills, contextual icons via existing `categoryIconFor` / `task-icons` helpers, colored priority dots (red/amber/blue from tokens).
- A small toggle at the top of the 3-card section: **All · Today (n) · Upcoming (n) · Needs (n)** — on mobile collapses to a single visible card; on desktop dims the others and emphasizes the selected. Persists to `localStorage` (`careflow:inbox-overview-focus`).

## Today Card
- Header: ☀️ icon chip · "Today" · `n tasks • Xh Ym` (sum task `estMinutes`) · right-side **circular completion ring** (SVG) showing `% done today`.
- AI insight banner (glass pill) using existing copy heuristics — e.g. "Three tasks can be completed in under 15 min." (derived locally from `estMinutes ≤ 15` count). No new edge function.
- Tasks grouped by **Morning / Afternoon / Evening** using existing `dayPart` logic + start-time inference. Each group header shows count chip.
- Row: checkbox (toggles `done`), contextual icon, title (wrap), priority dot, day-part / time pill on the right.
- Footer: `✓ N completed today · View all →` (navigates to `/today`).

## Upcoming Card
- Header: 📅 icon chip · "Upcoming" · `n items • Next 7 days` · calendar icon button (navigates `/calendar`).
- AI insight banner: localized rule-based copy ("Tomorrow is your busiest day", "Friday has the most free time", "You have N family activities this week") derived from grouped counts.
- Rows merge tasks + appointments + birthdays + holidays sorted by date. Each row: contextual icon (appointment / cake / holiday tree / task icon), title, area/category subtitle, **relative-date pill** ("Tomorrow", "In 3 days") + absolute date underneath.
- Holiday rows use amber pill; appointments use primary pill; birthdays use rose pill.
- Footer: `📅 View full calendar →`.

## Needs Scheduling Card
- Warm amber palette throughout (token-based, `bg-amber-500/10` + `ring-amber-500/20` already used; keep consistent with light/dark).
- Header: ⏳ icon chip · "Needs Scheduling" · `n task waiting` · sparkle suggestion button.
- AI scheduling insight banner ("You have 1 task waiting", "Best opening tomorrow afternoon", "This task fits a 30-min window") — rule-based using `estMinutes` + free time from today's tasks.
- Featured elevated card for the top unscheduled task: folder icon, title, category, est. time, priority pill, **Best Opening** suggestion block ("Tomorrow, 3:00 PM · 60 min available") computed locally from free slots.
- Quick action row: **Schedule** (primary gradient — uses `--primary` token), **Snooze**, **More** (overflow menu with Park, Delete).
- Dashed drop zone below ("📅 Drag tasks here to schedule") — visual only this iteration; existing inbox DnD already handles drops, will register the area as a drop target wired to set `dueDate=today` in a follow-up if needed.
- Footer: `View unscheduled (N) →` scrolls to `#inbox-held`.

## Technical Notes
Files touched:
- `src/components/inbox/InboxOverview.tsx` — full rewrite of the three sections; keep public export name and props (none).
- No new dependencies. Uses existing helpers: `apptOccursOn`, `openTaskEditor`, `categoryIconFor`, `useStore`.
- Relative-date helper added inline (`formatRelative(date)` returning "Today", "Tomorrow", "In N days", weekday).
- Insight strings derived locally — no edge function, no schema changes.
- All colors via semantic tokens or existing token-scoped utility classes; no hex literals.
- Toggle state persisted via `localStorage` alongside existing `careflow:inbox-overview` open-map.

No other files modified.
