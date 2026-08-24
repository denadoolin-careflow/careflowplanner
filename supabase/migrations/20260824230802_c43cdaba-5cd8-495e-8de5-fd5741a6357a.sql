CREATE TABLE public.meal_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meal_id uuid NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  person_id uuid NOT NULL,
  person_kind text NOT NULL DEFAULT 'recipient',
  serve_time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meal_id, person_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_people TO authenticated;
GRANT ALL ON public.meal_people TO service_role;
ALTER TABLE public.meal_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own meal people" ON public.meal_people
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER meal_people_updated BEFORE UPDATE ON public.meal_people
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX meal_people_user_meal_idx ON public.meal_people (user_id, meal_id);

CREATE TABLE public.connection_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_id uuid NOT NULL,
  person_kind text NOT NULL DEFAULT 'recipient',
  person_name text,
  task_id uuid,
  note text,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_checkins TO authenticated;
GRANT ALL ON public.connection_checkins TO service_role;
ALTER TABLE public.connection_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own check-ins" ON public.connection_checkins
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER connection_checkins_updated BEFORE UPDATE ON public.connection_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX connection_checkins_user_time_idx ON public.connection_checkins (user_id, checked_in_at DESC);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS today_care_people jsonb NOT NULL DEFAULT '[]'::jsonb;