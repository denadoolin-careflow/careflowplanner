ALTER TABLE public.cabinet_documents
  ADD COLUMN kind text NOT NULL DEFAULT 'document',
  ADD COLUMN mail_status text NOT NULL DEFAULT 'new',
  ADD COLUMN mail_type text,
  ADD COLUMN sender text,
  ADD COLUMN amount numeric,
  ADD COLUMN due_on date,
  ADD COLUMN review_task_id uuid,
  ADD COLUMN trashed_at timestamptz;
CREATE INDEX cabinet_documents_kind_idx ON public.cabinet_documents(user_id, kind, mail_status);