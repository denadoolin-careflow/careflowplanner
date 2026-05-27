CREATE TABLE public.mental_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood_word TEXT,
  mood_score INTEGER,
  anxiety INTEGER,
  focus INTEGER,
  sensory_load INTEGER,
  emotions TEXT[],
  gratitude TEXT,
  support_needed TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mental_health_logs TO authenticated;
GRANT ALL ON public.mental_health_logs TO service_role;

ALTER TABLE public.mental_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own mental_health_logs all"
ON public.mental_health_logs
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_mental_health_logs_updated
BEFORE UPDATE ON public.mental_health_logs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();