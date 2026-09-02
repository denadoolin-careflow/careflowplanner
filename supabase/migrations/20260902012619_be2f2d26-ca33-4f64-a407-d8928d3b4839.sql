CREATE TABLE public.wellflow_reminders (
  user_id uuid PRIMARY KEY,
  water_enabled boolean NOT NULL DEFAULT false,
  water_start time NOT NULL DEFAULT '08:00',
  water_end time NOT NULL DEFAULT '20:00',
  water_interval_minutes integer NOT NULL DEFAULT 120,
  weight_enabled boolean NOT NULL DEFAULT false,
  weight_days integer[] NOT NULL DEFAULT '{1}',
  weight_time time NOT NULL DEFAULT '07:30',
  checkin_enabled boolean NOT NULL DEFAULT false,
  checkin_time time NOT NULL DEFAULT '20:00',
  glp1_enabled boolean NOT NULL DEFAULT false,
  glp1_day integer NOT NULL DEFAULT 0,
  glp1_time time NOT NULL DEFAULT '09:00',
  glp1_day_before boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wellflow_reminders TO authenticated;
GRANT ALL ON public.wellflow_reminders TO service_role;

ALTER TABLE public.wellflow_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own wellflow reminders"
ON public.wellflow_reminders FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER wellflow_reminders_updated
BEFORE UPDATE ON public.wellflow_reminders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();