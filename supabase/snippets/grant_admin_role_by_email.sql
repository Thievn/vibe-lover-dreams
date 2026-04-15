-- Run in Supabase SQL Editor as postgres (or any role that can write user_roles).
-- Grants catalog admin (user_roles) so Edge Functions that check roles work, in addition to email-based admin.

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(trim(u.email)) = ANY (ARRAY['lustforgeapp@gmail.com']::text[])
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = u.id AND ur.role = 'admin'::public.app_role
);
