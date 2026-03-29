-- Create place_comments table
CREATE TABLE IF NOT EXISTS place_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE place_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read comments
CREATE POLICY "Anyone can read place comments"
  ON place_comments
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON place_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON place_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON place_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_place_comments_place_id ON place_comments(place_id);
CREATE INDEX IF NOT EXISTS idx_place_comments_user_id ON place_comments(user_id);
