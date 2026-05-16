-- Widen slot values
ALTER TABLE public.routines DROP CONSTRAINT IF EXISTS routines_slot_check;
ALTER TABLE public.routines ADD CONSTRAINT routines_slot_check
  CHECK (slot = ANY (ARRAY['morning','afternoon','evening','night','nap','anytime']));

-- Add cadence, tags, recipient link
ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS cadence text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recipient_id uuid;

ALTER TABLE public.routines DROP CONSTRAINT IF EXISTS routines_cadence_check;
ALTER TABLE public.routines ADD CONSTRAINT routines_cadence_check
  CHECK (cadence = ANY (ARRAY['daily','weekly','monthly','custom']));

CREATE INDEX IF NOT EXISTS routines_recipient_idx ON public.routines(recipient_id);