ALTER TABLE public.reset_items
  ADD COLUMN IF NOT EXISTS time_block text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'todo';

DO $$ BEGIN
  ALTER TABLE public.reset_items
    ADD CONSTRAINT reset_items_time_block_chk CHECK (time_block IS NULL OR time_block IN ('morning','afternoon','evening'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.reset_items
    ADD CONSTRAINT reset_items_status_chk CHECK (status IN ('todo','scheduled','in_progress','done'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.reset_checklists
  ADD COLUMN IF NOT EXISTS supplies jsonb NOT NULL DEFAULT '[]'::jsonb;