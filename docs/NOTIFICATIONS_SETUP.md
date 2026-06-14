# Notifications System Setup Guide

## 1. Run the Database Migration

Execute the SQL file in your Supabase project:

```bash
# Option 1: Using Supabase CLI (if installed)
supabase db push

# Option 2: Copy and paste in Supabase SQL Editor
# Go to https://app.supabase.com/project/YOUR_PROJECT/sql
# Copy the contents of create-notifications-system.sql and execute
```

Or manually in Supabase SQL Editor:
1. Go to your Supabase Dashboard → SQL Editor
2. Open `create-notifications-system.sql`
3. Copy and paste the entire file
4. Click "Run"

## 2. Test the Notifications System

### Test Friend Request Notifications:
1. Open the app on two devices/simulators with different accounts
2. Account A sends a friend request to Account B
3. Account B should see:
   - A notification badge on the "Notifications" tab
   - A notification in the Notifications screen
   - The notification should say "[Username] sent you a friend request"

### Test Friend Accepted Notifications:
1. Account B accepts the friend request
2. Account A should see:
   - A notification badge
   - A notification saying "[Username] accepted your friend request"

### Test New Place Notifications:
1. With two friends connected (Account A and Account B)
2. Account A adds a new place to the map
3. Account B should see:
   - A notification badge
   - A notification saying "[Username] added a new place: [Place Name]"
4. Tapping the notification should navigate to the Explore screen and show the place

## 3. Features Included

✅ **Real-time notifications** - Updates appear instantly using Supabase Realtime
✅ **Notification badge** - Shows unread count on the Notifications tab
✅ **Friend requests** - Get notified when someone sends you a friend request
✅ **Friend accepted** - Get notified when someone accepts your request
✅ **New places** - Get notified when friends add new places
✅ **Mark as read** - Tap a notification to mark it as read
✅ **Mark all as read** - Button to mark all notifications as read at once
✅ **Smart navigation** - Tapping a notification takes you to the relevant screen
✅ **Time formatting** - Shows "2m ago", "3h ago", "5d ago", etc.
✅ **Pull to refresh** - Swipe down to manually refresh notifications

## 4. Notification Types

| Type | Icon | Trigger | Action |
|------|------|---------|--------|
| `friend_request` | person-add | Someone sends you a friend request | Navigate to Friends tab |
| `friend_accepted` | check-circle | Someone accepts your friend request | Navigate to Friends tab |
| `new_place` | place | A friend adds a new place | Navigate to Explore screen and show place |
| `comment` | comment | Someone comments on your place (future) | Navigate to place details |
| `visit` | check | Someone visits your place (future) | Navigate to place details |

## 5. Troubleshooting

### Notifications not appearing:
- Check that the SQL migration ran successfully
- Verify Row Level Security (RLS) policies are enabled
- Check browser console for any errors
- Make sure Supabase Realtime is enabled for your project

### Badge not updating:
- Ensure the notifications table exists
- Check that the real-time subscription is working (check console logs)
- Try refreshing the app

### Triggers not firing:
- Verify the triggers were created successfully
- Check the `friendships` and `places` tables exist
- Test by manually inserting a notification with SQL

## 6. Future Enhancements

Ideas for expanding the notification system:
- **Comments**: Notify when someone comments on your place
- **Visits**: Notify when someone marks your place as visited
- **Likes**: Notify when someone likes your place
- **Push notifications**: Use Expo notifications for background alerts
- **Notification preferences**: Let users customize what they want to be notified about
- **Group notifications**: "You have 3 new friend requests"
