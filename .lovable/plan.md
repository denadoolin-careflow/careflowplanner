## Goal

Add three new top-level pages — **Health**, **Wealth**, and **Home** — wired into the sidebar/bottom nav, each backed by its own Supabase tables with RLS, and each surfacing key data as widgets in the customizable dashboard registry so users can pin them to Home / Today / Week.

This plan covers data model, routes, page UIs, and dashboard widgets. Calendar hourly DnD + time-blocking polish is tracked separately (next plan).

---

## 1. Health page (`/health`)

**Sections (tabs):**
- **Check-in** — daily self-care checklist (sleep hours, water, mood, stress, meds taken, mindfulness minutes). One row per day.
- **Movement** — log workouts (type, duration, intensity, notes) + weekly minutes goal + simple streak.
- **Weight** — log weight entries with date; line chart (recharts) + 7/30-day trend, optional goal weight.
- **Meal plan goals** — pick a goal (lose / maintain / gain / high-protein / low-carb / heart-healthy / energy) and target calories/protein. Feeds a "tailored suggestions" panel that filters `meals_library` by tags matching the goal and offers one-click "Add to day".

**New tables**
- `health_checkins` — `date`, `sleep_hours`, `water_cups`, `mood`, `stress`, `meds_taken bool`, `mindfulness_minutes`, `notes`
- `movement_logs` — `date`, `activity`, `minutes`, `intensity`, `notes`
- `weight_logs` — `date`, `weight_lb numeric`, `notes`
- `health_goals` — singleton per user: `goal_type`, `target_weight_lb`, `target_calories`, `target_protein_g`, `weekly_movement_minutes`

---

## 2. Wealth page (`/wealth`)

**Sections (tabs):**
- **Overview** — month-to-date income, expenses, net, upcoming bills, debt total, subscription monthly cost. Small bar chart of spend by category.
- **Budget** — category list with monthly limit + actual spend (progress bar). Add/edit categories.
- **Transactions** — quick add income/expense (date, amount, category, note, account). Filter by month.
- **Subscriptions** — name, amount, cadence (monthly / yearly), next charge date, category. Total summary.
- **Debts** — name, balance, APR, min payment, target payoff date. Simple snowball/avalanche order toggle + estimated payoff.
- **Recurring → calendar** — any subscription or recurring transaction with a `next_due_date` automatically appears as an event/appointment on the calendar via a derived view in code (no duplicate data).

**New tables**
- `budget_categories` — `name`, `monthly_limit numeric`, `kind` ('income'|'expense'), `color`, `sort_order`
- `transactions` — `date`, `amount numeric`, `category_id` (nullable), `kind` ('income'|'expense'), `note`, `account`
- `subscriptions` — `name`, `amount numeric`, `cadence`, `next_charge_date`, `category_id`, `notes`
- `debts` — `name`, `balance numeric`, `apr numeric`, `min_payment numeric`, `target_payoff_date`, `strategy` ('snowball'|'avalanche'), `notes`
- `recurring_bills` — `name`, `amount numeric`, `cadence`, `next_due_date`, `category_id`, `notes`, `auto_create_task bool`

A small client helper `src/lib/wealth-calendar.ts` merges `subscriptions` + `recurring_bills` into the existing calendar view (read-only overlay; no DB triggers).

---

## 3. Home page (`/home-areas`) — extends the existing `/home-reset`

Rather than replace `/home-reset`, add a new **Home** hub at `/home-areas` with:

- **Cleaning zones** — reuses `cleaning_tasks` already in DB; grouped by zone with filter chips.
- **Maintenance & improvement log** — recurring maintenance items (HVAC filter, gutters, smoke alarm, etc.) with `last_done`, `next_due`, `interval_months`, `notes`. Overdue items highlighted.
- **Important documents** — file uploads (PDF, image) per category (Insurance, Warranties, Manuals, Medical, Financial, Other) with title, expiration date, notes. Stored in a new public-read-restricted Supabase Storage bucket `home-documents` with per-user folder RLS.
- **Notes** — quick text notes scoped to Home (title + body, pinnable). Reuses generic note widget logic.
- **Chore chart (per-person weekly checklist)** — list of household members + per-person weekly chores with weekday checkboxes; resets each Monday. (Per the earlier scope choice.)

**New tables**
- `home_maintenance` — `title`, `category`, `last_done date`, `next_due date`, `interval_months`, `notes`
- `home_documents` — `title`, `category`, `file_path text`, `mime_type`, `size_bytes`, `expires_on date`, `notes`
- `home_notes` — `title`, `body`, `pinned bool`, `sort_order`
- `household_members` — `name`, `color`, `avatar_emoji`, `sort_order`
- `chore_assignments` — `member_id`, `title`, `weekdays int[]`, `notes`, `sort_order`
- `chore_completions` — `assignment_id`, `member_id`, `week_start date`, `weekday int`, `done_at timestamptz` (one row per check)

**New storage bucket** `home-documents` (private). RLS on `storage.objects`: users can CRUD only inside `home-documents/{auth.uid()}/...`.

---

## 4. Navigation & routing

- Add three routes in `src/App.tsx`: `/health`, `/wealth`, `/home-areas`.
- Add three entries in `src/lib/nav.ts` `NAV` (sidebar), with Lucide icons (`HeartPulse`, `Wallet`, `Home`). Update `MOBILE_NAV` to include Health + Wealth (replacing `Journal` slot? — see question).

---

## 5. Dashboard widgets

Register new widget types in `src/components/dashboard/WidgetRegistry.tsx` so they can be added to any customizable page:

- `health-checkin` — today's check-in status + quick toggles
- `weight-trend` — 30-day weight sparkline
- `movement-week` — weekly minutes vs. goal
- `budget-summary` — month spend vs. budget
- `upcoming-bills` — next 7 days of subscriptions + recurring bills
- `debt-progress` — total balance + payoff ETA
- `chore-today` — per-person checklist for today
- `home-overdue` — overdue maintenance items

Each widget is a small wrapper around a query hook from `src/lib/{health,wealth,home}.ts`.

---

## 6. Files

**New**
- `src/pages/Health.tsx`, `src/pages/Wealth.tsx`, `src/pages/HomeAreas.tsx`
- `src/lib/health.ts`, `src/lib/wealth.ts`, `src/lib/home-areas.ts`, `src/lib/wealth-calendar.ts`
- `src/components/health/{CheckInPanel,MovementPanel,WeightPanel,GoalsPanel}.tsx`
- `src/components/wealth/{OverviewPanel,BudgetPanel,TransactionsPanel,SubscriptionsPanel,DebtsPanel}.tsx`
- `src/components/home-areas/{ZonesPanel,MaintenancePanel,DocumentsPanel,NotesPanel,ChoreChart}.tsx`
- `src/components/dashboard/widgets/{HealthCheckinWidget,WeightTrendWidget,MovementWeekWidget,BudgetSummaryWidget,UpcomingBillsWidget,DebtProgressWidget,ChoreTodayWidget,HomeOverdueWidget}.tsx`
- One Supabase migration creating all tables + RLS + storage bucket

**Edited**
- `src/App.tsx`, `src/lib/nav.ts`, `src/components/dashboard/WidgetRegistry.tsx`, `src/components/calendar/TimeGrid.tsx` (read-only overlay of recurring bills/subscriptions)

---

## Out of scope (next plans)
- Calendar hourly DnD smoothness, event resize, drag tasks → time-block, recurring auto-creation as real tasks
- Bank/Plaid sync, OCR for receipts, multi-currency
- Family member auth (chore chart members are local labels, not separate logins)

## Questions before I build
1. **Mobile nav slot** — replace `Journal` with `Health` in the bottom 5-tab bar, or keep Journal and put Health/Wealth/Home only in the sidebar + "More"?
2. **Money privacy** — add an optional "Hide amounts" toggle (blurs $ values) on the Wealth page?
3. **Documents bucket** — confirm OK to create a private `home-documents` storage bucket (per-user folder RLS, max 20 MB per file)?
