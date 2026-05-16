
-- cycle_settings: one row per user
CREATE TABLE public.cycle_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  avg_cycle_length integer NOT NULL DEFAULT 28,
  avg_period_length integer NOT NULL DEFAULT 5,
  luteal_length integer NOT NULL DEFAULT 14,
  show_fertility boolean NOT NULL DEFAULT true,
  pair_with_moon boolean NOT NULL DEFAULT true,
  moon_archetype text NOT NULL DEFAULT 'auto',
  auto_low_energy boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cycle_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cycle_settings all" ON public.cycle_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_cycle_settings_updated BEFORE UPDATE ON public.cycle_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- cycle_logs: one row per period
CREATE TABLE public.cycle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cycle_logs_user_start ON public.cycle_logs (user_id, period_start DESC);
ALTER TABLE public.cycle_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cycle_logs all" ON public.cycle_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_cycle_logs_updated BEFORE UPDATE ON public.cycle_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- cycle_day_logs: one row per (user, date)
CREATE TABLE public.cycle_day_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  flow text,
  symptoms text[] NOT NULL DEFAULT '{}',
  mood text,
  energy_level text,
  bbt numeric,
  cervical_mucus text,
  is_intimate boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
CREATE INDEX idx_cycle_day_logs_user_date ON public.cycle_day_logs (user_id, date DESC);
ALTER TABLE public.cycle_day_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cycle_day_logs all" ON public.cycle_day_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_cycle_day_logs_updated BEFORE UPDATE ON public.cycle_day_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
