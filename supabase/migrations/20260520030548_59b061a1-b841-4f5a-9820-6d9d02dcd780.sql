
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS google_calendar_id text,
  ADD COLUMN IF NOT EXISTS google_last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS sync_to_google boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS end_time text,
  ADD COLUMN IF NOT EXISTS all_day boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_google_event_uidx
  ON public.appointments(user_id, google_calendar_id, google_event_id)
  WHERE google_event_id IS NOT NULL;

ALTER TABLE public.google_calendar_tokens
  ADD COLUMN IF NOT EXISTS write_calendar_id text NOT NULL DEFAULT 'primary';

CREATE TABLE IF NOT EXISTS public.google_calendar_sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  calendar_id text NOT NULL,
  sync_token text,
  last_pulled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, calendar_id)
);

ALTER TABLE public.google_calendar_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own gcal sync state all"
  ON public.google_calendar_sync_state FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_gcal_sync_state_updated
  BEFORE UPDATE ON public.google_calendar_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
