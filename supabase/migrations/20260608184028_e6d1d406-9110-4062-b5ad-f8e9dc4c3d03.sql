
CREATE TABLE public.carey_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  context_type text,
  context_id text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX carey_threads_user_idx ON public.carey_threads(user_id, last_message_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carey_threads TO authenticated;
GRANT ALL ON public.carey_threads TO service_role;
ALTER TABLE public.carey_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own carey threads" ON public.carey_threads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER carey_threads_updated_at BEFORE UPDATE ON public.carey_threads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.carey_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.carey_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX carey_messages_thread_idx ON public.carey_messages(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carey_messages TO authenticated;
GRANT ALL ON public.carey_messages TO service_role;
ALTER TABLE public.carey_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own carey messages" ON public.carey_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.carey_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('preference','pattern','goal','fact','wellness','family','caregiving')),
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence real NOT NULL DEFAULT 0.6,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, kind, key)
);
CREATE INDEX carey_memory_user_idx ON public.carey_memory(user_id, kind);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carey_memory TO authenticated;
GRANT ALL ON public.carey_memory TO service_role;
ALTER TABLE public.carey_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own carey memory" ON public.carey_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER carey_memory_updated_at BEFORE UPDATE ON public.carey_memory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.carey_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  surfaced_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX carey_insights_user_idx ON public.carey_insights(user_id, surfaced_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carey_insights TO authenticated;
GRANT ALL ON public.carey_insights TO service_role;
ALTER TABLE public.carey_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own carey insights" ON public.carey_insights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
