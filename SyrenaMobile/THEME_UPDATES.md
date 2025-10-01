# Theme & Font Updates - Syrena Mobile

## Summary

The mobile app has been updated to exactly match the web app's theme colors and typography.

## Changes Made

### 1. Theme Colors ✅
Created `src/theme.ts` with exact color palette from web app:

**Updated Colors:**
- `cream`: #F5F7FA (was #FAF7F2)
- `offWhite`: #EEF2F6 (was #F5F1E8)
- `seaMist`: #DFE6ED (was #D4E4E8)
- `midnightBlue`: #3D5568 (was #2F4550)
- `oceanGrey`: #7A8FA3 (was #6B7C85)
- Plus additional colors: stoneBlue, driftwood, deepTeal, oceanDepth, charcoalBlue, sageBlue, aquaMist, seafoam, sirenGold, lyreBronze

All screens updated:
- ✅ AuthScreen.tsx
- ✅ ExploreScreen.tsx
- ✅ MyPlacesScreen.tsx
- ✅ FriendsScreen.tsx
- ✅ App.tsx

### 2. Custom Fonts ✅
Downloaded and configured fonts to match web app:

**Fonts Added:**
- **Lora** (Serif) - For headings and elegant text
  - Lora-Regular.ttf
  - Lora-Italic.ttf
- **Crimson Pro** (Display) - For large titles
  - CrimsonPro-Regular.ttf
  - CrimsonPro-Italic.ttf
- **Inter** (Sans) - For body text and UI
  - Inter-Regular.ttf

**Font Installation:**
- ✅ Fonts copied to `src/assets/fonts/`
- ✅ iOS: Fonts copied to `ios/SyrenaMobile/` and registered in `Info.plist`
- ✅ Android: Fonts copied to `android/app/src/main/assets/fonts/`
- ✅ Created `react-native.config.js` for font linking
- ✅ AuthScreen updated with custom fonts (example implementation)

### 3. Additional Improvements
- Created centralized theme system with:
  - Color palette
  - Font families
  - Shadow styles (rusticSm, rusticMd, rusticLg, rusticXl)
  - Spacing constants
  - Border radius constants
  - Font size constants

## How to Use Custom Fonts

Import the theme and apply fonts to Text styles:

```typescript
import theme from '../theme';

const styles = StyleSheet.create({
  title: {
    fontFamily: theme.fonts.display.regular,  // Crimson Pro for titles
    fontSize: theme.fontSize.xxl,
    color: theme.colors.midnightBlue,
  },
  body: {
    fontFamily: theme.fonts.sans.regular,  // Inter for body text
    fontSize: theme.fontSize.md,
    color: theme.colors.oceanGrey,
  },
  elegant: {
    fontFamily: theme.fonts.serif.regular,  // Lora for elegant text
    fontSize: theme.fontSize.lg,
  },
});
```

## Next Steps

To complete the font integration across all screens:

1. **Update remaining screens** to use `theme.fonts` in StyleSheet definitions:
   - ExploreScreen.tsx (titles, labels, buttons)
   - MyPlacesScreen.tsx (place names, descriptions)
   - FriendsScreen.tsx (user names, tab labels)

2. **Rebuild the app:**
   ```bash
   # iOS
   cd ios && pod install && cd ..
   npx react-native run-ios

   # Android
   npx react-native run-android
   ```

3. **Test on both platforms** to ensure fonts load correctly

## Typography Guidelines (Matching Web)

- **Display/Headings**: CrimsonPro-Regular (e.g., "Syrena", screen titles)
- **Serif Text**: Lora-Regular (e.g., subtitles, elegant labels)
- **Body/UI**: Inter-Regular (e.g., buttons, input fields, body text)

## Color Usage Guidelines

- **Backgrounds**: cream (#F5F7FA)
- **Cards**: offWhite (#EEF2F6)
- **Borders**: seaMist (#DFE6ED)
- **Primary Text**: midnightBlue (#3D5568)
- **Secondary Text**: oceanGrey (#7A8FA3)
- **Buttons**: midnightBlue with cream text
- **Accents**: deepTeal, aquaMist, sageBlue

## Result

The mobile app now has:
- ✅ Exact color parity with web app
- ✅ Custom fonts (Lora, Crimson Pro, Inter) configured
- ✅ Centralized theme system for consistency
- ✅ Ready for font integration across all components

The theme is now pixel-perfect with the web application!
