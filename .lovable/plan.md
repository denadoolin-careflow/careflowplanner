
# Wealth Hub — Phased Rebuild

The current `/wealth` page already has the core tables (`transactions`, `recurring_bills`, `subscriptions`, `debts`, `budget_categories`) and a basic Overview/Subscriptions/Debt UI. I'll rebuild it into a full **Wealth Hub** mirroring the Home Hub pattern — a tabbed command center with widgets, calendar integration, recurring logic, savings goals, and analytics.

This is too large for one turn. Below is a 5-phase plan. **I'll ship Phase 1 this turn** and the rest as you approve.

---

## Architecture

**Route**: `/wealth` becomes the unified Wealth Hub (sidebar label stays "Wealth").

**Tabs (sticky, mobile-first)**:
`Dashboard · Transactions · Bills · Recurring · Goals · Debts · Calendar · Analytics`

**Reused tables**: `transactions`, `recurring_bills`, `subscriptions`, `debts`, `budget_categories`.

**New tables** (added across phases):
- `savings_goals` (title, target_amount, saved_amount, target_date, color, icon, linked_project_id, recurring_contribution, contribution_cadence, notes)
- `goal_contributions` (goal_id, amount, date, transaction_id?) — feeds visual progress & milestones
- `wealth_layouts` reuses `dashboard_layouts` with pageKey `wealth-hub`

**Existing table edits** (Phase 2+):
- `recurring_bills`: add `status` ('upcoming'|'paid'|'overdue'|'pending'), `priority`, `tags[]`, `linked_goal_id`, `paid_at`, `auto_create_task`
- `transactions`: add `tags[]`, `linked_goal_id`, `linked_bill_id`, `status`

**Visual language**: keep CareFlow palette — sage green (income), warm tan/gold (goals), cream surfaces, dark plum accents (overdue, used sparingly — no harsh red). Rounded cozy-card surfaces, soft gradients, gentle progress bars.

---

## Phase 1 (this turn) — Wealth Hub shell + Dashboard + Bills tab

1. **New** `src/pages/WealthHub.tsx` — replaces `Wealth.tsx` body. Calm header (greeting, "money is a tool, not a measure of you" tone), sticky tab strip, privacy eye toggle.
2. **Customizable dashboard** — `CustomizableGrid` with `pageKey="wealth-hub"`. Widgets in Phase 1:
   - This-month income / expenses / net
   - Upcoming bills (next 14 days)
   - Subscriptions monthly equivalent
   - Debt snapshot
   - Recent transactions
   - Quick-add transaction
3. **Bills tab** — full CRUD for `recurring_bills` with inline edit: name, amount, cadence, next due, category, notes, status badge. Filter (upcoming / overdue / paid). Mark paid → auto-create transaction + advance `next_due_date` by cadence. "Coming soon" placeholders for other tabs.
4. **Sidebar nav** — keep `/wealth`, no rename.
5. **No DB migration in Phase 1** — uses existing tables.

## Phase 2 — Transactions + Recurring engine
- Full transactions table view with inline edit, drag-reorder, grouping (date/category/tag), filters, search.
- Quick add with NLP-light parsing ("rent 1800 monthly housing").
- Add `status`, `tags[]`, `linked_goal_id`, `linked_bill_id` columns.
- Recurring engine: `recurring_bills` and `subscriptions` get an edge function `wealth-roll-forward` (daily cron) that materializes upcoming entries and creates calendar appointments + tasks.
- Cadences: daily, weekly, biweekly, monthly, yearly, custom (every N days).

## Phase 3 — Savings Goals + Debts
- New `savings_goals` + `goal_contributions` tables (with RLS).
- Visual goal cards (progress ring, target date countdown, milestone toasts at 25/50/75/100%).
- Recurring contributions auto-rolled forward.
- Debts tab: snowball/avalanche view with projected payoff timeline.
- Link transactions → goals (transfer of $200 boosts Vacation Fund).

## Phase 4 — Calendar integration
- Bills, paydays, savings transfers, debt payments appear in **Today / Upcoming / Week / Month / Calendar / Daily plan / Weekly plan / Monthly plan** via a unified `useWealthEvents()` hook.
- Drag-and-drop reschedule on the calendar updates `next_due_date`.
- Optional: push wealth events to Google Calendar (uses existing connector).

## Phase 5 — Analytics + polish
- Soft-gradient charts via recharts (already installed):
  - Pie: spending by category
  - Bar: income vs expenses by month
  - Line: savings growth, debt payoff
  - Heatmap: spending rhythm
- "Budget health" summary with gentle copy ("Your upcoming bills are manageable this week").
- Animated transitions (framer-motion), haptic feedback on mobile, monthly review section with reflective prompts.

---

## What I need from you

**Confirm to ship Phase 1 now.** Reply *go* (or tweak scope). The DB migration in Phase 2 will be small and additive — won't break existing data.
