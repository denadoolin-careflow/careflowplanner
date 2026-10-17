CREATE TABLE public.meal_completion_logs (
 user_id uuid NOT NULL DEFAULT auth.uid(),
 meal_id uuid NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
 scheduled_date date NOT NULL,
 done boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, meal_id, scheduled_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_completion_logs TO authenticated;
GRANT ALL ON public.meal_completion_logs TO service_role;
ALTER TABLE public.meal_completion_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own meal completions" ON public.meal_completion_logs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.meals WHERE id = meal_id AND meals.user_id = auth.uid()));