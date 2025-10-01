-- First, drop the existing table if it exists
DROP TABLE IF EXISTS places CASCADE;

-- Create places table with correct schema
CREATE TABLE places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  rating INTEGER CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_places_created_by ON places(created_by);
CREATE INDEX idx_places_location ON places(lat, lng);

-- Enable Row Level Security (RLS)
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow anyone to view all places (public map)
CREATE POLICY "Anyone can view all places" ON places
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own places
CREATE POLICY "Users can insert own places" ON places
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own places
CREATE POLICY "Users can update own places" ON places
  FOR UPDATE USING (auth.uid() = created_by);

-- Allow users to delete their own places
CREATE POLICY "Users can delete own places" ON places
  FOR DELETE USING (auth.uid() = created_by);