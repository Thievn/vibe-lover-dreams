-- Closed beta: only specific inboxes may create new auth users (server-side, when the hook is enabled).
-- After this migration runs: Supabase Dashboard → Authentication → Hooks → Before User Created →
-- Hook type: Postgres → function `public.auth_hook_beta_signup_allowlist` (enable and save).
-- Without enabling the hook, only the frontend allowlist applies (API signups could still bypass the UI).

CREATE OR REPLACE FUNCTION public.auth_normalize_email_allowlist(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  e text := lower(btrim(raw));
  atp int := strpos(e, '@');
  localpart text;
  dom text;
BEGIN
  IF atp < 2 OR atp >= length(e) THEN
    RETURN e;
  END IF;
  localpart := substr(e, 1, atp - 1);
  dom := substr(e, atp + 1);
  IF dom = 'googlemail.com' THEN
    dom := 'gmail.com';
  END IF;
  IF dom IN ('gmail.com') THEN
    IF strpos(localpart, '+') > 0 THEN
      localpart := split_part(localpart, '+', 1);
    END IF;
    localpart := replace(localpart, '.', '');
  END IF;
  RETURN localpart || '@' || dom;
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_hook_beta_signup_allowlist(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  raw_email text;
  norm text;
BEGIN
  raw_email := event->'user'->>'email';
  IF raw_email IS NULL OR length(btrim(raw_email)) = 0 THEN
    RETURN jsonb_build_object(
      'error',
      jsonb_build_object('http_code', 403, 'message', 'Email is required.')
    );
  END IF;

  norm := public.auth_normalize_email_allowlist(raw_email);

  IF norm IN (
    'lustforgeapp@gmail.com',
    'thievnsden@gmail.com',
    'deanoneill69@gmail.com'
  ) THEN
    RETURN '{}'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'error',
    jsonb_build_object(
      'http_code', 403,
      'message', 'Sign up is not open for this address.'
    )
  );
END;
$$;

COMMENT ON FUNCTION public.auth_hook_beta_signup_allowlist(jsonb) IS
  'Auth hook: allow signups only for lustforgeapp@gmail.com, thievnsden@gmail.com, deanoneill69@gmail.com (Gmail-normalized). Enable under Dashboard → Authentication → Hooks → Before User Created.';

REVOKE ALL ON FUNCTION public.auth_normalize_email_allowlist(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_normalize_email_allowlist(text) TO supabase_auth_admin;

REVOKE ALL ON FUNCTION public.auth_hook_beta_signup_allowlist(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_hook_beta_signup_allowlist(jsonb) TO supabase_auth_admin;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
