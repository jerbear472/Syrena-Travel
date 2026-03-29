import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  RefreshControl,
  Linking,
  Share,
} from 'react-native';
import { MaterialIcons as Icon, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { theme, getThemeColors, spacing, borderRadius, shadows, typography } from '../theme';
import { WEB_API_URL } from '../config/api';

const SEARCH_HISTORY_KEY = 'syrena_guide_search_history';

interface Place {
  name: string;
  description: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  why: string;
  isFriendPlace?: boolean;
  friend_name?: string;
  photo_url?: string | null;
  google_place_id?: string | null;
  rating?: number | null;
  price_level?: number | null;
}

interface JourneyResult {
  vibe_intro: string;
  places: Place[];
}

const SUGGESTED_QUERIES = [
  "I'm exploring Brooklyn this weekend",
  "Hidden gems in Silver Lake, LA",
  "I'm in Trastevere, Rome",
  "Coffee spots in Shimokitazawa, Tokyo",
  "Wandering the Marais in Paris",
  "Colonia Roma, Mexico City",
];

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'restaurant', label: 'Food', icon: 'restaurant' },
  { id: 'cafe', label: 'Coffee', icon: 'local-cafe' },
  { id: 'bar', label: 'Drinks', icon: 'local-bar' },
  { id: 'shopping', label: 'Shop', icon: 'shopping-bag' },
  { id: 'museum', label: 'Culture', icon: 'museum' },
];

const getCategoryIcon = (category: string): string => {
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
  };
  return icons[category] || 'place';
};

export default function SourceOfJourneyScreen() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JourneyResult | null>(null);
  const [error, setError] = useState('');
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());
  const [savingPlace, setSavingPlace] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const isDarkMode = useColorScheme() === 'dark';
  const colors = getThemeColors(isDarkMode);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cardAnims = useRef<Animated.Value[]>([]).current;
  const scrollRef = useRef<ScrollView>(null);

  // Get user location and search history on mount
  useEffect(() => {
    // Load search history immediately (non-blocking)
    loadSearchHistory();

    // Try to get location in background with short timeout
    // Location is optional - don't block the UI
    try {
      Geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {}, // silently fail — location is optional context
        { enableHighAccuracy: false, timeout: 2000, maximumAge: 60000 },
      );
    } catch {
      // Silently ignore - location is optional
    }
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (e) {
      console.log('Failed to load search history');
    }
  };

  const saveToHistory = async (searchQuery: string) => {
    try {
      const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 5);
      setSearchHistory(newHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.log('Failed to save search history');
    }
  };

  // Animate cards when results load
  useEffect(() => {
    if (result?.places) {
      // Reset and create new animations for each card
      cardAnims.length = 0;
      result.places.forEach(() => {
        cardAnims.push(new Animated.Value(0));
      });

      // Stagger the animations
      const animations = cardAnims.map((anim, index) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        })
      );

      Animated.stagger(100, animations).start();
    }
  }, [result]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Pulse animation for loading
  useEffect(() => {
    if (loading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading]);

  const fetchUserAndFriendsPlaces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { userPlaces: [], friendPlaces: [] };

      // Fetch user's own saved places
      const { data: userPlacesData } = await supabase
        .from('places')
        .select('name, description, category, lat, lng, city, address')
        .eq('user_id', user.id);

      const userPlaces = (userPlacesData || []).map((p: any) => ({
        name: p.name,
        description: p.description,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
        city: p.city,
        address: p.address,
        isUserPlace: true,
      }));

      // Fetch friends' places
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      let friendPlaces: any[] = [];
      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map(f =>
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        );

        const { data: places } = await supabase
          .from('places')
          .select('*, profile:profiles!places_user_id_fkey(display_name, username)')
          .in('user_id', friendIds);

        friendPlaces = (places || []).map((p: any) => ({
          name: p.name,
          description: p.description,
          category: p.category,
          lat: p.lat,
          lng: p.lng,
          friend_name: p.profile?.display_name || p.profile?.username || 'A friend',
        }));
      }

      return { userPlaces, friendPlaces };
    } catch {
      return { userPlaces: [], friendPlaces: [] };
    }
  };

  const handleRefresh = async () => {
    if (!lastQuery) return;
    setRefreshing(true);
    await handleSearch(lastQuery);
    setRefreshing(false);
  };

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setLastQuery(q);
    setLoading(true);
    setError('');
    setResult(null);
    setSelectedFilter('all');
    saveToHistory(q);

    try {
      const { userPlaces, friendPlaces } = await fetchUserAndFriendsPlaces();

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

      const response = await fetch(`${WEB_API_URL}/api/source-of-journey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          userPlaces,
          friendPlaces,
          ...(userLocation && { lat: userLocation.latitude, lng: userLocation.longitude }),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to get recommendations');
      }

      const data = await response.json();
      setResult(data);

      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try a shorter query or try again.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlace = async (place: Place) => {
    try {
      setSavingPlace(place.name);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Extract city from address (e.g. "123 Main St, Brooklyn, NY" → "Brooklyn")
      let city: string | null = null;
      if (place.address) {
        const parts = place.address.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          city = parts[parts.length - 2] || parts[1] || null;
        }
      }

      // Generate AI note from the "why" field (Syrena's recommendation reason)
      const aiNote = place.why ? `✨ Syrena's take: ${place.why}` : null;

      const { error: insertError } = await supabase
        .from('places')
        .insert({
          name: place.name,
          description: place.description,
          category: place.category,
          lat: place.lat,
          lng: place.lng,
          address: place.address || null,
          photo_url: place.photo_url || null,
          google_place_id: place.google_place_id || null,
          rating: place.rating || null,
          price_level: place.price_level || null,
          city: city,
          user_id: user.id,
          visit_count: 0,
          source: 'guide',
          notes: aiNote,
        });

      if (insertError) throw insertError;

      setSavedPlaces(prev => new Set([...prev, place.name]));
      Alert.alert('Saved', `${place.name} added to your places`);
    } catch (err: any) {
      console.error('[Guide] Save place error:', err?.message || err);
      Alert.alert('Error', err?.message || 'Failed to save place');
    } finally {
      setSavingPlace(null);
    }
  };

  const handleSaveAll = async () => {
    if (!result?.places) return;

    const unsavedPlaces = result.places.filter(p => !savedPlaces.has(p.name));
    if (unsavedPlaces.length === 0) {
      Alert.alert('All Saved', 'All places are already in your collection!');
      return;
    }

    setSavingAll(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const place of unsavedPlaces) {
        let city: string | null = null;
        if (place.address) {
          const parts = place.address.split(',').map(p => p.trim());
          if (parts.length >= 2) {
            city = parts[parts.length - 2] || parts[1] || null;
          }
        }

        const aiNote = place.why ? `✨ Syrena's take: ${place.why}` : null;

        await supabase.from('places').insert({
          name: place.name,
          description: place.description,
          category: place.category,
          lat: place.lat,
          lng: place.lng,
          address: place.address || null,
          photo_url: place.photo_url || null,
          google_place_id: place.google_place_id || null,
          rating: place.rating || null,
          price_level: place.price_level || null,
          city: city,
          user_id: user.id,
          visit_count: 0,
          source: 'guide',
          notes: aiNote,
        });

        setSavedPlaces(prev => new Set([...prev, place.name]));
      }

      Alert.alert('Saved!', `${unsavedPlaces.length} places added to your collection`);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save some places');
    } finally {
      setSavingAll(false);
    }
  };

  const handleOpenMaps = (place: Place) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(place.name)}@${place.lat},${place.lng}`,
      android: `geo:${place.lat},${place.lng}?q=${encodeURIComponent(place.name)}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleSharePlace = async (place: Place) => {
    try {
      const mapsUrl = `https://maps.google.com/?q=${place.lat},${place.lng}`;
      await Share.share({
        message: `Check out ${place.name}!\n\n${place.description}\n\n📍 ${place.address}\n\n${mapsUrl}`,
        title: place.name,
      });
    } catch (e) {
      // User cancelled
    }
  };

  const handleShareAll = async () => {
    if (!result?.places) return;

    try {
      const placesList = result.places
        .map((p, i) => `${i + 1}. ${p.name} - ${p.description}`)
        .join('\n');

      await Share.share({
        message: `My curated spots for ${lastQuery}:\n\n${placesList}\n\n✨ Curated by Syrena`,
        title: `Places in ${lastQuery}`,
      });
    } catch (e) {
      // User cancelled
    }
  };

  // Filter places by category
  const filteredPlaces = result?.places.filter(place => {
    if (selectedFilter === 'all') return true;
    return place.category === selectedFilter;
  }) || [];

  const renderSuggestions = () => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {/* Recent Searches */}
      {searchHistory.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Recent searches</Text>
          <View style={styles.historyGrid}>
            {searchHistory.map((historyItem, index) => (
              <Pressable
                key={`history-${index}`}
                onPress={() => {
                  setQuery(historyItem);
                  handleSearch(historyItem);
                }}
                style={({ pressed }) => [
                  styles.historyChip,
                  {
                    backgroundColor: pressed ? colors.primarySubtle : colors.surface,
                    borderColor: pressed ? colors.primary : colors.border,
                  },
                ]}
              >
                <Icon name="history" size={14} color={colors.textTertiary} />
                <Text style={[styles.historyText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {historyItem}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={[styles.sectionLabel, { color: colors.textTertiary, marginTop: searchHistory.length > 0 ? spacing.lg : 0 }]}>
        Try something like
      </Text>
      <View style={styles.suggestionsGrid}>
        {SUGGESTED_QUERIES.map((suggestion, index) => (
          <Pressable
            key={suggestion}
            onPress={() => {
              setQuery(suggestion);
              handleSearch(suggestion);
            }}
            style={({ pressed }) => [
              styles.suggestionCard,
              {
                backgroundColor: pressed ? colors.primarySubtle : colors.surface,
                borderColor: pressed ? colors.primary : colors.border,
              },
            ]}
          >
            <Icon name="place" size={16} color={colors.textTertiary} style={{ marginTop: 2 }} />
            <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>
              {suggestion}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  const renderLoading = () => (
    <Animated.View style={[styles.loadingContainer, { opacity: pulseAnim }]}>
      <View style={[styles.loadingIcon, { backgroundColor: colors.primary }]}>
        <MaterialCommunityIcons name="star-four-points" size={28} color={colors.textInverse} />
      </View>
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Reading the area...
      </Text>
      <Text style={[styles.loadingSubtext, { color: colors.textTertiary }]}>
        Curating places worth knowing
      </Text>
    </Animated.View>
  );

  const renderPlaceCard = (place: Place, index: number) => {
    const isSaved = savedPlaces.has(place.name);
    const isSaving = savingPlace === place.name;
    const cardAnim = cardAnims[index] || new Animated.Value(1);

    return (
      <Animated.View
        key={`${place.name}-${index}`}
        style={[
          styles.placeCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            ...shadows.sm,
            opacity: cardAnim,
            transform: [{
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            }],
          },
        ]}
      >
        {/* Photo or Placeholder */}
        {place.photo_url ? (
          <Image
            source={{ uri: place.photo_url }}
            style={styles.placePhoto}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placePhoto, styles.photoPlaceholder, { backgroundColor: colors.primarySubtle }]}>
            <Icon name={getCategoryIcon(place.category) as any} size={48} color={colors.primary} />
          </View>
        )}

        {/* Category badge on photo */}
        <View style={[styles.categoryBadge, { backgroundColor: colors.surface }]}>
          <Icon name={getCategoryIcon(place.category) as any} size={14} color={colors.primary} />
          <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>
            {place.category.charAt(0).toUpperCase() + place.category.slice(1).replace('-', ' ')}
          </Text>
        </View>

        {/* Header */}
        <View style={styles.placeHeader}>
          <View style={styles.placeInfo}>
            <Text style={[styles.placeName, { color: colors.textPrimary }]} numberOfLines={2}>
              {place.name}
            </Text>
            <View style={styles.placeMeta}>
              <Text style={[styles.placeDescription, { color: colors.textTertiary }]} numberOfLines={2}>
                {place.description}
              </Text>
              {(place.rating || place.price_level) && (
                <View style={styles.placeMetaRow}>
                  {place.rating && (
                    <View style={styles.ratingBadge}>
                      <Icon name="star" size={12} color={colors.accent} />
                      <Text style={[styles.ratingText, { color: colors.textSecondary }]}>{place.rating}</Text>
                    </View>
                  )}
                  {place.price_level && (
                    <Text style={[styles.priceText, { color: colors.textTertiary }]}>
                      {'$'.repeat(place.price_level)}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Address - now tappable for maps */}
        <Pressable
          onPress={() => handleOpenMaps(place)}
          style={({ pressed }) => [
            styles.addressRow,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Icon name="location-on" size={12} color={colors.accent} />
          <Text style={[styles.addressText, { color: colors.textTertiary }]} numberOfLines={1}>
            {place.address}
          </Text>
          <Icon name="directions" size={14} color={colors.accent} />
        </Pressable>

        {/* Why */}
        <View style={[styles.whyContainer, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.whyLabel, { color: colors.primary }]}>Why this made the cut</Text>
          <Text style={[styles.whyText, { color: colors.textSecondary }]}>{place.why}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.cardActions}>
          <Pressable
            onPress={() => handleSavePlace(place)}
            disabled={isSaved || isSaving}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: isSaved ? colors.accentSubtle : pressed ? colors.primarySubtle : colors.background,
                borderColor: isSaved ? colors.accent : colors.border,
              },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Icon
                  name={isSaved ? 'check' : 'bookmark-outline'}
                  size={18}
                  color={isSaved ? colors.accent : colors.textSecondary}
                />
                <Text style={[styles.actionButtonText, { color: isSaved ? colors.accent : colors.textSecondary }]}>
                  {isSaved ? 'Saved' : 'Save'}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => handleSharePlace(place)}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: pressed ? colors.primarySubtle : colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Icon name="share" size={18} color={colors.textSecondary} />
            <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Share</Text>
          </Pressable>
        </View>

        {/* Friend badge */}
        {place.isFriendPlace && place.friend_name && (
          <View style={[styles.friendBadge, { backgroundColor: colors.accentSubtle, borderColor: colors.accent }]}>
            <Icon name="star" size={12} color={colors.accent} />
            <Text style={[styles.friendBadgeText, { color: colors.primary }]}>
              Also saved by {place.friend_name}
            </Text>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderResults = () => {
    if (!result) return null;

    const unsavedCount = result.places.filter(p => !savedPlaces.has(p.name)).length;

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Vibe Intro */}
        {result.vibe_intro && (
          <View style={[styles.vibeCard, { backgroundColor: colors.primarySubtle, borderColor: colors.border }]}>
            <Text style={[styles.vibeText, { color: colors.textPrimary }]}>
              "{result.vibe_intro}"
            </Text>
          </View>
        )}

        {/* Quick Actions Row */}
        <View style={styles.quickActionsRow}>
          <Pressable
            onPress={handleSaveAll}
            disabled={savingAll || unsavedCount === 0}
            style={({ pressed }) => [
              styles.quickActionButton,
              {
                backgroundColor: pressed ? colors.accentSubtle : colors.surface,
                borderColor: colors.accent,
                opacity: unsavedCount === 0 ? 0.5 : 1,
              },
            ]}
          >
            {savingAll ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <Icon name="bookmark" size={16} color={colors.accent} />
                <Text style={[styles.quickActionText, { color: colors.accent }]}>
                  {unsavedCount === 0 ? 'All Saved' : `Save All (${unsavedCount})`}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={handleShareAll}
            style={({ pressed }) => [
              styles.quickActionButton,
              {
                backgroundColor: pressed ? colors.primarySubtle : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Icon name="share" size={16} color={colors.primary} />
            <Text style={[styles.quickActionText, { color: colors.primary }]}>Share List</Text>
          </Pressable>
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsContainer}
          style={styles.filterChipsScroll}
        >
          {CATEGORY_FILTERS.map(filter => {
            const count = filter.id === 'all'
              ? result.places.length
              : result.places.filter(p => p.category === filter.id).length;

            if (count === 0 && filter.id !== 'all') return null;

            const isActive = selectedFilter === filter.id;

            return (
              <Pressable
                key={filter.id}
                onPress={() => setSelectedFilter(filter.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <Icon
                  name={filter.icon as any}
                  size={14}
                  color={isActive ? colors.textInverse : colors.textSecondary}
                />
                <Text style={[
                  styles.filterChipText,
                  { color: isActive ? colors.textInverse : colors.textSecondary }
                ]}>
                  {filter.label} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Places */}
        {filteredPlaces.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Icon name="search-off" size={48} color={colors.textTertiary} />
            <Text style={[styles.noResultsText, { color: colors.textTertiary }]}>
              No {selectedFilter} spots in this area
            </Text>
            <Pressable onPress={() => setSelectedFilter('all')}>
              <Text style={[styles.showAllLink, { color: colors.primary }]}>Show all places</Text>
            </Pressable>
          </View>
        ) : (
          filteredPlaces.map((place, index) => renderPlaceCard(place, index))
        )}

        {/* Search Again */}
        <Pressable
          onPress={() => {
            setResult(null);
            setQuery('');
            setSelectedFilter('all');
          }}
          style={({ pressed }) => [
            styles.searchAgainButton,
            {
              backgroundColor: pressed ? colors.primarySubtle : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Icon name="explore" size={18} color={colors.primary} />
          <Text style={[styles.searchAgainText, { color: colors.primary }]}>Explore another area</Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerTop}>
            <MaterialCommunityIcons name="star-four-points" size={14} color={colors.accent} />
            <Text style={[styles.headerBadge, { color: colors.textTertiary }]}>THE GUIDE</Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Where to next?</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
            Drop your neighborhood. We'll pull the spots worth knowing.
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            result ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {/* Search Input */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="explore" size={20} color={colors.textTertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch()}
              placeholder="I'm in Williamsburg, Brooklyn..."
              placeholderTextColor={colors.textTertiary}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              editable={!loading}
              returnKeyType="search"
            />
            <Pressable
              onPress={() => handleSearch()}
              disabled={loading || !query.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: query.trim() ? (pressed ? colors.primaryDark : colors.primary) : colors.border,
                },
              ]}
            >
              <Icon name="send" size={18} color={query.trim() ? colors.textInverse : colors.textTertiary} />
            </Pressable>
          </View>

          {/* Content States */}
          {!result && !loading && renderSuggestions()}
          {loading && renderLoading()}
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.errorSubtle, borderColor: colors.error }]}>
              <Icon name="error-outline" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}
          {result && renderResults()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  headerBadge: {
    fontSize: typography.sizes.xxs,
    fontWeight: '500',
    letterSpacing: 2,
    fontFamily: typography.fonts.body.medium,
  },
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: '600',
    fontFamily: typography.fonts.heading.regular,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.body.regular,
    marginTop: spacing.sm,
    lineHeight: typography.sizes.base * 1.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.body.regular,
    paddingVertical: spacing.xs,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    fontFamily: typography.fonts.body.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  suggestionsGrid: {
    gap: spacing.sm,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  suggestionText: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.heading.regular,
    lineHeight: typography.sizes.base * 1.5,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  loadingIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.heading.italic,
    fontStyle: 'italic',
  },
  loadingSubtext: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body.regular,
    marginTop: spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body.regular,
  },
  vibeCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  vibeText: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.heading.italic,
    fontStyle: 'italic',
    lineHeight: typography.sizes.lg * 1.6,
  },
  placeCard: {
    borderRadius: borderRadius.card,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  placePhoto: {
    width: '100%',
    height: 160,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    fontFamily: typography.fonts.heading.regular,
    lineHeight: typography.sizes.md * 1.3,
  },
  placeDescription: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.heading.italic,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    lineHeight: typography.sizes.sm * 1.5,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  addressText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.body.regular,
  },
  whyContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  whyLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    fontFamily: typography.fonts.body.semibold,
    marginBottom: spacing.xs,
  },
  whyText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body.regular,
    lineHeight: typography.sizes.sm * 1.5,
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  placeMeta: {
    flex: 1,
  },
  placeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.body.medium,
  },
  priceText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.body.regular,
  },
  friendBadgeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.body.regular,
  },
  searchAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing.lg,
  },
  searchAgainText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
    fontFamily: typography.fonts.body.medium,
  },
  // New styles for enhanced features
  historyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  historyText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body.regular,
    maxWidth: 150,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    fontFamily: typography.fonts.body.semibold,
  },
  filterChipsScroll: {
    marginBottom: spacing.lg,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body.medium,
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  categoryBadgeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.body.medium,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body.medium,
    fontWeight: '500',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  noResultsText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fonts.body.regular,
    marginTop: spacing.md,
  },
  showAllLink: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body.medium,
    marginTop: spacing.sm,
    textDecorationLine: 'underline',
  },
});
