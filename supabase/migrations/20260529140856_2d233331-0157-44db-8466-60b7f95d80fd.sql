-- Person progress entries
CREATE TABLE public.person_progress_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'custom',
  label text NOT NULL,
  value_numeric numeric,
  value_text text,
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_progress_entries TO authenticated;
GRANT ALL ON public.person_progress_entries TO service_role;
ALTER TABLE public.person_progress_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppe_select_own" ON public.person_progress_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ppe_insert_own" ON public.person_progress_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ppe_update_own" ON public.person_progress_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ppe_delete_own" ON public.person_progress_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_ppe_recipient ON public.person_progress_entries(user_id, recipient_id, recorded_at DESC);
CREATE TRIGGER trg_ppe_updated BEFORE UPDATE ON public.person_progress_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Person progress goals
CREATE TABLE public.person_progress_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'custom',
  target_value numeric,
  current_value numeric DEFAULT 0,
  unit text,
  status text NOT NULL DEFAULT 'active',
  target_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_progress_goals TO authenticated;
GRANT ALL ON public.person_progress_goals TO service_role;
ALTER TABLE public.person_progress_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppg_select_own" ON public.person_progress_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ppg_insert_own" ON public.person_progress_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ppg_update_own" ON public.person_progress_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ppg_delete_own" ON public.person_progress_goals FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_ppg_recipient ON public.person_progress_goals(user_id, recipient_id);
CREATE TRIGGER trg_ppg_updated BEFORE UPDATE ON public.person_progress_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Person check-ins (schedules)
CREATE TABLE public.person_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  title text NOT NULL,
  prompt text,
  cadence text NOT NULL DEFAULT 'weekly',
  cadence_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_completed_at timestamptz,
  next_due_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_checkins TO authenticated;
GRANT ALL ON public.person_checkins TO service_role;
ALTER TABLE public.person_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc_select_own" ON public.person_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pc_insert_own" ON public.person_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pc_update_own" ON public.person_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pc_delete_own" ON public.person_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_pc_recipient ON public.person_checkins(user_id, recipient_id, next_due_at);
CREATE TRIGGER trg_pc_updated BEFORE UPDATE ON public.person_checkins FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Person check-in responses
CREATE TABLE public.person_checkin_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  checkin_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  mood smallint,
  energy smallint,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  cycle_phase text,
  responded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_checkin_responses TO authenticated;
GRANT ALL ON public.person_checkin_responses TO service_role;
ALTER TABLE public.person_checkin_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pcr_select_own" ON public.person_checkin_responses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pcr_insert_own" ON public.person_checkin_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pcr_update_own" ON public.person_checkin_responses FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pcr_delete_own" ON public.person_checkin_responses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_pcr_checkin ON public.person_checkin_responses(user_id, checkin_id, responded_at DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.person_progress_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.person_progress_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.person_checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.person_checkin_responses;