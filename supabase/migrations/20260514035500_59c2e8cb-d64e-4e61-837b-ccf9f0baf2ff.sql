-- Universal note linking table
CREATE TABLE public.note_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('task','project','goal','habit','appointment','time_block')),
  entity_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (note_id, entity_type, entity_id)
);

CREATE INDEX idx_note_links_entity ON public.note_links (entity_type, entity_id);
CREATE INDEX idx_note_links_note ON public.note_links (note_id);
CREATE INDEX idx_note_links_user ON public.note_links (user_id);

ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own note_links all"
ON public.note_links
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Backfill existing notes.project_id values into note_links
INSERT INTO public.note_links (user_id, note_id, entity_type, entity_id)
SELECT n.user_id, n.id, 'project', n.project_id
FROM public.notes n
WHERE n.project_id IS NOT NULL
ON CONFLICT DO NOTHING;