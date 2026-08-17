ALTER TABLE public.time_blocks
  ADD COLUMN IF NOT EXISTS link_type text,
  ADD COLUMN IF NOT EXISTS link_id uuid;

CREATE INDEX IF NOT EXISTS time_blocks_user_date_idx ON public.time_blocks (user_id, date);
CREATE INDEX IF NOT EXISTS time_blocks_link_idx ON public.time_blocks (link_type, link_id);