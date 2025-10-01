# Setting Up Social Features (Comments & Visits)

## Quick Setup - Run this SQL in Supabase

1. **Go to Supabase SQL Editor:**
   https://supabase.com/dashboard/project/fisghxjiurwrafgfzcxs/sql/new

2. **Copy and paste this entire SQL code:**

```sql
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view comments" ON place_comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON place_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON place_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON place_comments;
DROP POLICY IF EXISTS "Anyone can view visits" ON place_visits;
DROP POLICY IF EXISTS "Users can insert own visits" ON place_visits;
DROP POLICY IF EXISTS "Users can delete own visits" ON place_visits;

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
```

3. **Click "Run" to execute the SQL**

## Features Added

### 📍 Place Details Modal
When you click on any Syrena logo marker on the map:
- View place name, category, rating, and description
- See who created the place
- View when it was added

### 💬 Comments System
- Add comments to any place
- View all comments from other users
- Comments show user name and date
- Only logged-in users can comment
- Users can delete their own comments

### ✅ Visit Tracking
- Mark places as "Visited"
- See who else has visited the place
- Toggle visited status on/off
- Track when you visited

## How It Works

1. **Click any Syrena logo on the map** - Opens the place details
2. **Add a comment** - Type in the comment box and press Enter or click Send
3. **Mark as visited** - Click the "Mark as Visited" button
4. **View visitors** - See all users who have visited the place

## Testing

1. Add a new place on the map
2. Click on the Syrena logo marker
3. Add a comment
4. Mark it as visited
5. Sign in with a different account to test multi-user features

## Database Structure

### `place_comments` table:
- Links to places and users
- Stores comment text and timestamp
- Enforces that users can only edit/delete their own comments

### `place_visits` table:
- Tracks which users visited which places
- Prevents duplicate visits (one per user per place)
- Stores visit timestamp

## Troubleshooting

If comments or visits aren't working:
1. Check Supabase Dashboard → Table Editor
2. Verify `place_comments` and `place_visits` tables exist
3. Check Authentication → Policies are enabled
4. View Logs for any RLS policy errors