CREATE TABLE public.care_guide_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_date date NOT NULL,
  atmosphere text,
  brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, brief_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_guide_briefs TO authenticated;
GRANT ALL ON public.care_guide_briefs TO service_role;

ALTER TABLE public.care_guide_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own care guide briefs"
  ON public.care_guide_briefs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_care_guide_briefs_updated_at
  BEFORE UPDATE ON public.care_guide_briefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();