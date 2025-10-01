import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Session } from '@supabase/supabase-js';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { supabase } from './src/lib/supabase';
import ExploreScreen from './src/screens/ExploreScreen';
import MyPlacesScreen from './src/screens/MyPlacesScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import AuthScreen from './src/screens/AuthScreen';
import theme from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = 'explore';

          if (route.name === 'Explore') {
            iconName = 'explore'; // Compass icon (matches web)
          } else if (route.name === 'My Places') {
            iconName = 'my-location'; // Location marker (represents saved places)
          } else if (route.name === 'Friends') {
            iconName = 'people'; // Users icon (matches web)
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.midnightBlue,
        tabBarInactiveTintColor: theme.colors.oceanGrey,
        tabBarStyle: {
          backgroundColor: theme.colors.offWhite,
          borderTopWidth: 2,
          borderTopColor: theme.colors.seaMist,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="My Places" component={MyPlacesScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
    </Tab.Navigator>
  );
}

function App(): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <SafeAreaProvider />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session ? (
            <Stack.Screen name="Main" component={TabNavigator} />
          ) : (
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;