-- Allow password sign-in with profiles.display_name when it maps to exactly one account.
-- Supabase Auth still receives the real email from resolve_login_email.

CREATE OR REPLACE FUNCTION public.resolve_login_email(p_login text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_trim text;
  v_count int;
  v_email text;
BEGIN
  v_trim := trim(p_login);
  IF v_trim IS NULL OR length(v_trim) < 3 THEN
    RETURN NULL;
  END IF;

  IF v_trim ~* '^[^[:space:]]+@[^[:space:]]+\.[^[:space:]]+$' THEN
    RETURN lower(v_trim);
  END IF;

  SELECT count(*)::int INTO v_count
  FROM auth.users u
  INNER JOIN public.profiles p ON p.user_id = u.id
  WHERE lower(p.display_name) = lower(v_trim);

  IF v_count IS DISTINCT FROM 1 THEN
    RETURN NULL;
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  INNER JOIN public.profiles p ON p.user_id = u.id
  WHERE lower(p.display_name) = lower(v_trim)
  LIMIT 1;

  RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO authenticated;

COMMENT ON FUNCTION public.resolve_login_email(text) IS
  'Maps profiles.display_name to a single auth.users email for sign-in, or passes through a valid email string.';

-- Optional: set founder display_name after you create the auth user (same email as VITE_ADMIN_EMAIL / default).
-- Casing preserved for username sign-in display; adjust email in your fork if needed.
UPDATE public.profiles p
SET display_name = 'LustForge'
FROM auth.users u
WHERE p.user_id = u.id
  AND lower(u.email) = lower('lustforgeapp@gmail.com');
