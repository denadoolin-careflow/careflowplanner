CREATE TABLE public.daily_focus_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  focus_date date NOT NULL,
  goal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, focus_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_focus_goals TO authenticated;
GRANT ALL ON public.daily_focus_goals TO service_role;
ALTER TABLE public.daily_focus_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own focus goals" ON public.daily_focus_goals FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_type text NOT NULL,
  source_id text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_type, source_id, target_type, target_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_links TO authenticated;
GRANT ALL ON public.entity_links TO service_role;
ALTER TABLE public.entity_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own entity links" ON public.entity_links FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.workspace_profiles (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  dismissed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_profiles TO authenticated;
GRANT ALL ON public.workspace_profiles TO service_role;
ALTER TABLE public.workspace_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own workspace profile" ON public.workspace_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_focus_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entity_links;