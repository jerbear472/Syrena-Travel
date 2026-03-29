import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  useColorScheme,
  Image,
  Easing,
} from 'react-native';
import { getThemeColors, typography } from '../theme';

// Import the app logo
const appLogo = require('../assets/images/SyrenaStar.png');

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getThemeColors(isDarkMode);

  // Animation values — only for decorative elements that aren't on the native splash
  const detailsFade = useRef(new Animated.Value(0)).current;
  const detailsSlide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    let isMounted = true;

    // Short delay before animating in the decorative elements
    // This gives the native splash -> React splash handoff time to settle
    const animation = Animated.parallel([
      Animated.timing(detailsFade, {
        toValue: 1,
        duration: 600,
        delay: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(detailsSlide, {
        toValue: 0,
        duration: 500,
        delay: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    // Auto finish after 2.5 seconds
    console.log('[SplashScreen] Starting timer...');
    const timer = setTimeout(() => {
      console.log('[SplashScreen] Timer finished, calling onFinish');
      if (isMounted) {
        onFinish();
      }
    }, 2500);

    return () => {
      isMounted = false;
      animation.stop();
      clearTimeout(timer);
    };
  }, [onFinish]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logo — starts fully visible to match native splash */}
      <View style={styles.logoContainer}>
        <Image
          source={appLogo}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Brand name — starts fully visible to match native splash */}
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.accent }]}>
          SYRENA
        </Text>

        {/* Decorative elements animate in after handoff */}
        <Animated.View
          style={[
            styles.detailsContainer,
            {
              opacity: detailsFade,
              transform: [{ translateY: detailsSlide }],
            },
          ]}
        >
          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: colors.accent + '50' }]} />
            <View style={[styles.dividerDiamond, { backgroundColor: colors.accent }]} />
            <View style={[styles.dividerLine, { backgroundColor: colors.accent + '50' }]} />
          </View>

          <Text style={[styles.subtitle, { color: colors.accent + 'CC' }]}>
            TRAVEL
          </Text>
        </Animated.View>
      </View>

      {/* Tagline — animates in with decorative elements */}
      <Animated.View
        style={[
          styles.taglineContainer,
          {
            opacity: detailsFade,
            transform: [{ translateY: detailsSlide }],
          },
        ]}
      >
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Voyage to Extraordinary Destinations
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontFamily: typography.fonts.display.regular,
    fontWeight: '600',
    letterSpacing: 14,
    textAlign: 'center',
  },
  detailsContainer: {
    alignItems: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    width: 50,
    height: 1,
  },
  dividerDiamond: {
    width: 8,
    height: 8,
    marginHorizontal: 12,
    transform: [{ rotate: '45deg' }],
  },
  subtitle: {
    fontSize: 18,
    fontFamily: typography.fonts.display.regular,
    fontWeight: '400',
    letterSpacing: 12,
    textAlign: 'center',
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  tagline: {
    fontSize: 14,
    fontFamily: typography.fonts.body.regular,
    fontStyle: 'italic',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
