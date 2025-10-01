import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { supabase } from '../lib/supabase';
import theme from '../theme';

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  category?: string;
  rating?: number;
  created_at: string;
  created_by: string;
}

export default function MyPlacesScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    loadMyPlaces();

    const subscription = supabase
      .channel('my-places')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'places' }, loadMyPlaces)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadMyPlaces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);

      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlaces(data || []);
    } catch (error: any) {
      console.error('Error loading places:', error.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  const deletePlace = async (placeId: string) => {
    try {
      const { error } = await supabase
        .from('places')
        .delete()
        .eq('id', placeId);

      if (error) throw error;
      loadMyPlaces();
      Alert.alert('Success', 'Place deleted');
    } catch (error: any) {
      Alert.alert('Error', error.message);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryIcon = (category?: string) => {
    const icons: {[key: string]: string} = {
      restaurant: 'restaurant',
      cafe: 'local-cafe',
      viewpoint: 'photo-camera',
      nature: 'park',
      shopping: 'shopping-bag',
      hotel: 'hotel',
      museum: 'account-balance',
      'hidden-gem': 'stars',
      'people-watching': 'people',
      other: 'more-horiz',
    };
    return icons[category || 'other'] || 'place';
  };

  const renderPlace = ({ item }: { item: Place }) => (
    <View style={styles.placeCard}>
      <View style={styles.placeContent}>
        <View style={styles.placeIcon}>
          <Icon name={getCategoryIcon(item.category)} size={24} color="#000" />
        </View>
        <View style={styles.placeInfo}>
          <Text style={styles.placeName}>{item.name}</Text>
          {item.rating && item.rating > 0 && (
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  name={star <= (item.rating || 0) ? 'star' : 'star-border'}
                  size={14}
                  color={star <= (item.rating || 0) ? '#F59E0B' : '#D1D5DB'}
                />
              ))}
            </View>
          )}
          {item.description && (
            <Text style={styles.placeNotes} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={styles.placeDate}>{formatDate(item.created_at)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => confirmDelete(item.id, item.name)}
        >
          <Icon name="delete" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading places...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Places</Text>
          <Text style={styles.subtitle}>
            {places.length} {places.length === 1 ? 'place' : 'places'} saved
          </Text>
        </View>
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

      {places.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="explore" size={64} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>No places saved yet</Text>
          <Text style={styles.emptySubtitle}>
            Go to Explore tab and tap on the map to save your first place
          </Text>
        </View>
      ) : (
        <FlatList
          data={places}
          renderItem={renderPlace}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

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
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
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
    fontWeight: '600',
    color: theme.colors.midnightBlue,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.oceanGrey,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
  placeCard: {
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.seaMist,
  },
  placeContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.aquaMist,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.stoneBlue,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.midnightBlue,
    marginBottom: 4,
  },
  placeNotes: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.oceanGrey,
    marginBottom: 4,
  },
  placeDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.driftwood,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  deleteButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.lg,
    fontSize: theme.fontSize.md,
    color: theme.colors.oceanGrey,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.midnightBlue,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.oceanGrey,
    textAlign: 'center',
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
    fontWeight: '600',
    color: theme.colors.midnightBlue,
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
});