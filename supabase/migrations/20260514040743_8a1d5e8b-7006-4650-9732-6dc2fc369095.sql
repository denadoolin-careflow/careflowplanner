
ALTER FUNCTION public.sync_reset_item_to_task() SECURITY INVOKER;
ALTER FUNCTION public.sync_task_to_reset_item() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.sync_reset_item_to_task() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_task_to_reset_item() FROM PUBLIC, anon;
