
CREATE TABLE public.caregiver_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  water boolean NOT NULL DEFAULT false,
  food boolean NOT NULL DEFAULT false,
  meds boolean NOT NULL DEFAULT false,
  outside boolean NOT NULL DEFAULT false,
  movement boolean NOT NULL DEFAULT false,
  sleep_hours numeric,
  energy int,
  mood text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiver_checkins TO authenticated;
GRANT ALL ON public.caregiver_checkins TO service_role;

ALTER TABLE public.caregiver_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select" ON public.caregiver_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.caregiver_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.caregiver_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.caregiver_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_caregiver_checkins_updated_at
  BEFORE UPDATE ON public.caregiver_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_caregiver_checkins_user_date ON public.caregiver_checkins(user_id, date DESC);
