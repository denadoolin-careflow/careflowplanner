CREATE TABLE public.wellflow_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  entry text NOT NULL DEFAULT '',
  mood smallint,
  energy smallint,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wellflow_journal TO authenticated;
GRANT ALL ON public.wellflow_journal TO service_role;

ALTER TABLE public.wellflow_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own health journal" ON public.wellflow_journal
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own health journal" ON public.wellflow_journal
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own health journal" ON public.wellflow_journal
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own health journal" ON public.wellflow_journal
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER wellflow_journal_set_updated_at
  BEFORE UPDATE ON public.wellflow_journal
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX wellflow_journal_user_date_idx ON public.wellflow_journal (user_id, date DESC);