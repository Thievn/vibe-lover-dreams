-- QA test inbox: behave as a normal end user (no catalog admin / cross-table RLS).
-- Earlier migrations granted `user_roles.admin` and operator forge credits to this address.

DELETE FROM public.user_roles ur
USING auth.users u
WHERE
  ur.user_id = u.id
  AND ur.role = 'admin'::public.app_role
  AND lower(trim(u.email)) = 'thievnsden@gmail.com';

-- Match default new-account forge credits (profiles default is 100).
UPDATE public.profiles p
SET
  tokens_balance = 100,
  updated_at = now()
FROM auth.users u
WHERE
  p.user_id = u.id
  AND lower(trim(u.email)) = 'thievnsden@gmail.com';
