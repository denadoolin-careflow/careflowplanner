ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS cover_gradient text;