ALTER TABLE public.care_recipients
  ADD COLUMN IF NOT EXISTS diagnoses text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS diagnosis_notes text,
  ADD COLUMN IF NOT EXISTS cycle jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sex text;