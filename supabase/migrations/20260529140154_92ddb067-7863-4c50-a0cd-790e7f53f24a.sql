
-- Family members for routines + tasks (color/icon tagging)
CREATE TABLE IF NOT EXISTS public.routine_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_people TO authenticated;
GRANT ALL ON public.routine_people TO service_role;

ALTER TABLE public.routine_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "people own select" ON public.routine_people FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "people own insert" ON public.routine_people FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "people own update" ON public.routine_people FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "people own delete" ON public.routine_people FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER routine_people_set_updated BEFORE UPDATE ON public.routine_people
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tasks: person tag for color-coded family attribution
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS person_tag text;
CREATE INDEX IF NOT EXISTS tasks_person_tag_idx ON public.tasks (user_id, person_tag);

-- Caregiving chores (linked optionally to Home zones + tasks)
CREATE TABLE IF NOT EXISTS public.caregiving_chores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_id uuid,
  title text NOT NULL,
  zone text,
  area text DEFAULT 'Caregiving',
  cadence text DEFAULT 'weekly',
  assigned_to text,
  notes text,
  est_minutes integer,
  done boolean NOT NULL DEFAULT false,
  last_done_at timestamptz,
  linked_task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiving_chores TO authenticated;
GRANT ALL ON public.caregiving_chores TO service_role;

ALTER TABLE public.caregiving_chores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chores own select" ON public.caregiving_chores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "chores own insert" ON public.caregiving_chores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chores own update" ON public.caregiving_chores FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "chores own delete" ON public.caregiving_chores FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER caregiving_chores_set_updated BEFORE UPDATE ON public.caregiving_chores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS caregiving_chores_recipient_idx ON public.caregiving_chores (user_id, recipient_id);
