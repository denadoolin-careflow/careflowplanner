## Goal
Make Google Calendar a true two-way sync with CareFlow, with the GCal events also visible on Today and an auto-refresh so the calendars stay in step without manual refresh clicks.

## What's already in place
- OAuth connect/disconnect (`google-calendar-connect`, `google-calendar-callback`, `google-calendar-disconnect`).
- `google-calendar-calendars` — list calendars + persist which calendars to show.
- `google-calendar-events` — fetch read-only events (currently rendered on Week, Month, Calendar pages and the Unscheduled Tasks Rail).
- Tokens stored in `google_calendar_tokens` with refresh-token rotation in `_shared/google-token.ts`.
- `GoogleCalendarSection` UI mounted in Settings.

The integration is currently **read-only** (scope: `calendar.readonly`) and the current user is **not connected yet** (`connected: false` in the last events call).

## Plan

### 1. Walk you through connecting (no code change)
Once we're done, you'll:
- Go to **Settings → Google Calendar**, click **Connect Google Calendar**, complete the popup.
- Toggle which calendars should appear and **Save selection**.
- After that, the changes below kick in automatically.

### 2. Surface GCal events on Today
- Add a `gcalFetchEvents(timeMin, timeMax)` call to `src/pages/Today.tsx` scoped to that day.
- Render them in the existing Today schedule rail alongside `appointments` and `time_blocks`, using the calendar's color dot, title, and time. Read-only (tapping just opens the event in Google in a new tab via `htmlLink`).

### 3. Two-way sync: push CareFlow appointments → Google
- **Schema migration**:
  - Add columns to `public.appointments`: `google_event_id text`, `google_calendar_id text`, `google_last_synced_at timestamptz`, `sync_to_google boolean default false`.
  - Add column to `public.google_calendar_tokens`: `write_calendar_id text` (the GCal calendar CareFlow writes into; defaults to `primary`).
- **Scope upgrade**: change `google-calendar-connect` scope from `calendar.readonly` to `https://www.googleapis.com/auth/calendar.events` and prompt a reconnect. Add a banner in `GoogleCalendarSection` if the stored `scope` is read-only, asking the user to reconnect to enable two-way sync.
- **New edge function `google-calendar-push`** (POST):
  - Input: `{ appointment_id, action: "upsert" | "delete" }`.
  - Loads the CareFlow appointment, calls Google `calendars/{write_calendar_id}/events` (POST for create, PATCH for update using `google_event_id`, DELETE for delete).
  - Stores `google_event_id` / `google_calendar_id` / `google_last_synced_at` back on the appointment row.
- **New edge function `google-calendar-pull`** (POST, no body):
  - Calls `events.list` per enabled calendar with `syncToken` (persisted per calendar in a new `google_calendar_sync_state` table) for incremental delta.
  - For each new GCal event with no matching `appointments.google_event_id`, inserts a row into `appointments` with `sync_to_google = false` and `google_event_id` set so we don't bounce it back.
  - For updated/deleted events, mirrors the change on the matching appointment.
- **Pick the "write" calendar**: add a small selector in `GoogleCalendarSection` ("Save new CareFlow appointments to: [primary ▾]") that persists `write_calendar_id`.
- **Per-appointment opt-in**: add a "Sync to Google" switch in `AppointmentEditor`. When on, `addAppointment` / `updateAppointment` / `deleteAppointment` in `src/lib/store.tsx` invoke `google-calendar-push` after the local DB write. Failures show a toast but don't block local saves.

### 4. Auto-refresh / background sync
- **Client**: in `Week`, `Month`, `CalendarPage`, `Today`, and `UnscheduledTasksRail`, replace the one-shot `gcalFetchEvents` with a small `useGCalEvents(timeMin, timeMax)` hook that:
  - Refetches on tab `visibilitychange → visible`.
  - Refetches every 5 minutes while tab is visible.
  - Refetches once after `addAppointment` / `updateAppointment` / `deleteAppointment` (via a lightweight event-bus call already used elsewhere or a new `gcalRefresh` callback).
- **Server**: schedule `google-calendar-pull` to run every 10 minutes for connected users using `pg_cron` + `pg_net` (one cron job that fans out across rows in `google_calendar_tokens`). This keeps GCal-side changes flowing into CareFlow even when no tab is open.

### 5. Verify
- Manually reconnect with the new scope, confirm a banner appears for users still on the old read-only scope.
- Create an appointment in CareFlow with "Sync to Google" on → confirm it appears in Google Calendar within seconds, with `google_event_id` populated in the DB.
- Edit + delete the same appointment → confirm the GCal event updates / disappears.
- Create an event in Google Calendar → wait for the next cron tick (or trigger `google-calendar-pull` manually) → confirm it appears in CareFlow with no duplicate when subsequent pulls run.
- Hard-refresh and tab-focus the Week/Month/Today views → confirm events refresh without manual click.

## Technical notes
- `google-calendar-events` already returns `{ connected, events }`, so the new hook only needs caching + polling on top.
- Use `If-Match` ETag / incremental `syncToken` from Google to avoid pulling the entire calendar every cycle.
- Cron job (`pg_cron`) will be created via `supabase--insert` (not `migration`) because it includes the project URL + anon key.
- All new edge functions follow the existing CORS pattern from `_shared/cors.ts` and use `authedUserId` + `getValidAccessToken` from `_shared/google-token.ts`.

## Files / objects touched
- New edge functions: `supabase/functions/google-calendar-push/index.ts`, `supabase/functions/google-calendar-pull/index.ts`.
- Edited edge function: `supabase/functions/google-calendar-connect/index.ts` (scope upgrade).
- Migration: `appointments` adds `google_event_id`, `google_calendar_id`, `google_last_synced_at`, `sync_to_google`; `google_calendar_tokens` adds `write_calendar_id`; new `google_calendar_sync_state` table.
- Cron job (via insert, not migration).
- Client: `src/lib/google-calendar.ts` (new helpers + hook), `src/components/calendar/GoogleCalendarSection.tsx` (scope banner + write-calendar selector), `src/components/calendar/AppointmentEditor.tsx` (sync toggle), `src/lib/store.tsx` (push on appointment writes), `src/pages/Today.tsx`, `src/pages/Week.tsx`, `src/pages/Month.tsx`, `src/pages/CalendarPage.tsx`, `src/components/calendar/UnscheduledTasksRail.tsx` (use new hook).

## Out of scope
- Syncing CareFlow `time_blocks` or `tasks` into GCal (only `appointments`).
- Recurring-event editing of GCal series (we'll mirror the master event only; per-instance edits land as a follow-up if you want them).
- Multi-account GCal (one Google account per CareFlow user, same as today).
