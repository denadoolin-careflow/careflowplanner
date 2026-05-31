ALTER TABLE public.pantry_items ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Backfill per (user, status) using name order
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id, stock_status ORDER BY name) AS rn
  FROM public.pantry_items
)
UPDATE public.pantry_items p
SET sort_order = ranked.rn
FROM ranked
WHERE p.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_pantry_user_status_order
  ON public.pantry_items (user_id, stock_status, sort_order);
CREATE INDEX IF NOT EXISTS idx_pantry_user_cat_order
  ON public.pantry_items (user_id, category, sort_order);