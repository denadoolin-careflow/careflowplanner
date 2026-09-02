CREATE TABLE public.food_feel_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_id UUID REFERENCES public.food_entries(id) ON DELETE SET NULL,
  food_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rating SMALLINT NOT NULL DEFAULT 3,
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  delay_minutes INTEGER,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_feel_logs TO authenticated;
GRANT ALL ON public.food_feel_logs TO service_role;

ALTER TABLE public.food_feel_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own food feel logs"
  ON public.food_feel_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX food_feel_logs_user_date_idx ON public.food_feel_logs (user_id, date DESC);

CREATE TRIGGER food_feel_logs_updated
  BEFORE UPDATE ON public.food_feel_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.wellflow_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  style TEXT NOT NULL DEFAULT 'balanced',
  pace TEXT NOT NULL DEFAULT 'steady',
  active BOOLEAN NOT NULL DEFAULT true,
  target_calories INTEGER,
  target_protein INTEGER,
  target_carbs INTEGER,
  target_fat INTEGER,
  target_fiber INTEGER,
  target_water_oz INTEGER,
  movement_days SMALLINT NOT NULL DEFAULT 3,
  notes TEXT,
  started_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wellflow_plans TO authenticated;
GRANT ALL ON public.wellflow_plans TO service_role;

ALTER TABLE public.wellflow_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own wellflow plans"
  ON public.wellflow_plans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX wellflow_plans_user_idx ON public.wellflow_plans (user_id, active);

CREATE TRIGGER wellflow_plans_updated
  BEFORE UPDATE ON public.wellflow_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();