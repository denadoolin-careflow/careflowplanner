-- FOOD ENTRIES
CREATE TABLE public.food_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  logged_at timestamptz NOT NULL DEFAULT now(),
  food_name text NOT NULL,
  serving_size text,
  servings numeric NOT NULL DEFAULT 1,
  calories numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  fiber numeric NOT NULL DEFAULT 0,
  meal_type text NOT NULL DEFAULT 'other',
  source text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_entries TO authenticated;
GRANT ALL ON public.food_entries TO service_role;
ALTER TABLE public.food_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own food entries" ON public.food_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX food_entries_user_date_idx ON public.food_entries (user_id, date);
CREATE TRIGGER food_entries_updated BEFORE UPDATE ON public.food_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CUSTOM / SAVED FOODS
CREATE TABLE public.custom_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  serving_size text,
  calories numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  fiber numeric NOT NULL DEFAULT 0,
  favorite boolean NOT NULL DEFAULT false,
  times_logged integer NOT NULL DEFAULT 0,
  barcode text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_foods TO authenticated;
GRANT ALL ON public.custom_foods TO service_role;
ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own custom foods" ON public.custom_foods FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX custom_foods_user_idx ON public.custom_foods (user_id);
CREATE TRIGGER custom_foods_updated BEFORE UPDATE ON public.custom_foods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- NUTRITION + WEIGHT GOALS
CREATE TABLE public.nutrition_goals (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calories numeric,
  protein numeric,
  fiber numeric,
  carbs numeric,
  fat numeric,
  water_oz numeric,
  starting_weight numeric,
  goal_weight numeric,
  weight_unit text NOT NULL DEFAULT 'lb',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_goals TO authenticated;
GRANT ALL ON public.nutrition_goals TO service_role;
ALTER TABLE public.nutrition_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nutrition goals" ON public.nutrition_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER nutrition_goals_updated BEFORE UPDATE ON public.nutrition_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- WATER
CREATE TABLE public.water_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  logged_at timestamptz NOT NULL DEFAULT now(),
  ounces numeric NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_entries TO authenticated;
GRANT ALL ON public.water_entries TO service_role;
ALTER TABLE public.water_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own water entries" ON public.water_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX water_entries_user_date_idx ON public.water_entries (user_id, date);

-- GLP-1 PROFILE
CREATE TABLE public.glp1_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_name text,
  prescribed_dose text,
  frequency text NOT NULL DEFAULT 'weekly',
  injection_day text,
  start_date date,
  provider text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glp1_profile TO authenticated;
GRANT ALL ON public.glp1_profile TO service_role;
ALTER TABLE public.glp1_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own glp1 profile" ON public.glp1_profile FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER glp1_profile_updated BEFORE UPDATE ON public.glp1_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- GLP-1 INJECTIONS
CREATE TABLE public.glp1_injections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  time_of_day time,
  medication text,
  dose text,
  injection_site text,
  symptoms text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glp1_injections TO authenticated;
GRANT ALL ON public.glp1_injections TO service_role;
ALTER TABLE public.glp1_injections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own glp1 injections" ON public.glp1_injections FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX glp1_injections_user_date_idx ON public.glp1_injections (user_id, date DESC);
CREATE TRIGGER glp1_injections_updated BEFORE UPDATE ON public.glp1_injections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- WELLNESS CHECK-INS
CREATE TABLE public.wellness_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  hunger smallint,
  fullness smallint,
  energy smallint,
  nausea smallint,
  digestion smallint,
  mood smallint,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wellness_checkins TO authenticated;
GRANT ALL ON public.wellness_checkins TO service_role;
ALTER TABLE public.wellness_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wellness checkins" ON public.wellness_checkins FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER wellness_checkins_updated BEFORE UPDATE ON public.wellness_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();