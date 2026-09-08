CREATE TABLE public.grocery_price_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_key text NOT NULL,
  store text NOT NULL,
  price_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grocery_price_overrides TO authenticated;
GRANT ALL ON public.grocery_price_overrides TO service_role;

ALTER TABLE public.grocery_price_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own grocery price overrides"
ON public.grocery_price_overrides FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX grocery_price_overrides_uniq
  ON public.grocery_price_overrides (user_id, item_key, store);

CREATE TRIGGER grocery_price_overrides_updated
BEFORE UPDATE ON public.grocery_price_overrides
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();