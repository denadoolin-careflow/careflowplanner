
-- meals_library
CREATE TABLE public.meals_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  slot text,
  prep_minutes integer,
  cook_minutes integer,
  servings integer,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  image_url text,
  icon text,
  color text,
  energy_level text NOT NULL DEFAULT 'medium',
  family_rating integer,
  is_favorite boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meals_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meals_library all" ON public.meals_library FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER meals_library_updated BEFORE UPDATE ON public.meals_library FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- grocery_categories
CREATE TABLE public.grocery_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  collapsed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.grocery_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own grocery_categories all" ON public.grocery_categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER grocery_categories_updated BEFORE UPDATE ON public.grocery_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- user_pantry_colors
CREATE TABLE public.user_pantry_colors (
  user_id uuid PRIMARY KEY,
  in_stock_color text NOT NULL DEFAULT '142 70% 45%',
  low_color text NOT NULL DEFAULT '38 92% 55%',
  out_color text NOT NULL DEFAULT '0 75% 60%',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_pantry_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pantry_colors all" ON public.user_pantry_colors FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_pantry_colors_updated BEFORE UPDATE ON public.user_pantry_colors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- extend pantry_items
ALTER TABLE public.pantry_items
  ADD COLUMN IF NOT EXISTS stock_status text NOT NULL DEFAULT 'in_stock',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS qty text;

-- extend grocery_items
ALTER TABLE public.grocery_items
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text;
