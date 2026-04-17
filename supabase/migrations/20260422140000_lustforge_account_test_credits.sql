-- Grant forge credits for the primary LustForge operator account (local / QA testing).
-- Safe to re-run: only raises balance to at least 5000.

UPDATE public.profiles AS p
SET tokens_balance = GREATEST(COALESCE(p.tokens_balance, 0), 5000)
FROM auth.users AS u
WHERE p.user_id = u.id
  AND (
    lower(u.email) = 'lustforgeapp@gmail.com'
    OR lower(u.email) = 'lustforgeapp@googlemail.com'
  );
