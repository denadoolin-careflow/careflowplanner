-- Extend pantry_items with unit/price/store_pref columns
ALTER TABLE public.pantry_items
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS store_pref text;

-- Allow need_soon as a valid stock status (no enum constraint exists today, it's free-text — just document)
-- Existing values: in_stock | low | out, plus new: need_soon

-- Grocery preferences table (one row per user)
CREATE TABLE IF NOT EXISTS public.grocery_prefs (
  user_id uuid PRIMARY KEY,
  preferred_store text NOT NULL DEFAULT 'instacart',
  backup_store text,
  delivery_mode text NOT NULL DEFAULT 'delivery',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grocery_prefs TO authenticated;
GRANT ALL ON public.grocery_prefs TO service_role;

ALTER TABLE public.grocery_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own grocery prefs select" ON public.grocery_prefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own grocery prefs insert" ON public.grocery_prefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own grocery prefs update" ON public.grocery_prefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own grocery prefs delete" ON public.grocery_prefs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_grocery_prefs_updated
  BEFORE UPDATE ON public.grocery_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();