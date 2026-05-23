CREATE TABLE public.period_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('week','month')),
  kind TEXT NOT NULL DEFAULT 'review' CHECK (kind IN ('review','reset')),
  period_start DATE NOT NULL,
  content JSONB,
  reflection TEXT,
  intentions TEXT[] NOT NULL DEFAULT '{}',
  wins TEXT[] NOT NULL DEFAULT '{}',
  releases TEXT[] NOT NULL DEFAULT '{}',
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_period_reviews_user ON public.period_reviews(user_id, period, period_start DESC);

ALTER TABLE public.period_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own period_reviews select" ON public.period_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own period_reviews insert" ON public.period_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own period_reviews update" ON public.period_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own period_reviews delete" ON public.period_reviews FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_period_reviews_updated_at
  BEFORE UPDATE ON public.period_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();