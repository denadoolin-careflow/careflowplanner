ALTER TABLE public.grocery_items
  ADD COLUMN IF NOT EXISTS source_meal_id UUID,
  ADD COLUMN IF NOT EXISTS source_meal_name TEXT,
  ADD COLUMN IF NOT EXISTS source_slot TEXT,
  ADD COLUMN IF NOT EXISTS source_date DATE;
CREATE INDEX IF NOT EXISTS idx_grocery_items_source_meal ON public.grocery_items(user_id, source_meal_id);