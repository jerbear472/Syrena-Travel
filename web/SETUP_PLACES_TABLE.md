# Setting Up Places Table in Supabase

## Quick Setup Instructions

### Step 1: Go to Supabase SQL Editor
1. Go to [your Supabase project](https://supabase.com/dashboard/project/fisghxjiurwrafgfzcxs)
2. Click on **SQL Editor** in the left sidebar

### Step 2: Run This SQL Query
Copy and paste this entire SQL code into the SQL editor and click "Run":

```sql
-- Create places table
CREATE TABLE IF NOT EXISTS places (
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
CREATE INDEX IF NOT EXISTS idx_places_created_by ON places(created_by);
CREATE INDEX IF NOT EXISTS idx_places_location ON places(lat, lng);

-- Enable Row Level Security (RLS)
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all places" ON places;
DROP POLICY IF EXISTS "Users can insert own places" ON places;
DROP POLICY IF EXISTS "Users can update own places" ON places;
DROP POLICY IF EXISTS "Users can delete own places" ON places;

-- Create policies
-- Allow users to see all places (public map)
CREATE POLICY "Users can view all places" ON places
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
```

### Step 3: Verify Table Creation
1. Go to **Table Editor** in the left sidebar
2. You should see a `places` table
3. Click on it to verify the columns are created

### Step 4: Test It Out
1. Go back to your app at http://localhost:3003
2. Sign in if you haven't already
3. Click on the map to add a place
4. Check the "My Places" tab to see your saved places

## Table Structure

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique identifier for each place |
| created_by | UUID | User who created the place |
| name | TEXT | Name/title of the place |
| description | TEXT | Optional notes about the place |
| category | TEXT | Category (restaurant, cafe, etc.) |
| lat | DECIMAL | Latitude coordinate |
| lng | DECIMAL | Longitude coordinate |
| rating | INTEGER | Rating from 0-5 stars |
| created_at | TIMESTAMP | When the place was added |

## Troubleshooting

### If you get permission errors:
- Make sure you're logged into Supabase
- Check that RLS policies are created correctly
- Verify your user is authenticated in the app

### If places aren't saving:
- Check the browser console for errors
- Verify the table exists in Supabase
- Make sure you're signed in to the app

### To reset and start fresh:
```sql
DROP TABLE IF EXISTS places CASCADE;
```
Then run the creation SQL again.

## Features Enabled
✅ Click on map to add places
✅ Add title and subtitle
✅ Choose category (restaurant, cafe, viewpoint, etc.)
✅ Rate places with stars
✅ Add personal notes
✅ View all your places in "My Places" tab
✅ Public map shows all users' places