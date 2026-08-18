DELETE FROM public.time_blocks WHERE title IN ('Grid note test','Grid note test 2') AND link_type = 'note';
DELETE FROM public.notes WHERE title IN ('Grid note test','Grid note test 2');