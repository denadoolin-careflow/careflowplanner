-- Mental Load + Decision Support tables

-- 1) Brain dumps inbox
CREATE TABLE public.brain_dumps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  ai_category text,           -- task | appointment | errand | worry | idea | someday | routine
  ai_title text,              -- cleaned, short title from AI
  status text NOT NULL DEFAULT 'inbox', -- inbox | sorted | promoted | archived
  promoted_task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brain_dumps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own brain_dumps all" ON public.brain_dumps
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_brain_dumps_updated BEFORE UPDATE ON public.brain_dumps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_brain_dumps_user_created ON public.brain_dumps(user_id, created_at DESC);

-- 2) Daily mental-load check-ins (one per user per day)
CREATE TABLE public.mental_load_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  energy smallint NOT NULL DEFAULT 3,        -- 1..5
  emotional smallint NOT NULL DEFAULT 3,     -- 1..5
  caregiving smallint NOT NULL DEFAULT 3,    -- 1..5
  note text,
  minimum_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
ALTER TABLE public.mental_load_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mental_load_checkins all" ON public.mental_load_checkins
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_mental_load_checkins_updated BEFORE UPDATE ON public.mental_load_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_mlc_user_date ON public.mental_load_checkins(user_id, date DESC);

-- Validation trigger (range checks live in a trigger, not CHECK, per project rules)
CREATE OR REPLACE FUNCTION public.validate_mental_load_checkin()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.energy NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'energy must be 1..5'; END IF;
  IF NEW.emotional NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'emotional must be 1..5'; END IF;
  IF NEW.caregiving NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'caregiving must be 1..5'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_mlc BEFORE INSERT OR UPDATE ON public.mental_load_checkins
  FOR EACH ROW EXECUTE FUNCTION public.validate_mental_load_checkin();

-- 3) Minimum viable day template (one row per user)
CREATE TABLE public.minimum_viable_day (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  items text[] NOT NULL DEFAULT ARRAY[
    'Drink water',
    'Feed family',
    'One small home reset',
    'One important task',
    'Rest for a few minutes'
  ],
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.minimum_viable_day ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own minimum_viable_day all" ON public.minimum_viable_day
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_mvd_updated BEFORE UPDATE ON public.minimum_viable_day
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();