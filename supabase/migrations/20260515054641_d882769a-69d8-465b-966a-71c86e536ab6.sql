
-- Monthly intentions: word of month, intention, emotional focus, priorities, vision
CREATE TABLE public.monthly_intentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month DATE NOT NULL, -- first of month, e.g. 2026-05-01
  word TEXT,
  intention TEXT,
  emotional_focus TEXT,
  priorities JSONB NOT NULL DEFAULT '[]'::jsonb,
  vision TEXT,
  quote TEXT,
  mood_board JSONB NOT NULL DEFAULT '[]'::jsonb,
  focus_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);
ALTER TABLE public.monthly_intentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own monthly_intentions all" ON public.monthly_intentions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_monthly_intentions_updated_at
  BEFORE UPDATE ON public.monthly_intentions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Monthly reviews: reflection answers + completion summary
CREATE TABLE public.monthly_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month DATE NOT NULL,
  wins TEXT,
  challenges TEXT,
  gratitude TEXT,
  lessons TEXT,
  next_month_focus TEXT,
  rating INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);
ALTER TABLE public.monthly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own monthly_reviews all" ON public.monthly_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_monthly_reviews_updated_at
  BEFORE UPDATE ON public.monthly_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
