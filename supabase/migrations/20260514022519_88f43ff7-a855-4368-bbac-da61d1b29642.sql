
-- 1) Re-point projects to the oldest area row per (user_id, name)
WITH ranked AS (
  SELECT id, user_id, name, ROW_NUMBER() OVER (PARTITION BY user_id, name ORDER BY created_at, id) AS rn
  FROM public.areas
),
keepers AS (
  SELECT user_id, name, id AS keep_id FROM ranked WHERE rn = 1
)
UPDATE public.projects p
SET area_id = k.keep_id
FROM public.areas a
JOIN keepers k ON k.user_id = a.user_id AND k.name = a.name
WHERE p.area_id = a.id AND a.id <> k.keep_id;

-- 2) Delete duplicate area rows
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, name ORDER BY created_at, id) AS rn
  FROM public.areas
)
DELETE FROM public.areas WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 3) Prevent future duplicates
ALTER TABLE public.areas
  ADD CONSTRAINT areas_user_name_unique UNIQUE (user_id, name);
