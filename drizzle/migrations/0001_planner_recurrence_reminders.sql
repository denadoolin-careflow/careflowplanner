ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence_series_id uuid,
  ADD COLUMN IF NOT EXISTS reminder_minutes_before integer;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS recurrence_series_id uuid;

ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS recurrence_rule jsonb,
  ADD COLUMN IF NOT EXISTS recurrence_series_id uuid,
  ADD COLUMN IF NOT EXISTS reminder_minutes_before integer;

ALTER TABLE public.caregiving_chores
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS recurrence_rule jsonb,
  ADD COLUMN IF NOT EXISTS recurrence_series_id uuid,
  ADD COLUMN IF NOT EXISTS reminder_minutes_before integer;

CREATE TABLE public.planner_recurrence_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  series_id uuid NOT NULL,
  occurrence_date date NOT NULL,
  action text NOT NULL DEFAULT 'skip' CHECK (action IN ('skip', 'override')),
  override_date date,
  override_time text,
  override_end_time text,
  override_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, series_id, occurrence_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_recurrence_exceptions TO authenticated;
GRANT ALL ON public.planner_recurrence_exceptions TO service_role;
ALTER TABLE public.planner_recurrence_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own planner recurrence exceptions"
ON public.planner_recurrence_exceptions FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX planner_recurrence_exceptions_series_date_idx
ON public.planner_recurrence_exceptions (user_id, series_id, occurrence_date);

CREATE TABLE public.planner_reminder_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  in_app_enabled boolean NOT NULL DEFAULT true,
  device_enabled boolean NOT NULL DEFAULT false,
  email_digest_enabled boolean NOT NULL DEFAULT false,
  email_digest_time text NOT NULL DEFAULT '08:00',
  planner_enabled boolean NOT NULL DEFAULT true,
  moon_enabled boolean NOT NULL DEFAULT true,
  cycle_enabled boolean NOT NULL DEFAULT true,
  journal_prompt_enabled boolean NOT NULL DEFAULT true,
  default_lead_minutes integer NOT NULL DEFAULT 10 CHECK (default_lead_minutes >= 0),
  snooze_minutes integer NOT NULL DEFAULT 15 CHECK (snooze_minutes > 0),
  quiet_enabled boolean NOT NULL DEFAULT false,
  quiet_start text NOT NULL DEFAULT '21:00',
  quiet_end text NOT NULL DEFAULT '07:00',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_reminder_preferences TO authenticated;
GRANT ALL ON public.planner_reminder_preferences TO service_role;
ALTER TABLE public.planner_reminder_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own planner reminder preferences"
ON public.planner_reminder_preferences FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.planner_saved_prompt_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prompt text NOT NULL,
  source_kind text NOT NULL DEFAULT 'journal',
  source_date date,
  remind_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_saved_prompt_reminders TO authenticated;
GRANT ALL ON public.planner_saved_prompt_reminders TO service_role;
ALTER TABLE public.planner_saved_prompt_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved prompt reminders"
ON public.planner_saved_prompt_reminders FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX planner_saved_prompt_reminders_due_idx
ON public.planner_saved_prompt_reminders (user_id, remind_at) WHERE completed_at IS NULL;