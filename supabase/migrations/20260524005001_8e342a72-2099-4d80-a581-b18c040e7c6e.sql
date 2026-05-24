
CREATE TABLE public.care_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  season text,
  top_n integer not null default 3,
  mvp_items jsonb not null default '[]'::jsonb,
  pillars_enabled jsonb not null default '["home","health","care","heart","wealth","mind","time"]'::jsonb,
  pillars_order jsonb not null default '["home","health","care","heart","wealth","mind","time"]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.care_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own care_profile select" ON public.care_profile FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own care_profile insert" ON public.care_profile FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own care_profile update" ON public.care_profile FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own care_profile delete" ON public.care_profile FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_care_profile
BEFORE UPDATE ON public.care_profile
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
