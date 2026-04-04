
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create custom_characters table
CREATE TABLE public.custom_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  personality TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_characters ENABLE ROW LEVEL SECURITY;

-- RLS for custom_characters
CREATE POLICY "Users can view their own characters"
  ON public.custom_characters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view approved public characters"
  ON public.custom_characters FOR SELECT
  USING (is_public = true AND approved = true);

CREATE POLICY "Users can create their own characters"
  ON public.custom_characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own characters"
  ON public.custom_characters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own characters"
  ON public.custom_characters FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all characters"
  ON public.custom_characters FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on custom_characters
CREATE TRIGGER update_custom_characters_updated_at
  BEFORE UPDATE ON public.custom_characters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Admin policies on profiles for admin dashboard
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
