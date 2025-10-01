-- Create comments table for places
CREATE TABLE IF NOT EXISTS place_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create visits tracking table
CREATE TABLE IF NOT EXISTS place_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(place_id, user_id) -- Prevent duplicate visits
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_place_id ON place_comments(place_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_by ON place_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_visits_place_id ON place_visits(place_id);
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON place_visits(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE place_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_visits ENABLE ROW LEVEL SECURITY;

-- Policies for comments
-- Anyone can view comments
CREATE POLICY "Anyone can view comments" ON place_comments
  FOR SELECT USING (true);

-- Authenticated users can insert their own comments
CREATE POLICY "Users can insert own comments" ON place_comments
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON place_comments
  FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON place_comments
  FOR DELETE USING (auth.uid() = created_by);

-- Policies for visits
-- Anyone can view visits
CREATE POLICY "Anyone can view visits" ON place_visits
  FOR SELECT USING (true);

-- Authenticated users can insert their own visits
CREATE POLICY "Users can insert own visits" ON place_visits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own visits
CREATE POLICY "Users can delete own visits" ON place_visits
  FOR DELETE USING (auth.uid() = user_id);