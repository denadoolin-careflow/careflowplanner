
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  iso_date date NOT NULL,
  ai_payload jsonb,
  mood text,
  gratitude jsonb,
  capture_text text,
  capture_media jsonb,
  chosen_intention text,
  saved_mantra text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, iso_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_checkins TO authenticated;
GRANT ALL ON public.daily_checkins TO service_role;

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own daily_checkins select" ON public.daily_checkins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own daily_checkins insert" ON public.daily_checkins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own daily_checkins update" ON public.daily_checkins
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own daily_checkins delete" ON public.daily_checkins
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_daily_checkins_updated_at
  BEFORE UPDATE ON public.daily_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS daily_checkins_user_date_idx
  ON public.daily_checkins (user_id, iso_date DESC);
