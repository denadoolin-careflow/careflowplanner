
CREATE TABLE public.pomodoro_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  template_id text,
  template_label text,
  task_id text,
  task_title text,
  focus_seconds integer NOT NULL DEFAULT 1500,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own pomo sessions all"
ON public.pomodoro_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX pomodoro_sessions_user_completed_idx
  ON public.pomodoro_sessions (user_id, completed_at DESC);
