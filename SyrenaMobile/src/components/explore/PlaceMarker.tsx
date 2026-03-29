import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { MaterialIcons as Icon, MaterialCommunityIcons } from '@expo/vector-icons';
import theme from '../../theme';

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  category?: string;
  user_id: string;
  photo_url?: string;
  visit_count?: number;
  price_level?: number;
  city?: string;
  source?: string;
}

interface PlaceMarkerProps {
  place: Place;
  currentUserId?: string;
  onPress: (place: Place) => void;
}

// Enhanced category colors — all 9 types + legacy fallback
const CATEGORY_COLORS: Record<string, string> = {
  restaurant: '#E63946',
  cafe: '#8B6914',
  bar: '#9B59B6',
  hotel: '#457B9D',
  viewpoint: '#E76F51',
  nature: '#2A9D8F',
  shopping: '#D4A84B',
  museum: '#6C5B7B',
  'hidden-gem': '#B8860B',
  activity: '#2A9D8F',
};

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  bar: 'Bar',
  hotel: 'Hotel',
  viewpoint: 'Viewpoint',
  nature: 'Nature',
  shopping: 'Shopping',
  museum: 'Museum',
  'hidden-gem': 'Hidden Gem',
  activity: 'Experience',
};

const getCategoryIcon = (categoryId?: string): string => {
  const icons: Record<string, string> = {
    restaurant: 'restaurant',
    cafe: 'local-cafe',
    bar: 'local-bar',
    hotel: 'hotel',
    viewpoint: 'photo-camera',
    nature: 'park',
    shopping: 'shopping-bag',
    museum: 'museum',
    'hidden-gem': 'star',
    activity: 'explore',
  };
  return icons[categoryId || 'activity'] || 'explore';
};

const getCategoryColor = (categoryId?: string): string => {
  return CATEGORY_COLORS[categoryId || 'activity'] || CATEGORY_COLORS.activity;
};

const getPriceLevelLabel = (level?: number): string | null => {
  if (!level) return null;
  return '$'.repeat(level);
};

const PlaceMarker = memo(function PlaceMarker({ place, currentUserId, onPress }: PlaceMarkerProps) {
  const categoryIcon = getCategoryIcon(place.category);
  const baseColor = getCategoryColor(place.category);
  const categoryLabel = CATEGORY_LABELS[place.category || 'activity'] || 'Place';
  const priceLabel = getPriceLevelLabel(place.price_level);
  const isSyrenaPick = place.source === 'syrena';

  return (
    <Marker
      coordinate={{ latitude: place.lat, longitude: place.lng }}
      tracksViewChanges={false}
    >
      {/* Custom marker pin */}
      {isSyrenaPick ? (
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.marker, styles.filledMarker, { backgroundColor: theme.colors.accent }]}
        >
          <MaterialCommunityIcons name="star-four-points" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.marker, styles.filledMarker, { backgroundColor: baseColor }]}
        >
          <Icon name={categoryIcon} size={16} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Custom callout */}
      <Callout
        tooltip
        onPress={() => onPress(place)}
        style={styles.calloutContainer}
      >
        <View style={styles.callout}>
          {/* Photo strip */}
          {place.photo_url ? (
            <Image
              source={{ uri: place.photo_url }}
              style={styles.calloutImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.calloutImage, styles.calloutImagePlaceholder]}>
              <Icon name={categoryIcon} size={24} color={theme.colors.textTertiary} />
            </View>
          )}

          {/* Content */}
          <View style={styles.calloutContent}>
            {/* Name */}
            <Text style={styles.calloutName} numberOfLines={1}>
              {place.name}
            </Text>

            {/* Category + Price row */}
            <View style={styles.calloutMeta}>
              <View style={[styles.calloutCategoryDot, { backgroundColor: baseColor }]} />
              <Text style={styles.calloutCategory}>{categoryLabel}</Text>
              {priceLabel && (
                <Text style={styles.calloutPrice}>{priceLabel}</Text>
              )}
            </View>

            {/* City */}
            {place.city && (
              <View style={styles.calloutLocationRow}>
                <Icon name="place" size={10} color={theme.colors.textTertiary} />
                <Text style={styles.calloutCity} numberOfLines={1}>{place.city}</Text>
              </View>
            )}

            {/* Bottom row: badges + CTA */}
            <View style={styles.calloutFooter}>
              <View style={styles.calloutBadges}>
                {isSyrenaPick && (
                  <View style={styles.syrenaBadge}>
                    <MaterialCommunityIcons name="star-four-points" size={8} color={theme.colors.accent} />
                    <Text style={styles.syrenaBadgeText}>Recommended by Syrena</Text>
                  </View>
                )}
                {(place.visit_count || 0) > 0 && (
                  <View style={styles.visitsBadge}>
                    <Icon name="check-circle" size={8} color={theme.colors.success} />
                    <Text style={styles.visitsBadgeText}>{place.visit_count}</Text>
                  </View>
                )}
              </View>
              <View style={styles.calloutCta}>
                <Text style={styles.calloutCtaText}>View</Text>
                <Icon name="chevron-right" size={12} color={theme.colors.accent} />
              </View>
            </View>
          </View>

          {/* Arrow nub */}
          <View style={styles.calloutArrowBorder} />
          <View style={styles.calloutArrow} />
        </View>
      </Callout>
    </Marker>
  );
});

export default PlaceMarker;

const CALLOUT_WIDTH = 220;

const styles = StyleSheet.create({
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  filledMarker: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  calloutContainer: {
    width: CALLOUT_WIDTH,
  },
  callout: {
    width: CALLOUT_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: theme.colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  calloutImage: {
    width: CALLOUT_WIDTH,
    height: 80,
    backgroundColor: theme.colors.background,
  },
  calloutImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  calloutContent: {
    padding: 10,
  },
  calloutName: {
    fontSize: 14,
    fontFamily: theme.typography.fonts.body.semibold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  calloutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  calloutCategoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  calloutCategory: {
    fontSize: 11,
    fontFamily: theme.typography.fonts.body.medium,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calloutPrice: {
    fontSize: 11,
    fontFamily: theme.typography.fonts.body.semibold,
    color: theme.colors.accent,
    marginLeft: 2,
  },
  calloutLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 6,
  },
  calloutCity: {
    fontSize: 11,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textTertiary,
  },
  calloutFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  calloutBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syrenaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.accentSubtle,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  syrenaBadgeText: {
    fontSize: 9,
    fontFamily: theme.typography.fonts.body.medium,
    color: theme.colors.accent,
  },
  visitsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  visitsBadgeText: {
    fontSize: 9,
    fontFamily: theme.typography.fonts.body.medium,
    color: theme.colors.success,
  },
  calloutCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  calloutCtaText: {
    fontSize: 11,
    fontFamily: theme.typography.fonts.body.semibold,
    color: theme.colors.accent,
  },
  // Arrow pointing down from callout
  calloutArrowBorder: {
    position: 'absolute',
    bottom: -11,
    left: CALLOUT_WIDTH / 2 - 11,
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: theme.colors.borderSubtle,
  },
  calloutArrow: {
    position: 'absolute',
    bottom: -10,
    left: CALLOUT_WIDTH / 2 - 10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: theme.colors.surface,
  },
});
