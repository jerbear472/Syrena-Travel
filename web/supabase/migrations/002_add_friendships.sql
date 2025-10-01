-- Create profiles table to store user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- Add username to places table for display
ALTER TABLE public.places
ADD COLUMN IF NOT EXISTS created_by_username TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);
CREATE INDEX IF NOT EXISTS idx_places_created_by ON public.places(created_by);

-- Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Friendships policies
CREATE POLICY "Users can view their friendships"
  ON public.friendships FOR SELECT
  USING (
    auth.uid() = requester_id OR
    auth.uid() = addressee_id
  );

CREATE POLICY "Users can create friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships they're part of"
  ON public.friendships FOR UPDATE
  USING (
    auth.uid() = requester_id OR
    auth.uid() = addressee_id
  );

CREATE POLICY "Users can delete their friendships"
  ON public.friendships FOR DELETE
  USING (
    auth.uid() = requester_id OR
    auth.uid() = addressee_id
  );

-- Update places RLS to only show friends' places
DROP POLICY IF EXISTS "Places are viewable by everyone" ON public.places;

CREATE POLICY "Users can see their own places and friends' places"
  ON public.places FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = created_by) OR
        (addressee_id = auth.uid() AND requester_id = created_by)
      )
    )
  );

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get mutual friends
CREATE OR REPLACE FUNCTION public.get_friends(user_id UUID)
RETURNS TABLE (
  friend_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  friendship_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN f.requester_id = user_id THEN p.id
      ELSE p2.id
    END as friend_id,
    CASE
      WHEN f.requester_id = user_id THEN p.username
      ELSE p2.username
    END as username,
    CASE
      WHEN f.requester_id = user_id THEN p.display_name
      ELSE p2.display_name
    END as display_name,
    CASE
      WHEN f.requester_id = user_id THEN p.avatar_url
      ELSE p2.avatar_url
    END as avatar_url,
    f.status as friendship_status
  FROM public.friendships f
  LEFT JOIN public.profiles p ON p.id = f.addressee_id
  LEFT JOIN public.profiles p2 ON p2.id = f.requester_id
  WHERE (f.requester_id = user_id OR f.addressee_id = user_id)
    AND f.status = 'accepted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;