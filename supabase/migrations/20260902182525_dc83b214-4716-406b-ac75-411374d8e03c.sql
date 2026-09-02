CREATE TABLE public.wellflow_movement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT current_date,
  logged_at timestamptz NOT NULL DEFAULT now(),
  activity text NOT NULL DEFAULT 'walk',
  minutes integer NOT NULL DEFAULT 20,
  intensity text NOT NULL DEFAULT 'easy',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wellflow_movement_logs TO authenticated;
GRANT ALL ON public.wellflow_movement_logs TO service_role;

ALTER TABLE public.wellflow_movement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own movement logs"
ON public.wellflow_movement_logs FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX wellflow_movement_logs_user_date_idx
  ON public.wellflow_movement_logs (user_id, date DESC);

CREATE TRIGGER wellflow_movement_logs_updated
BEFORE UPDATE ON public.wellflow_movement_logs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.food_feel_logs
  ADD COLUMN IF NOT EXISTS severities jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'medication';