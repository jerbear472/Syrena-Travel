-- Create place_comments table
CREATE TABLE IF NOT EXISTS place_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_place_comments_place_id ON place_comments(place_id);
CREATE INDEX IF NOT EXISTS idx_place_comments_user_id ON place_comments(user_id);

-- Enable RLS
ALTER TABLE place_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all comments on places they have access to
CREATE POLICY "Users can read place comments" ON place_comments
  FOR SELECT USING (true);

-- Policy: Users can insert their own comments
CREATE POLICY "Users can insert their own comments" ON place_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON place_comments
  FOR DELETE USING (auth.uid() = user_id);
