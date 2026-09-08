CREATE TABLE public.grocery_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_key text NOT NULL,
  item_name text,
  store text NOT NULL,
  price_cents integer NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grocery_price_history TO authenticated;
GRANT ALL ON public.grocery_price_history TO service_role;

ALTER TABLE public.grocery_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own grocery price history"
ON public.grocery_price_history FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX grocery_price_history_lookup
  ON public.grocery_price_history (user_id, item_key, recorded_at DESC);