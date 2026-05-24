
-- Rewrite sync to handle INSERT vs UPDATE separately so the FK from tasks.reset_item_id resolves.
DROP TRIGGER IF EXISTS trg_sync_reset_to_task ON public.reset_items;

CREATE OR REPLACE FUNCTION public.sync_reset_item_to_task_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  guard text;
  new_task_id uuid;
BEGIN
  guard := current_setting('app.reset_sync', true);
  IF guard = 'on' THEN RETURN NEW; END IF;
  IF NEW.linked_task_id IS NOT NULL THEN RETURN NEW; END IF;

  PERFORM set_config('app.reset_sync', 'on', true);
  INSERT INTO public.tasks (user_id, title, notes, done, due_date, est_minutes, area, status, reset_item_id)
  VALUES (NEW.user_id, NEW.title, NEW.notes, NEW.done, NEW.due_date, NEW.est_minutes, 'Home',
          CASE WHEN NEW.done THEN 'done' ELSE 'active' END, NEW.id)
  RETURNING id INTO new_task_id;

  UPDATE public.reset_items SET linked_task_id = new_task_id WHERE id = NEW.id;
  PERFORM set_config('app.reset_sync', 'off', true);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_sync_reset_to_task_insert
AFTER INSERT ON public.reset_items
FOR EACH ROW EXECUTE FUNCTION public.sync_reset_item_to_task_after_insert();

CREATE TRIGGER trg_sync_reset_to_task_update
BEFORE UPDATE OF title, notes, done, due_date, est_minutes ON public.reset_items
FOR EACH ROW EXECUTE FUNCTION public.sync_reset_item_to_task();
