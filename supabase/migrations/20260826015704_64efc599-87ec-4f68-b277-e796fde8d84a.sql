CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipient_id UUID REFERENCES public.care_recipients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dose TEXT,
  notes TEXT,
  times TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medications TO authenticated;
GRANT ALL ON public.medications TO service_role;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own medications" ON public.medications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER medications_updated_at BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.medication_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'taken',
  taken_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (medication_id, scheduled_date, scheduled_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medication_logs TO authenticated;
GRANT ALL ON public.medication_logs TO service_role;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own medication logs" ON public.medication_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER medication_logs_updated_at BEFORE UPDATE ON public.medication_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.symptom_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipient_id UUID REFERENCES public.care_recipients(id) ON DELETE CASCADE,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  symptom TEXT NOT NULL,
  severity SMALLINT NOT NULL,
  capacity SMALLINT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.symptom_logs TO authenticated;
GRANT ALL ON public.symptom_logs TO service_role;
ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own symptom logs" ON public.symptom_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER symptom_logs_updated_at BEFORE UPDATE ON public.symptom_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();