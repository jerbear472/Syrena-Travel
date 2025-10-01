-- Create places table
CREATE TABLE IF NOT EXISTS places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  category TEXT DEFAULT 'general',
  is_favorite BOOLEAN DEFAULT false,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  visited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_places_user_id ON places(user_id);
CREATE INDEX idx_places_location ON places(latitude, longitude);

-- Enable Row Level Security
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own places
CREATE POLICY "Users can view own places" ON places
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own places
CREATE POLICY "Users can insert own places" ON places
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own places
CREATE POLICY "Users can update own places" ON places
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own places
CREATE POLICY "Users can delete own places" ON places
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_places_updated_at
  BEFORE UPDATE ON places
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();