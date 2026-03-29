import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Marker } from 'react-native-maps';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { theme } from '../theme';

interface PulsingEventMarkerProps {
  event: {
    id: string;
    title: string;
    event_type: string;
    lat: number;
    lng: number;
    timeframe: 'soon' | 'upcoming' | 'future' | 'past';
    attendee_count: number;
  };
  onPress: () => void;
}

const getEventIcon = (eventType: string): string => {
  const iconMap: {[key: string]: string} = {
    reservation: 'restaurant',
    concert: 'music-note',
    travel: 'flight',
    meetup: 'people',
    visit: 'place',
    other: 'star',
  };
  return iconMap[eventType] || 'star';
};

const getEventColor = (timeframe: string): string => {
  switch(timeframe) {
    case 'soon': return '#FFB800'; // Gold
    case 'upcoming': return '#3B82F6'; // Blue
    case 'future': return '#A855F7'; // Purple
    default: return '#6B7280'; // Gray
  }
};

export default function PulsingEventMarker({ event, onPress }: PulsingEventMarkerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Pulsing scale animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const eventColor = getEventColor(event.timeframe);

  return (
    <Marker
      coordinate={{
        latitude: event.lat,
        longitude: event.lng,
      }}
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View style={styles.container}>
        {/* Outer glow */}
        <Animated.View
          style={[
            styles.glow,
            {
              backgroundColor: eventColor,
              opacity: glowAnim,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        {/* Inner marker */}
        <Animated.View
          style={[
            styles.marker,
            {
              backgroundColor: eventColor,
              borderColor: theme.colors.offWhite,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Icon name={getEventIcon(event.event_type)} size={28} color={theme.colors.offWhite} />

          {/* Attendee badge */}
          {event.attendee_count > 1 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {event.attendee_count > 9 ? '9+' : event.attendee_count}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  marker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: theme.colors.coral,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.offWhite,
  },
  badgeText: {
    color: theme.colors.offWhite,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: theme.fonts.sans.regular,
  },
});
