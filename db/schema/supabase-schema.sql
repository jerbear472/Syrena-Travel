-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  bio TEXT,
  profile_picture VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create places table with PostGIS support
CREATE TABLE IF NOT EXISTS public.places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  address TEXT,
  location GEOGRAPHY(Point, 4326),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  google_place_id VARCHAR(255),
  photo_url VARCHAR(500),
  rating DECIMAL(2, 1),
  price_level INTEGER CHECK (price_level >= 1 AND price_level <= 4),
  notes TEXT,
  visited BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index for location queries
CREATE INDEX IF NOT EXISTS idx_places_location
ON places USING GIST(location);

-- Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Create place_shares table for granular sharing control
CREATE TABLE IF NOT EXISTS public.place_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID REFERENCES places(id) ON DELETE CASCADE NOT NULL,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(place_id, shared_with_user_id)
);

-- Create reservations table (for future priority booking feature)
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE NOT NULL,
  reservation_date DATE,
  reservation_time TIME,
  party_size INTEGER,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create place_categories table
CREATE TABLE IF NOT EXISTS public.place_categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  display_order INTEGER
);

-- Insert default categories
INSERT INTO place_categories (id, name, icon, display_order) VALUES
  ('restaurants', 'Restaurants', '🍴', 1),
  ('bars', 'Bars & Clubs', '🍹', 2),
  ('coffee', 'Coffee Shops', '☕', 3),
  ('attractions', 'Attractions', '🎭', 4),
  ('hotels', 'Hotels', '🏨', 5),
  ('shopping', 'Shopping', '🛍️', 6),
  ('parks', 'Parks & Nature', '🌳', 7),
  ('other', 'Other', '📍', 8)
ON CONFLICT (id) DO NOTHING;

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Places policies
CREATE POLICY "Users can view own places"
  ON places FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view friends' public places"
  ON places FOR SELECT
  USING (
    is_public = true
    AND user_id IN (
      SELECT friend_id FROM friends
      WHERE user_id = auth.uid()
      AND status = 'accepted'
    )
  );

CREATE POLICY "Users can view specifically shared places"
  ON places FOR SELECT
  USING (
    id IN (
      SELECT place_id FROM place_shares
      WHERE shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own places"
  ON places FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own places"
  ON places FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own places"
  ON places FOR DELETE
  USING (auth.uid() = user_id);

-- Friends policies
CREATE POLICY "Users can view own friendships"
  ON friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests"
  ON friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friend requests they're involved in"
  ON friends FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete own friend relationships"
  ON friends FOR DELETE
  USING (auth.uid() = user_id);

-- Functions and Triggers

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_places_updated_at BEFORE UPDATE ON places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friends_updated_at BEFORE UPDATE ON friends
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get nearby places from friends
CREATE OR REPLACE FUNCTION get_nearby_friend_places(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  category VARCHAR(100),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  user_id UUID,
  username VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.category,
    p.lat,
    p.lng,
    ST_Distance(
      p.location::geography,
      ST_MakePoint(user_lng, user_lat)::geography
    ) as distance_meters,
    p.user_id,
    pr.username
  FROM places p
  JOIN profiles pr ON p.user_id = pr.id
  WHERE
    p.is_public = true
    AND p.user_id IN (
      SELECT friend_id FROM friends
      WHERE user_id = auth.uid()
      AND status = 'accepted'
    )
    AND ST_DWithin(
      p.location::geography,
      ST_MakePoint(user_lng, user_lat)::geography,
      radius_meters
    )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;