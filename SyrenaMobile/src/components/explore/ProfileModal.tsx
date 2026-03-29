import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import theme from '../../theme';
import { supabase } from '../../lib/supabase';
import BottomSheet from '../ui/BottomSheet';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: any;
  onSignOut: () => void;
  onDeleteAccount?: () => void;
}

interface Profile {
  id: string;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
}

interface Place {
  id: string;
  name: string;
  category?: string;
  rating?: number;
  photo_url?: string;
}

function ProfileModal({
  visible,
  onClose,
  user,
  onSignOut,
  onDeleteAccount,
}: ProfileModalProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [topPlaces, setTopPlaces] = useState<Place[]>([]);
  const [stats, setStats] = useState({ places: 0, friends: 0 });
  const [deletingAccount, setDeletingAccount] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const bioInputRef = useRef<TextInput>(null);

  // Scroll to bio field when focused - ensures input stays visible above keyboard
  const handleBioFocus = useCallback(() => {
    // Delay to let keyboard fully appear, then scroll to show bio input
    // Use multiple attempts to handle varying keyboard animation speeds
    const scrollDown = () => scrollViewRef.current?.scrollToEnd({ animated: true });
    setTimeout(scrollDown, 150);
    setTimeout(scrollDown, 400);
    setTimeout(scrollDown, 800);
  }, []);

  useEffect(() => {
    if (visible && user) {
      loadProfile();
      loadTopPlaces();
      loadStats();
    }
  }, [visible, user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
      }

      if (data) {
        setProfile(data);
        setEditDisplayName(data.display_name || '');
        setEditBio(data.bio || '');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTopPlaces = async () => {
    try {
      const { data } = await supabase
        .from('places')
        .select('id, name, category, rating, photo_url')
        .eq('user_id', user.id)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(5);

      setTopPlaces(data || []);
    } catch (error) {
      console.error('Error loading top places:', error);
    }
  };

  const loadStats = async () => {
    try {
      const [placesResult, friendsResult] = await Promise.all([
        supabase
          .from('places')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq('status', 'accepted'),
      ]);

      setStats({
        places: placesResult.count || 0,
        friends: friendsResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handlePickImage = () => {
    Alert.alert('Upload Photo', 'Choose a source', [
      {
        text: 'Camera',
        onPress: () => pickImage('camera'),
      },
      {
        text: 'Gallery',
        onPress: () => pickImage('gallery'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8 as const,
      maxWidth: 500,
      maxHeight: 500,
      includeBase64: true,
    };

    const result = source === 'camera'
      ? await launchCamera(options)
      : await launchImageLibrary(options);

    if (result.assets && result.assets[0]) {
      uploadPhoto(result.assets[0]);
    }
  };

  const uploadPhoto = async (asset: any) => {
    setUploadingPhoto(true);
    try {
      const fileName = `avatar_${user.id}_${Date.now()}.jpg`;

      if (!asset.base64) {
        throw new Error('Failed to get image data');
      }

      // Decode base64 to Uint8Array
      const binaryString = atob(asset.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, bytes, {
          contentType: asset.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
      Alert.alert('Success', 'Profile photo updated!');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editDisplayName.trim() || null,
          bio: editBio.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        display_name: editDisplayName.trim() || undefined,
        bio: editBio.trim() || undefined,
      } : null);

      setIsEditing(false);
      Alert.alert('Success', 'Profile updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteAccount(),
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      // Delete all user data from tables
      const userId = user.id;

      // Delete places
      await supabase.from('places').delete().eq('user_id', userId);

      // Delete friendships (both as requester and addressee)
      await supabase.from('friendships').delete().or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      // Delete notifications
      await supabase.from('notifications').delete().eq('user_id', userId);

      // Delete push tokens
      await supabase.from('push_tokens').delete().eq('user_id', userId);

      // Delete profile
      await supabase.from('profiles').delete().eq('id', userId);

      // Sign out and trigger account deletion callback
      await supabase.auth.signOut();

      if (onDeleteAccount) {
        onDeleteAccount();
      }

      Alert.alert('Account Deleted', 'Your account and all associated data have been deleted.');
    } catch (error: any) {
      console.error('Delete account error:', error);
      Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const getCategoryIcon = (category?: string) => {
    const icons: {[key: string]: string} = {
      restaurant: 'restaurant',
      hotel: 'hotel',
      bar: 'local-bar',
      activity: 'explore',
    };
    return icons[category || 'activity'] || 'explore';
  };

  const renderTopPlace = ({ item }: { item: Place }) => (
    <View style={styles.recommendationCard}>
      {item.photo_url ? (
        <Image source={{ uri: item.photo_url }} style={styles.recommendationPhoto} />
      ) : (
        <View style={[styles.recommendationPhoto, styles.recommendationPlaceholder]}>
          <Icon name={getCategoryIcon(item.category)} size={20} color={theme.colors.textTertiary} />
        </View>
      )}
      <View style={styles.recommendationInfo}>
        <Text style={styles.recommendationName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.categoryBadge}>
          <Icon name={getCategoryIcon(item.category)} size={10} color={theme.colors.accent} />
          <Text style={styles.categoryText}>{item.category || 'Place'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
    <BottomSheet visible={visible} onClose={onClose} maxHeight="90%">
      <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? 'Edit Profile' : 'Profile'}</Text>
            <View style={styles.headerActions}>
              {!isEditing && (
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Icon name="edit" size={22} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  if (isEditing) {
                    setIsEditing(false);
                    setEditDisplayName(profile?.display_name || '');
                    setEditBio(profile?.bio || '');
                  } else {
                    onClose();
                  }
                }}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name={isEditing ? "arrow-back" : "close"} size={26} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : user && (
            <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                contentContainerStyle={[
                  styles.scrollContent,
                  isEditing && styles.scrollContentEditing
                ]}
              >
              <View style={styles.profileContent}>
                {/* Profile Photo - hide when editing for cleaner layout */}
                {!isEditing && (
                  <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={handlePickImage}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <View style={styles.avatarLarge}>
                        <ActivityIndicator size="small" color={theme.colors.surface} />
                      </View>
                    ) : profile?.avatar_url ? (
                      <Image
                        source={{ uri: profile.avatar_url }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <View style={styles.avatarLarge}>
                        <Text style={styles.avatarTextLarge}>
                          {user.email?.[0]?.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.cameraButton}>
                      <Icon name="camera-alt" size={14} color={theme.colors.surface} />
                    </View>
                  </TouchableOpacity>
                )}

                {/* Name & Bio - show edit form or profile info */}
                {isEditing ? (
                  <View style={styles.editSection}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Display Name</Text>
                      <TextInput
                        style={styles.input}
                        value={editDisplayName}
                        onChangeText={setEditDisplayName}
                        placeholder="Enter your name"
                        placeholderTextColor={theme.colors.textTertiary}
                        autoCapitalize="words"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Bio</Text>
                      <TextInput
                        ref={bioInputRef}
                        style={[styles.input, styles.bioInput]}
                        value={editBio}
                        onChangeText={setEditBio}
                        placeholder="Tell us about yourself..."
                        placeholderTextColor={theme.colors.textTertiary}
                        multiline
                        scrollEnabled={true}
                        numberOfLines={4}
                        textAlignVertical="top"
                        onFocus={handleBioFocus}
                      />
                    </View>

                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                          Keyboard.dismiss();
                          setIsEditing(false);
                          setEditDisplayName(profile?.display_name || '');
                          setEditBio(profile?.bio || '');
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSaveProfile}
                        disabled={saving}
                      >
                        {saving ? (
                          <ActivityIndicator size="small" color={theme.colors.surface} />
                        ) : (
                          <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.profileName}>
                      {profile?.display_name || user.email?.split('@')[0]}
                    </Text>
                    <Text style={styles.profileUsername}>@{profile?.username || user.email?.split('@')[0]}</Text>

                    {profile?.bio ? (
                      <Text style={styles.bioText}>{profile.bio}</Text>
                    ) : null}

                    {/* Stats */}
                    <View style={styles.statsContainer}>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.places}</Text>
                        <Text style={styles.statLabel}>Places</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{stats.friends}</Text>
                        <Text style={styles.statLabel}>Friends</Text>
                      </View>
                    </View>
                  </>
                )}

                {/* Top Recommendations */}
                {!isEditing && topPlaces.length > 0 && (
                  <View style={styles.recommendationsSection}>
                    <Text style={styles.sectionTitle}>Top Recommendations</Text>
                    <FlatList
                      data={topPlaces}
                      renderItem={renderTopPlace}
                      keyExtractor={(item) => item.id}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.recommendationsList}
                    />
                  </View>
                )}

                {/* Sign Out */}
                {!isEditing && (
                  <>
                    <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
                      <Icon name="logout" size={20} color={"#FFF"} />
                      <Text style={styles.signOutButtonText}>Sign Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteAccountButton}
                      onPress={handleDeleteAccount}
                      disabled={deletingAccount}
                    >
                      {deletingAccount ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <>
                          <Icon name="delete-forever" size={18} color="#DC2626" />
                          <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </ScrollView>
          )}
        </View>
    </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    paddingBottom: 20,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  scrollContentEditing: {
    paddingBottom: 450, // Extra padding to ensure bio input stays visible above keyboard
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  editIconButton: {
    padding: 4,
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fonts.display.regular,
    fontWeight: '600',
    color: theme.colors.accent,
    letterSpacing: 1,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xxxl,
    alignItems: 'center',
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.lg,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.accent,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.accent,
  },
  avatarTextLarge: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: '600',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  profileName: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.typography.fonts.heading.regular,
    marginBottom: 2,
  },
  profileUsername: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
  bioText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
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
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'transparent',
  },
  editSection: {
    width: '100%',
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: '#1A202C',
    minHeight: 48,
  },
  bioInput: {
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
    paddingTop: theme.spacing.md,
    color: '#1A202C',
  },
  editActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.surface,
    fontWeight: '600',
  },
  recommendationsSection: {
    width: '100%',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
    paddingLeft: theme.spacing.xs,
  },
  recommendationsList: {
    paddingRight: theme.spacing.md,
  },
  recommendationCard: {
    width: 120,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  recommendationPhoto: {
    width: '100%',
    height: 80,
    backgroundColor: theme.colors.border,
  },
  recommendationPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationInfo: {
    padding: theme.spacing.sm,
  },
  recommendationName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  categoryText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    textTransform: 'capitalize',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.xxl,
    minWidth: 200,
    marginTop: theme.spacing.md,
  },
  signOutButtonText: {
    color: '#FFF',
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  deleteAccountButtonText: {
    color: '#DC2626',
    fontSize: theme.typography.sizes.sm,
    fontWeight: '500',
  },
  // Edit Modal Styles
  editModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingTop: Platform.OS === 'ios' ? 16 : theme.spacing.md,
  },
  editModalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  editModalCancel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  editModalSave: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  editModalContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  editModalInputGroup: {
    marginBottom: theme.spacing.xl,
  },
  editModalLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editModalInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: '#1A202C',
    minHeight: 50,
  },
  editModalBioInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: '#1A202C',
    minHeight: 150,
    textAlignVertical: 'top',
  },
});

export default memo(ProfileModal);
