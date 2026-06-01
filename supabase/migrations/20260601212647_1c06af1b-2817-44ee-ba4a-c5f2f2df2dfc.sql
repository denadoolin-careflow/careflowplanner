
ALTER TABLE public.pantry_items
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT 'Pantry',
  ADD COLUMN IF NOT EXISTS restock_cadence text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS last_restocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;

UPDATE public.pantry_items
SET location = CASE
  WHEN category IN ('Fridge','Dairy','Meat & Seafood') THEN 'Fridge'
  WHEN category = 'Frozen' THEN 'Freezer'
  WHEN category IN ('Spices & Baking','Condiments & Sauces','Beverages','Canned Goods','Pasta & Grains','Snacks','Bakery') THEN 'Pantry'
  WHEN category IN ('Vegetables','Fruits') THEN 'Fridge'
  ELSE 'Pantry'
END
WHERE location = 'Pantry';

CREATE INDEX IF NOT EXISTS idx_pantry_items_user_location ON public.pantry_items(user_id, location);
CREATE INDEX IF NOT EXISTS idx_pantry_items_restock ON public.pantry_items(user_id, restock_cadence) WHERE restock_cadence <> 'none';
