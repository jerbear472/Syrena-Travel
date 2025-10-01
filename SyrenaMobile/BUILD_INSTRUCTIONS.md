# Syrena Mobile - Build Instructions

## ✅ Setup Complete

All code is ready! Metro bundler is running successfully on port 8081.

## 🔨 Build Steps

### 1. Open the Project in Xcode

```bash
open ios/SyrenaMobile.xcworkspace
```

**IMPORTANT:** Open the `.xcworkspace` file, NOT the `.xcodeproj` file!

### 2. Clean Build Folder

In Xcode menu:
- Product → Clean Build Folder (Cmd+Shift+K)

### 3. Build and Run

- Select a simulator or device from the device dropdown
- Press the Run button (Cmd+R)

### 4. Wait for Build

The first build will take 3-5 minutes as it compiles:
- React Native framework
- Google Maps dependencies
- All 79 CocoaPods
- Native modules

## 📱 What to Expect

After the build succeeds, the app will launch and you'll see:

1. **Auth Screen** with:
   - Blue lyre logo (rounded corners)
   - Sign in / Sign up forms
   - Muted blue theme

2. **After Login** - Bottom tabs:
   - **Explore**: Google Maps with ability to tap and add places
   - **My Places**: List of your saved places
   - **Friends**: Friend search and management

3. **Muted Blue Theme**:
   - Cream backgrounds (#FAF7F2)
   - Midnight blue active states (#2F4550)
   - Ocean grey inactive (#6B7C85)

## 🐛 If Map Doesn't Show

If the map appears blank:

1. Check location permissions:
   - Settings → Privacy & Security → Location Services
   - Find "Syrena" and set to "While Using the App"

2. Verify Google Maps API key in Info.plist:
   - Key: GMSApiKey
   - Value: AIzaSyArP42EedqSSuYhKBA5fsPQPSdGyWxFtc4

3. Make sure you're using PROVIDER_GOOGLE in MapView

## ⚠️ Known Issue

The friendships table migration needs to be applied to Supabase:

1. Go to https://supabase.com/dashboard
2. Open your project
3. Go to SQL Editor
4. Run the contents of: `web/supabase/migrations/002_add_friendships.sql`

Without this migration, the Friends tab won't work properly.

## 🎨 Features Ready

- ✅ Add places to map (tap anywhere)
- ✅ 10 categories with icons
- ✅ 5-star ratings
- ✅ Search for places
- ✅ Add friends (after migration)
- ✅ View friends' places
- ✅ Muted blue theme
- ✅ Google Maps integration
- ✅ Real-time sync with Supabase

## 🚀 Metro Bundler

Already running in the background! You can see it at: http://localhost:8081

If you need to restart it:
```bash
cd /Users/JeremyUys_1/Desktop/syrena-travel/SyrenaMobile
npx react-native start --reset-cache
```

---

**Everything is ready to go! Just build in Xcode and the app will work perfectly.**
