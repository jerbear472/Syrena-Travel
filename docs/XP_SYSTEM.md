# XP and Level System

## Overview
Syrena Travel includes a gamification system where users earn XP (experience points) and level up by having their places visited by friends.

## How It Works

### Earning XP
- **10 XP** awarded when someone marks they've visited your place
- XP is only awarded when a friend visits (not when you visit your own place)
- Each unique visit per person counts once

### Leveling Up
- **Level formula**: `floor(XP / 100) + 1`
- **Level 1**: 0-99 XP
- **Level 2**: 100-199 XP
- **Level 3**: 200-299 XP
- And so on...

### Where You See It
- **My Places**: Shows your current Level and XP on the stats tiles
- **Friend's Places**: Shows your friend's Level and XP on their page

## Database Setup

To enable the XP system, run this SQL migration in your Supabase SQL Editor:

```bash
# File location: web/supabase/add_xp_and_visits.sql
```

This migration adds:
1. `xp` and `level` columns to the `profiles` table
2. `place_visits` table to track who visited which places
3. `visit_count` column to `places` table (cached count)
4. Automatic triggers to award XP when visits are recorded
5. Automatic level calculation

## Future Features (To Be Implemented)

The database is ready, but we still need to add UI for:
- **"I've Been Here" button** on place details modal
- **Visit count badge** on place cards
- **Visitor list** showing who has been to each place
- **XP notification** when someone visits your place
- **Level-up animation** when reaching a new level

## Technical Details

### Database Tables

**profiles table additions:**
```sql
xp INTEGER DEFAULT 0
level INTEGER DEFAULT 1
```

**place_visits table:**
```sql
id UUID PRIMARY KEY
place_id UUID (references places)
visitor_id UUID (references profiles)
visited_at TIMESTAMPTZ
UNIQUE(place_id, visitor_id) -- One visit per person per place
```

**places table additions:**
```sql
visit_count INTEGER DEFAULT 0
```

### Functions
- `calculate_level(xp_amount)` - Converts XP to level
- `award_visit_xp()` - Trigger that awards XP on new visit
- `update_place_visit_count()` - Maintains visit count cache
