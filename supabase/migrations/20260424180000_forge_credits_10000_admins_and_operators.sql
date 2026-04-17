-- Forge credits (profiles.tokens_balance): set 10,000 for operator inboxes + every user with admin role.
-- Fixes cases where only lustforgeapp@gmail.com was targeted in an earlier migration but you sign in as another admin account.
-- Also inserts missing profiles for auth users without a row (dashboard otherwise shows 0 credits).

-- Edge case: auth user exists but profiles row never created
INSERT INTO public.profiles (user_id, tokens_balance, display_name)
SELECT
  u.id,
  100,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    NULLIF(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(trim(u.raw_user_meta_data ->> 'username'), ''),
    split_part(u.email, '@', 1)
  )
FROM auth.users AS u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.user_id = u.id);

-- Primary operator / known studio inboxes (Gmail + Googlemail)
UPDATE public.profiles AS p
SET
  tokens_balance = 10000,
  updated_at = now()
FROM auth.users AS u
WHERE
  p.user_id = u.id
  AND (
    lower(trim(u.email)) IN (
      'lustforgeapp@gmail.com',
      'lustforgeapp@googlemail.com',
      'thievnsden@gmail.com'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles AS ur
      WHERE
        ur.user_id = u.id
        AND ur.role = 'admin'::public.app_role
    )
  );
