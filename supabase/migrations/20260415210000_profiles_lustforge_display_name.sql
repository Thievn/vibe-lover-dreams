-- If an earlier migration already set display_name to mixed casing, normalize founder handle.
UPDATE public.profiles p
SET display_name = 'LustForge'
FROM auth.users u
WHERE p.user_id = u.id
  AND lower(u.email) = lower('lustforgeapp@gmail.com')
  AND (p.display_name IS DISTINCT FROM 'LustForge');
