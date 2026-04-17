-- Admin dashboard: waitlist was readable by nobody; generated_images / chat_messages had no global read for admins.
-- Also grant DB admin role to known operator inboxes so RLS matches the Command UI (has_role-based policies).

-- ---------------------------------------------------------------------------
-- user_roles: ensure operator accounts used in production have admin role
-- ---------------------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users AS u
WHERE
  lower(trim(u.email)) IN (
    'lustforgeapp@gmail.com',
    'lustforgeapp@googlemail.com',
    'thievnsden@gmail.com'
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- ---------------------------------------------------------------------------
-- waitlist
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read waitlist" ON public.waitlist;
CREATE POLICY "Admins can read waitlist"
  ON public.waitlist FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete waitlist entries" ON public.waitlist;
CREATE POLICY "Admins can delete waitlist entries"
  ON public.waitlist FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- generated_images (dashboard totals + analytics)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all generated images" ON public.generated_images;
CREATE POLICY "Admins can view all generated images"
  ON public.generated_images FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- chat_messages (analytics trend / bar charts)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all chat messages" ON public.chat_messages;
CREATE POLICY "Admins can view all chat messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
