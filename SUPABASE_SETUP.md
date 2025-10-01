# Supabase Setup Guide for Syrena Travel

## ✅ Completed Integration

Your Syrena Travel app is now integrated with Supabase! Here's what has been set up:

### 1. **Supabase Connection**
- Project URL: `https://fisghxjiurwrafgfzcxs.supabase.co`
- Configuration file: `web/.env.local`

### 2. **Database Schema**
The following tables and features have been prepared:
- **Users/Profiles** - Extended auth with username and profile data
- **Places** - Location data with PostGIS support
- **Friends** - Social connections between users
- **Place Shares** - Granular sharing permissions
- **Reservations** - Future booking feature
- **Row Level Security** - Automatic data protection

### 3. **Authentication System**
- Sign up with email/password
- Sign in functionality
- Session management
- Protected routes

## 🚀 Next Steps to Complete Setup

### 1. Get Your Supabase Anon Key
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the `anon` public key
4. Add it to `web/.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 2. Run Database Schema
1. Go to Supabase SQL Editor
2. Copy the contents of `supabase-schema.sql`
3. Run the SQL to create all tables and functions

### 3. Configure Authentication
1. In Supabase Dashboard → Authentication → Providers
2. Enable Email provider (should be on by default)
3. Optional: Configure OAuth providers (Google, GitHub, etc.)

### 4. Enable PostGIS Extension (for maps)
1. Go to Database → Extensions
2. Search for "postgis"
3. Enable the extension

## 📱 Testing the App

1. **Start the servers** (already running):
   ```bash
   ./start-dev.sh
   ```

2. **Access the app**:
   - Frontend: http://localhost:3000
   - API: http://localhost:5001

3. **Test Authentication**:
   - Click "Sign In" in the sidebar
   - Create a new account
   - Check your email for verification link

## 🗂️ File Structure

```
syrena-travel/
├── web/                        # Next.js frontend
│   ├── src/
│   │   ├── lib/supabase.ts    # Supabase client
│   │   ├── components/
│   │   │   ├── AuthModal.tsx  # Auth UI
│   │   │   └── MapView.tsx    # Map component
│   │   └── types/
│   │       └── supabase.ts    # TypeScript types
│   └── .env.local             # Environment variables
├── api/                       # Express backend (optional)
├── supabase-schema.sql       # Database schema
└── SUPABASE_SETUP.md         # This file
```

## 🔐 Security Features Included

- **Row Level Security (RLS)**: Users can only see their own data and friends' shared places
- **Secure Authentication**: Handled by Supabase Auth
- **Protected API Routes**: Automatic user context
- **Type Safety**: Full TypeScript support

## 📊 Database Features

### Spatial Queries
Find places near a location:
```sql
SELECT * FROM get_nearby_friend_places(37.7749, -122.4194, 5000);
```

### Friend System
- Send/accept friend requests
- View friends' public places
- Private sharing options

## 🎯 Current Features

✅ User authentication (sign up/sign in/sign out)
✅ Database schema with PostGIS
✅ Row Level Security policies
✅ TypeScript types
✅ Auth UI components
✅ Supabase client configuration

## 🔄 To Add Your Own Google Maps Key

1. Get an API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Add to `web/.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key-here
   ```

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Dashboard](https://app.supabase.com)
- [PostGIS Documentation](https://postgis.net/documentation/)

## ⚠️ Important Notes

1. **Email Confirmation**: New users need to confirm their email
2. **CORS**: Already configured for localhost development
3. **API Keys**: Never commit the `service_role` key to git
4. **Database**: Your schema is ready to run in SQL editor

---

Your app is ready for Supabase! Just add your anon key and run the SQL schema to complete the setup.