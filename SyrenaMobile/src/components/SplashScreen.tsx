import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import theme from '../theme';

interface SplashScreenProps {
  onFinish: () => void;
}

const { width } = Dimensions.get('window');

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Animate logo and text with calmer animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade out after 2.5 seconds
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onFinish();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
            ],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/bluelyre.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.title}>Syrena</Text>
        <Text style={styles.subtitle}>Share your places</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 40,
    backgroundColor: theme.colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: theme.colors.midnightBlue,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 28,
  },
  title: {
    fontSize: 48,
    fontFamily: theme.fonts.display.regular,
    fontWeight: '300',
    color: theme.colors.midnightBlue,
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.serif.italic,
    color: theme.colors.oceanGrey,
    fontStyle: 'italic',
  },
});
