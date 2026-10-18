CREATE TABLE public.budget_month_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  month text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_month_targets TO authenticated;
GRANT ALL ON public.budget_month_targets TO service_role;
ALTER TABLE public.budget_month_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own month targets" ON public.budget_month_targets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);