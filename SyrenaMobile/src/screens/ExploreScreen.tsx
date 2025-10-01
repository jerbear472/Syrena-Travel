import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { supabase } from '../lib/supabase';
import theme from '../theme';

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  category?: string;
  created_by: string;
  photo_url?: string;
  odyssey_icon?: string;
  visit_count?: number;
}

const categories = [
  { id: 'restaurant', name: 'Restaurant', icon: 'restaurant' },
  { id: 'cafe', name: 'Café', icon: 'local-cafe' },
  { id: 'viewpoint', name: 'Viewpoint', icon: 'photo-camera' },
  { id: 'nature', name: 'Nature', icon: 'park' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag' },
  { id: 'hotel', name: 'Hotel', icon: 'hotel' },
  { id: 'museum', name: 'Museum', icon: 'account-balance' },
  { id: 'hidden-gem', name: 'Hidden Gem', icon: 'stars' },
  { id: 'people-watching', name: 'People Watching', icon: 'people' },
  { id: 'other', name: 'Other', icon: 'more-horiz' },
];

const odysseyIconMap: {[key: string]: any} = {
  'odyssey-1-circle.png': require('../assets/images/odyssey/odyssey-1-circle.png'),
  'odyssey-2-circle.png': require('../assets/images/odyssey/odyssey-2-circle.png'),
  'odyssey-3-circle.png': require('../assets/images/odyssey/odyssey-3-circle.png'),
  'odyssey-4-circle.png': require('../assets/images/odyssey/odyssey-4-circle.png'),
  'odyssey-5-circle.png': require('../assets/images/odyssey/odyssey-5-circle.png'),
  'odyssey-6-circle.png': require('../assets/images/odyssey/odyssey-6-circle.png'),
  'odyssey-7-circle.png': require('../assets/images/odyssey/odyssey-7-circle.png'),
  'odyssey-8-circle.png': require('../assets/images/odyssey/odyssey-8-circle.png'),
  'odyssey-9-circle.png': require('../assets/images/odyssey/odyssey-9-circle.png'),
  'odyssey-10-circle.png': require('../assets/images/odyssey/odyssey-10-circle.png'),
  'odyssey-11-circle.png': require('../assets/images/odyssey/odyssey-11-circle.png'),
  'odyssey-12-circle.png': require('../assets/images/odyssey/odyssey-12-circle.png'),
};

export default function ExploreScreen({ route }: any) {
  const mapRef = useRef<MapView>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlace, setNewPlace] = useState<{lat: number; lng: number} | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [placeDescription, setPlaceDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [placeDetails, setPlaceDetails] = useState<any>(null);
  const [loadingPlaceDetails, setLoadingPlaceDetails] = useState(false);
  const [priceLevel, setPriceLevel] = useState(0);
  const [showFriendsSelector, setShowFriendsSelector] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriendFilter, setSelectedFriendFilter] = useState<string | null>(null);
  const [odysseyIcon, setOdysseyIcon] = useState<string>('odyssey-1-circle.png');
  const [savingIcon, setSavingIcon] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{uri: string; type: string; name: string} | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    loadPlaces();
    getUser();

    const subscription = supabase
      .channel('places')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'places' }, loadPlaces)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle navigation from My Places
  useEffect(() => {
    if (route?.params?.focusPlace) {
      const { lat, lng } = route.params.focusPlace;
      mapRef.current?.animateToRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [route?.params?.focusPlace]);

  const getUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        loadFriends(user.id);
        loadOdysseyIcon(user.id);
      }
    } catch (error: any) {
      console.error('Error getting user:', error.message || String(error));
    }
  };

  const loadOdysseyIcon = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('odyssey_icon')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data?.odyssey_icon) {
        setOdysseyIcon(data.odyssey_icon);
      }
    } catch (error: any) {
      console.error('Error loading odyssey icon:', error.message || String(error));
    }
  };

  const saveOdysseyIcon = async (icon: string) => {
    if (!user) return;
    setSavingIcon(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ odyssey_icon: icon })
        .eq('id', user.id);

      if (error) throw error;
      setOdysseyIcon(icon);
      Alert.alert('Success', 'Map pin icon updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSavingIcon(false);
    }
  };

  const loadFriends = async (userId: string) => {
    try {
      // Query friends table and join with profiles to get friend details
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          friend_id,
          status,
          profiles!inner(id, email)
        `)
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (error) throw error;

      // Transform data to match expected format
      const transformedData = data?.map(friendship => ({
        ...friendship,
        friend: {
          id: friendship.profiles?.id,
          email: friendship.profiles?.email
        }
      })) || [];

      setFriends(transformedData);
    } catch (error: any) {
      console.error('Error loading friends:', error.message || String(error));
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

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
      },
      (error) => {
        console.error('Location error:', error);
        Alert.alert(
          'Location Error',
          'Unable to get your current location. Please check location permissions in Settings.',
          [{ text: 'OK' }]
        );
        // Fallback to default location (San Francisco)
        const defaultLocation = { latitude: 37.78825, longitude: -122.4324 };
        setUserLocation(defaultLocation);
        mapRef.current?.animateToRegion({
          ...defaultLocation,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  };

  const loadPlaces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('places')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlaces(data || []);
    } catch (error: any) {
      console.error('Error loading places:', error.message || String(error));
    }
  };

  const fetchPlaceDetails = async (lat: number, lng: number) => {
    setLoadingPlaceDetails(true);

    try {
      // Call our Next.js API endpoint to fetch place details
      // Use localhost for simulator, or your machine's IP for real device
      const API_URL = Platform.OS === 'ios'
        ? 'http://localhost:3000/api/places'
        : 'http://10.0.2.2:3000/api/places'; // Android emulator uses 10.0.2.2 for localhost

      const response = await fetch(`${API_URL}?lat=${lat}&lng=${lng}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const placeInfo = await response.json();

        // Only set place details if we got valid data
        if (placeInfo && !placeInfo.error) {
          setPlaceDetails(placeInfo);

          // Auto-populate form
          if (placeInfo.name) {
            setPlaceName(placeInfo.name);
          }
          if (placeInfo.priceLevel) {
            setPriceLevel(placeInfo.priceLevel);
          }

          // Auto-detect category
          if (placeInfo.types && placeInfo.types.length > 0) {
            const types = placeInfo.types;
            if (types.includes('restaurant') || types.includes('food')) {
              setSelectedCategory('restaurant');
            } else if (types.includes('cafe') || types.includes('coffee')) {
              setSelectedCategory('cafe');
            } else if (types.includes('hotel') || types.includes('lodging')) {
              setSelectedCategory('hotel');
            } else if (types.includes('shopping_mall') || types.includes('store')) {
              setSelectedCategory('shopping');
            } else if (types.includes('museum') || types.includes('art_gallery')) {
              setSelectedCategory('museum');
            } else if (types.includes('park') || types.includes('natural_feature')) {
              setSelectedCategory('nature');
            } else if (types.includes('tourist_attraction')) {
              setSelectedCategory('viewpoint');
            }
          }
        }
      }
    } catch (error: any) {
      // Silently fail - place details are optional
      console.log('Place details not available (this is optional)');
    } finally {
      setLoadingPlaceDetails(false);
    }
  };

  const handleMapPress = (event: any) => {
    const coordinate = event.nativeEvent.coordinate;
    setNewPlace({ lat: coordinate.latitude, lng: coordinate.longitude });
    setShowAddModal(true);

    // Fetch place details from Google Places API (non-blocking)
    fetchPlaceDetails(coordinate.latitude, coordinate.longitude);
  };

  const pickImage = () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: () => {
            launchCamera(
              {
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1024,
                maxHeight: 1024,
              },
              (response) => {
                if (response.assets && response.assets[0]) {
                  const asset = response.assets[0];
                  setSelectedPhoto({
                    uri: asset.uri || '',
                    type: asset.type || 'image/jpeg',
                    name: asset.fileName || `photo_${Date.now()}.jpg`,
                  });
                }
              }
            );
          },
        },
        {
          text: 'Choose from Library',
          onPress: () => {
            launchImageLibrary(
              {
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1024,
                maxHeight: 1024,
              },
              (response) => {
                if (response.assets && response.assets[0]) {
                  const asset = response.assets[0];
                  setSelectedPhoto({
                    uri: asset.uri || '',
                    type: asset.type || 'image/jpeg',
                    name: asset.fileName || `photo_${Date.now()}.jpg`,
                  });
                }
              }
            );
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (!selectedPhoto) return null;

    setUploadingPhoto(true);
    try {
      // Read the file as base64
      const fileExt = selectedPhoto.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const response = await fetch(selectedPhoto.uri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('place-photos')
        .upload(filePath, arrayBuffer, {
          contentType: selectedPhoto.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('place-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const savePlace = async () => {
    if (!placeName?.trim()) {
      Alert.alert('Missing Information', 'Please enter a place name');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Missing Information', 'Please select a category');
      return;
    }

    if (!newPlace) {
      Alert.alert('Error', 'Invalid location. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        throw new Error('Authentication error: ' + userError.message);
      }

      if (!user) {
        throw new Error('You must be logged in to save places');
      }

      // Upload photo if selected
      let photoUrl = null;
      if (selectedPhoto) {
        photoUrl = await uploadPhoto(user.id);
        if (!photoUrl) {
          // Photo upload failed, but continue anyway
          console.warn('Photo upload failed, continuing without photo');
        }
      }

      const placeData = {
        name: placeName.trim(),
        lat: newPlace.lat,
        lng: newPlace.lng,
        description: placeDescription?.trim() || null,
        category: selectedCategory,
        price_level: priceLevel > 0 ? priceLevel : null,
        photo_url: photoUrl,
        odyssey_icon: odysseyIcon,
        created_by: user.id,
      };

      const { error } = await supabase.from('places').insert(placeData);

      if (error) {
        throw new Error('Failed to save place: ' + error.message);
      }

      // Success!
      setShowAddModal(false);
      resetForm();
      await loadPlaces();

      Alert.alert('Success', `"${placeName}" has been saved!`);
    } catch (error: any) {
      console.error('Error saving place:', error);
      Alert.alert(
        'Error Saving Place',
        error.message || 'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPlaceName('');
    setPlaceDescription('');
    setSelectedCategory('');
    setNewPlace(null);
    setPlaceDetails(null);
    setPriceLevel(0);
    setSelectedPhoto(null);
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || 'place';
  };

  const handleMarkerPress = (place: Place) => {
    setSelectedPlace(place);
    setShowDetailsModal(true);
    loadComments(place.id);
  };

  const handleDeletePlace = async (placeId: string) => {
    try {
      const { error } = await supabase
        .from('places')
        .delete()
        .eq('id', placeId);

      if (error) throw error;

      setShowDetailsModal(false);
      setSelectedPlace(null);
      loadPlaces();
      Alert.alert('Success', 'Place deleted');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
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

  const markAsVisited = async (placeId: string) => {
    try {
      const { data: place } = await supabase
        .from('places')
        .select('visit_count')
        .eq('id', placeId)
        .single();

      const newCount = (place?.visit_count || 0) + 1;

      const { error } = await supabase
        .from('places')
        .update({ visit_count: newCount })
        .eq('id', placeId);

      if (error) throw error;

      // Update local state
      if (selectedPlace) {
        setSelectedPlace({ ...selectedPlace, visit_count: newCount });
      }
      loadPlaces();
      Alert.alert('Success', 'Marked as visited!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const loadComments = async (placeId: string) => {
    try {
      const { data, error } = await supabase
        .from('place_comments')
        .select('*, profiles(username, display_name)')
        .eq('place_id', placeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error('Error loading comments:', error.message);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !selectedPlace) return;

    setSubmittingComment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('place_comments')
        .insert({
          place_id: selectedPlace.id,
          user_id: user.id,
          comment: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      loadComments(selectedPlace.id);
      Alert.alert('Success', 'Comment added!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const getMarkerColor = (categoryId: string) => {
    const colors: {[key: string]: string} = {
      restaurant: '#5B8C9E',
      cafe: '#7FA9BA',
      viewpoint: '#4A7A8C',
      nature: '#6B9DAE',
      shopping: '#8BAFC0',
      hotel: '#3D6B7D',
      museum: '#5F8FA1',
      'hidden-gem': '#4D7C8E',
      'people-watching': '#6A9AAC',
      other: '#7B8C94',
    };
    return colors[categoryId] || '#3D6B7D';
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Explore</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Icon name="search" size={24} color={theme.colors.midnightBlue} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => setShowProfileModal(true)}
            >
              {user ? (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user.email?.[0]?.toUpperCase()}
                  </Text>
                  <View style={styles.statusDot} />
                </View>
              ) : (
                <Icon name="account-circle" size={32} color={theme.colors.midnightBlue} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {showSearch && (
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={theme.colors.oceanGrey} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for places..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <TouchableOpacity onPress={() => setShowSearch(false)}>
            <Icon name="close" size={20} color={theme.colors.oceanGrey} />
          </TouchableOpacity>
        </View>
      )}

      {/* Help Banner */}
      {places.length === 0 && (
        <View style={styles.helpBanner}>
          <Icon name="info-outline" size={16} color={theme.colors.oceanGrey} />
          <Text style={styles.helpText}>
            Tap and hold to add a place • Scroll with one finger
          </Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={handleMapPress}
        initialRegion={{
          latitude: userLocation?.latitude || 37.78825,
          longitude: userLocation?.longitude || -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {places.map((place) => {
          // Use the place's saved odyssey icon
          const iconSource = place.odyssey_icon && odysseyIconMap[place.odyssey_icon]
            ? odysseyIconMap[place.odyssey_icon]
            : undefined;

          return (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.lat, longitude: place.lng }}
              title={place.name}
              description={place.description}
              pinColor={!iconSource ? getMarkerColor(place.category || 'other') : undefined}
              onPress={() => handleMarkerPress(place)}
            >
              {iconSource && (
                <Image
                  source={iconSource}
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
              )}
            </Marker>
          );
        })}
      </MapView>

      {/* Floating Action Buttons */}
      <View style={styles.floatingButtons}>
        {/* Friends Filter Button */}
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setShowFriendsSelector(!showFriendsSelector)}
        >
          <Icon name="people" size={24} color={theme.colors.offWhite} />
          {selectedFriendFilter && <View style={styles.filterActiveDot} />}
        </TouchableOpacity>

        {/* Current Location Button */}
        <TouchableOpacity
          style={[styles.floatingButton, styles.locationButton]}
          onPress={recenterToCurrentLocation}
        >
          <Icon name="my-location" size={24} color={theme.colors.offWhite} />
        </TouchableOpacity>
      </View>

      {/* Friends Selector Modal */}
      {showFriendsSelector && (
        <View style={styles.friendsSelectorContainer}>
          <View style={styles.friendsSelectorContent}>
            <Text style={styles.friendsSelectorTitle}>View Friend's Places</Text>
            <ScrollView style={styles.friendsList}>
              <TouchableOpacity
                style={[
                  styles.friendItem,
                  !selectedFriendFilter && styles.friendItemActive,
                ]}
                onPress={() => {
                  setSelectedFriendFilter(null);
                  setShowFriendsSelector(false);
                  loadPlaces();
                }}
              >
                <Icon name="public" size={20} color={theme.colors.midnightBlue} />
                <Text style={styles.friendName}>All Places</Text>
                {!selectedFriendFilter && (
                  <Icon name="check" size={20} color={theme.colors.deepTeal} />
                )}
              </TouchableOpacity>
              {friends.map((friendship) => (
                <TouchableOpacity
                  key={friendship.friend_id}
                  style={[
                    styles.friendItem,
                    selectedFriendFilter === friendship.friend_id && styles.friendItemActive,
                  ]}
                  onPress={() => {
                    setSelectedFriendFilter(friendship.friend_id);
                    setShowFriendsSelector(false);
                    // Filter places by friend
                  }}
                >
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendAvatarText}>
                      {friendship.friend?.email?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.friendName}>{friendship.friend?.email}</Text>
                  {selectedFriendFilter === friendship.friend_id && (
                    <Icon name="check" size={20} color={theme.colors.deepTeal} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Place</Text>
                <TouchableOpacity onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}>
                  <Icon name="close" size={24} color={theme.colors.midnightBlue} />
                </TouchableOpacity>
              </View>

              {/* Loading State */}
              {loadingPlaceDetails && (
                <View style={styles.loadingPlaceDetails}>
                  <ActivityIndicator color={theme.colors.midnightBlue} />
                  <Text style={styles.loadingText}>Fetching place details...</Text>
                </View>
              )}

              {/* Place Photos */}
              {placeDetails?.photos && placeDetails.photos.length > 0 && (
                <View style={styles.photosSection}>
                  <Text style={styles.label}>Google Photos</Text>
                  <View style={styles.photosGrid}>
                    {placeDetails.photos.map((photo: string, index: number) => (
                      <Image
                        key={index}
                        source={{ uri: photo }}
                        style={styles.placePhoto}
                        resizeMode="cover"
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Price Level */}
              {priceLevel > 0 && (
                <View style={styles.priceLevelContainer}>
                  <Text style={styles.label}>Price Level:</Text>
                  <View style={styles.priceLevelIcons}>
                    {[1, 2, 3, 4].map((level) => (
                      <Text
                        key={level}
                        style={[
                          styles.dollarSign,
                          level <= priceLevel && styles.dollarSignActive
                        ]}
                      >
                        $
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Photo Upload */}
              <View style={styles.photoSection}>
                <Text style={styles.label}>Add Photo (Optional)</Text>
                {selectedPhoto ? (
                  <View style={styles.photoPreviewContainer}>
                    <Image
                      source={{ uri: selectedPhoto.uri }}
                      style={styles.photoPreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => setSelectedPhoto(null)}
                    >
                      <Icon name="close" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addPhotoButton}
                    onPress={pickImage}
                    disabled={loading || uploadingPhoto}
                  >
                    <Icon name="add-a-photo" size={32} color={theme.colors.oceanGrey} />
                    <Text style={styles.addPhotoText}>Tap to add photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Place name *"
                value={placeName}
                onChangeText={setPlaceName}
                editable={!loading}
              />

              <Text style={styles.label}>Category *</Text>
              <View style={styles.categoriesGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryButton,
                      selectedCategory === cat.id && styles.categoryButtonActive
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                    disabled={loading}
                  >
                    <Icon
                      name={cat.icon}
                      size={20}
                      color={selectedCategory === cat.id ? theme.colors.midnightBlue : theme.colors.oceanGrey}
                    />
                    <Text style={[
                      styles.categoryText,
                      selectedCategory === cat.id && styles.categoryTextActive
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes (optional)"
                value={placeDescription}
                onChangeText={setPlaceDescription}
                multiline
                numberOfLines={4}
                editable={!loading}
              />

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.buttonDisabled]}
                onPress={savePlace}
                disabled={loading || !placeName || !selectedCategory}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Place</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Place Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Place Details</Text>
              <TouchableOpacity onPress={() => {
                setShowDetailsModal(false);
                setSelectedPlace(null);
              }}>
                <Icon name="close" size={24} color={theme.colors.midnightBlue} />
              </TouchableOpacity>
            </View>

            {selectedPlace && (
              <View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* User Photo */}
                  {selectedPlace.photo_url && (
                    <View style={styles.placePhotoContainer}>
                      <Image
                        source={{ uri: selectedPlace.photo_url }}
                        style={styles.placePhotoLarge}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {/* Category Icon */}
                  <View style={styles.detailsIconContainer}>
                    <Icon
                      name={getCategoryIcon(selectedPlace.category || 'other')}
                      size={48}
                      color={theme.colors.midnightBlue}
                    />
                  </View>

                  {/* Place Name */}
                  <Text style={styles.detailsTitle}>{selectedPlace.name}</Text>

                  {/* Category */}
                  <View style={styles.detailsRow}>
                  <Icon name="category" size={18} color={theme.colors.oceanGrey} />
                  <Text style={styles.detailsLabel}>Category:</Text>
                  <Text style={styles.detailsValue}>
                    {categories.find(c => c.id === selectedPlace.category)?.name || 'Other'}
                  </Text>
                </View>

                {/* Visit Count */}
                <View style={styles.detailsRow}>
                  <Icon name="visibility" size={18} color={theme.colors.oceanGrey} />
                  <Text style={styles.detailsLabel}>Visits:</Text>
                  <Text style={styles.detailsValue}>{selectedPlace.visit_count || 0}</Text>
                </View>

                {/* Description */}
                {selectedPlace.description && (
                  <View style={styles.detailsSection}>
                    <View style={styles.detailsRow}>
                      <Icon name="notes" size={18} color={theme.colors.oceanGrey} />
                      <Text style={styles.detailsLabel}>Notes:</Text>
                    </View>
                    <Text style={styles.detailsDescription}>
                      {selectedPlace.description}
                    </Text>
                  </View>
                )}

                {/* Location */}
                <View style={styles.detailsRow}>
                  <Icon name="place" size={18} color={theme.colors.oceanGrey} />
                  <Text style={styles.detailsLabel}>Location:</Text>
                  <Text style={styles.detailsValue}>
                    {selectedPlace.lat.toFixed(6)}, {selectedPlace.lng.toFixed(6)}
                  </Text>
                </View>

                {/* Mark as Visited Button */}
                <TouchableOpacity
                  style={styles.visitButton}
                  onPress={() => markAsVisited(selectedPlace.id)}
                >
                  <Icon name="check-circle" size={20} color="#FFF" />
                  <Text style={styles.visitButtonText}>Mark as Visited</Text>
                </TouchableOpacity>

                {/* Comments Section */}
                <View style={styles.commentsSection}>
                  <Text style={styles.commentsSectionTitle}>Comments</Text>

                  {/* Add Comment */}
                  <View style={styles.addCommentContainer}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Add a comment..."
                      value={newComment}
                      onChangeText={setNewComment}
                      multiline
                      editable={!submittingComment}
                    />
                    <TouchableOpacity
                      style={[styles.submitCommentButton, submittingComment && styles.submitCommentButtonDisabled]}
                      onPress={submitComment}
                      disabled={submittingComment || !newComment.trim()}
                    >
                      {submittingComment ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Icon name="send" size={18} color="#FFF" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Comments List */}
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <View key={comment.id} style={styles.commentItem}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor}>
                            {comment.profiles?.display_name || comment.profiles?.username || 'User'}
                          </Text>
                          <Text style={styles.commentDate}>
                            {new Date(comment.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={styles.commentText}>{comment.comment}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
                  )}
                </View>

                {/* Delete Button */}
                <TouchableOpacity
                  style={styles.deleteButtonLarge}
                  onPress={() => confirmDeletePlace(selectedPlace.id, selectedPlace.name)}
                >
                  <Icon name="delete" size={20} color="#FFF" />
                  <Text style={styles.deleteButtonText}>Delete Place</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profile</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Icon name="close" size={24} color={theme.colors.midnightBlue} />
              </TouchableOpacity>
            </View>

            {user && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.profileContent}>
                  <View style={styles.profileAvatarLarge}>
                    <Text style={styles.profileAvatarTextLarge}>
                      {user.email?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.profileName}>
                    {user.email?.split('@')[0]}
                  </Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>

                  {/* Odyssey Icon Picker */}
                  <View style={styles.iconPickerSection}>
                    <Text style={styles.iconPickerTitle}>Map Pin Icon</Text>
                    <Text style={styles.iconPickerSubtitle}>
                      Choose an Odyssey-themed icon for your map pin
                    </Text>
                    <View style={styles.iconGrid}>
                      {['odyssey-1-circle.png', 'odyssey-2-circle.png', 'odyssey-3-circle.png', 'odyssey-4-circle.png', 'odyssey-5-circle.png', 'odyssey-6-circle.png', 'odyssey-7-circle.png', 'odyssey-8-circle.png', 'odyssey-9-circle.png', 'odyssey-10-circle.png', 'odyssey-11-circle.png', 'odyssey-12-circle.png'].map((icon) => {
                        const iconMap: {[key: string]: any} = {
                          'odyssey-1-circle.png': require('../assets/images/odyssey/odyssey-1-circle.png'),
                          'odyssey-2-circle.png': require('../assets/images/odyssey/odyssey-2-circle.png'),
                          'odyssey-3-circle.png': require('../assets/images/odyssey/odyssey-3-circle.png'),
                          'odyssey-4-circle.png': require('../assets/images/odyssey/odyssey-4-circle.png'),
                          'odyssey-5-circle.png': require('../assets/images/odyssey/odyssey-5-circle.png'),
                          'odyssey-6-circle.png': require('../assets/images/odyssey/odyssey-6-circle.png'),
                          'odyssey-7-circle.png': require('../assets/images/odyssey/odyssey-7-circle.png'),
                          'odyssey-8-circle.png': require('../assets/images/odyssey/odyssey-8-circle.png'),
                          'odyssey-9-circle.png': require('../assets/images/odyssey/odyssey-9-circle.png'),
                          'odyssey-10-circle.png': require('../assets/images/odyssey/odyssey-10-circle.png'),
                          'odyssey-11-circle.png': require('../assets/images/odyssey/odyssey-11-circle.png'),
                          'odyssey-12-circle.png': require('../assets/images/odyssey/odyssey-12-circle.png'),
                        };

                        return (
                          <TouchableOpacity
                            key={icon}
                            style={[
                              styles.iconOption,
                              odysseyIcon === icon && styles.iconOptionSelected,
                            ]}
                            onPress={() => saveOdysseyIcon(icon)}
                            disabled={savingIcon}
                          >
                            <Image
                              source={iconMap[icon]}
                              style={styles.iconImage}
                              resizeMode="contain"
                            />
                            {odysseyIcon === icon && (
                              <View style={styles.iconCheckmark}>
                                <Icon name="check" size={16} color={theme.colors.offWhite} />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={async () => {
                      await supabase.auth.signOut();
                      setShowProfileModal(false);
                    }}
                  >
                    <Icon name="logout" size={20} color="#FFF" />
                    <Text style={styles.signOutButtonText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  headerSafeArea: {
    backgroundColor: theme.colors.offWhite,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.offWhite,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.seaMist,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontFamily: 'Crimson Pro',
    fontWeight: '600',
    color: theme.colors.midnightBlue,
  },
  searchButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.seaMist,
    backgroundColor: theme.colors.offWhite,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.midnightBlue,
  },
  helpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.aquaMist,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.seaMist,
    gap: theme.spacing.sm,
  },
  helpText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.oceanGrey,
  },
  map: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(61, 85, 104, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.offWhite,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontFamily: 'Crimson Pro',
    fontWeight: '600',
    color: theme.colors.midnightBlue,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.sans.regular,
    fontWeight: '600',
    color: theme.colors.midnightBlue,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    fontFamily: theme.fonts.sans.regular,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.seaMist,
    color: theme.colors.midnightBlue,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.seaMist,
    backgroundColor: '#FFFFFF',
  },
  categoryButtonActive: {
    borderColor: theme.colors.midnightBlue,
    backgroundColor: theme.colors.aquaMist,
  },
  categoryText: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.oceanGrey,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: theme.colors.midnightBlue,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: theme.colors.midnightBlue,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: theme.colors.cream,
    fontSize: theme.fontSize.md,
    fontFamily: theme.fonts.sans.regular,
    fontWeight: '600',
  },
  detailsIconContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.seaMist,
    marginBottom: theme.spacing.lg,
  },
  detailsTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '600',
    color: theme.colors.midnightBlue,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  detailsLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.midnightBlue,
  },
  detailsValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.oceanGrey,
    flex: 1,
  },
  ratingDisplay: {
    flexDirection: 'row',
    gap: 4,
  },
  detailsSection: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  detailsDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.oceanGrey,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
    paddingLeft: 26,
  },
  visitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.success || '#10B981',
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    marginTop: theme.spacing.lg,
  },
  visitButtonText: {
    color: '#FFF',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  commentsSection: {
    marginTop: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 2,
    borderTopColor: theme.colors.seaMist,
  },
  commentsSectionTitle: {
    fontSize: theme.fontSize.lg,
    fontFamily: theme.fonts.display.regular,
    color: theme.colors.midnightBlue,
    marginBottom: theme.spacing.md,
    fontWeight: '600',
  },
  addCommentContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: theme.colors.seaMist,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontFamily: theme.fonts.sans.regular,
    fontSize: theme.fontSize.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submitCommentButton: {
    backgroundColor: theme.colors.midnightBlue,
    borderRadius: theme.borderRadius.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitCommentButtonDisabled: {
    opacity: 0.5,
  },
  commentItem: {
    backgroundColor: '#FFF',
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.seaMist,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  commentAuthor: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.sans.regular,
    fontWeight: '600',
    color: theme.colors.midnightBlue,
  },
  commentDate: {
    fontSize: theme.fontSize.xs,
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.oceanGrey,
  },
  commentText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.earthBrown,
  },
  noCommentsText: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.oceanGrey,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
  deleteButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    marginTop: theme.spacing.xxl,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  profileButton: {
    padding: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.midnightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.deepTeal,
    position: 'relative',
  },
  avatarText: {
    color: theme.colors.cream,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.aquaMist,
    borderWidth: 2,
    borderColor: theme.colors.offWhite,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  profileAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.midnightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.deepTeal,
    marginBottom: theme.spacing.lg,
  },
  profileAvatarTextLarge: {
    color: theme.colors.cream,
    fontSize: theme.fontSize.xxl,
    fontWeight: '600',
  },
  profileName: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.midnightBlue,
    marginBottom: theme.spacing.xs,
  },
  profileEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.oceanGrey,
    fontStyle: 'italic',
    marginBottom: theme.spacing.xxl,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.oceanDepth,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.xxl,
    minWidth: 200,
  },
  signOutButtonText: {
    color: '#FFF',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  loadingPlaceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  photosSection: {
    marginBottom: theme.spacing.lg,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  placePhoto: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.seaMist,
  },
  priceLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  priceLevelIcons: {
    flexDirection: 'row',
    gap: 2,
  },
  dollarSign: {
    fontSize: theme.fontSize.md,
    color: theme.colors.seaMist,
    fontWeight: '600',
  },
  dollarSignActive: {
    color: theme.colors.sirenGold,
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
    backgroundColor: theme.colors.deepTeal,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.oceanDepth,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  locationButton: {
    backgroundColor: theme.colors.midnightBlue,
  },
  filterActiveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.sirenGold,
    borderWidth: 2,
    borderColor: theme.colors.offWhite,
  },
  friendsSelectorContainer: {
    position: 'absolute',
    right: theme.spacing.xl + 70,
    bottom: theme.spacing.xxxl + 80,
    width: 280,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  friendsSelectorContent: {
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: 350,
    shadowColor: theme.colors.oceanDepth,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  friendsSelectorTitle: {
    fontSize: theme.fontSize.lg,
    fontFamily: 'Crimson Pro',
    fontWeight: '600',
    color: theme.colors.midnightBlue,
    marginBottom: theme.spacing.md,
  },
  friendsList: {
    maxHeight: 280,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.cream,
  },
  friendItemActive: {
    backgroundColor: theme.colors.seaMist,
    borderWidth: 2,
    borderColor: theme.colors.deepTeal,
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.midnightBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarText: {
    color: theme.colors.offWhite,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  friendName: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.midnightBlue,
  },
  iconPickerSection: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    borderTopWidth: 2,
    borderTopColor: theme.colors.seaMist,
  },
  iconPickerTitle: {
    fontSize: theme.fontSize.lg,
    fontFamily: 'Crimson Pro',
    fontWeight: '600',
    color: theme.colors.midnightBlue,
    marginBottom: theme.spacing.sm,
  },
  iconPickerSubtitle: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.oceanGrey,
    marginBottom: theme.spacing.lg,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'center',
  },
  iconOption: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  iconOptionSelected: {
    shadowColor: theme.colors.oceanDepth,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    transform: [{ scale: 1.1 }],
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  iconCheckmark: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(61, 85, 104, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
  },
  photoSection: {
    marginBottom: theme.spacing.lg,
  },
  addPhotoButton: {
    borderWidth: 2,
    borderColor: theme.colors.seaMist,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cream,
  },
  addPhotoText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.oceanGrey,
    fontFamily: theme.fonts.sans.regular,
  },
  photoPreviewContainer: {
    position: 'relative',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.seaMist,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    backgroundColor: theme.colors.cream,
  },
  removePhotoButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placePhotoContainer: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.seaMist,
  },
  placePhotoLarge: {
    width: '100%',
    height: 250,
    backgroundColor: theme.colors.cream,
  },
});
