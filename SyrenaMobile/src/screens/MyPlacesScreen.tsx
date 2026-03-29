import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Image,
  Share,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import theme from '../theme';
import { PlaceCardSkeleton } from '../components/SkeletonLoader';
import { ProfileModal, PlaceDetailsModal } from '../components/explore';
import { PressableScale } from '../components/ui/AnimatedComponents';

const { width: screenWidth } = Dimensions.get('window');
const GRID_GAP = 4;
const GRID_PADDING = 16;
const GRID_CELL_SIZE = (screenWidth - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  category?: string;
  created_at: string;
  user_id: string;
  visit_count?: number;
  photo_url?: string;
  rating?: number;
  price_level?: number;
  icon?: string;
  city?: string;
  source?: string;
}

interface UserProfile {
  avatar_url?: string;
  display_name?: string;
  username?: string;
  bio?: string;
  created_at?: string;
}

const categories = [
  { id: 'all', name: 'All', icon: 'apps' },
  { id: 'restaurant', name: 'Restaurants', icon: 'restaurant' },
  { id: 'cafe', name: 'Cafes', icon: 'local-cafe' },
  { id: 'bar', name: 'Bars', icon: 'local-bar' },
  { id: 'hotel', name: 'Hotels', icon: 'hotel' },
  { id: 'viewpoint', name: 'Viewpoints', icon: 'photo-camera' },
  { id: 'nature', name: 'Nature', icon: 'park' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag' },
  { id: 'museum', name: 'Museums', icon: 'museum' },
  { id: 'hidden-gem', name: 'Hidden Gems', icon: 'star' },
];

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

const CATEGORY_ICONS: Record<string, string> = {
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

const sortOptions = [
  { id: 'recent', name: 'Most Recent', icon: 'schedule' },
  { id: 'visited', name: 'Most Visited', icon: 'trending-up' },
  { id: 'rating', name: 'Highest Rated', icon: 'star' },
  { id: 'name', name: 'A-Z', icon: 'sort-by-alpha' },
];

// Helper to clean city name by removing postal codes and numeric fragments
const cleanCityName = (rawCity: string | undefined | null): string => {
  if (!rawCity) return '';

  let cleaned = rawCity
    .replace(/\b\d{2,5}[-–]\d{2,4}\b/g, '')
    .replace(/\b\d{4,6}\b/g, '')
    .replace(/\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b/gi, '')
    .replace(/\b\d{4}\s?[A-Z]{2}\b/gi, '')
    .replace(/^\d+\s*[-–]\s*/g, '')
    .replace(/\s*[-–]\s*\d+$/g, '')
    .replace(/\s*[-–]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
};

export default function MyPlacesScreen({ navigation, route }: any) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [viewingFriend, setViewingFriend] = useState<{id: string; name: string} | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showPlaceDetails, setShowPlaceDetails] = useState(false);
  const [placeOwner, setPlaceOwner] = useState<{id: string; username?: string; display_name?: string} | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editRating, setEditRating] = useState(0);
  const [editPriceLevel, setEditPriceLevel] = useState(0);
  const [saving, setSaving] = useState(false);

  // Notification badge
  const [unreadCount, setUnreadCount] = useState(0);

  // Filter & Sort state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('recent');
  const [showSortModal, setShowSortModal] = useState(false);

  useEffect(() => {
    if (route?.params?.friendId) {
      setViewingFriend({
        id: route.params.friendId,
        name: route.params.friendName,
      });
      loadFriendPlaces(route.params.friendId);
    } else {
      setViewingFriend(null);
      loadMyPlaces();
    }
  }, [route?.params?.friendId]);

  // Auto-refresh when screen comes into focus (e.g., returning from Guide)
  useFocusEffect(
    useCallback(() => {
      if (!route?.params?.friendId) {
        loadMyPlaces();
      }
    }, [route?.params?.friendId])
  );

  // Notification badge: load unread count + realtime subscription
  useEffect(() => {
    if (!user) return;

    const loadUnread = async () => {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);
        if (!error) setUnreadCount(count || 0);
      } catch {}
    };

    loadUnread();

    const channel = supabase
      .channel('myplaces-notif-badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => loadUnread(),
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadMyPlaces = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Auth error:', userError);
        Alert.alert('Authentication Error', 'Please try logging in again.');
        return;
      }

      if (!user) {
        console.log('No user found');
        return;
      }

      setUser(user);

      // Load user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('avatar_url, display_name, username, bio, created_at')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setUserProfile(profileData);
      }

      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        Alert.alert('Error', 'Failed to load your places. Please try again.');
        return;
      }

      // Fetch visit counts from place_visits table
      const placeIds = data?.map(p => p.id) || [];
      let placesWithVisitCounts = data || [];

      if (placeIds.length > 0) {
        const { data: visits } = await supabase
          .from('place_visits')
          .select('place_id')
          .in('place_id', placeIds);

        const visitCounts: { [key: string]: number } = {};
        (visits || []).forEach((v: { place_id: string }) => {
          visitCounts[v.place_id] = (visitCounts[v.place_id] || 0) + 1;
        });

        placesWithVisitCounts = data?.map(place => ({
          ...place,
          visit_count: visitCounts[place.id] || 0
        })) || [];
      }

      setPlaces(placesWithVisitCounts);
    } catch (error: any) {
      console.error('Error loading places:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const loadFriendPlaces = async (friendId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      }

      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('user_id', friendId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const placeIds = data?.map(p => p.id) || [];
      let placesWithVisitCounts = data || [];

      if (placeIds.length > 0) {
        const { data: visits } = await supabase
          .from('place_visits')
          .select('place_id')
          .in('place_id', placeIds);

        const visitCounts: { [key: string]: number } = {};
        (visits || []).forEach((v: { place_id: string }) => {
          visitCounts[v.place_id] = (visitCounts[v.place_id] || 0) + 1;
        });

        placesWithVisitCounts = data?.map(place => ({
          ...place,
          visit_count: visitCounts[place.id] || 0
        })) || [];
      }

      setPlaces(placesWithVisitCounts);
    } catch (error: any) {
      console.error('Error loading friend places:', error?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Computed stats
  const stats = useMemo(() => {
    const totalPlaces = places.length;
    const totalVisits = places.reduce((sum, p) => sum + (p.visit_count || 0), 0);
    const uniqueCities = new Set(
      places
        .map(p => cleanCityName(p.city))
        .filter(c => c.length > 0)
    );
    return { totalPlaces, totalVisits, cities: uniqueCities.size };
  }, [places]);

  // Category counts for filter pills
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: places.length };
    categories.forEach(cat => {
      if (cat.id !== 'all') {
        counts[cat.id] = places.filter(p => p.category === cat.id).length;
      }
    });
    return counts;
  }, [places]);

  // Filtered and sorted places
  const filteredPlaces = useMemo(() => {
    let result = [...places];

    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }

    switch (selectedSort) {
      case 'visited':
        result.sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return result;
  }, [places, selectedCategory, selectedSort]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (viewingFriend) {
        await loadFriendPlaces(viewingFriend.id);
      } else {
        await loadMyPlaces();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const deletePlace = async (placeId: string) => {
    try {
      const { error } = await supabase
        .from('places')
        .delete()
        .eq('id', placeId);

      if (error) {
        throw new Error('Failed to delete place: ' + error.message);
      }

      await loadMyPlaces();
      Alert.alert('Success', 'Place deleted successfully');
    } catch (error: any) {
      console.error('Delete error:', error);
      Alert.alert('Error', error.message || 'Failed to delete place');
    }
  };

  const confirmDelete = (placeId: string, placeName: string) => {
    Alert.alert(
      'Delete Place',
      `Are you sure you want to delete "${placeName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: () => deletePlace(placeId), style: 'destructive' },
      ]
    );
  };

  const getCategoryIcon = useCallback((category?: string) => {
    return CATEGORY_ICONS[category || 'activity'] || 'explore';
  }, []);

  const getCategoryColor = useCallback((category?: string) => {
    return CATEGORY_COLORS[category || 'activity'] || theme.colors.accent;
  }, []);

  const handlePlacePress = async (place: Place) => {
    setSelectedPlace(place);
    setComments([]);
    setVisitors([]);

    try {
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('id', place.user_id)
        .single();
      setPlaceOwner(ownerData);
    } catch (error) {
      setPlaceOwner(null);
    }

    loadComments(place.id);
    loadVisitors(place.id);
    setShowPlaceDetails(true);
  };

  const loadComments = async (placeId: string) => {
    try {
      const { data: commentsData, error } = await supabase
        .from('place_comments')
        .select('*')
        .eq('place_id', placeId)
        .order('created_at', { ascending: false });

      if (error) {
        setComments([]);
        return;
      }

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      const userIds = [...new Set(commentsData.map(c => c.created_by))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', userIds);

      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        profiles: profilesData?.find(p => p.id === comment.created_by) || null,
      }));

      setComments(commentsWithProfiles);
    } catch (error) {
      setComments([]);
    }
  };

  const loadVisitors = async (placeId: string) => {
    try {
      const { data, error } = await supabase
        .from('place_visits')
        .select('*, profiles:visitor_id(username, display_name, avatar_url)')
        .eq('place_id', placeId)
        .order('visited_at', { ascending: false });

      if (error) {
        setVisitors([]);
        return;
      }
      setVisitors(data || []);
    } catch (error) {
      setVisitors([]);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !selectedPlace) return;

    setSubmittingComment(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const { data: insertData, error } = await supabase
        .from('place_comments')
        .insert({
          place_id: selectedPlace.id,
          created_by: currentUser.id,
          comment: newComment.trim(),
        })
        .select();

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', currentUser.id)
        .single();

      const senderName = profile?.display_name || profile?.username || 'Someone';

      const newCommentObj = {
        id: insertData?.[0]?.id || `temp-${Date.now()}`,
        comment: newComment.trim(),
        created_at: new Date().toISOString(),
        profiles: {
          display_name: profile?.display_name,
          username: profile?.username,
        },
      };
      setComments(prevComments => [newCommentObj, ...prevComments]);

      if (selectedPlace.user_id !== currentUser.id) {
        await supabase.from('notifications').insert({
          user_id: selectedPlace.user_id,
          type: 'place_comment',
          title: 'New Comment',
          message: `${senderName} commented on ${selectedPlace.name}`,
          data: { place_id: selectedPlace.id, commenter_id: currentUser.id },
          read: false,
        });
      }

      setNewComment('');
      setTimeout(() => {
        loadComments(selectedPlace.id);
      }, 500);

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

      const { data: place } = await supabase
        .from('places')
        .select('user_id, name')
        .eq('id', placeId)
        .single();

      const { error } = await supabase
        .from('place_visits')
        .insert({
          place_id: placeId,
          visitor_id: currentUser.id,
        });

      if (error) throw error;

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

      const { data: visits } = await supabase
        .from('place_visits')
        .select('place_id')
        .eq('place_id', placeId);

      const newVisitCount = visits?.length || 0;

      setPlaces(places.map(p =>
        p.id === placeId ? { ...p, visit_count: newVisitCount } : p
      ));
      if (selectedPlace?.id === placeId) {
        setSelectedPlace({ ...selectedPlace, visit_count: newVisitCount });
      }

      loadVisitors(placeId);
      Alert.alert('Success', 'Marked as visited!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const sharePlace = async (place: Place) => {
    try {
      const categoryEmoji: Record<string, string> = {
        hotel: '🏨', restaurant: '🍽️', cafe: '☕', bar: '🍸',
        activity: '✨', viewpoint: '📸', nature: '🌿',
        shopping: '🛍️', museum: '🏛️', 'hidden-gem': '💎',
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

  const handleEdit = (place: Place) => {
    setShowPlaceDetails(false);
    setEditingPlace(place);
    setEditName(place.name);
    setEditDescription(place.description || '');
    setEditCategory(place.category || 'activity');
    setEditRating(place.rating || 0);
    setEditPriceLevel(place.price_level || 0);
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!editingPlace || !editName.trim()) {
      Alert.alert('Error', 'Place name is required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('places')
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
          category: editCategory,
          rating: editRating,
          price_level: editPriceLevel > 0 ? editPriceLevel : null,
        })
        .eq('id', editingPlace.id);

      if (error) throw error;

      setPlaces(places.map(p =>
        p.id === editingPlace.id
          ? { ...p, name: editName.trim(), description: editDescription.trim(), category: editCategory, rating: editRating, price_level: editPriceLevel > 0 ? editPriceLevel : undefined }
          : p
      ));

      setShowEditModal(false);
      setEditingPlace(null);
      Alert.alert('Success', 'Place updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update place');
    } finally {
      setSaving(false);
    }
  };

  const viewOnMap = (place: Place) => {
    setShowPlaceDetails(false);
    navigation.navigate('Explore', {
      focusPlace: {
        lat: place.lat,
        lng: place.lng,
        name: place.name,
      },
    });
  };

  const handleGridLongPress = (place: Place) => {
    if (viewingFriend) return;
    Alert.alert(
      place.name,
      undefined,
      [
        { text: 'View on Map', onPress: () => viewOnMap(place) },
        { text: 'Share', onPress: () => sharePlace(place) },
        { text: 'Edit', onPress: () => handleEdit(place) },
        { text: 'Delete', onPress: () => confirmDelete(place.id, place.name), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const currentSortName = useMemo(() =>
    sortOptions.find(s => s.id === selectedSort)?.name || 'Sort'
  , [selectedSort]);

  const memberSince = useMemo(() => {
    const dateStr = userProfile?.created_at || user?.created_at;
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [userProfile?.created_at, user?.created_at]);

  // Grid cell renderer
  const renderGridItem = useCallback(({ item, index }: { item: Place; index: number }) => {
    const isMiddle = index % 3 === 1;
    return (
      <PressableScale
        style={[
          styles.gridCell,
          isMiddle && { marginHorizontal: GRID_GAP },
        ]}
        onPress={() => handlePlacePress(item)}
        onLongPress={() => handleGridLongPress(item)}
        scaleValue={0.96}
      >
        {item.photo_url ? (
          <Image
            source={{ uri: item.photo_url }}
            style={styles.gridPhoto}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.gridPhoto, styles.gridPhotoPlaceholder]}>
            <Icon
              name={getCategoryIcon(item.category)}
              size={28}
              color={theme.colors.textTertiary}
            />
          </View>
        )}

        {/* Bottom gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.65)']}
          style={styles.gridGradient}
        />

        {/* Place name */}
        <Text style={styles.gridName} numberOfLines={1}>
          {item.name}
        </Text>

        {/* Category badge - top left */}
        <View style={[styles.gridCategoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
          <Icon name={getCategoryIcon(item.category)} size={8} color="#FFF" />
        </View>

        {/* Visit count badge - top right */}
        {(item.visit_count || 0) > 0 && (
          <View style={styles.gridVisitBadge}>
            <Icon name="check-circle" size={10} color={theme.colors.success} />
            <Text style={styles.gridVisitText}>{item.visit_count}</Text>
          </View>
        )}

        {/* Syrena Pick badge */}
        {item.source === 'syrena' && (
          <View style={styles.gridSyrenaBadge}>
            <Icon name="auto-awesome" size={10} color={theme.colors.accent} />
          </View>
        )}
      </PressableScale>
    );
  }, [viewingFriend, getCategoryIcon, getCategoryColor]);

  // Profile header + filters in ListHeaderComponent
  const ListHeader = useMemo(() => {
    const displayName = viewingFriend
      ? viewingFriend.name
      : userProfile?.display_name || user?.email?.split('@')[0] || 'Traveler';
    const username = viewingFriend ? null : userProfile?.username;

    return (
      <>
        {/* Profile Header */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.profileAvatarContainer}
            onPress={() => !viewingFriend && setShowProfileModal(true)}
            activeOpacity={viewingFriend ? 1 : 0.7}
          >
            {!viewingFriend && userProfile?.avatar_url ? (
              <Image
                source={{ uri: userProfile.avatar_url }}
                style={styles.profileAvatar}
              />
            ) : (
              <View style={styles.profileAvatarFallback}>
                <Text style={styles.profileAvatarText}>
                  {displayName[0]?.toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.profileDisplayName}>{displayName}</Text>
          {username && (
            <Text style={styles.profileUsername}>@{username}</Text>
          )}
          {!viewingFriend && memberSince ? (
            <Text style={styles.profileMemberSince}>MEMBER SINCE {memberSince.toUpperCase()}</Text>
          ) : null}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalPlaces}</Text>
              <Text style={styles.statLabel}>Places</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalVisits}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.cities}</Text>
              <Text style={styles.statLabel}>Cities</Text>
            </View>
          </View>
        </View>

        {/* Category Filter Pills */}
        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTabs}
          >
            {categories.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              if (cat.id !== 'all' && count === 0) return null;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryTab,
                    selectedCategory === cat.id && styles.categoryTabActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Icon
                    name={cat.icon}
                    size={14}
                    color={selectedCategory === cat.id ? theme.colors.surface : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryTabText,
                      selectedCategory === cat.id && styles.categoryTabTextActive,
                    ]}
                  >
                    {cat.name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Sort button */}
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortModal(true)}
          >
            <Icon name="sort" size={16} color={theme.colors.primary} />
            <Text style={styles.sortButtonText}>{currentSortName}</Text>
            <Icon name="expand-more" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </>
    );
  }, [stats, selectedCategory, categoryCounts, currentSortName, userProfile, user, viewingFriend, memberSince]);

  const renderLoadingContent = useCallback(() => (
    <View style={styles.loadingContent}>
      <PlaceCardSkeleton />
      <PlaceCardSkeleton />
      <PlaceCardSkeleton />
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {viewingFriend && (
              <TouchableOpacity
                onPress={() => {
                  navigation.setParams({ friendId: undefined, friendName: undefined });
                }}
                style={styles.backButton}
              >
                <Icon name="arrow-back" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
            <View>
              <Text style={styles.title}>
                {viewingFriend ? `${viewingFriend.name || 'Friend'}'s Places` : 'My Places'}
              </Text>
            </View>
          </View>
          {viewingFriend && (
            <TouchableOpacity
              style={styles.viewOnMapButton}
              onPress={() => {
                navigation.navigate('Explore', {
                  filterByFriendId: viewingFriend.id,
                  filterByFriendName: viewingFriend.name,
                });
              }}
            >
              <Icon name="map" size={20} color={theme.colors.surface} />
              <Text style={styles.viewOnMapText}>Map</Text>
            </TouchableOpacity>
          )}
          {!viewingFriend && (
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => navigation.getParent()?.navigate('Notifications')}
              >
                <Icon name="notifications-none" size={24} color={theme.colors.primary} />
                {unreadCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => setShowProfileModal(true)}
              >
                {userProfile?.avatar_url ? (
                  <Image
                    source={{ uri: userProfile.avatar_url }}
                    style={styles.headerAvatar}
                  />
                ) : user ? (
                  <View style={styles.headerAvatarFallback}>
                    <Text style={styles.headerAvatarText}>
                      {user.email?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                ) : (
                  <Icon name="account-circle" size={32} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>

      {loading ? (
        renderLoadingContent()
      ) : places.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon name="explore" size={64} color={theme.colors.border} />
          </View>
          <Text style={styles.emptyTitle}>Start your collection</Text>
          <Text style={styles.emptySubtitle}>
            Save places from the Explore tab or ask the Guide for recommendations
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('Explore')}
          >
            <Icon name="add" size={20} color={theme.colors.surface} />
            <Text style={styles.emptyButtonText}>Explore Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredPlaces}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={12}
          windowSize={5}
          initialNumToRender={9}
        />
      )}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.sortModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContent}>
            <View style={styles.sortModalHeader}>
              <Text style={styles.sortModalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Icon name="close" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.sortOption,
                  selectedSort === option.id && styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSelectedSort(option.id);
                  setShowSortModal(false);
                }}
              >
                <Icon
                  name={option.icon}
                  size={20}
                  color={selectedSort === option.id ? theme.colors.accent : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    selectedSort === option.id && styles.sortOptionTextActive,
                  ]}
                >
                  {option.name}
                </Text>
                {selectedSort === option.id && (
                  <Icon name="check" size={20} color={theme.colors.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Place Details Modal */}
      <PlaceDetailsModal
        visible={showPlaceDetails}
        onClose={() => setShowPlaceDetails(false)}
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
        onEdit={handleEdit}
        onDelete={confirmDelete}
      />

      {/* Profile Modal */}
      <ProfileModal
        visible={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          loadMyPlaces();
        }}
        user={user}
        onSignOut={async () => {
          await supabase.auth.signOut();
          setShowProfileModal(false);
        }}
      />

      {/* Edit Place Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalOverlay}
        >
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Place</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="close" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.editForm}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Place name"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Description</Text>
                <TextInput
                  style={[styles.editInput, styles.editTextArea]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Add a description..."
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  scrollEnabled={false}
                  numberOfLines={3}
                />
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Category</Text>
                <View style={styles.categoryGrid}>
                  {categories.filter(c => c.id !== 'all').map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryOption,
                        editCategory === cat.id && [styles.categoryOptionActive, { borderColor: CATEGORY_COLORS[cat.id] || theme.colors.primary, backgroundColor: CATEGORY_COLORS[cat.id] || theme.colors.primary }],
                      ]}
                      onPress={() => setEditCategory(cat.id)}
                    >
                      <Icon
                        name={cat.icon}
                        size={16}
                        color={editCategory === cat.id ? '#FFF' : theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.categoryOptionText,
                          editCategory === cat.id && styles.categoryOptionTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name.replace(/s$/, '')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Rating</Text>
                <View style={styles.ratingSelector}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setEditRating(star === editRating ? 0 : star)}
                    >
                      <Icon
                        name={star <= editRating ? 'star' : 'star-border'}
                        size={36}
                        color={star <= editRating ? theme.colors.accent : theme.colors.border}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Price Level</Text>
                <View style={styles.priceLevelSelector}>
                  {[1, 2, 3, 4].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.priceLevelButton,
                        editPriceLevel === level && styles.priceLevelButtonActive
                      ]}
                      onPress={() => setEditPriceLevel(editPriceLevel === level ? 0 : level)}
                    >
                      <Text style={[
                        styles.priceLevelText,
                        editPriceLevel === level && styles.priceLevelTextActive
                      ]}>
                        {'$'.repeat(level)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={saveEdit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  backButton: {
    padding: 4,
  },
  viewOnMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  viewOnMapText: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.typography.fonts.heading.regular,
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  notificationButton: {
    padding: 4,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E63946',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: theme.colors.surface,
  },
  notifBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  profileButton: {
    padding: 4,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  headerAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  headerAvatarText: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
  },
  loadingContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },

  // Profile Section
  profileSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  profileAvatarContainer: {
    marginBottom: theme.spacing.md,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  profileAvatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.accent,
  },
  profileAvatarText: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.xxl,
    fontWeight: '600',
  },
  profileDisplayName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: theme.typography.fonts.heading.regular,
    marginBottom: 2,
  },
  profileUsername: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    marginBottom: 4,
  },
  profileMemberSince: {
    fontSize: theme.typography.sizes.xxs,
    color: theme.colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.lg,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: theme.spacing.sm,
  },
  statNumber: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: theme.typography.fonts.heading.regular,
  },
  statLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.border,
  },

  // Filters
  filtersContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  categoryTabs: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryTabText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  sortButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },

  // Photo Grid
  gridContent: {
    paddingBottom: 100,
  },
  gridRow: {
    paddingHorizontal: GRID_PADDING,
    marginBottom: GRID_GAP,
  },
  gridCell: {
    width: GRID_CELL_SIZE,
    height: GRID_CELL_SIZE,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background,
  },
  gridPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  gridName: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gridCategoryBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridVisitBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  gridVisitText: {
    fontSize: 9,
    color: theme.colors.success,
    fontWeight: '700',
  },
  gridSyrenaBadge: {
    position: 'absolute',
    bottom: 22,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.typography.fonts.heading.regular,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  emptyButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
  },

  // Sort Modal
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sortModalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: 40,
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sortModalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.typography.fonts.heading.regular,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sortOptionActive: {
    backgroundColor: theme.colors.accentSubtle,
  },
  sortOptionText: {
    flex: 1,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
  },
  sortOptionTextActive: {
    color: theme.colors.accent,
    fontWeight: '600',
  },

  // Edit Modal
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.typography.fonts.heading.regular,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  editForm: {
    maxHeight: 400,
  },
  editField: {
    marginBottom: theme.spacing.lg,
  },
  editLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
  },
  editInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textPrimary,
  },
  editTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  categoryOption: {
    width: '31%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
  },
  categoryOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  categoryOptionText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  ratingSelector: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  priceLevelSelector: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  priceLevelButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    minWidth: 50,
    alignItems: 'center',
  },
  priceLevelButtonActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSubtle,
  },
  priceLevelText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  priceLevelTextActive: {
    color: theme.colors.accent,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
  },
});
