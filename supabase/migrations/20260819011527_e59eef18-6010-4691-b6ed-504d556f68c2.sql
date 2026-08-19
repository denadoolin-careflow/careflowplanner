CREATE TABLE public.task_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  task_id UUID,
  task_title TEXT NOT NULL DEFAULT '',
  day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  seconds INTEGER NOT NULL DEFAULT 0,
  est_minutes INTEGER,
  activity TEXT,
  area TEXT,
  source TEXT NOT NULL DEFAULT 'tracker',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_time_entries TO authenticated;
GRANT ALL ON public.task_time_entries TO service_role;

ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own time entries"
ON public.task_time_entries FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX task_time_entries_user_day_idx ON public.task_time_entries (user_id, day DESC);
CREATE INDEX task_time_entries_task_idx ON public.task_time_entries (user_id, task_id);