import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Share,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Animated,
  Linking,
  Easing,
  InteractionManager,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import LinearGradient from 'react-native-linear-gradient';
import Geolocation from '@react-native-community/geolocation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon, MaterialCommunityIcons } from '@expo/vector-icons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { supabase } from '../lib/supabase';
import theme from '../theme';
import { getApiUrl, API_CONFIG } from '../config/api';
import { cleanCityName, getCityFromCoordinates } from '../utils/location';
import {
  PlaceMarker,
  FriendsSelectorModal,
  ProfileModal,
  AddPlaceModal,
  PlaceDetailsModal,
} from '../components/explore';
import { PressableScale } from '../components/ui/AnimatedComponents';
import { runOnboardingIfNeeded } from '../services/OnboardingService';

const { width: screenWidth } = Dimensions.get('window');

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
  odyssey_icon?: string;
  created_at?: string;
  city?: string;
  source?: string;
}

interface PlaceDetails {
  name?: string;
  address?: string;
  photos?: string[];
  priceLevel?: number;
  types?: string[];
  error?: boolean;
  city?: string;
  placeId?: string;
}

interface NearbyAlternative {
  placeId: string;
  name: string;
  address: string;
  types: string[];
}

interface PlaceOwner {
  id: string;
  username?: string;
  display_name?: string;
}

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  profiles?: {
    username?: string;
    display_name?: string;
  };
}

interface SearchResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const categories = [
  { id: 'restaurant', name: 'Restaurant', icon: 'restaurant' },
  { id: 'cafe', name: 'Cafe', icon: 'local-cafe' },
  { id: 'bar', name: 'Bar', icon: 'local-bar' },
  { id: 'hotel', name: 'Hotel', icon: 'hotel' },
  { id: 'viewpoint', name: 'Viewpoint', icon: 'photo-camera' },
  { id: 'nature', name: 'Nature', icon: 'park' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag' },
  { id: 'museum', name: 'Museum', icon: 'museum' },
  { id: 'hidden-gem', name: 'Hidden Gem', icon: 'star' },
];

const ALL_CATEGORY_IDS = categories.map(c => c.id);

const CATEGORY_ICONS: { [key: string]: string } = {
  restaurant: 'restaurant',
  cafe: 'local-cafe',
  hotel: 'hotel',
  bar: 'local-bar',
  activity: 'explore',
  viewpoint: 'photo-camera',
  nature: 'park',
  shopping: 'shopping-bag',
  museum: 'museum',
  'hidden-gem': 'star',
};

// cleanCityName and getCityFromCoordinates imported from ../utils/location

export default function ExploreScreen({ route, navigation }: any) {
  const mapRef = useRef<MapView>(null);

  // Subtle chevron animation for map card
  const chevronAnim = useRef(new Animated.Value(0)).current;

  // Track which cities have been fetched this session to prevent duplicate API calls
  const fetchedCitiesRef = useRef<Set<string>>(new Set());

  // View mode state
  const [showFullMap, setShowFullMap] = useState(false);

  // Places state
  const [places, setPlaces] = useState<Place[]>([]); // Filtered places for map
  const [allPlaces, setAllPlaces] = useState<Place[]>([]); // All places for landing page
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);

  // User state
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{avatar_url?: string} | null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriendFilters, setSelectedFriendFilters] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(ALL_CATEGORY_IDS);
  const [selectedPriceLevels, setSelectedPriceLevels] = useState<number[]>([1, 2, 3, 4]);
  const [showSyrenaPicksFilter, setShowSyrenaPicksFilter] = useState<boolean>(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<{lat: number; lng: number; name: string} | null>(null);

  // Handle search text change with ref update to fix Fabric sync issue
  const handleSearchTextChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Modal visibility
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFriendsSelector, setShowFriendsSelector] = useState(false);

  // Add place form state
  const [newPlace, setNewPlace] = useState<{lat: number; lng: number} | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [placeDescription, setPlaceDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceLevel, setPriceLevel] = useState(0);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [nearbyAlternatives, setNearbyAlternatives] = useState<NearbyAlternative[]>([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [loadingAlternative, setLoadingAlternative] = useState(false);
  const [loadingPlaceDetails, setLoadingPlaceDetails] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<{uri: string; type: string; name: string}[]>([]);
  const [selectedGooglePhotoUrl, setSelectedGooglePhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [placeOwner, setPlaceOwner] = useState<PlaceOwner | null>(null);

  // Details modal state
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // General state
  const [loading, setLoading] = useState(false);
  const [reloadingSyrenaPicks, setReloadingSyrenaPicks] = useState(false);

  // Edit place state
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);

  // Initialize - defer heavy operations until after render
  useEffect(() => {
    // Use InteractionManager to wait for animations/transitions to complete
    const task = InteractionManager.runAfterInteractions(() => {
      getCurrentLocation();
      getUser();
    });

    return () => task.cancel();
  }, []);

  // Subtle chevron micro-motion for map card
  useEffect(() => {
    const chevronAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(chevronAnim, {
          toValue: 4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(chevronAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    chevronAnimation.start();

    return () => {
      chevronAnimation.stop();
    };
  }, []);

  // Initialize filters to show all places by default (MY_PLACES + all friends)
  useEffect(() => {
    if (user && friends.length >= 0) {
      const friendIds = friends.map(f => f.friend_id).filter(Boolean);
      const allFilters = ['MY_PLACES', ...friendIds];
      // Only set if filters are empty (initial load)
      if (selectedFriendFilters.length === 0) {
        setSelectedFriendFilters(allFilters);
      }
    }
  }, [user, friends]);

  // Load places when user, friends, or friend filters change (debounced)
  useEffect(() => {
    if (!user) return;

    // Debounce filter changes to prevent excessive API calls
    // Using 400ms to batch rapid filter toggles
    const timer = setTimeout(() => {
      loadPlaces();
    }, 400);

    return () => clearTimeout(timer);
  }, [user, friends, selectedFriendFilters, selectedCategories, selectedPriceLevels, showSyrenaPicksFilter]);

  // Realtime subscription and useFocusEffect DISABLED
  // They were causing constant flickering/reloading
  // Users can pull-to-refresh or data loads on mount

  // Handle navigation from My Places - focus on a specific place
  useEffect(() => {
    if (!route?.params?.focusPlace) return;

    const { lat, lng } = route.params.focusPlace;
    setShowFullMap(true);

    const timer = setTimeout(() => {
      mapRef.current?.animateToRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }, 500);

    return () => clearTimeout(timer);
  }, [route?.params?.focusPlace]);

  // Handle navigation from friend's places - filter by friend and focus on their last place
  useEffect(() => {
    if (!route?.params?.filterByFriendId) return;

    const friendId = route.params.filterByFriendId;
    // Set filter to only show this friend's places (not MY_PLACES)
    setSelectedFriendFilters([friendId]);
    setShowFullMap(true);

    // Find the friend's most recent place and focus on it
    const friendPlaces = allPlaces.filter(p => p.user_id === friendId);
    let timer: NodeJS.Timeout | null = null;

    if (friendPlaces.length > 0) {
      // Places are already sorted by created_at desc, so first is most recent
      const lastPlace = friendPlaces[0];
      timer = setTimeout(() => {
        mapRef.current?.animateToRegion({
          latitude: lastPlace.lat,
          longitude: lastPlace.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }, 500);
    }

    // Clear the param to avoid re-triggering
    navigation.setParams({ filterByFriendId: undefined, filterByFriendName: undefined });

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [route?.params?.filterByFriendId, allPlaces]);

  // Search with debounce (500ms to reduce Google API calls)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length > 2) {
        searchPlaces(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        loadFriends(user.id);
        loadUserProfile(user.id);
      }
    } catch (error: any) {
      console.error('Error getting user:', error?.message || 'Unknown error');
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (data) {
        setUserProfile(data);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error?.message);
    }
  };

  const loadFriends = async (userId: string) => {
    try {

      // First get friendships
      const { data: friendshipsData, error: friendshipsError } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', 'accepted');


      if (friendshipsError) {
        console.log('Friendships error:', friendshipsError);
        setFriends([]);
        return;
      }

      if (!friendshipsData || friendshipsData.length === 0) {
        setFriends([]);
        return;
      }

      // Get friend IDs
      const friendIds = friendshipsData.map(f =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      );

      // Fetch profiles for friends
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', friendIds);


      const transformedData = friendshipsData.map(f => {
        const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
        const friendProfile = profilesData?.find(p => p.id === friendId);
        return {
          id: f.id,
          friend_id: friendId,
          status: 'accepted',
          friend: friendProfile || null
        };
      });

      setFriends(transformedData);
      // Default all friends to be selected in filters
      setSelectedFriendFilters(transformedData.map(f => f.friend_id));
    } catch (error: any) {
      setFriends([]);
    }
  };

  const getCurrentLocation = () => {
    // Set default location immediately to prevent UI freeze
    const defaultLocation = { latitude: 37.78825, longitude: -122.4324 };

    // Set a quick fallback timeout in case geolocation hangs
    const fallbackTimer = setTimeout(() => {
      if (!userLocation) {
        console.log('[Location] Fallback timeout - using default');
        setUserLocation(defaultLocation);
      }
    }, 3000); // 3 second fallback

    try {
      Geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(fallbackTimer);
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
        },
        (error) => {
          clearTimeout(fallbackTimer);
          console.log('[Location] Error:', error.message);
          setUserLocation(defaultLocation);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    } catch (error) {
      clearTimeout(fallbackTimer);
      console.log('[Location] Exception:', error);
      setUserLocation(defaultLocation);
    }
  };

  const recenterToCurrentLocation = () => {
    if (userLocation) {
      mapRef.current?.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    } else {
      getCurrentLocation();
    }
  };

  const loadPlaces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Always get ALL user IDs (user + all friends) for the landing page
      const allUserIds: string[] = [user.id];
      const friendIds = friends.map(f => f.friend_id).filter(Boolean);
      allUserIds.push(...friendIds);

      // Load ALL places first (for landing page sections)
      const { data: allData, error: allError } = await supabase
        .from('places')
        .select('*')
        .in('user_id', allUserIds)
        .order('created_at', { ascending: false });

      if (allError) throw allError;

      const allUserIdsFromData = [...new Set(allData?.map(p => p.user_id))];
      const allPlaceIds = allData?.map(p => p.id) || [];

      // Fetch profiles and visit counts in parallel
      const [profilesResult, visitsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, odyssey_icon')
          .in('id', allUserIdsFromData),
        supabase
          .from('place_visits')
          .select('place_id')
          .in('place_id', allPlaceIds)
      ]);

      const profiles = profilesResult.data;
      const visits = visitsResult.data || [];

      // Count visits per place
      const visitCounts: { [key: string]: number } = {};
      visits.forEach(v => {
        visitCounts[v.place_id] = (visitCounts[v.place_id] || 0) + 1;
      });

      const allPlacesWithIcons = allData?.map(place => {
        const profile = profiles?.find(p => p.id === place.user_id);
        return {
          ...place,
          odyssey_icon: profile?.odyssey_icon || 'odyssey-3.png',
          visit_count: visitCounts[place.id] || 0
        };
      }) || [];

      // Store ALL places for landing page (before any filtering)
      setAllPlaces(allPlacesWithIcons);

      // Now apply filters for the map view
      let userIdsToShow: string[] = [];

      // Only show places from checked filters (nothing checked = no places)
      if (selectedFriendFilters.includes('MY_PLACES')) {
        userIdsToShow.push(user.id);
      }
      const friendFilters = selectedFriendFilters.filter(id => id !== 'MY_PLACES');
      userIdsToShow.push(...friendFilters);

      userIdsToShow = [...new Set(userIdsToShow)];

      // Filter places for map based on selected friend filters
      let filteredPlaces = allPlacesWithIcons.filter(place =>
        userIdsToShow.includes(place.user_id)
      );

      // Apply Syrena Picks filter
      if (!showSyrenaPicksFilter) {
        filteredPlaces = filteredPlaces.filter(place => place.source !== 'syrena');
      }

      // Apply category and price level filters
      filteredPlaces = filteredPlaces.filter(place => {
        // Category filter (if all selected, show all; also show places with unrecognized categories)
        const placeCategory = place.category || '';
        const categoryMatch = selectedCategories.length === ALL_CATEGORY_IDS.length ||
          selectedCategories.includes(placeCategory) ||
          !ALL_CATEGORY_IDS.includes(placeCategory);

        // Price level filter (if all selected, show all; also include places without price_level)
        const priceMatch = selectedPriceLevels.length === 4 ||
          !place.price_level ||
          selectedPriceLevels.includes(place.price_level);

        return categoryMatch && priceMatch;
      });

      // Set filtered places for map
      setPlaces(filteredPlaces);

      // DISABLED: City fetching on load was causing excessive API charges ($1500+)
      // Cities are now set when places are CREATED (see savePlace below)
    } catch (error: any) {
      console.error('Error loading places:', error?.message || 'Unknown error');
    }
  };

  // Reload Syrena picks: delete existing ones and regenerate
  const reloadSyrenaPicks = async () => {
    if (!user || reloadingSyrenaPicks) return;

    Alert.alert(
      'Reload Recommendations',
      'This will replace your current Syrena picks with fresh recommendations. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reload',
          onPress: async () => {
            setReloadingSyrenaPicks(true);
            try {
              // Delete existing Syrena picks
              const { error: deleteError } = await supabase
                .from('places')
                .delete()
                .eq('user_id', user.id)
                .eq('source', 'syrena');

              if (deleteError) throw deleteError;

              // Reset onboarding flag so it can re-run
              await supabase
                .from('profiles')
                .update({ onboarding_complete: false })
                .eq('id', user.id);

              // Get location and regenerate
              const location = userLocation || { latitude: 37.78825, longitude: -122.4324 };
              await runOnboardingIfNeeded(user.id, location, {
                onComplete: (count) => {
                  console.log(`[Reload] Regenerated ${count} Syrena Picks`);
                  loadPlaces();
                },
                onError: (err) => {
                  Alert.alert('Error', 'Failed to reload recommendations. Please try again.');
                  console.error('[Reload] Error:', err);
                },
              });
            } catch (err: any) {
              console.error('[Reload] Error:', err?.message || err);
              Alert.alert('Error', 'Failed to reload recommendations.');
            } finally {
              setReloadingSyrenaPicks(false);
            }
          },
        },
      ]
    );
  };

  // Search functionality using Google Places API with location bias
  const searchPlaces = async (query: string) => {
    setIsSearching(true);
    try {
      const API_URL = getApiUrl('search');

      // Build URL with location bias if available
      let url = `${API_URL}?query=${encodeURIComponent(query)}`;
      if (userLocation) {
        url += `&lat=${userLocation.latitude}&lng=${userLocation.longitude}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.predictions) {
          setSearchResults(data.predictions);
          setShowSearchResults(true);
        } else {
          setSearchResults([]);
          setShowSearchResults(false);
        }
      } else {
        console.log('Search API error:', response.status);
        setSearchResults([]);
      }
    } catch (error: any) {
      console.log('Search error:', error.message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultPress = async (result: SearchResult) => {
    setIsSearching(true);
    try {
      // Get place details to get coordinates
      const API_URL = getApiUrl('place-details');
      const response = await fetch(`${API_URL}?place_id=${result.place_id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.geometry?.location) {
          const { lat, lng } = data.result.geometry.location;
          const placeName = result.structured_formatting.main_text;

          // Set the searched location to show a pin
          setSearchedLocation({ lat, lng, name: placeName });

          // Navigate to full map and focus on location
          setShowFullMap(true);
          setSearchQuery('');
          setShowSearchResults(false);

          setTimeout(() => {
            mapRef.current?.animateToRegion({
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 1000);
          }, 300);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', 'Could not find location');
    } finally {
      setIsSearching(false);
    }
  };

  const fetchPlaceDetails = async (lat: number, lng: number, skipAutoFill: boolean = false) => {
    setLoadingPlaceDetails(true);
    setNearbyAlternatives([]);
    setShowAlternatives(false);

    try {
      const API_URL = getApiUrl('places');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(`${API_URL}?lat=${lat}&lng=${lng}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const placeInfo = data.placeDetails;
        const alternatives = data.nearbyAlternatives || [];

        // Store nearby alternatives for "wrong place" feature
        setNearbyAlternatives(alternatives);

        if (placeInfo && !placeInfo.error) {
          // Extract city from address (typically format: "123 St, City, State, Country")
          let city = '';
          if (placeInfo.address) {
            const parts = placeInfo.address.split(',').map((p: string) => p.trim());
            // City is usually the 2nd part (after street address)
            if (parts.length >= 2) {
              city = cleanCityName(parts[1]);
            }
          }
          setPlaceDetails({ ...placeInfo, city });

          // Only auto-fill if not skipping and user hasn't chosen custom place
          if (!skipAutoFill) {
            if (placeInfo.name) {
              setPlaceName(placeInfo.name);
            }
            if (placeInfo.priceLevel) {
              setPriceLevel(placeInfo.priceLevel);
            }

            if (placeInfo.types && placeInfo.types.length > 0) {
              const types = placeInfo.types;
              if (types.includes('bar') || types.includes('night_club')) {
                setSelectedCategory('bar');
              } else if (types.includes('restaurant') || types.includes('food')) {
                setSelectedCategory('restaurant');
              } else if (types.includes('hotel') || types.includes('lodging')) {
                setSelectedCategory('hotel');
              } else {
                setSelectedCategory('activity');
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.log('Error fetching place details:', error.message);
    } finally {
      setLoadingPlaceDetails(false);
    }
  };

  const handleMapPress = (event: any) => {
    const coordinate = event.nativeEvent.coordinate;

    resetForm();
    setNewPlace({ lat: coordinate.latitude, lng: coordinate.longitude });
    setShowAddModal(true);
    fetchPlaceDetails(coordinate.latitude, coordinate.longitude);
  };

  const handlePoiClick = (event: any) => {
    const { coordinate } = event.nativeEvent;

    resetForm();
    setNewPlace({ lat: coordinate.latitude, lng: coordinate.longitude });
    setShowAddModal(true);
    fetchPlaceDetails(coordinate.latitude, coordinate.longitude);
  };

  const [useCustomPlace, setUseCustomPlace] = useState(false);

  const resetForm = () => {
    setPlaceName('');
    setPlaceDescription('');
    setSelectedCategory('');
    setPlaceDetails(null);
    setPriceLevel(0);
    setSelectedPhotos([]);
    setSelectedGooglePhotoUrl(null);
    setNewPlace(null);
    setPlaceOwner(null);
    setEditingPlace(null);
    setUseCustomPlace(false);
    setNearbyAlternatives([]);
    setShowAlternatives(false);
  };

  const clearGoogleSuggestion = () => {
    // If there are alternatives, show them instead of clearing everything
    if (nearbyAlternatives.length > 0) {
      setShowAlternatives(true);
    } else {
      // No alternatives available, fall back to custom entry
      setPlaceDetails(null);
      setPlaceName('');
      setSelectedCategory('');
      setPriceLevel(0);
      setSelectedGooglePhotoUrl(null);
      setUseCustomPlace(true);
    }
  };

  const selectAlternativePlace = async (alternative: NearbyAlternative) => {
    setLoadingAlternative(true);
    setShowAlternatives(false);

    try {
      const API_URL = getApiUrl('places');
      const response = await fetch(`${API_URL}/details?place_id=${alternative.placeId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        const placeInfo = data.placeDetails;

        if (placeInfo && !placeInfo.error) {
          // Extract city from address
          let city = '';
          if (placeInfo.address) {
            const parts = placeInfo.address.split(',').map((p: string) => p.trim());
            if (parts.length >= 2) {
              city = cleanCityName(parts[1]);
            }
          }
          setPlaceDetails({ ...placeInfo, city });
          setPlaceName(placeInfo.name || '');
          setSelectedGooglePhotoUrl(null); // Reset photo selection for new place

          if (placeInfo.priceLevel) {
            setPriceLevel(placeInfo.priceLevel);
          }

          // Auto-detect category from types
          if (placeInfo.types && placeInfo.types.length > 0) {
            const types = placeInfo.types;
            if (types.includes('bar') || types.includes('night_club')) {
              setSelectedCategory('bar');
            } else if (types.includes('restaurant') || types.includes('food')) {
              setSelectedCategory('restaurant');
            } else if (types.includes('hotel') || types.includes('lodging')) {
              setSelectedCategory('hotel');
            } else {
              setSelectedCategory('activity');
            }
          }
        }
      }
    } catch (error: any) {
      console.log('Error fetching alternative place details:', error.message);
      Alert.alert('Error', 'Could not load place details');
    } finally {
      setLoadingAlternative(false);
    }
  };

  const enterCustomPlace = () => {
    setShowAlternatives(false);
    setPlaceDetails(null);
    setPlaceName('');
    setSelectedCategory('');
    setPriceLevel(0);
    setSelectedGooglePhotoUrl(null);
    setUseCustomPlace(true);
  };

  const pickImage = () => {
    Alert.alert(
      'Add Photo',
      'Choose a photo source',
      [
        { text: 'Camera', onPress: () => launchCamera({ mediaType: 'photo' }, handleCameraResponse) },
        { text: 'Gallery', onPress: () => launchImageLibrary({ mediaType: 'photo', selectionLimit: 5 }, handleGalleryResponse) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleCameraResponse = (response: any) => {
    if (response.didCancel || response.errorCode) return;

    const asset = response.assets?.[0];
    if (asset) {
      setSelectedPhotos(prev => [...prev, {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `photo_${Date.now()}.jpg`,
      }]);
    }
  };

  const handleGalleryResponse = (response: any) => {
    if (response.didCancel || response.errorCode) return;

    const assets = response.assets || [];
    const newPhotos = assets.map((asset: any) => ({
      uri: asset.uri,
      type: asset.type || 'image/jpeg',
      name: asset.fileName || `photo_${Date.now()}.jpg`,
    }));
    setSelectedPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (selectedPhotos.length === 0) return [];

    setUploadingPhoto(true);
    const uploadedUrls: string[] = [];

    try {
      for (const photo of selectedPhotos) {
        const fileName = `${user?.id}/${Date.now()}-${photo.name}`;

        const formData = new FormData();
        formData.append('file', {
          uri: photo.uri,
          type: photo.type,
          name: photo.name,
        } as any);

        const { error } = await supabase.storage
          .from('place-photos')
          .upload(fileName, formData);

        if (error) {
          console.error('Upload error for photo:', error);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('place-photos')
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      }

      return uploadedUrls;
    } catch (error: any) {
      console.error('Upload error:', error);
      return uploadedUrls;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const savePlace = async () => {
    if (!newPlace || !placeName || !selectedCategory) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (selectedPhotos.length === 0 && !selectedGooglePhotoUrl) {
      Alert.alert('Photo Required', 'Please select a Google photo or upload your own before saving.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let photoUrl = null;
      if (selectedPhotos.length > 0) {
        // User uploaded their own photos - upload them
        const uploadedUrls = await uploadPhotos();
        if (uploadedUrls.length > 0) {
          // Store first photo as main photo_url, additional as JSON in photo_urls
          photoUrl = uploadedUrls[0];
        }
      } else if (selectedGooglePhotoUrl) {
        // User selected a Google photo - use that URL directly
        photoUrl = selectedGooglePhotoUrl;
      }

      // Extract city from placeDetails (one-time, no additional API call)
      let city: string | null = null;
      if (placeDetails?.city) {
        city = cleanCityName(placeDetails.city);
      } else if (placeDetails?.address) {
        // Fallback: extract city from address
        const parts = placeDetails.address.split(',').map((p: string) => p.trim());
        if (parts.length >= 2) {
          city = cleanCityName(parts[1]);
        }
      }

      const placeData = {
        name: placeName,
        description: placeDescription,
        lat: newPlace.lat,
        lng: newPlace.lng,
        category: selectedCategory,
        price_level: priceLevel > 0 ? priceLevel : null,
        photo_url: photoUrl,
        user_id: user.id,
        city: city, // Store city once - no need to fetch again!
      };

      const { error } = await supabase.from('places').insert(placeData);

      if (error) throw new Error('Failed to save place: ' + error.message);

      setShowAddModal(false);
      resetForm();
      setSearchedLocation(null);
      await loadPlaces();
      Alert.alert('Success', `"${placeName}" has been saved!`);
    } catch (error: any) {
      Alert.alert('Error Saving Place', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerPress = async (place: Place) => {
    setSelectedPlace(place);
    setVisitors([]);

    try {
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('id', place.user_id)
        .single();

      if (ownerData) {
        setPlaceOwner(ownerData);
      }
    } catch (error) {
      console.error('Error loading place owner:', error);
    }

    loadComments(place.id);
    loadVisitors(place.id);
    setShowDetailsModal(true);
  };

  const loadVisitors = async (placeId: string) => {
    try {
      const { data, error } = await supabase
        .from('place_visits')
        .select('*, profiles:visitor_id(username, display_name, avatar_url)')
        .eq('place_id', placeId)
        .order('visited_at', { ascending: false });

      if (error) {
        console.error('Error loading visitors:', error);
        setVisitors([]);
        return;
      }
      setVisitors(data || []);
    } catch (error: any) {
      console.error('Error loading visitors:', error);
      setVisitors([]);
    }
  };

  const loadComments = async (placeId: string) => {
    try {

      // First get comments
      const { data: commentsData, error } = await supabase
        .from('place_comments')
        .select('*')
        .eq('place_id', placeId)
        .order('created_at', { ascending: false });


      if (error) {
        console.log('Error loading comments:', error);
        setComments([]);
        return;
      }

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }


      // Then get profiles for each comment
      const userIds = [...new Set(commentsData.map(c => c.created_by))];

      const { data: profilesData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', userIds);


      // Merge profiles into comments
      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        profiles: profilesData?.find(p => p.id === comment.created_by) || null,
      }));

      setComments(commentsWithProfiles);
    } catch (error: any) {
      console.log('Exception loading comments:', error);
      setComments([]);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !selectedPlace) return;

    setSubmittingComment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: insertData, error } = await supabase
        .from('place_comments')
        .insert({
          place_id: selectedPlace.id,
          created_by: user.id,
          comment: newComment.trim(),
        })
        .select();

      if (error) throw error;

      // Get user profile for the optimistic update
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single();

      const senderName = profile?.display_name || profile?.username || 'Someone';

      // Add the comment to the UI with the real ID from insert
      const newCommentObj: Comment = {
        id: insertData?.[0]?.id || `temp-${Date.now()}`,
        comment: newComment.trim(),
        created_at: new Date().toISOString(),
        profiles: {
          display_name: profile?.display_name,
          username: profile?.username,
        },
      };
      setComments(prevComments => [newCommentObj, ...prevComments]);

      // Notify the place owner (if not commenting on own place)
      if (selectedPlace.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: selectedPlace.user_id,
          type: 'place_comment',
          title: 'New Comment',
          message: `${senderName} commented on ${selectedPlace.name}`,
          data: { place_id: selectedPlace.id, commenter_id: user.id },
          read: false,
        });
      }

      setNewComment('');
      Alert.alert('Success', 'Comment added!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const markAsVisited = async (placeId: string) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // Get place details first to know the owner
      const { data: place } = await supabase
        .from('places')
        .select('user_id, name')
        .eq('id', placeId)
        .single();

      // Insert into place_visits table
      const { error: visitError } = await supabase
        .from('place_visits')
        .insert({
          place_id: placeId,
          visitor_id: currentUser.id,
        });

      if (visitError) {
        // Check if it's a unique constraint error (already visited)
        if (visitError.code === '23505') {
          Alert.alert('Already Visited', 'You have already marked this place as visited!');
          return;
        }
        throw visitError;
      }

      // Notify the place owner (if not visiting own place)
      if (place && place.user_id !== currentUser.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('id', currentUser.id)
          .single();

        const visitorName = profile?.display_name || profile?.username || 'Someone';

        await supabase.from('notifications').insert({
          user_id: place.user_id,
          type: 'place_visit',
          title: 'New Visit',
          message: `${visitorName} visited ${place.name}`,
          data: { place_id: placeId, visitor_id: currentUser.id },
          read: false,
        });
      }

      // Count visits directly from place_visits table
      const { data: visits } = await supabase
        .from('place_visits')
        .select('place_id')
        .eq('place_id', placeId);

      const newVisitCount = visits?.length || 0;

      // Update selectedPlace state
      if (selectedPlace) {
        setSelectedPlace({ ...selectedPlace, visit_count: newVisitCount });
      }

      // Update allPlaces state directly instead of reloading (prevents race condition)
      setAllPlaces(prev => prev.map(p =>
        p.id === placeId ? { ...p, visit_count: newVisitCount } : p
      ));

      // Only reload visitors list, not all places
      loadVisitors(placeId);
      Alert.alert('Success', 'Marked as visited!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const sharePlace = async (place: Place) => {
    try {
      const categoryEmoji: Record<string, string> = {
        hotel: '🏨',
        restaurant: '🍽️',
        cafe: '☕',
        bar: '🍸',
        activity: '✨',
        viewpoint: '📸',
        nature: '🌿',
        shopping: '🛍️',
        museum: '🏛️',
        'hidden-gem': '💎',
      };
      const emoji = categoryEmoji[place.category || 'activity'] || '📍';

      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}+${place.lat},${place.lng}`;

      const message = `${emoji} ${place.name}

${place.description ? `"${place.description}"\n\n` : ''}📍 ${googleMapsUrl}

━━━━━━━━━━━━━━━
Shared via Syrena
Your trusted travel companion`;

      await Share.share({
        message,
        title: `${place.name} - Syrena`,
      });
    } catch (error: any) {
      console.error('Share error:', error);
    }
  };

  const openInGoogleMaps = (place: Place) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}+${place.lat},${place.lng}`;
    Linking.openURL(url).catch((err) => {
      console.error('Failed to open Google Maps:', err);
      Alert.alert('Error', 'Could not open Google Maps');
    });
  };

  const confirmDeletePlace = (placeId: string, placeName: string) => {
    Alert.alert(
      'Delete Place',
      `Are you sure you want to delete "${placeName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => handleDeletePlace(placeId),
          style: 'destructive'
        },
      ]
    );
  };

  const handleDeletePlace = async (placeId: string) => {
    try {
      const { error } = await supabase
        .from('places')
        .delete()
        .eq('id', placeId);

      if (error) throw error;

      setPlaces(prevPlaces => prevPlaces.filter(p => p.id !== placeId));
      setShowDetailsModal(false);
      setSelectedPlace(null);
      Alert.alert('Success', 'Place deleted');
      await loadPlaces();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleEditPlace = (place: Place) => {
    // Close details modal
    setShowDetailsModal(false);
    setSelectedPlace(null);

    // Set editing state and pre-fill form
    setEditingPlace(place);
    setNewPlace({ lat: place.lat, lng: place.lng });
    setPlaceName(place.name);
    setPlaceDescription(place.description || '');
    setSelectedCategory(place.category || '');
    setPriceLevel(place.price_level || 0);
    if (place.photo_url) {
      setSelectedGooglePhotoUrl(place.photo_url);
    }

    // Show add modal (which will be in edit mode)
    setShowAddModal(true);
  };

  const updatePlace = async () => {
    if (!editingPlace || !placeName || !selectedCategory) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let photoUrl = editingPlace.photo_url;
      if (selectedPhotos.length > 0) {
        // User uploaded new photos
        const uploadedUrls = await uploadPhotos();
        if (uploadedUrls.length > 0) {
          photoUrl = uploadedUrls[0];
        }
      } else if (selectedGooglePhotoUrl && selectedGooglePhotoUrl !== editingPlace.photo_url) {
        // User selected a different Google photo
        photoUrl = selectedGooglePhotoUrl;
      }

      const { error } = await supabase
        .from('places')
        .update({
          name: placeName,
          description: placeDescription,
          category: selectedCategory,
          price_level: priceLevel > 0 ? priceLevel : null,
          photo_url: photoUrl,
        })
        .eq('id', editingPlace.id);

      if (error) throw new Error('Failed to update place: ' + error.message);

      setShowAddModal(false);
      setEditingPlace(null);
      resetForm();
      await loadPlaces();
      Alert.alert('Success', `"${placeName}" has been updated!`);
    } catch (error: any) {
      Alert.alert('Error Updating Place', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleFriendFilterChange = (friendId: string) => {
    // Additive filter - toggle the selection
    if (selectedFriendFilters.includes(friendId)) {
      // Unchecking - remove from filters
      setSelectedFriendFilters(prev => prev.filter(id => id !== friendId));
    } else {
      // Checking - add to filters
      setSelectedFriendFilters(prev => [...prev, friendId]);
    }
  };

  const handleCategoryChange = (category: string) => {
    if (selectedCategories.includes(category)) {
      // Don't allow deselecting all - keep at least one
      if (selectedCategories.length > 1) {
        setSelectedCategories(prev => prev.filter(c => c !== category));
      }
    } else {
      setSelectedCategories(prev => [...prev, category]);
    }
  };

  const handlePriceLevelChange = (level: number) => {
    if (selectedPriceLevels.includes(level)) {
      // Don't allow deselecting all - keep at least one
      if (selectedPriceLevels.length > 1) {
        setSelectedPriceLevels(prev => prev.filter(l => l !== level));
      }
    } else {
      setSelectedPriceLevels(prev => [...prev, level]);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowProfileModal(false);
  };

  // Get user's best recommendations (most visited) - memoized for performance
  // Use allPlaces for landing page sections (unfiltered), places for map (filtered)
  const myPlaces = useMemo(() => allPlaces.filter(p => p.user_id === user?.id), [allPlaces, user?.id]);
  const topRecommendations = useMemo(() => [...myPlaces].sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0)).slice(0, 6), [myPlaces]);
  const recentPlaces = useMemo(() => [...allPlaces].slice(0, 8), [allPlaces]);
  const friendsPlaces = useMemo(() => allPlaces.filter(p => p.user_id !== user?.id && p.source !== 'syrena').slice(0, 6), [allPlaces, user?.id]);
  const syrenaPlaces = useMemo(() => allPlaces.filter(p => p.source === 'syrena').slice(0, 10), [allPlaces]);

  // Helper to get friend info for a place - memoized for performance
  const getFriendInfo = useCallback((userId: string): { name: string | null; avatar_url: string | null } => {
    const friendship = friends.find(f => f.friend_id === userId);
    if (friendship?.friend) {
      return {
        name: friendship.friend.display_name || friendship.friend.username || null,
        avatar_url: friendship.friend.avatar_url || null,
      };
    }
    return { name: null, avatar_url: null };
  }, [friends]);

  // Navigate to place on map
  const goToPlaceOnMap = useCallback((place: Place) => {
    setShowFullMap(true);
    setSelectedPlace(place);
    setTimeout(() => {
      mapRef.current?.animateToRegion({
        latitude: place.lat,
        longitude: place.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }, 300);
  }, []);

  // Render place card for horizontal list - editorial image treatment
  const renderPlaceCard = (place: Place, size: 'small' | 'large' = 'small') => {
    const isFriendsPick = place.user_id !== user?.id;
    const friendInfo = isFriendsPick ? getFriendInfo(place.user_id) : null;

    return (
      <PressableScale
        key={place.id}
        style={[styles.placeCard, size === 'large' && styles.placeCardLarge]}
        onPress={() => handleMarkerPress(place)}
        scaleValue={0.97}
      >
        <View style={styles.imageContainer}>
          {place.photo_url ? (
            <>
              <Image source={{ uri: place.photo_url }} style={styles.placeImage} resizeMode="cover" />
              {/* Editorial gradient overlay - transparent to subtle dark */}
              <LinearGradient
                colors={['transparent', 'rgba(0, 0, 0, 0.08)']}
                style={styles.imageGradient}
              />
              {/* Warm color treatment overlay */}
              <View style={styles.warmOverlay} />
            </>
          ) : (
            <View style={[styles.placeImage, styles.placeholderImage]}>
              <Icon name={CATEGORY_ICONS[place.category || 'activity'] || 'place'} size={32} color={theme.colors.textTertiary} />
            </View>
          )}

          {/* Friend's pick badge with profile icon */}
          {isFriendsPick && friendInfo?.name && place.source !== 'syrena' && (
            <View style={styles.friendPickBadge}>
              {friendInfo.avatar_url ? (
                <Image
                  source={{ uri: friendInfo.avatar_url }}
                  style={styles.friendAvatar}
                />
              ) : (
                <View style={styles.friendAvatarPlaceholder}>
                  <Icon name="person" size={10} color={theme.colors.surface} />
                </View>
              )}
              <Text style={styles.friendPickText} numberOfLines={1}>
                {friendInfo.name.split(' ')[0]}'s pick
              </Text>
            </View>
          )}

          {/* Syrena pick badge */}
          {place.source === 'syrena' && (
            <View style={styles.friendPickBadge}>
              <MaterialCommunityIcons name="star-four-points" size={10} color={theme.colors.accent} />
              <Text style={[styles.friendPickText, { color: theme.colors.accent }]} numberOfLines={1}>
                Recommended by Syrena
              </Text>
            </View>
          )}
        </View>

        <View style={styles.placeCardContent}>
          <Text style={styles.placeCardName} numberOfLines={1}>{place.name}</Text>
          {place.city && (
            <View style={styles.placeCardCity}>
              <Icon name="place" size={10} color={theme.colors.textTertiary} />
              <Text style={styles.placeCardCityText} numberOfLines={1}>{place.city}</Text>
            </View>
          )}
          <View style={styles.placeCardMeta}>
            <Icon name={CATEGORY_ICONS[place.category || 'activity'] || 'place'} size={12} color={theme.colors.accent} />
            <Text style={styles.placeCardCategory}>
              {categories.find(c => c.id === place.category)?.name || 'Place'}
            </Text>
          </View>
          {(place.visit_count || 0) > 0 && (
            <View style={styles.visitBadge}>
              <Icon name="check-circle" size={10} color={theme.colors.success} />
              <Text style={styles.visitText}>{place.visit_count} visits</Text>
            </View>
          )}
        </View>
      </PressableScale>
    );
  };

  // Full Map View
  if (showFullMap) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => { setShowFullMap(false); setSearchedLocation(null); }} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Map</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowFriendsSelector(true)}
              >
                <Icon name="filter-list" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => setShowProfileModal(true)}
              >
                {userProfile?.avatar_url ? (
                  <Image
                    source={{ uri: userProfile.avatar_url }}
                    style={styles.avatarImage}
                  />
                ) : user ? (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {user.email?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                ) : (
                  <Icon name="account-circle" size={32} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        <MapView
          ref={mapRef}
          style={styles.fullMap}
          showsUserLocation
          showsMyLocationButton={false}
          showsPointsOfInterest={true}
          onLongPress={handleMapPress}
          onPoiClick={handlePoiClick}
          initialRegion={{
            latitude: userLocation?.latitude || 37.78825,
            longitude: userLocation?.longitude || -122.4324,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          {places.map((place) => (
            <PlaceMarker
              key={place.id}
              place={place}
              currentUserId={user?.id}
              onPress={handleMarkerPress}
            />
          ))}
          {searchedLocation && (
            <Marker
              coordinate={{
                latitude: searchedLocation.lat,
                longitude: searchedLocation.lng,
              }}
              title={searchedLocation.name}
              description="Tap to add this place"
              pinColor={theme.colors.primary}
              onCalloutPress={() => {
                resetForm();
                setNewPlace({ lat: searchedLocation.lat, lng: searchedLocation.lng });
                setPlaceName(searchedLocation.name);
                setShowAddModal(true);
                fetchPlaceDetails(searchedLocation.lat, searchedLocation.lng);
              }}
            />
          )}
        </MapView>

        <View style={styles.floatingButtons}>
          <TouchableOpacity
            style={[styles.floatingButton, styles.locationButton]}
            onPress={recenterToCurrentLocation}
          >
            <Icon name="my-location" size={24} color={theme.colors.surface} />
          </TouchableOpacity>
        </View>

        {/* Modals */}
        <FriendsSelectorModal
          visible={showFriendsSelector}
          onClose={() => setShowFriendsSelector(false)}
          friends={friends}
          selectedFriendFilters={selectedFriendFilters}
          onFilterChange={handleFriendFilterChange}
          onNavigateToFriends={() => {
            setShowFriendsSelector(false);
            navigation.navigate('Feed', { initialTab: 'search' });
          }}
          selectedCategories={selectedCategories}
          onCategoryChange={handleCategoryChange}
          selectedPriceLevels={selectedPriceLevels}
          onPriceLevelChange={handlePriceLevelChange}
          showSyrenaPicks={showSyrenaPicksFilter}
          onSyrenaPicksChange={setShowSyrenaPicksFilter}
        />

        <AddPlaceModal
          visible={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            resetForm();
          }}
          placeName={placeName}
          setPlaceName={setPlaceName}
          placeDescription={placeDescription}
          setPlaceDescription={setPlaceDescription}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          loading={loading}
          loadingPlaceDetails={loadingPlaceDetails}
          placeDetails={placeDetails}
          placeOwner={placeOwner}
          priceLevel={priceLevel}
          setPriceLevel={setPriceLevel}
          selectedPhotos={selectedPhotos}
          selectedGooglePhotoUrl={selectedGooglePhotoUrl}
          onPickImage={pickImage}
          onRemovePhoto={removePhoto}
          onSelectGooglePhoto={setSelectedGooglePhotoUrl}
          onSave={editingPlace ? updatePlace : savePlace}
          uploadingPhoto={uploadingPhoto}
          isEditing={!!editingPlace}
          onClearSuggestion={clearGoogleSuggestion}
          nearbyAlternatives={nearbyAlternatives}
          showAlternatives={showAlternatives}
          loadingAlternative={loadingAlternative}
          onSelectAlternative={selectAlternativePlace}
          onEnterCustomPlace={enterCustomPlace}
        />

        <PlaceDetailsModal
          visible={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPlace(null);
          }}
          place={selectedPlace}
          placeOwner={placeOwner}
          currentUserId={user?.id}
          comments={comments}
          visitors={visitors}
          newComment={newComment}
          setNewComment={setNewComment}
          submittingComment={submittingComment}
          onSubmitComment={submitComment}
          onMarkAsVisited={markAsVisited}
          onShare={sharePlace}
          onSave={openInGoogleMaps}
          onEdit={handleEditPlace}
          onDelete={confirmDeletePlace}
          onViewOnMap={(place) => {
            setShowDetailsModal(false);
            goToPlaceOnMap(place);
          }}
        />

        <ProfileModal
          visible={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            if (user) loadUserProfile(user.id);
          }}
          user={user}
          onSignOut={handleSignOut}
        />
      </View>
    );
  }

  // Landing Page View
  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>SYRENA</Text>
            <View style={styles.logoUnderline} />
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setShowProfileModal(true)}
          >
            {userProfile?.avatar_url ? (
              <Image
                source={{ uri: userProfile.avatar_url }}
                style={styles.avatarImage}
              />
            ) : user ? (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.email?.[0]?.toUpperCase()}
                </Text>
              </View>
            ) : (
              <Icon name="account-circle" size={32} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar with Results */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} style={[styles.searchIcon, { color: theme.colors.textTertiary }]} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search destinations..."
              placeholderTextColor={theme.colors.textTertiary}
              onChangeText={handleSearchTextChange}
              selectionColor={theme.colors.accent}
              cursorColor={theme.colors.accent}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {isSearching && <ActivityIndicator size="small" color={theme.colors.accent} />}
            {searchQuery.length > 0 && !isSearching && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setShowSearchResults(false);
                searchInputRef.current?.clear();
              }}>
                <Icon name="close" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <View style={styles.searchResultsContainer}>
            {searchResults.length > 0 ? (
              <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
                {searchResults.map((result, index) => (
                  <TouchableOpacity
                    key={result.place_id}
                    style={[
                      styles.searchResultItem,
                      index === searchResults.length - 1 && styles.searchResultItemLast,
                    ]}
                    onPress={() => handleSearchResultPress(result)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.searchResultIcon}>
                      <Icon name="place" size={20} color={theme.colors.accent} />
                    </View>
                    <View style={styles.searchResultText}>
                      <Text style={styles.searchResultMain} numberOfLines={1}>
                        {result.structured_formatting.main_text}
                      </Text>
                      <Text style={styles.searchResultSecondary} numberOfLines={1}>
                        {result.structured_formatting.secondary_text}
                      </Text>
                    </View>
                    <Icon name="north-east" size={18} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noResultsContainer}>
                <Icon name="search-off" size={32} color={theme.colors.textTertiary} />
                <Text style={styles.noResultsText}>No places found</Text>
                <Text style={styles.noResultsSubtext}>Try a different search term</Text>
              </View>
            )}
          </View>
        )}
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Compact Map Preview - Elevated "Alive" Design */}
        <TouchableOpacity
          style={styles.mapPreviewContainer}
          onPress={() => setShowFullMap(true)}
          activeOpacity={0.95}
        >
          <MapView
            ref={mapRef}
            style={styles.mapPreview}
            showsUserLocation
            showsMyLocationButton={false}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            initialRegion={{
              latitude: userLocation?.latitude || 37.78825,
              longitude: userLocation?.longitude || -122.4324,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          >
            {allPlaces.map((place) => (
              <PlaceMarker
                key={place.id}
                place={place}
                currentUserId={user?.id}
                onPress={() => {}}
              />
            ))}
          </MapView>

          {/* Gradient overlay - navy to transparent from bottom */}
          <LinearGradient
            colors={['transparent', 'rgba(30, 58, 95, 0.4)']}
            locations={[0.4, 1]}
            style={styles.mapGradientOverlay}
          />

          {/* Clean overlay with subtle chevron animation */}
          <View style={styles.mapOverlayClean}>
            <View style={styles.exploreButtonClean}>
              <Icon name="explore" size={16} color={theme.colors.surface} />
              <Text style={styles.exploreButtonText}>Explore Map</Text>
              <Animated.View style={{ transform: [{ translateX: chevronAnim }] }}>
                <Icon name="chevron-right" size={18} color={theme.colors.accent} />
              </Animated.View>
            </View>

            <View style={styles.placeCountBadge}>
              <Text style={styles.placeCountText}>{allPlaces.length} places</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Syrena Picks - Card Container */}
        {syrenaPlaces.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="star-four-points" size={14} color={theme.colors.accent} />
                  <Text style={styles.sectionTitle}>Recommended by Syrena</Text>
                </View>
                <TouchableOpacity
                  onPress={reloadSyrenaPicks}
                  disabled={reloadingSyrenaPicks}
                  style={{ padding: 4 }}
                >
                  {reloadingSyrenaPicks ? (
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                  ) : (
                    <Icon name="refresh" size={18} color={theme.colors.textTertiary} />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionSubtitle}>Curated just for you</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sectionCardList}
            >
              {syrenaPlaces.map((place) => renderPlaceCard(place))}
            </ScrollView>
          </View>
        )}

        {/* Friends' Picks - Card Container */}
        {friendsPlaces.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <Text style={styles.sectionTitle}>Friends' Picks</Text>
              <Text style={styles.sectionSubtitle}>Recommendations from your circle</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sectionCardList}
            >
              {friendsPlaces.map((place) => renderPlaceCard(place))}
            </ScrollView>
          </View>
        )}

        {/* Recent Discoveries - Card Container */}
        {recentPlaces.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <Text style={styles.sectionTitle}>Recent Discoveries</Text>
              <Text style={styles.sectionSubtitle}>Latest additions to explore</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sectionCardList}
            >
              {recentPlaces.map((place) => renderPlaceCard(place))}
            </ScrollView>
          </View>
        )}

        {/* Empty State */}
        {allPlaces.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="explore" size={64} color={theme.colors.border} />
            <Text style={styles.emptyTitle}>Start Your Journey</Text>
            <Text style={styles.emptyText}>
              Tap the map above to explore and long-press to add your favorite places
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Profile Modal */}
      <ProfileModal
        visible={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          // Refresh profile in case avatar was updated
          if (user) loadUserProfile(user.id);
        }}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Place Details Modal */}
      <PlaceDetailsModal
        visible={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPlace(null);
        }}
        place={selectedPlace}
        placeOwner={placeOwner}
        currentUserId={user?.id}
        comments={comments}
        visitors={visitors}
        newComment={newComment}
        setNewComment={setNewComment}
        submittingComment={submittingComment}
        onSubmitComment={submitComment}
        onMarkAsVisited={markAsVisited}
        onShare={sharePlace}
        onSave={openInGoogleMaps}
        onEdit={handleEditPlace}
        onDelete={confirmDeletePlace}
        onViewOnMap={(place) => {
          setShowDetailsModal(false);
          goToPlaceOnMap(place);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerSafeArea: {
    backgroundColor: theme.colors.surface,
    zIndex: 100,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    // No border - clean header
  },
  logoContainer: {
    alignItems: 'flex-start',
  },
  logoText: {
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fonts.heading.regular,
    fontWeight: '600',
    color: theme.colors.primary,
    letterSpacing: 4,
  },
  logoUnderline: {
    width: 40,
    height: 2,
    backgroundColor: theme.colors.accent,
    marginTop: 4,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fonts.heading.regular,
    fontWeight: '600',
    color: theme.colors.primary,
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  filterButton: {
    padding: 4,
  },
  profileButton: {
    padding: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  avatarText: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
  },
  searchWrapper: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 14, // radii.input
    borderWidth: 1,
    borderColor: 'rgba(13, 38, 76, 0.08)', // borders.light
    // No shadow on inputs
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.xs,
  },
  searchResultsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.xs,
    maxHeight: 300,
    ...theme.shadows.lg,
  },
  searchResults: {
    padding: theme.spacing.sm,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  searchResultItemLast: {
    borderBottomWidth: 0,
  },
  searchResultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accentSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultText: {
    flex: 1,
  },
  searchResultMain: {
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.body.medium,
    color: theme.colors.textPrimary,
  },
  searchResultSecondary: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  noResultsContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.body.medium,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  noResultsSubtext: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  mapPreviewContainer: {
    height: 180,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden',
    backgroundColor: theme.colors.borderSubtle,
  },
  mapPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  // Gradient overlay for depth - navy to transparent from bottom
  mapGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  // Clean overlay with button top-left and badge bottom-right
  mapOverlayClean: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  exploreButtonClean: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.button,
    gap: theme.spacing.xs,
    ...theme.shadows.xs,
  },
  exploreButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.medium,
  },
  placeCountBadge: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.button,
  },
  placeCountText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.semibold,
  },
  // Section Card Container - rounded container instead of dividers
  sectionCard: {
    marginTop: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  sectionCardHeader: {
    marginBottom: 12, // Header block → content: 12px
  },
  sectionCardList: {
    gap: theme.spacing.md,
  },
  // Legacy section styles (kept for backwards compatibility)
  section: {
    marginTop: theme.spacing.xl,
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fonts.heading.regular,
    fontWeight: '600',
    color: theme.colors.primary,
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textTertiary,
    marginTop: 4, // Header → subheader: 4-6px
  },
  seeAllText: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.medium,
    color: theme.colors.accent,
  },
  horizontalList: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  placeCard: {
    width: 160,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.xs,
  },
  placeCardLarge: {
    width: 200,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 100,
    overflow: 'hidden',
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
  },
  placeImage: {
    width: '100%',
    height: 100,
    backgroundColor: theme.colors.background,
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  warmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 248, 240, 0.08)', // Warm sepia tint
  },
  friendPickBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.button,
    gap: 4,
    ...theme.shadows.xs,
  },
  friendAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  friendAvatarPlaceholder: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendPickText: {
    fontSize: 9,
    fontFamily: theme.typography.fonts.body.medium,
    color: theme.colors.textSecondary,
    maxWidth: 60,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeCardContent: {
    padding: theme.spacing.sm,
  },
  placeCardName: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  placeCardCity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  placeCardCityText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    fontFamily: theme.typography.fonts.body.regular,
  },
  placeCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  placeCardCategory: {
    fontSize: 10,
    fontFamily: theme.typography.fonts.body.medium,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.85,
  },
  visitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  visitText: {
    fontSize: theme.typography.sizes.xxs,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.success,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.huge,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fonts.heading.regular,
    color: theme.colors.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomPadding: {
    height: 100,
  },
  fullMap: {
    flex: 1,
  },
  floatingButtons: {
    position: 'absolute',
    right: theme.spacing.xl,
    bottom: theme.spacing.xxxl + 80,
    gap: theme.spacing.md,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  locationButton: {
    backgroundColor: theme.colors.primary,
  },
});
