
-- Loved Ones (extra people for Memories beyond Care Recipients)
CREATE TABLE public.loved_ones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  relation text,
  kind text NOT NULL DEFAULT 'person',
  birth_date date,
  notes text,
  color text,
  avatar_emoji text,
  avatar_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loved_ones TO authenticated;
GRANT ALL ON public.loved_ones TO service_role;

ALTER TABLE public.loved_ones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own loved_ones all" ON public.loved_ones
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER loved_ones_updated_at
  BEFORE UPDATE ON public.loved_ones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Memories
CREATE TABLE public.memories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  reflection text,
  memory_type text NOT NULL DEFAULT 'favorite_moment',
  mood text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  time text,
  location text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  voice_note_path text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  recipient_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  loved_one_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  project_id uuid,
  routine_id uuid,
  journal_entry_id uuid,
  calendar_event_id uuid,
  moon_phase text,
  season text,
  atmosphere text,
  meaningful_note text,
  remember_note text,
  challenging_note text,
  beautiful_note text,
  is_favorite boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  chapter text,
  cover_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.memories TO authenticated;
GRANT ALL ON public.memories TO service_role;

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own memories all" ON public.memories
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX memories_user_date_idx ON public.memories (user_id, date DESC);
CREATE INDEX memories_user_type_idx ON public.memories (user_id, memory_type);
CREATE INDEX memories_recipient_ids_idx ON public.memories USING GIN (recipient_ids);
CREATE INDEX memories_loved_one_ids_idx ON public.memories USING GIN (loved_one_ids);
CREATE INDEX memories_tags_idx ON public.memories USING GIN (tags);
