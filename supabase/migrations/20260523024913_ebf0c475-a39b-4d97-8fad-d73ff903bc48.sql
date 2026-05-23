
-- Home Rhythm assignments: pin items (tasks, chores, routines, meals, custom) to a time slot for a given date
CREATE TABLE public.home_rhythm_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  slot TEXT NOT NULL CHECK (slot IN ('morning','afternoon','evening','night')),
  source_type TEXT NOT NULL CHECK (source_type IN ('task','chore','routine','meal','custom')),
  source_id UUID,
  title TEXT NOT NULL,
  notes TEXT,
  done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_home_rhythm_user_date ON public.home_rhythm_assignments(user_id, date);

ALTER TABLE public.home_rhythm_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own rhythm assignments"
ON public.home_rhythm_assignments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own rhythm assignments"
ON public.home_rhythm_assignments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own rhythm assignments"
ON public.home_rhythm_assignments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own rhythm assignments"
ON public.home_rhythm_assignments FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER trg_home_rhythm_updated
BEFORE UPDATE ON public.home_rhythm_assignments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
