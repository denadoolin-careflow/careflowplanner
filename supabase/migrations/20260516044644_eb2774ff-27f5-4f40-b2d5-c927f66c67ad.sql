-- Extend care_recipients
ALTER TABLE public.care_recipients
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS zodiac text,
  ADD COLUMN IF NOT EXISTS love_languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS food_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS school text,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ssn_last4 text,
  ADD COLUMN IF NOT EXISTS ssn_full text;

-- Medical history
CREATE TABLE IF NOT EXISTS public.medical_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  category text,
  provider text,
  notes text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own medical_history all" ON public.medical_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS medical_history_recipient_idx ON public.medical_history(recipient_id);
CREATE TRIGGER trg_medical_history_updated_at BEFORE UPDATE ON public.medical_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Care providers (doctors, dentists, therapists, etc.)
CREATE TABLE IF NOT EXISTS public.care_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'doctor',
  specialty text,
  phone text,
  email text,
  address text,
  notes text,
  next_appt date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.care_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own care_providers all" ON public.care_providers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS care_providers_recipient_idx ON public.care_providers(recipient_id);
CREATE TRIGGER trg_care_providers_updated_at BEFORE UPDATE ON public.care_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AI care notes
CREATE TABLE IF NOT EXISTS public.care_ai_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  focus text NOT NULL DEFAULT 'general',
  prompt text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.care_ai_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own care_ai_notes all" ON public.care_ai_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS care_ai_notes_recipient_idx ON public.care_ai_notes(recipient_id);