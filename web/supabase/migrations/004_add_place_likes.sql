-- Create place_likes table for social feed likes
CREATE TABLE IF NOT EXISTS place_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(place_id, user_id)
);

-- Indexes for feed queries
CREATE INDEX IF NOT EXISTS idx_place_likes_place_id ON place_likes(place_id);
CREATE INDEX IF NOT EXISTS idx_place_likes_user_id ON place_likes(user_id);

-- Enable RLS
ALTER TABLE place_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can read likes (needed for like counts)
CREATE POLICY "Anyone can read likes" ON place_likes
  FOR SELECT USING (true);

-- Users can insert their own likes
CREATE POLICY "Users can like" ON place_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes (unlike)
CREATE POLICY "Users can unlike" ON place_likes
  FOR DELETE USING (auth.uid() = user_id);
