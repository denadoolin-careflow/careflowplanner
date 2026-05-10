
-- Meal preferences (one row per user)
CREATE TABLE public.meal_preferences (
  user_id UUID PRIMARY KEY,
  family_size INTEGER NOT NULL DEFAULT 2,
  diets TEXT[] NOT NULL DEFAULT '{}',
  allergies TEXT[] NOT NULL DEFAULT '{}',
  dislikes TEXT[] NOT NULL DEFAULT '{}',
  cuisines TEXT[] NOT NULL DEFAULT '{}',
  budget_level TEXT NOT NULL DEFAULT 'medium',
  max_prep_minutes INTEGER NOT NULL DEFAULT 30,
  low_energy BOOLEAN NOT NULL DEFAULT false,
  picky_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meal_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meal prefs all" ON public.meal_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_meal_prefs_updated BEFORE UPDATE ON public.meal_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Favorite meals
CREATE TABLE public.favorite_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slot TEXT,
  prep_minutes INTEGER,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.favorite_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fav meals all" ON public.favorite_meals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_fav_meals_updated BEFORE UPDATE ON public.favorite_meals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_fav_meals_user ON public.favorite_meals(user_id);

-- Pantry staples
CREATE TABLE public.pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pantry all" ON public.pantry_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_pantry_updated BEFORE UPDATE ON public.pantry_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_pantry_user ON public.pantry_items(user_id);

-- Add recipe fields to existing meals table (for AI-generated recipe details)
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS prep_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
