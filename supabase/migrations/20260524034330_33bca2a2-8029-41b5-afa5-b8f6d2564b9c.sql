
CREATE TABLE IF NOT EXISTS public.monthly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month DATE NOT NULL, -- first day of month, e.g. 2026-05-01
  word TEXT,
  theme TEXT,
  intention TEXT,
  season TEXT,
  season_notes TEXT,
  priorities JSONB NOT NULL DEFAULT '[]'::jsonb,        -- [{id,title,done,linked_task_id?}]
  outings JSONB NOT NULL DEFAULT '[]'::jsonb,           -- [{id,title,date?,notes?,linked_appt_id?}]
  activities JSONB NOT NULL DEFAULT '[]'::jsonb,        -- [{id,title,notes?,done?}]
  moon_notes TEXT,
  cycle_notes TEXT,
  ai_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

ALTER TABLE public.monthly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own monthly_plans all" ON public.monthly_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_monthly_plans_updated
BEFORE UPDATE ON public.monthly_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
