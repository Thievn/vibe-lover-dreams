-- Sign-up with "Confirm email" enabled returns no JWT until the user clicks the link.
-- The client cannot UPDATE/UPSERT `profiles` under RLS without a session, so the chosen
-- username must be applied inside this SECURITY DEFINER trigger from auth metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := NULLIF(
    trim(
      COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.raw_user_meta_data ->> 'full_name', '')
    ),
    ''
  );
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, v_name);
  RETURN NEW;
END;
$$;
