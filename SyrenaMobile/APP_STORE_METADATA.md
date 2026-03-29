# Syrena - App Store Connect Metadata

## App Information

**App Name:** Syrena
**Subtitle:** Travel Guide & Place Discovery
**Bundle ID:** com.syrena.travel
**SKU:** syrena-travel-ios-001
**Primary Language:** English (US)
**Category:** Travel
**Secondary Category:** Lifestyle

---

## Version 1.0.0

### App Description (4000 characters max)

Syrena is your personal travel companion for discovering and saving extraordinary destinations around the world.

**Discover & Save Places**
Create your own curated collection of restaurants, hotels, activities, and hidden gems. Whether you're planning your next adventure or documenting your favorite local spots, Syrena makes it easy to organize and remember every place that matters to you.

**Connect with Friends**
See where your friends are exploring and get authentic recommendations from people you trust. Share your discoveries and build a network of travel inspiration.

**Map Your World**
Visualize all your saved places on a beautiful interactive map. Filter by category, mark places as visited, and track your travel journey over time.

**Key Features:**
- Save unlimited places with photos, notes, and categories
- Interactive map view of all your saved destinations
- Connect with friends and see their recommendations
- Mark places as visited to track your adventures
- Organize places by restaurant, hotel, activity, and more
- Beautiful, intuitive design inspired by classic travel guides
- Real-time notifications for friend activity
- Privacy controls for your place collection

Start your journey with Syrena today and never forget an extraordinary destination again.

---

### Keywords (100 characters max, comma-separated)

travel,places,map,restaurants,hotels,recommendations,friends,discover,explore,guide,vacation,trips

---

### What's New in This Version

Welcome to Syrena! This is our first release featuring:
- Save and organize your favorite places
- Interactive map with all your destinations
- Connect with friends and see their picks
- Beautiful travel-inspired design
- Real-time notifications

---

### Promotional Text (170 characters max)

Discover extraordinary destinations. Save your favorite places. Connect with friends who share your wanderlust.

---

### Support URL

https://syrena.travel/support

### Marketing URL

https://syrena.travel

### Privacy Policy URL

https://syrena.travel/privacy

---

## App Privacy

### Data Collection

**Data Linked to You:**
- Contact Info (Email address - for account creation)
- Location (Precise location - for map features)
- User Content (Photos, other user content - for place photos)
- Identifiers (User ID - for account management)

**Data Used to Track You:**
- None

### Privacy Practices
- Data is used to provide core app functionality
- Data is not sold to third parties
- Users can request data deletion

---

## Age Rating

**Rating:** 4+
- No objectionable content
- No user-generated content that could be inappropriate
- No gambling
- No horror themes
- No mature content

---

## App Review Information

### Contact Information
**First Name:** [Your First Name]
**Last Name:** [Your Last Name]
**Phone Number:** [Your Phone]
**Email:** [Your Email]

### Demo Account (if app requires login)
**Username:** demo@syrena.travel
**Password:** [Create demo account password]

### Notes for Reviewer
Syrena is a travel and place discovery app. Users can:
1. Create an account with email
2. Save places to their personal collection
3. View places on an interactive map
4. Connect with friends to see their recommendations
5. Mark places as visited

The app requires location permission to show nearby places and allow users to save locations. Camera/photo library access is used to add photos to places.

---

## Screenshots Required

### iPhone 6.7" (iPhone 15 Pro Max) - Required
1. Map view with saved places
2. Place detail card
3. Friends list with recommendations
4. My Places collection
5. Explore screen

### iPhone 6.5" (iPhone 14 Plus) - Required
Same as above

### iPhone 5.5" (iPhone 8 Plus) - Optional
Same as above

### iPad Pro 12.9" - If supporting iPad
Same as above

---

## Build Checklist

- [ ] Bundle ID registered in Apple Developer Portal
- [ ] App ID created with required capabilities
- [ ] Provisioning profiles created (Development & Distribution)
- [ ] Signing certificates installed
- [ ] Archive built in Xcode (Product > Archive)
- [ ] Build uploaded to App Store Connect
- [ ] Screenshots uploaded for all required sizes
- [ ] All metadata fields completed
- [ ] Privacy policy URL accessible
- [ ] Support URL accessible
- [ ] App Review notes completed
- [ ] Demo account created (if needed)

---

## Terminal Commands for Release Build

```bash
# Clean build folder
cd /Users/JeremyUys_1/Desktop/syrena-travel/SyrenaMobile/ios
xcodebuild clean -workspace SyrenaMobile.xcworkspace -scheme SyrenaMobile

# Install pods
pod install

# Open in Xcode for archive
open SyrenaMobile.xcworkspace

# In Xcode:
# 1. Select "Any iOS Device" as build target
# 2. Product > Archive
# 3. Window > Organizer > Distribute App
# 4. Select "App Store Connect" > Upload
```

---

## Post-Submission

After uploading to App Store Connect:
1. Complete all metadata fields
2. Upload screenshots
3. Set pricing (Free)
4. Submit for review
5. Respond to any reviewer questions within 24 hours
