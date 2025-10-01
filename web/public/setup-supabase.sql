-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create places table
CREATE TABLE IF NOT EXISTS places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  price_level INTEGER CHECK (price_level >= 1 AND price_level <= 4),
  rating DECIMAL(2, 1),
  photo_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_places junction table for saved places
CREATE TABLE IF NOT EXISTS user_places (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  notes TEXT,
  tags TEXT[],
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, place_id)
);

-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Create activity feed table
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policies for places
CREATE POLICY "Places are viewable by everyone" ON places
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create places" ON places
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own places" ON places
  FOR UPDATE USING (auth.uid() = created_by);

-- Create policies for user_places
CREATE POLICY "Users can view own saved places" ON user_places
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save places" ON user_places
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave places" ON user_places
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for friends
CREATE POLICY "Users can view own friends" ON friends
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests" ON friends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friend status" ON friends
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create policies for activities
CREATE POLICY "Users can view friends activities" ON activities
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM friends
      WHERE (friends.user_id = auth.uid() AND friends.friend_id = activities.user_id)
        AND friends.status = 'accepted'
    )
  );

CREATE POLICY "Users can create own activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to handle user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_places_location ON places(lat, lng);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_user_places_user ON user_places(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_users ON friends(user_id, friend_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);

-- Insert some sample data for testing
INSERT INTO places (name, description, category, lat, lng, address, price_level, rating, photo_url) VALUES
  ('Blue Bottle Coffee', 'Artisan coffee shop with minimalist design', 'coffee', 37.7769, -122.4193, '66 Mint St, San Francisco, CA', 2, 4.5, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400'),
  ('Foreign Cinema', 'Restaurant & indie films in a courtyard setting', 'restaurants', 37.7569, -122.4193, '2534 Mission St, San Francisco, CA', 3, 4.3, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'),
  ('The Fillmore', 'Historic music venue with great acoustics', 'attractions', 37.7839, -122.4329, '1805 Geary Blvd, San Francisco, CA', 2, 4.6, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400')
ON CONFLICT DO NOTHING;