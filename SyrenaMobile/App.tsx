import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Session } from '@supabase/supabase-js';
import {
  Text,
  View,
  StyleSheet,
  useColorScheme,
  Pressable,
  Platform,
  StatusBar,
  Linking,
  Animated,
} from 'react-native';
import { MaterialIcons as Icon, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import Geolocation from '@react-native-community/geolocation';

import { supabase } from './src/lib/supabase';
import { runOnboardingIfNeeded } from './src/services/OnboardingService';
import ExploreScreen from './src/screens/ExploreScreen';
import MyPlacesScreen from './src/screens/MyPlacesScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SourceOfJourneyScreen from './src/screens/SourceOfJourneyScreen';
import CreateEventScreen from './src/screens/CreateEventScreen';
import AuthScreen from './src/screens/AuthScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import SplashScreen from './src/components/SplashScreen';
import { theme, getThemeColors } from './src/theme';
import pushNotificationService from './src/services/PushNotificationService';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Animated tab bar icon with smooth transitions
const TabBarIcon = ({ name, focused, color, isCommunityIcon }: { name: string; focused: boolean; color: string; isCommunityIcon?: boolean }) => {
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.9)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1 : 0.9,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
      {isCommunityIcon ? (
        <MaterialCommunityIcons name={name as any} size={24} color={color} />
      ) : (
        <Icon name={name} size={24} color={color} />
      )}
    </Animated.View>
  );
};

// Animated Tab button component with smooth transitions
const TabButton = ({ route, index, state, descriptors, navigation, colors }: any) => {
  const { options } = descriptors[route.key];
  const isFocused = state.index === index;
  const labelOpacity = useRef(new Animated.Value(isFocused ? 1 : 0.6)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(labelOpacity, {
      toValue: isFocused ? 1 : 0.6,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isFocused]);

  const onPressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.95,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate({ name: route.name, merge: true });
    }
  };

  const getIconInfo = () => {
    switch (route.name) {
      case 'Explore':
        return { name: 'explore', isCommunityIcon: false };
      case 'Guide':
        return { name: 'star-four-points', isCommunityIcon: true };
      case 'My Places':
        return { name: 'my-location', isCommunityIcon: false };
      case 'Feed':
        return { name: 'people', isCommunityIcon: false };
      default:
        return { name: 'circle', isCommunityIcon: false };
    }
  };

  const iconInfo = getIconInfo();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.tabBarItem}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale: pressScale }] }]}>
        <View style={styles.tabIconContainer}>
          <TabBarIcon
            name={iconInfo.name}
            focused={isFocused}
            color={isFocused ? colors.primary : colors.textTertiary}
            isCommunityIcon={iconInfo.isCommunityIcon}
          />
        </View>
        <Animated.Text style={[
          styles.tabLabel,
          {
            color: isFocused ? colors.primary : colors.textTertiary,
            fontWeight: isFocused ? '600' : '400',
            opacity: labelOpacity,
          }
        ]}>
          {route.name}
        </Animated.Text>
        {isFocused && (
          <View style={[styles.activeIndicatorDot, { backgroundColor: colors.primary }]} />
        )}
      </Animated.View>
    </Pressable>
  );
};

// Custom tab bar with leather-bound manuscript style
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getThemeColors(isDarkMode);

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.primary }]}>
      {state.routes.map((route: any, index: number) => (
        <TabButton
          key={route.key}
          route={route}
          index={index}
          state={state}
          descriptors={descriptors}
          navigation={navigation}
          colors={colors}
        />
      ))}
    </View>
  );
};

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      sceneContainerStyle={{
        borderBottomWidth: 0,
        borderBottomColor: 'transparent',
      }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          borderTopColor: 'transparent',
        },
      }}
      safeAreaInsets={{ bottom: 0 }}
    >
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Guide" component={SourceOfJourneyScreen} />
      <Tab.Screen name="My Places" component={MyPlacesScreen} />
      <Tab.Screen name="Feed" component={FriendsScreen} />
    </Tab.Navigator>
  );
}

function App(): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const onboardingTriggered = useRef(false);
  const isDarkMode = useColorScheme() === 'dark';
  const navigationRef = useRef<any>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Register for push notifications when user logs in
  useEffect(() => {
    let pushTimeout: NodeJS.Timeout;

    if (session?.user) {
      // Defer push notification registration to avoid blocking UI after login
      pushTimeout = setTimeout(() => {
        registerPushNotifications(session.user.id);
      }, 2000); // Wait 2 seconds after login
    }

    // Listen for notifications when app is foregrounded
    notificationListener.current = pushNotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('[Push] Notification received:', notification);
      }
    );

    // Listen for notification taps
    responseListener.current = pushNotificationService.addNotificationResponseListener(
      (response) => {
        console.log('[Push] Notification tapped:', response);
        const data = response.notification.request.content.data;

        // Navigate based on notification type
        if (navigationRef.current) {
          if (data?.type === 'friend_request' || data?.type === 'friend_accepted') {
            navigationRef.current.navigate('Main', { screen: 'Feed' });
          } else if (data?.type === 'new_place' && data?.place_id) {
            navigationRef.current.navigate('Main', {
              screen: 'Explore',
              params: { showPlaceId: data.place_id, lat: data.lat, lng: data.lng }
            });
          } else {
            navigationRef.current.navigate('Notifications');
          }
        }
      }
    );

    return () => {
      if (pushTimeout) clearTimeout(pushTimeout);
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [session]);

  // Trigger onboarding silently in background for new users
  useEffect(() => {
    if (!session?.user || showSplash || isPasswordRecovery) return;
    if (onboardingTriggered.current) return;

    const runOnboarding = async (location: { latitude: number; longitude: number }) => {
      try {
        const result = await runOnboardingIfNeeded(
          session.user.id,
          location,
          {
            onProgress: (msg) => console.log(`[Onboarding] ${msg}`),
            onComplete: (count) => {
              if (count > 0) {
                console.log(`[App] Onboarding complete: ${count} Syrena Picks added`);
              }
            },
            onError: (err) => console.log('[Onboarding] Error:', err),
          },
        );
        // Only mark as triggered if onboarding ran successfully or was already complete
        onboardingTriggered.current = true;
      } catch (err) {
        console.log('[Onboarding] Failed, will retry on next render:', err);
      }
    };

    const triggerOnboarding = () => {
      // Use default location immediately, then try to get real location
      const defaultLocation = { latitude: 37.78825, longitude: -122.4324 };

      // Start onboarding with default location first (non-blocking)
      // This ensures onboarding runs even if location permission is denied
      let onboardingStarted = false;

      // Set a short timeout to ensure we don't wait too long for location
      const fallbackTimer = setTimeout(() => {
        if (!onboardingStarted) {
          onboardingStarted = true;
          runOnboarding(defaultLocation);
        }
      }, 2000);

      try {
        Geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(fallbackTimer);
            if (!onboardingStarted) {
              onboardingStarted = true;
              runOnboarding({ latitude: position.coords.latitude, longitude: position.coords.longitude });
            }
          },
          () => {
            clearTimeout(fallbackTimer);
            if (!onboardingStarted) {
              onboardingStarted = true;
              runOnboarding(defaultLocation);
            }
          },
          { enableHighAccuracy: false, timeout: 2000, maximumAge: 60000 },
        );
      } catch {
        clearTimeout(fallbackTimer);
        if (!onboardingStarted) {
          onboardingStarted = true;
          runOnboarding(defaultLocation);
        }
      }
    };

    // Defer to let the map and profile trigger settle
    const timer = setTimeout(triggerOnboarding, 3000);
    return () => clearTimeout(timer);
  }, [session, showSplash]);

  const registerPushNotifications = async (userId: string) => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Push registration timeout')), 10000)
      );

      const tokenPromise = pushNotificationService.registerForPushNotifications();
      const token = await Promise.race([tokenPromise, timeoutPromise]);

      if (token) {
        await pushNotificationService.saveTokenToDatabase(userId);
        console.log('[Push] Registered successfully');
      }
    } catch (error) {
      console.log('[Push] Registration skipped or failed:', error);
    }
  };

  // Custom navigation theme
  const navigationTheme = isDarkMode ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: theme.darkColors.primary,
      background: theme.darkColors.background,
      card: theme.darkColors.surface,
      text: theme.darkColors.textPrimary,
      border: 'transparent',
      notification: theme.darkColors.accent,
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: 'transparent',
      notification: theme.colors.accent,
    },
  };

  // Handle deep links for password reset
  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;

      console.log('[App] Deep link received:', url);

      // Handle syrena://reset-password links
      if (url.includes('reset-password')) {
        console.log('[App] Password recovery link detected');

        // Parse URL to extract tokens
        try {
          const urlObj = new URL(url);
          const accessToken = urlObj.searchParams.get('access_token');
          const refreshToken = urlObj.searchParams.get('refresh_token');

          if (accessToken && refreshToken) {
            console.log('[App] Setting session from deep link tokens');
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('[App] Error setting session:', error);
              return;
            }

            if (data.session) {
              console.log('[App] Session set successfully, activating recovery mode');
              setSession(data.session);
              setIsPasswordRecovery(true);
            }
          } else {
            // No tokens in URL, just activate recovery mode if user already has session
            console.log('[App] No tokens in URL, checking existing session');
            const { data: { session: existingSession } } = await supabase.auth.getSession();
            if (existingSession) {
              setIsPasswordRecovery(true);
            }
          }
        } catch (e) {
          console.error('[App] Error parsing deep link:', e);
          // Fallback: just try to activate recovery mode
          setIsPasswordRecovery(true);
        }
      }
    };

    // Check if app was opened from a deep link
    Linking.getInitialURL().then(handleDeepLink);

    // Listen for deep links while app is open
    const linkingListener = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    return () => {
      linkingListener.remove();
    };
  }, []);

  useEffect(() => {
    console.log('[App] Starting auth check...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[App] Got session:', session ? 'logged in' : 'not logged in');
      setSession(session);
      setLoading(false);
    }).catch(err => {
      console.error('[App] Auth error:', err);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[App] Auth state changed:', event, 'isPasswordRecovery:', isPasswordRecovery);

      if (event === 'PASSWORD_RECOVERY') {
        console.log('[App] Password recovery mode activated via auth event');
        setIsPasswordRecovery(true);
        setSession(session);
      } else if (event === 'SIGNED_IN') {
        // Don't reset isPasswordRecovery on SIGNED_IN - let deep link handler control it
        setSession(session);
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
        setSession(null);
        onboardingTriggered.current = false; // Reset so onboarding runs on next sign-in
      } else {
        setSession(session);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [isPasswordRecovery]);

  // Only show splash - auth loading happens in background
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={isDarkMode ? theme.darkColors.background : theme.colors.background}
        />
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </SafeAreaProvider>
    );
  }

  // Show password reset screen if in recovery mode
  if (isPasswordRecovery && session) {
    return (
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={isDarkMode ? theme.darkColors.background : theme.colors.background}
        />
        <ResetPasswordScreen
          onComplete={async () => {
            // Sign out first, then clear the recovery state
            await supabase.auth.signOut();
            setSession(null);
            setIsPasswordRecovery(false);
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? theme.darkColors.background : theme.colors.background}
      />
      <NavigationContainer theme={navigationTheme} ref={navigationRef}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'fade_from_bottom',
            animationDuration: 250,
            gestureEnabled: true,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          {session ? (
            <>
              <Stack.Screen
                name="Main"
                component={TabNavigator}
                options={{
                  animation: 'fade',
                  animationDuration: 300,
                }}
              />
              <Stack.Screen
                name="CreateEvent"
                component={CreateEventScreen}
                options={{
                  animation: 'slide_from_bottom',
                  animationDuration: 300,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{
                  animation: 'slide_from_right',
                  animationDuration: 250,
                }}
              />
            </>
          ) : (
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{
                animation: 'fade',
                animationDuration: 400,
              }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: Platform.select({
      ios: 84,
      android: 64,
      default: 64,
    }),
    paddingBottom: Platform.select({
      ios: 28,
      android: 8,
      default: 8,
    }),
    paddingTop: 10,
    marginTop: -1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(13, 38, 76, 0.10)',
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 26,
  },
  activeIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: theme.typography.fonts.body.regular,
    letterSpacing: 0.3,
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  badgeText: {
    color: theme.colors.textPrimary,
    fontSize: 8,
    fontWeight: '600',
    fontFamily: theme.typography.fonts.body.regular,
  },
});

export default App;