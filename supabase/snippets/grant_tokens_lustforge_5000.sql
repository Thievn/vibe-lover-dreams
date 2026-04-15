-- Run in Supabase SQL Editor (postgres / service role).
-- Sets forge token balance to 5,000 for the primary LustForge account.
-- Change the email in the WHERE clause if your test user uses a different address.

UPDATE public.profiles p
SET tokens_balance = 5000,
    updated_at = now()
FROM auth.users u
WHERE p.user_id = u.id
  AND lower(trim(u.email)) = lower(trim('lustforgeapp@gmail.com'));

-- Verify:
-- SELECT u.email, p.tokens_balance FROM public.profiles p JOIN auth.users u ON u.id = p.user_id WHERE lower(u.email) = 'lustforgeapp@gmail.com';
