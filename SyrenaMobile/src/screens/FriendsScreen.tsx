import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Image,
  Dimensions,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';
import { supabase } from '../lib/supabase';
import theme from '../theme';
import { FriendCardSkeleton } from '../components/SkeletonLoader';
import { ProfileModal, PlaceDetailsModal } from '../components/explore';

const { width: screenWidth } = Dimensions.get('window');

// ─── Category config (matches PlaceMarker) ───
const CATEGORY_COLORS: Record<string, string> = {
  restaurant: '#E63946', cafe: '#8B6914', bar: '#9B59B6',
  hotel: '#457B9D', viewpoint: '#E76F51', nature: '#2A9D8F',
  shopping: '#D4A84B', museum: '#6C5B7B', 'hidden-gem': '#B8860B',
  activity: '#2A9D8F',
};
const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant', cafe: 'Cafe', bar: 'Bar', hotel: 'Hotel',
  viewpoint: 'Viewpoint', nature: 'Nature', shopping: 'Shopping',
  museum: 'Museum', 'hidden-gem': 'Hidden Gem', activity: 'Experience',
};
const CATEGORY_ICONS: Record<string, string> = {
  restaurant: 'restaurant', cafe: 'local-cafe', bar: 'local-bar',
  hotel: 'hotel', viewpoint: 'photo-camera', nature: 'park',
  shopping: 'shopping-bag', museum: 'museum', 'hidden-gem': 'star',
  activity: 'explore',
};
const categoryGradients: Record<string, string[]> = {
  restaurant: ['#E63946', '#EB5A5A', '#F07A7A'],
  cafe: ['#8B6914', '#A07A1A', '#B58E22'],
  bar: ['#9B59B6', '#A86FC4', '#B585D2'],
  hotel: ['#457B9D', '#5A8FAD', '#7BA8C2'],
  viewpoint: ['#E76F51', '#EC8A70', '#F0A48F'],
  nature: ['#2A9D8F', '#3DAFA1', '#5BC4B6'],
  shopping: ['#D4A84B', '#DEBA6A', '#E7CC88'],
  museum: ['#6C5B7B', '#7E6F8C', '#90839D'],
  'hidden-gem': ['#B8860B', '#C9971C', '#DAA82D'],
  activity: ['#2A9D8F', '#3DAFA1', '#5BC4B6'],
};

// ─── Interfaces ───
interface FeedItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  photo_url?: string;
  lat: number;
  lng: number;
  city?: string;
  created_at: string;
  user_id: string;
  source?: string;
  visit_count?: number;
  price_level?: number;
  profile: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
  };
  like_count: number;
  comment_count: number;
  is_liked: boolean;
}

interface Friend {
  id: string;
  friend: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
  };
  placesCount?: number;
}

interface PendingRequest {
  id: string;
  requester: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
}

// ─── Helpers ───
const getRelativeTime = (dateStr: string): string => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getCatColor = (cat?: string) => CATEGORY_COLORS[cat || 'activity'] || CATEGORY_COLORS.activity;
const getCatIcon = (cat?: string) => CATEGORY_ICONS[cat || 'activity'] || 'explore';
const getCatLabel = (cat?: string) => CATEGORY_LABELS[cat || 'activity'] || 'Place';
const getCatGradient = (cat?: string) => categoryGradients[cat || 'activity'] || categoryGradients.activity;

export default function FriendsScreen({ navigation, route }: any) {
  // ─── View mode ───
  const [viewMode, setViewMode] = useState<'feed' | 'manage'>('feed');

  // ─── Feed state ───
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [likedPlaceIds, setLikedPlaceIds] = useState<Set<string>>(new Set());

  // ─── PlaceDetailsModal state ───
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [showPlaceDetails, setShowPlaceDetails] = useState(false);
  const [placeOwner, setPlaceOwner] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [modalLikeCount, setModalLikeCount] = useState(0);
  const [modalHasLiked, setModalHasLiked] = useState(false);

  // ─── Friends/manage state ───
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>(
    route?.params?.initialTab || 'friends'
  );
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageRefreshing, setManageRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);

  // ─── User state ───
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // ─── Init ───
  useEffect(() => {
    loadCurrentUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadFeed();
      }
    }, [user])
  );

  // ─── User loading ───
  const loadCurrentUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, display_name, username')
          .eq('id', authUser.id)
          .single();
        if (profile) setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  // ─── Feed loading ───
  const loadFeed = async () => {
    if (!user?.id) return;

    try {
      // 1. Get friend IDs
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      const friendIds = (friendships || []).map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      if (friendIds.length === 0) {
        setFeedItems([]);
        setFeedLoading(false);
        setFeedRefreshing(false);
        return;
      }

      // 2. Get friends' places
      const { data: places } = await supabase
        .from('places')
        .select('*')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!places || places.length === 0) {
        setFeedItems([]);
        setFeedLoading(false);
        setFeedRefreshing(false);
        return;
      }

      // 3. Get profiles for those friends
      const uniqueUserIds = [...new Set(places.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', uniqueUserIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // 4. Get like counts
      const placeIds = places.map(p => p.id);
      const { data: likes } = await supabase
        .from('place_likes')
        .select('place_id, user_id')
        .in('place_id', placeIds);

      const likeCounts = new Map<string, number>();
      const userLiked = new Set<string>();
      (likes || []).forEach(l => {
        likeCounts.set(l.place_id, (likeCounts.get(l.place_id) || 0) + 1);
        if (l.user_id === user.id) userLiked.add(l.place_id);
      });
      setLikedPlaceIds(userLiked);

      // 5. Get comment counts
      const { data: commentCounts } = await supabase
        .from('place_comments')
        .select('place_id')
        .in('place_id', placeIds);

      const commentCountMap = new Map<string, number>();
      (commentCounts || []).forEach(c => {
        commentCountMap.set(c.place_id, (commentCountMap.get(c.place_id) || 0) + 1);
      });

      // 6. Assemble feed items
      const items: FeedItem[] = places.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        photo_url: p.photo_url,
        lat: p.lat,
        lng: p.lng,
        city: p.city,
        created_at: p.created_at,
        user_id: p.user_id,
        source: p.source,
        visit_count: p.visit_count,
        price_level: p.price_level,
        profile: profileMap.get(p.user_id) || {},
        like_count: likeCounts.get(p.id) || 0,
        comment_count: commentCountMap.get(p.id) || 0,
        is_liked: userLiked.has(p.id),
      }));

      setFeedItems(items);
    } catch (error: any) {
      console.error('Error loading feed:', error.message);
    } finally {
      setFeedLoading(false);
      setFeedRefreshing(false);
    }
  };

  // ─── Like/unlike ───
  const toggleLike = async (placeId: string) => {
    if (!user?.id) return;
    const isLiked = likedPlaceIds.has(placeId);

    // Optimistic update
    setFeedItems(prev => prev.map(item =>
      item.id === placeId
        ? { ...item, is_liked: !isLiked, like_count: item.like_count + (isLiked ? -1 : 1) }
        : item
    ));
    setLikedPlaceIds(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(placeId); else next.add(placeId);
      return next;
    });

    // Update modal state if open
    if (selectedPlace?.id === placeId) {
      setModalHasLiked(!isLiked);
      setModalLikeCount(prev => prev + (isLiked ? -1 : 1));
    }

    try {
      if (isLiked) {
        await supabase.from('place_likes').delete()
          .eq('place_id', placeId).eq('user_id', user.id);
      } else {
        await supabase.from('place_likes').insert({ place_id: placeId, user_id: user.id });
      }
    } catch (error: any) {
      // Revert on error
      setFeedItems(prev => prev.map(item =>
        item.id === placeId
          ? { ...item, is_liked: isLiked, like_count: item.like_count + (isLiked ? 1 : -1) }
          : item
      ));
      setLikedPlaceIds(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(placeId); else next.delete(placeId);
        return next;
      });
    }
  };

  // ─── PlaceDetailsModal helpers ───
  const openPlaceDetails = async (item: FeedItem) => {
    setSelectedPlace(item);
    setModalLikeCount(item.like_count);
    setModalHasLiked(item.is_liked);

    try {
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('id', item.user_id)
        .single();
      setPlaceOwner(ownerData);
    } catch {
      setPlaceOwner(null);
    }

    loadComments(item.id);
    loadVisitors(item.id);
    setShowPlaceDetails(true);
  };

  const loadComments = async (placeId: string) => {
    try {
      const { data: commentsData } = await supabase
        .from('place_comments')
        .select('*')
        .eq('place_id', placeId)
        .order('created_at', { ascending: false });

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }
      const userIds = [...new Set(commentsData.map(c => c.created_by))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', userIds);

      setComments(commentsData.map(c => ({
        ...c,
        profiles: profilesData?.find(p => p.id === c.created_by) || null,
      })));
    } catch {
      setComments([]);
    }
  };

  const loadVisitors = async (placeId: string) => {
    try {
      const { data } = await supabase
        .from('place_visits')
        .select('*, profiles:visitor_id(username, display_name, avatar_url)')
        .eq('place_id', placeId)
        .order('visited_at', { ascending: false });
      setVisitors(data || []);
    } catch {
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
        profiles: { display_name: profile?.display_name, username: profile?.username },
      };
      setComments(prev => [newCommentObj, ...prev]);

      // Update comment count in feed
      setFeedItems(prev => prev.map(item =>
        item.id === selectedPlace.id
          ? { ...item, comment_count: item.comment_count + 1 }
          : item
      ));

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
      setTimeout(() => loadComments(selectedPlace.id), 500);
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
        .from('places').select('user_id, name').eq('id', placeId).single();

      const { error } = await supabase
        .from('place_visits')
        .insert({ place_id: placeId, visitor_id: currentUser.id });
      if (error) throw error;

      if (place && place.user_id !== currentUser.id) {
        const { data: profile } = await supabase
          .from('profiles').select('display_name, username').eq('id', currentUser.id).single();
        const visitorName = profile?.display_name || profile?.username || 'Someone';
        await supabase.from('notifications').insert({
          user_id: place.user_id, type: 'place_visit', title: 'New Visit',
          message: `${visitorName} visited ${place.name}`,
          data: { place_id: placeId, visitor_id: currentUser.id }, read: false,
        });
      }

      const { data: visits } = await supabase
        .from('place_visits').select('place_id').eq('place_id', placeId);
      const newVisitCount = visits?.length || 0;

      setFeedItems(prev => prev.map(p =>
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

  const sharePlace = async (place: any) => {
    try {
      const categoryEmoji: Record<string, string> = {
        hotel: '\u{1F3E8}', restaurant: '\u{1F37D}\u{FE0F}', cafe: '\u{2615}', bar: '\u{1F378}',
        activity: '\u{2728}', viewpoint: '\u{1F4F8}', nature: '\u{1F33F}',
        shopping: '\u{1F6CD}\u{FE0F}', museum: '\u{1F3DB}\u{FE0F}', 'hidden-gem': '\u{1F48E}',
      };
      const emoji = categoryEmoji[place.category || 'activity'] || '\u{1F4CD}';
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}+${place.lat},${place.lng}`;
      await Share.share({
        message: `${emoji} ${place.name}\n\n${place.description || ''}\n\n${googleMapsUrl}`,
      });
    } catch {}
  };

  const openInGoogleMaps = (place: any) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}+${place.lat},${place.lng}`;
    Linking.openURL(url);
  };

  const navigateToMap = (item: FeedItem) => {
    navigation.navigate('Explore', {
      focusPlace: { lat: item.lat, lng: item.lng, name: item.name },
    });
  };

  // ─── Friend management ───
  const loadFriendsData = async () => {
    setManageLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: friendsData } = await supabase
        .from('friendships')
        .select(`*, requester:requester_id(id, username, display_name, avatar_url, bio), addressee:addressee_id(id, username, display_name, avatar_url, bio)`)
        .or(`requester_id.eq.${authUser.id},addressee_id.eq.${authUser.id}`)
        .eq('status', 'accepted');

      const { data: pendingData } = await supabase
        .from('friendships')
        .select(`*, requester:requester_id(id, username, display_name, avatar_url)`)
        .eq('addressee_id', authUser.id)
        .eq('status', 'pending');

      const { data: sentData } = await supabase
        .from('friendships')
        .select(`*, addressee:addressee_id(id, username, display_name, avatar_url)`)
        .eq('requester_id', authUser.id)
        .eq('status', 'pending');

      if (friendsData) {
        const formatted = friendsData.map(f => {
          const friend = f.requester_id === authUser.id ? f.addressee : f.requester;
          return { ...f, friend };
        });
        const withCounts = await Promise.all(
          formatted.map(async (f) => {
            const { count } = await supabase
              .from('places').select('id', { count: 'exact', head: true }).eq('user_id', f.friend.id);
            return { ...f, placesCount: count || 0 };
          })
        );
        setFriends(withCounts);
      }
      if (pendingData) setPendingRequests(pendingData);
      if (sentData) setSentRequests(sentData);
    } catch (error: any) {
      console.log('Friends feature error:', error.message);
    } finally {
      setManageLoading(false);
      setManageRefreshing(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase
        .from('profiles').select('*').neq('id', authUser.id)
        .order('created_at', { ascending: false }).limit(50);
      setAllUsers(data || []);
    } catch {}
  };

  // Load manage data when switching to manage mode
  useEffect(() => {
    if (viewMode === 'manage' && friends.length === 0) {
      loadFriendsData();
      loadAllUsers();
    }
  }, [viewMode]);

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
          .neq('id', currentUser.id)
          .limit(20);
        setSearchResults(data || []);
      } catch {} finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const sendFriendRequest = async (addresseeId: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { error } = await supabase.from('friendships')
        .insert({ requester_id: authUser.id, addressee_id: addresseeId, status: 'pending' });
      if (error) {
        if (error.code === '23505') Alert.alert('Already Friends', 'You already have a connection with this user');
        else throw error;
        return;
      }
      Alert.alert('Success', 'Friend request sent!');
      await loadFriendsData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
      if (error) throw error;
      Alert.alert('Success', 'Friend request accepted!');
      await loadFriendsData();
      loadFeed();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const declineRequest = async (friendshipId: string) => {
    try {
      await supabase.from('friendships').delete().eq('id', friendshipId);
      loadFriendsData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const removeFriend = async (friendshipId: string, friendName: string) => {
    Alert.alert('Remove Friend', `Are you sure you want to remove ${friendName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('friendships').delete().eq('id', friendshipId);
            await loadFriendsData();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowProfileModal(false);
  };

  // ─── Feed Card ───
  const renderFeedCard = ({ item }: { item: FeedItem }) => {
    const catColor = getCatColor(item.category);
    const catIcon = getCatIcon(item.category);
    const catLabel = getCatLabel(item.category);
    const gradient = getCatGradient(item.category);

    return (
      <View style={styles.feedCard}>
        {/* Card Header */}
        <View style={styles.feedCardHeader}>
          {item.profile.avatar_url ? (
            <Image source={{ uri: item.profile.avatar_url }} style={styles.feedAvatar} />
          ) : (
            <View style={styles.feedAvatarPlaceholder}>
              <Text style={styles.feedAvatarText}>
                {(item.profile.display_name || item.profile.username || 'U')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.feedHeaderInfo}>
            <Text style={styles.feedUsername} numberOfLines={1}>
              {item.profile.display_name || item.profile.username || 'A friend'}
            </Text>
            <Text style={styles.feedTime}>{getRelativeTime(item.created_at)}</Text>
          </View>
          <View style={[styles.feedCategoryPill, { backgroundColor: catColor + '18' }]}>
            <Icon name={catIcon} size={12} color={catColor} />
            <Text style={[styles.feedCategoryText, { color: catColor }]}>{catLabel}</Text>
          </View>
        </View>

        {/* Photo / Placeholder */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => openPlaceDetails(item)}>
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url }} style={styles.feedImage} resizeMode="cover" />
          ) : (
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.feedImagePlaceholder}>
              <View style={styles.feedPlaceholderIconCircle}>
                <Icon name={catIcon} size={36} color="#FFF" />
              </View>
              <Text style={styles.feedPlaceholderName} numberOfLines={1}>{item.name}</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.feedCardBody}>
          <TouchableOpacity onPress={() => openPlaceDetails(item)}>
            <Text style={styles.feedPlaceName} numberOfLines={1}>{item.name}</Text>
          </TouchableOpacity>
          {item.description ? (
            <Text style={styles.feedDescription} numberOfLines={2}>{item.description}</Text>
          ) : null}
          {item.city ? (
            <View style={styles.feedCityRow}>
              <Icon name="place" size={12} color={theme.colors.textTertiary} />
              <Text style={styles.feedCity} numberOfLines={1}>{item.city}</Text>
            </View>
          ) : null}
        </View>

        {/* Action Bar */}
        <View style={styles.feedActions}>
          <TouchableOpacity style={styles.feedActionBtn} onPress={() => toggleLike(item.id)}>
            <Icon
              name={item.is_liked ? 'favorite' : 'favorite-border'}
              size={20}
              color={item.is_liked ? '#E63946' : theme.colors.textTertiary}
            />
            <Text style={[styles.feedActionText, item.is_liked && { color: '#E63946' }]}>
              {item.like_count > 0 ? item.like_count : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.feedActionBtn} onPress={() => openPlaceDetails(item)}>
            <Icon name="chat-bubble-outline" size={20} color={theme.colors.textTertiary} />
            <Text style={styles.feedActionText}>
              {item.comment_count > 0 ? item.comment_count : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.feedActionBtn} onPress={() => navigateToMap(item)}>
            <Icon name="map" size={20} color={theme.colors.textTertiary} />
            <Text style={styles.feedActionText}>Map</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.feedActionBtn} onPress={() => sharePlace(item)}>
            <Icon name="share" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Friend management renderers ───
  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={styles.friendCard}
      onPress={() => navigation.navigate('My Places', {
        friendId: item.friend.id,
        friendName: item.friend.display_name || item.friend.username,
      })}
      onLongPress={() => removeFriend(item.id, item.friend.display_name || item.friend.username)}
      activeOpacity={0.7}
    >
      <View style={styles.friendCardContent}>
        {item.friend.avatar_url ? (
          <Image source={{ uri: item.friend.avatar_url }} style={styles.friendAvatar} />
        ) : (
          <View style={styles.friendAvatarPlaceholder}>
            <Text style={styles.friendAvatarText}>{item.friend.username?.[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.friend.display_name || item.friend.username}</Text>
          <Text style={styles.friendUsername}>@{item.friend.username}</Text>
        </View>
        <View style={styles.friendMeta}>
          <View style={styles.placesCountBadge}>
            <Icon name="place" size={14} color={theme.colors.accent} />
            <Text style={styles.placesCountText}>{item.placesCount || 0}</Text>
          </View>
          <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRequest = ({ item }: { item: PendingRequest }) => (
    <View style={styles.requestCard}>
      {item.requester.avatar_url ? (
        <Image source={{ uri: item.requester.avatar_url }} style={styles.requestAvatar} />
      ) : (
        <View style={styles.requestAvatarPlaceholder}>
          <Text style={styles.requestAvatarText}>{item.requester.username?.[0]?.toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{item.requester.display_name || item.requester.username}</Text>
        <Text style={styles.requestUsername}>@{item.requester.username}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity style={styles.acceptButtonLarge} onPress={() => acceptRequest(item.id)}>
          <Icon name="check" size={18} color={theme.colors.surface} />
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineButtonLarge} onPress={() => declineRequest(item.id)}>
          <Icon name="close" size={18} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }: { item: any }) => {
    const isAlreadyFriend = friends.some(f => f.friend.id === item.id);
    const hasPendingRequest = sentRequests.some(r => r.addressee?.id === item.id);
    const hasReceivedRequest = pendingRequests.some(r => r.requester?.id === item.id);

    return (
      <View style={styles.searchResultCard}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.searchAvatar} />
        ) : (
          <View style={styles.searchAvatarPlaceholder}>
            <Text style={styles.searchAvatarText}>{item.username?.[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.searchInfo}>
          <Text style={styles.searchName}>{item.display_name || item.username}</Text>
          <Text style={styles.searchUsername}>@{item.username}</Text>
        </View>
        {isAlreadyFriend ? (
          <View style={styles.alreadyFriendsButton}>
            <Icon name="check" size={16} color={theme.colors.success} />
            <Text style={styles.alreadyFriendsText}>Friends</Text>
          </View>
        ) : hasPendingRequest ? (
          <View style={styles.pendingButton}>
            <Icon name="schedule" size={16} color={theme.colors.warning} />
            <Text style={styles.pendingButtonText}>Sent</Text>
          </View>
        ) : hasReceivedRequest ? (
          <TouchableOpacity
            style={styles.acceptButtonSmall}
            onPress={() => {
              const request = pendingRequests.find(r => r.requester?.id === item.id);
              if (request) acceptRequest(request.id);
            }}
          >
            <Icon name="check" size={16} color={theme.colors.surface} />
            <Text style={styles.acceptButtonSmallText}>Accept</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={() => sendFriendRequest(item.id)}>
            <Icon name="person-add" size={16} color={theme.colors.surface} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ─── Loading state ───
  if (feedLoading && viewMode === 'feed') {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Feed</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setViewMode('manage')}>
                <Icon name="people" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileButton} onPress={() => setShowProfileModal(true)}>
                {userProfile?.avatar_url ? (
                  <Image source={{ uri: userProfile.avatar_url }} style={styles.profileAvatar} />
                ) : user ? (
                  <View style={styles.profileAvatarPlaceholder}>
                    <Text style={styles.profileAvatarText}>{user.email?.[0]?.toUpperCase()}</Text>
                  </View>
                ) : (
                  <Icon name="account-circle" size={32} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
        <ProfileModal
          visible={showProfileModal}
          onClose={() => { setShowProfileModal(false); loadCurrentUser(); }}
          user={user}
          onSignOut={handleSignOut}
        />
      </View>
    );
  }

  // ─── RENDER ───
  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          {viewMode === 'manage' ? (
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => setViewMode('feed')} style={{ padding: 4 }}>
                <Icon name="arrow-back" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Friends</Text>
            </View>
          ) : (
            <Text style={styles.headerTitle}>Feed</Text>
          )}
          <View style={styles.headerRight}>
            {viewMode === 'feed' && (
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => { setViewMode('manage'); }}>
                <Icon name="people" size={22} color={theme.colors.textSecondary} />
                {pendingRequests.length > 0 && (
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>{pendingRequests.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.profileButton} onPress={() => setShowProfileModal(true)}>
              {userProfile?.avatar_url ? (
                <Image source={{ uri: userProfile.avatar_url }} style={styles.profileAvatar} />
              ) : user ? (
                <View style={styles.profileAvatarPlaceholder}>
                  <Text style={styles.profileAvatarText}>{user.email?.[0]?.toUpperCase()}</Text>
                </View>
              ) : (
                <Icon name="account-circle" size={32} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Manage tabs */}
        {viewMode === 'manage' && (
          <View style={styles.tabsContainer}>
            <View style={styles.tabs}>
              {(['friends', 'requests', 'search'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.activeTab]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                    {tab === 'friends' ? `Friends (${friends.length})`
                      : tab === 'requests' ? `Requests (${pendingRequests.length + sentRequests.length})`
                      : 'Search'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* ─── Feed View ─── */}
      {viewMode === 'feed' && (
        <FlatList
          data={feedItems}
          renderItem={renderFeedCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.feedListContent}
          refreshControl={
            <RefreshControl
              refreshing={feedRefreshing}
              onRefresh={() => { setFeedRefreshing(true); loadFeed(); }}
              tintColor={theme.colors.primary}
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={5}
          initialNumToRender={5}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIconCircle}>
                <Icon name="dynamic-feed" size={48} color={theme.colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>Your feed is empty</Text>
              <Text style={styles.emptySubtitle}>
                Add friends to see their travel discoveries here
              </Text>
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={() => setViewMode('manage')}
              >
                <Icon name="person-add" size={18} color={theme.colors.surface} />
                <Text style={styles.emptyActionText}>Find Friends</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ─── Manage View ─── */}
      {viewMode === 'manage' && activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={theme.colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username or name..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searching ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <Icon name="close" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {viewMode === 'manage' && activeTab === 'friends' && (
        manageLoading ? (
          <View style={styles.listContent}>
            <FriendCardSkeleton /><FriendCardSkeleton /><FriendCardSkeleton />
          </View>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={manageRefreshing}
                onRefresh={() => { setManageRefreshing(true); loadFriendsData(); }}
                tintColor={theme.colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="people-outline" size={48} color={theme.colors.textTertiary} />
                </View>
                <Text style={styles.emptyTitle}>No friends yet</Text>
                <Text style={styles.emptySubtitle}>Search for friends and start sharing your favorite travel spots!</Text>
                <TouchableOpacity style={styles.emptyActionButton} onPress={() => setActiveTab('search')}>
                  <Icon name="person-add" size={18} color={theme.colors.surface} />
                  <Text style={styles.emptyActionText}>Find Friends</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )
      )}

      {viewMode === 'manage' && activeTab === 'requests' && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={manageRefreshing}
              onRefresh={() => { setManageRefreshing(true); loadFriendsData(); }}
              tintColor={theme.colors.primary}
            />
          }
        >
          {pendingRequests.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Received ({pendingRequests.length})</Text>
              {pendingRequests.map(item => (
                <View key={item.id}>{renderRequest({ item })}</View>
              ))}
            </>
          )}
          {sentRequests.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, pendingRequests.length > 0 && { marginTop: 20 }]}>
                Sent ({sentRequests.length})
              </Text>
              {sentRequests.map(item => (
                <View key={item.id} style={styles.sentRequestCard}>
                  {item.addressee?.avatar_url ? (
                    <Image source={{ uri: item.addressee.avatar_url }} style={styles.sentAvatar} />
                  ) : (
                    <View style={styles.sentAvatarPlaceholder}>
                      <Text style={styles.sentAvatarText}>{item.addressee?.username?.[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.sentInfo}>
                    <Text style={styles.sentName}>{item.addressee?.display_name || item.addressee?.username}</Text>
                    <Text style={styles.sentUsername}>@{item.addressee?.username}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Icon name="schedule" size={14} color={theme.colors.warning} />
                    <Text style={styles.pendingText}>Awaiting</Text>
                  </View>
                </View>
              ))}
            </>
          )}
          {pendingRequests.length === 0 && sentRequests.length === 0 && (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIconCircle}>
                <Icon name="mail-outline" size={48} color={theme.colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySubtitle}>Friend requests you receive or send will appear here</Text>
            </View>
          )}
        </ScrollView>
      )}

      {viewMode === 'manage' && activeTab === 'search' && (
        <FlatList
          data={searchQuery ? searchResults : allUsers}
          renderItem={renderSearchResult}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !searchQuery && allUsers.length > 0 ? (
              <View style={styles.discoverHeader}>
                <Icon name="explore" size={18} color={theme.colors.accent} />
                <Text style={styles.discoverTitle}>Discover Travelers</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            searching ? null : searchQuery ? (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="search-off" size={48} color={theme.colors.textTertiary} />
                </View>
                <Text style={styles.emptyTitle}>No users found</Text>
                <Text style={styles.emptySubtitle}>Try searching with a different username</Text>
              </View>
            ) : null
          }
        />
      )}

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
        onDelete={() => {}}
        onViewOnMap={selectedPlace ? (place) => {
          setShowPlaceDetails(false);
          navigation.navigate('Explore', {
            focusPlace: { lat: place.lat, lng: place.lng, name: place.name },
          });
        } : undefined}
        likeCount={modalLikeCount}
        hasLiked={modalHasLiked}
        onToggleLike={toggleLike}
      />

      {/* Profile Modal */}
      <ProfileModal
        visible={showProfileModal}
        onClose={() => { setShowProfileModal(false); loadCurrentUser(); }}
        user={user}
        onSignOut={handleSignOut}
      />
    </View>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSafeArea: { backgroundColor: theme.colors.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface, height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: {
    fontSize: theme.typography.sizes.lg, fontWeight: '600', color: theme.colors.primary,
    fontFamily: theme.typography.fonts.display.regular, letterSpacing: 2,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  headerIconBtn: { padding: 6, position: 'relative' },
  headerBadge: {
    position: 'absolute', top: 0, right: 0, backgroundColor: '#E63946',
    borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 4,
  },
  headerBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  profileButton: { padding: 4 },
  profileAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: theme.colors.primary },
  profileAvatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.colors.primary,
  },
  profileAvatarText: { color: theme.colors.surface, fontSize: theme.typography.sizes.md, fontWeight: '600' },

  // Feed
  feedListContent: { paddingVertical: theme.spacing.md },
  feedCard: {
    backgroundColor: theme.colors.surface, marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md, borderRadius: theme.borderRadius.lg,
    borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden',
  },
  feedCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  feedAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: theme.colors.border },
  feedAvatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.primarySubtle, justifyContent: 'center', alignItems: 'center',
  },
  feedAvatarText: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
  feedHeaderInfo: { flex: 1, marginLeft: theme.spacing.sm },
  feedUsername: {
    fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary,
    fontFamily: theme.typography.fonts.heading.regular,
  },
  feedTime: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 1 },
  feedCategoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  feedCategoryText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  feedImage: { width: '100%', aspectRatio: 4 / 3 },
  feedImagePlaceholder: { width: '100%', aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center' },
  feedPlaceholderIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  feedPlaceholderName: {
    color: '#FFF', fontSize: 16, fontWeight: '600',
    fontFamily: theme.typography.fonts.display.regular, textAlign: 'center', paddingHorizontal: 20,
  },
  feedCardBody: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  feedPlaceName: {
    fontSize: 18, fontWeight: '700', color: theme.colors.primary,
    fontFamily: theme.typography.fonts.display.regular, letterSpacing: -0.2, marginBottom: 2,
  },
  feedDescription: {
    fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20,
    fontFamily: theme.typography.fonts.body.regular, marginBottom: 4,
  },
  feedCityRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  feedCity: { fontSize: 12, color: theme.colors.textTertiary, fontFamily: theme.typography.fonts.body.regular },
  feedActions: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border,
    gap: theme.spacing.lg,
  },
  feedActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  feedActionText: { fontSize: 13, color: theme.colors.textTertiary, fontWeight: '500' },

  // Manage tabs
  tabsContainer: {
    paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.md, backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border,
  },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: theme.borderRadius.full,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.border,
  },
  activeTab: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tabText: {
    fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary,
    fontWeight: '500', fontFamily: theme.typography.fonts.body.medium,
  },
  activeTabText: { color: '#FFFFFF', fontWeight: '600' },
  listContent: { padding: theme.spacing.xl },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm, borderBottomWidth: 1,
    borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface, minHeight: 56,
  },
  searchInput: {
    flex: 1, marginLeft: theme.spacing.md, fontSize: theme.typography.sizes.md,
    color: theme.colors.textPrimary, fontFamily: theme.typography.fonts.body.regular,
    paddingVertical: 12, paddingHorizontal: 8, height: 44,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md, fontWeight: '600', color: theme.colors.accent,
    marginBottom: theme.spacing.md, fontFamily: theme.typography.fonts.display.regular,
  },

  // Friend Cards
  friendCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  friendCardContent: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md },
  friendAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: theme.colors.border },
  friendAvatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.colors.primarySubtle, justifyContent: 'center', alignItems: 'center',
  },
  friendAvatarText: { color: theme.colors.primary, fontSize: theme.typography.sizes.lg, fontWeight: '600' },
  friendInfo: { flex: 1, marginLeft: theme.spacing.md },
  friendName: {
    fontSize: theme.typography.sizes.md, fontWeight: '600', color: theme.colors.textPrimary,
    fontFamily: theme.typography.fonts.heading.regular,
  },
  friendUsername: { fontSize: theme.typography.sizes.sm, color: theme.colors.textTertiary, marginTop: 2 },
  friendMeta: { alignItems: 'flex-end', gap: 8 },
  placesCountBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.accentSubtle,
    paddingHorizontal: theme.spacing.sm, paddingVertical: 4, borderRadius: theme.borderRadius.full, gap: 4,
  },
  placesCountText: { fontSize: theme.typography.sizes.sm, fontWeight: '600', color: theme.colors.accent },

  // Request Cards
  requestCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg, padding: theme.spacing.md,
    marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  requestAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: theme.colors.border },
  requestAvatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.colors.primarySubtle, justifyContent: 'center', alignItems: 'center',
  },
  requestAvatarText: { color: theme.colors.primary, fontSize: theme.typography.sizes.lg, fontWeight: '600' },
  requestInfo: { flex: 1, marginLeft: theme.spacing.md },
  requestName: { fontSize: theme.typography.sizes.md, fontWeight: '600', color: theme.colors.textPrimary },
  requestUsername: { fontSize: theme.typography.sizes.sm, color: theme.colors.textTertiary, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptButtonLarge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.md, paddingVertical: 8, borderRadius: theme.borderRadius.md, gap: 4,
  },
  acceptButtonText: { color: theme.colors.surface, fontSize: theme.typography.sizes.sm, fontWeight: '600' },
  declineButtonLarge: {
    marginLeft: 8, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.errorSubtle, borderWidth: 1, borderColor: theme.colors.error,
  },

  // Sent
  sentRequestCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg, padding: theme.spacing.md,
    marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, opacity: 0.8,
  },
  sentAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: theme.colors.secondary },
  sentAvatarPlaceholder: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: theme.colors.secondarySubtle, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: theme.colors.secondary,
  },
  sentAvatarText: { color: theme.colors.secondary, fontSize: theme.typography.sizes.md, fontWeight: '600' },
  sentInfo: { flex: 1, marginLeft: theme.spacing.md },
  sentName: { fontSize: theme.typography.sizes.md, fontWeight: '500', color: theme.colors.textSecondary },
  sentUsername: { fontSize: theme.typography.sizes.sm, color: theme.colors.textTertiary, marginTop: 2 },
  pendingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.warningSubtle,
    borderWidth: 1, borderColor: theme.colors.warning,
  },
  pendingText: { fontSize: theme.typography.sizes.xs, color: theme.colors.warningDark, fontWeight: '500' },

  // Search
  searchResultCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg, padding: theme.spacing.md,
    marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  searchAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: theme.colors.border },
  searchAvatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.colors.primarySubtle, justifyContent: 'center', alignItems: 'center',
  },
  searchAvatarText: { color: theme.colors.primary, fontSize: theme.typography.sizes.lg, fontWeight: '600' },
  searchInfo: { flex: 1, marginLeft: theme.spacing.md },
  searchName: { fontSize: theme.typography.sizes.md, fontWeight: '600', color: theme.colors.textPrimary },
  searchUsername: { fontSize: theme.typography.sizes.sm, color: theme.colors.textTertiary, marginTop: 2 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.borderRadius.lg, gap: 4,
  },
  addButtonText: { color: theme.colors.textInverse, fontSize: theme.typography.sizes.sm, fontWeight: '500' },
  pendingButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.warningSubtle,
    paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.borderRadius.lg,
    gap: 4, borderWidth: 1.5, borderColor: theme.colors.warning,
  },
  pendingButtonText: { color: theme.colors.warningDark, fontSize: theme.typography.sizes.sm, fontWeight: '500' },
  alreadyFriendsButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.successSubtle,
    paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.borderRadius.lg,
    gap: 4, borderWidth: 1.5, borderColor: theme.colors.success,
  },
  alreadyFriendsText: { color: theme.colors.successDark, fontSize: theme.typography.sizes.sm, fontWeight: '500' },
  acceptButtonSmall: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.borderRadius.lg, gap: 4,
  },
  acceptButtonSmallText: { color: theme.colors.surface, fontSize: theme.typography.sizes.sm, fontWeight: '500' },

  // Empty
  emptyStateContainer: {
    alignItems: 'center', paddingVertical: theme.spacing.xxxl, paddingHorizontal: theme.spacing.xl,
  },
  emptyIconCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.primarySubtle,
    justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.lg, fontWeight: '600', color: theme.colors.textPrimary,
    fontFamily: theme.typography.fonts.heading.regular, marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.md, color: theme.colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: theme.spacing.lg,
  },
  emptyActionButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg, gap: 8,
  },
  emptyActionText: { color: theme.colors.surface, fontSize: theme.typography.sizes.md, fontWeight: '600' },

  // Discover
  discoverHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg, gap: 8 },
  discoverTitle: {
    fontSize: theme.typography.sizes.md, fontWeight: '600', color: theme.colors.accent,
    fontFamily: theme.typography.fonts.display.regular, letterSpacing: 1,
  },
});
