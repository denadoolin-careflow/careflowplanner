
-- Routine completions: per-day log so we can compute consistency
CREATE TABLE public.routine_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  routine_id uuid NOT NULL,
  item_id text NOT NULL,
  completed_on date NOT NULL DEFAULT (now() at time zone 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, routine_id, item_id, completed_on)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_completions TO authenticated;
GRANT ALL ON public.routine_completions TO service_role;

ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rc_select_own" ON public.routine_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rc_insert_own" ON public.routine_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rc_update_own" ON public.routine_completions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rc_delete_own" ON public.routine_completions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_routine_completions_user_day ON public.routine_completions(user_id, completed_on);
CREATE INDEX idx_routine_completions_routine ON public.routine_completions(routine_id);

-- Person overview AI cache
CREATE TABLE public.person_overviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  signature text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipient_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_overviews TO authenticated;
GRANT ALL ON public.person_overviews TO service_role;

ALTER TABLE public.person_overviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "po_select_own" ON public.person_overviews FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "po_insert_own" ON public.person_overviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "po_update_own" ON public.person_overviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "po_delete_own" ON public.person_overviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
