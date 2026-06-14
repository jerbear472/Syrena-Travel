# Syrena Travel - Quick Setup Guide

## 🚀 Getting Started

### 1. Add Your API Keys

Edit the file `web/.env.local` and add your keys:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://fisghxjiurwrafgfzcxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here  # ← Add your key here

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-actual-google-maps-key-here  # ← Add your key here
```

### 2. Get Your Keys

**Supabase Anon Key:**
1. Go to https://supabase.com/dashboard/project/fisghxjiurwrafgfzcxs/settings/api
2. Copy the "anon public" key
3. Replace `your-actual-anon-key-here` in `.env.local`

**Google Maps API Key:**
1. Go to https://console.cloud.google.com/
2. Enable "Maps JavaScript API"
3. Create credentials → API Key
4. Replace `your-actual-google-maps-key-here` in `.env.local`

### 3. Restart the Server

After adding your keys, restart the development server:

```bash
cd ~/Desktop/syrena-travel
./start-dev.sh
```

### 4. Check Setup Status

The app will show a status indicator in the bottom-right corner:
- ✅ Green = Service connected
- ❌ Red = Configuration needed
- ⚠️ Amber = Configured but connection failed

### 5. Test Authentication

1. Click "Sign in to continue"
2. Create a new account or sign in
3. Check your email for confirmation (new accounts)

## 📱 Access Your App

Open your browser and go to: http://localhost:3000

## 🔧 Troubleshooting

- **Map not showing?** Check that your Google Maps API key has "Maps JavaScript API" enabled
- **Login not working?** Verify your Supabase anon key is correct
- **Server not starting?** Run `npm install` in the web directory first

## ✨ Features

- 🗺️ Interactive map with friends' saved places
- 👥 Social features to connect with friends
- 📍 Save and share your favorite locations
- 🔐 Secure authentication with Supabase
- 📱 Responsive design for all devices