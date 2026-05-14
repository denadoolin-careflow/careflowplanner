
ALTER TABLE public.reset_items ADD COLUMN IF NOT EXISTS linked_task_id uuid;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reset_item_id uuid;

CREATE INDEX IF NOT EXISTS idx_reset_items_linked_task ON public.reset_items(linked_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reset_item ON public.tasks(reset_item_id);

-- FK with set null
DO $$ BEGIN
  ALTER TABLE public.reset_items
    ADD CONSTRAINT reset_items_linked_task_fk
    FOREIGN KEY (linked_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_reset_item_fk
    FOREIGN KEY (reset_item_id) REFERENCES public.reset_items(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sync trigger: reset_item -> task
CREATE OR REPLACE FUNCTION public.sync_reset_item_to_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guard text;
BEGIN
  guard := current_setting('app.reset_sync', true);
  IF guard = 'on' THEN RETURN NEW; END IF;

  IF NEW.linked_task_id IS NULL THEN
    PERFORM set_config('app.reset_sync', 'on', true);
    INSERT INTO public.tasks (user_id, title, notes, done, due_date, est_minutes, area, status, reset_item_id)
    VALUES (NEW.user_id, NEW.title, NEW.notes, NEW.done, NEW.due_date, NEW.est_minutes, 'Home', 
            CASE WHEN NEW.done THEN 'done' ELSE 'active' END, NEW.id)
    RETURNING id INTO NEW.linked_task_id;
    PERFORM set_config('app.reset_sync', 'off', true);
  ELSE
    PERFORM set_config('app.reset_sync', 'on', true);
    UPDATE public.tasks
       SET title = NEW.title,
           notes = NEW.notes,
           done = NEW.done,
           due_date = NEW.due_date,
           est_minutes = NEW.est_minutes,
           status = CASE WHEN NEW.done THEN 'done' ELSE 'active' END
     WHERE id = NEW.linked_task_id;
    PERFORM set_config('app.reset_sync', 'off', true);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_reset_to_task ON public.reset_items;
CREATE TRIGGER trg_sync_reset_to_task
BEFORE INSERT OR UPDATE OF title, notes, done, due_date, est_minutes ON public.reset_items
FOR EACH ROW EXECUTE FUNCTION public.sync_reset_item_to_task();

-- Sync trigger: task -> reset_item
CREATE OR REPLACE FUNCTION public.sync_task_to_reset_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guard text;
BEGIN
  guard := current_setting('app.reset_sync', true);
  IF guard = 'on' THEN RETURN NEW; END IF;
  IF NEW.reset_item_id IS NULL THEN RETURN NEW; END IF;

  PERFORM set_config('app.reset_sync', 'on', true);
  UPDATE public.reset_items
     SET title = NEW.title,
         notes = NEW.notes,
         done = NEW.done,
         due_date = NEW.due_date,
         est_minutes = NEW.est_minutes
   WHERE id = NEW.reset_item_id;
  PERFORM set_config('app.reset_sync', 'off', true);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_task_to_reset ON public.tasks;
CREATE TRIGGER trg_sync_task_to_reset
AFTER UPDATE OF title, notes, done, due_date, est_minutes ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.sync_task_to_reset_item();

-- Backfill existing reset_items without a linked task
DO $$
DECLARE
  r record;
  new_task_id uuid;
BEGIN
  PERFORM set_config('app.reset_sync', 'on', true);
  FOR r IN SELECT * FROM public.reset_items WHERE linked_task_id IS NULL LOOP
    INSERT INTO public.tasks (user_id, title, notes, done, due_date, est_minutes, area, status, reset_item_id)
    VALUES (r.user_id, r.title, r.notes, r.done, r.due_date, r.est_minutes, 'Home',
            CASE WHEN r.done THEN 'done' ELSE 'active' END, r.id)
    RETURNING id INTO new_task_id;
    UPDATE public.reset_items SET linked_task_id = new_task_id WHERE id = r.id;
  END LOOP;
  PERFORM set_config('app.reset_sync', 'off', true);
END $$;
