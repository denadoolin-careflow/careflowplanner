
CREATE TABLE public.quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  archetype text NOT NULL,
  identity text,
  atmosphere text NOT NULL,
  planning_style text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  taken_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own quiz_results select" ON public.quiz_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own quiz_results insert" ON public.quiz_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own quiz_results update" ON public.quiz_results
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own quiz_results delete" ON public.quiz_results
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_quiz_results_updated_at
  BEFORE UPDATE ON public.quiz_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
