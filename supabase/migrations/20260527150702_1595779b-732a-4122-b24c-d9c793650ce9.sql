CREATE TABLE public.moon_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  moon_phase TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL DEFAULT '',
  mood TEXT,
  energy TEXT,
  prompts JSONB NOT NULL DEFAULT '[]'::jsonb,
  intentions JSONB NOT NULL DEFAULT '[]'::jsonb,
  releases JSONB NOT NULL DEFAULT '[]'::jsonb,
  gratitude JSONB NOT NULL DEFAULT '[]'::jsonb,
  cycle_phase TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moon_journal_entries TO authenticated;
GRANT ALL ON public.moon_journal_entries TO service_role;

ALTER TABLE public.moon_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own moon_journal all" ON public.moon_journal_entries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_moon_journal_user_date ON public.moon_journal_entries(user_id, date DESC);

CREATE TRIGGER trg_moon_journal_updated_at
  BEFORE UPDATE ON public.moon_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();