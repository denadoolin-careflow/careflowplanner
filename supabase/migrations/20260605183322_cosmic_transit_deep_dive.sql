ALTER TABLE public.cosmic_transit_interpretations
  ADD COLUMN IF NOT EXISTS why_matters text,
  ADD COLUMN IF NOT EXISTS challenges  text,
  ADD COLUMN IF NOT EXISTS action      text,
  ADD COLUMN IF NOT EXISTS affirmation text,
  ADD COLUMN IF NOT EXISTS reflection  text;
