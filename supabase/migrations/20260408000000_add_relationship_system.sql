-- Create companion_relationships table for affection/breeding system
CREATE TABLE public.companion_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  companion_id text NOT NULL,
  affection_level integer NOT NULL DEFAULT 0,
  breeding_progress integer NOT NULL DEFAULT 0,
  breeding_stage integer NOT NULL DEFAULT 0,
  last_interaction timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, companion_id)
);

-- Enable RLS
ALTER TABLE public.companion_relationships ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own relationships"
  ON public.companion_relationships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own relationships"
  ON public.companion_relationships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own relationships"
  ON public.companion_relationships FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create companion_gifts table for spontaneous gifts
CREATE TABLE public.companion_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  companion_id text NOT NULL,
  gift_type text NOT NULL, -- 'image', 'message', 'pattern'
  gift_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companion_gifts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own gifts"
  ON public.companion_gifts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gifts"
  ON public.companion_gifts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_companion_relationships_user_id ON public.companion_relationships(user_id);
CREATE INDEX idx_companion_relationships_companion_id ON public.companion_relationships(companion_id);
CREATE INDEX idx_companion_gifts_user_id ON public.companion_gifts(user_id);
CREATE INDEX idx_companion_gifts_companion_id ON public.companion_gifts(companion_id);