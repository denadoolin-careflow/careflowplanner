# Per-Person Progress & Cycle Check-Ins

Add lightweight progress tracking and recurring, cycle-aware check-in reminders for each person in the caregiving space, surfaced on their dashboard. Be mindful of those that are male and don't include cycle data for men, focus on developmental and well being check ins.

## 1. Data model

New tables (RLS scoped to `auth.uid() = user_id`):

- `**person_progress_entries**` — timeline of measurable progress per recipient.
  - `recipient_id`, `user_id`, `category` (`milestone | skill | mood | health | behavior | custom`), `label`, `value_numeric` (nullable, e.g. 1–10 scale), `value_text`, `notes`, `recorded_at`.
- `**person_progress_goals**` — optional targets a recipient is working toward.
  - `recipient_id`, `user_id`, `title`, `category`, `target_value`, `current_value`, `unit`, `status` (`active | achieved | paused`), `target_date`.
- `**person_checkins**` — scheduled check-in templates per recipient.
  - `recipient_id`, `user_id`, `title`, `prompt`, `cadence` (`daily | weekly | cycle_phase | custom_days`), `cadence_config` jsonb (e.g. `{ phase: "luteal" }` or `{ days: ["mon","thu"] }`), `last_completed_at`, `next_due_at`, `active`.
- `**person_checkin_responses**` — answers logged against a check-in.
  - `checkin_id`, `recipient_id`, `user_id`, `mood` (1–5), `energy` (1–5), `notes`, `tags text[]`, `cycle_phase`, `responded_at`.

All four tables get standard `GRANT`s for `authenticated` + `service_role`, RLS enabled, and `auth.uid() = user_id` policies for SELECT/INSERT/UPDATE/DELETE. `updated_at` trigger reuses `public.set_updated_at()`.

## 2. Cycle-aware scheduler

Reuse the existing `phaseForDate` helper that already powers `PersonDashboard`.

- A small `src/lib/checkins.ts` module computes `nextDueAt(checkin, recipient, today)`:
  - `daily` → tomorrow 9am local.
  - `weekly` → next matching weekday.
  - `custom_days` → next day in `cadence_config.days`.
  - `cycle_phase` → next date whose `phaseForDate(date, recipient.cycle)` equals the configured phase; if recipient has no cycle data, fall back to weekly and flag it in the UI.
- `next_due_at` is recomputed on the client after each response is saved (no cron needed). A nightly recompute happens lazily on app load for any check-ins where `next_due_at < now()`.

## 3. UI surfaces

All additions live in caregiving / dashboard surfaces; no business-logic changes elsewhere.

- `**PersonDashboard.tsx**` gets two new `SectionCard`s:
  - **Progress** — sparkline of recent `person_progress_entries` per category, list of active goals with progress bars, "Log progress" button → `LogProgressDialog`.
  - **Check-ins** — list of active check-ins with `next_due_at`, "Respond now" button → `CheckinResponseDialog`, and "Manage check-ins" → `CheckinManager`.
- `**LogProgressDialog.tsx**` (new) — category picker, label, optional numeric value + unit, notes, date.
- `**CheckinManager.tsx**` (new) — CRUD list of check-ins with cadence picker. When `cadence = cycle_phase`, show a phase dropdown (menstrual / follicular / ovulatory / luteal) and a hint when the recipient has no cycle data.
- `**CheckinResponseDialog.tsx**` (new) — mood + energy sliders, notes, tag chips; auto-stamps `cycle_phase` from `phaseForDate`.
- **Home / Today surface** — extend the existing "today" feed (wherever `RoutineFocusMode` and Reset items already appear) to include due check-ins as cards with a one-tap "Respond" action. Person color/icon chip from the existing family-tag system identifies whose check-in it is.

## 4. AI integration (light touch)

Pass the last ~14 days of `person_progress_entries` + recent check-in mood/energy averages into the existing `ai-person-overview` payload so the developmental plan reflects observed trends. No new edge function; just extend the prompt + the `useAIPersonOverview` signature. Stays at AI weight 5.

## Technical notes

- Frontend stores: add `progressStore` and `checkinsStore` next to `routinesStore` in `src/lib/`, mirroring existing zustand patterns and `byRecipient` selectors.
- Realtime: enable `supabase_realtime` on the four new tables so multiple devices stay in sync (matches existing pattern for routines).
- No new secrets, no new connectors.
- Build order: migration → stores → dialogs → dashboard sections → today-feed integration → AI prompt extension.