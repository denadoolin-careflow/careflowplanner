
CREATE TABLE public.daily_intentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  word TEXT,
  intention TEXT,
  theme TEXT,
  emotional_focus TEXT,
  priorities JSONB NOT NULL DEFAULT '[]'::jsonb,
  top_three JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  mood TEXT,
  energy TEXT,
  gratitude JSONB NOT NULL DEFAULT '[]'::jsonb,
  weather_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
ALTER TABLE public.daily_intentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily_intentions all" ON public.daily_intentions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_daily_intentions_updated_at
  BEFORE UPDATE ON public.daily_intentions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.daily_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  wins TEXT,
  challenges TEXT,
  gratitude TEXT,
  lessons TEXT,
  tomorrow_focus TEXT,
  rating INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
ALTER TABLE public.daily_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily_reviews all" ON public.daily_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_daily_reviews_updated_at
  BEFORE UPDATE ON public.daily_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.daily_plan_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_plan_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily_plan_layouts all" ON public.daily_plan_layouts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_daily_plan_layouts_updated_at
  BEFORE UPDATE ON public.daily_plan_layouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
