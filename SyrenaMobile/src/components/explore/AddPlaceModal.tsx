import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import theme from '../../theme';
import BottomSheet from '../ui/BottomSheet';

interface PlaceDetails {
  name?: string;
  address?: string;
  photos?: string[];
  priceLevel?: number;
  types?: string[];
}

interface PlaceOwner {
  id: string;
  username?: string;
  display_name?: string;
}

interface SelectedPhoto {
  uri: string;
  type: string;
  name: string;
}

interface NearbyAlternative {
  placeId: string;
  name: string;
  address: string;
  types: string[];
}

interface AddPlaceModalProps {
  visible: boolean;
  onClose: () => void;
  placeName: string;
  setPlaceName: (name: string) => void;
  placeDescription: string;
  setPlaceDescription: (desc: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  loading: boolean;
  loadingPlaceDetails: boolean;
  placeDetails: PlaceDetails | null;
  placeOwner: PlaceOwner | null;
  priceLevel: number;
  setPriceLevel: (level: number) => void;
  selectedPhotos: SelectedPhoto[];
  selectedGooglePhotoUrl: string | null;
  onPickImage: () => void;
  onRemovePhoto: (index: number) => void;
  onSelectGooglePhoto: (url: string | null) => void;
  onSave: () => void;
  uploadingPhoto: boolean;
  isEditing?: boolean;
  onClearSuggestion?: () => void;
  nearbyAlternatives?: NearbyAlternative[];
  showAlternatives?: boolean;
  loadingAlternative?: boolean;
  onSelectAlternative?: (alternative: NearbyAlternative) => void;
  onEnterCustomPlace?: () => void;
}

const categories = [
  { id: 'restaurant', name: 'Restaurant', icon: 'restaurant', color: '#E63946' },
  { id: 'cafe', name: 'Cafe', icon: 'local-cafe', color: '#8B6914' },
  { id: 'bar', name: 'Bar', icon: 'local-bar', color: '#9B59B6' },
  { id: 'hotel', name: 'Hotel', icon: 'hotel', color: '#457B9D' },
  { id: 'viewpoint', name: 'Viewpoint', icon: 'photo-camera', color: '#E76F51' },
  { id: 'nature', name: 'Nature', icon: 'park', color: '#2A9D8F' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag', color: '#D4A84B' },
  { id: 'museum', name: 'Museum', icon: 'museum', color: '#6C5B7B' },
  { id: 'hidden-gem', name: 'Hidden Gem', icon: 'star', color: '#B8860B' },
];

function AddPlaceModal({
  visible,
  onClose,
  placeName,
  setPlaceName,
  placeDescription,
  setPlaceDescription,
  selectedCategory,
  setSelectedCategory,
  loading,
  loadingPlaceDetails,
  placeDetails,
  placeOwner,
  priceLevel,
  setPriceLevel,
  selectedPhotos,
  selectedGooglePhotoUrl,
  onPickImage,
  onRemovePhoto,
  onSelectGooglePhoto,
  onSave,
  uploadingPhoto,
  isEditing = false,
  onClearSuggestion,
  nearbyAlternatives = [],
  showAlternatives = false,
  loadingAlternative = false,
  onSelectAlternative,
  onEnterCustomPlace,
}: AddPlaceModalProps) {
  const hasPhoto = selectedPhotos.length > 0 || !!selectedGooglePhotoUrl;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {/* Header outside ScrollView for reliable touch */}
      <View style={styles.header}>
        <Text style={styles.title}>{isEditing ? 'Edit Place' : 'Add Place'}</Text>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.5}
        >
          <View style={styles.closeButtonInner}>
            <Icon name="close" size={24} color={theme.colors.primary} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Loading State */}
        {loadingPlaceDetails && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>Fetching place details...</Text>
          </View>
        )}

        {/* Loading Alternative State */}
        {loadingAlternative && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading place details...</Text>
          </View>
        )}

        {/* Nearby Alternatives Selection */}
        {showAlternatives && nearbyAlternatives.length > 0 && !loadingAlternative && (
          <View style={styles.alternativesSection}>
            <Text style={styles.alternativesTitle}>Select the correct place:</Text>
            <Text style={styles.alternativesSubtitle}>Other places nearby</Text>

            {nearbyAlternatives.map((alt, index) => (
              <TouchableOpacity
                key={alt.placeId || index}
                style={styles.alternativeItem}
                onPress={() => onSelectAlternative?.(alt)}
                activeOpacity={0.7}
              >
                <View style={styles.alternativeIcon}>
                  <Icon name="place" size={20} color={theme.colors.accent} />
                </View>
                <View style={styles.alternativeContent}>
                  <Text style={styles.alternativeName} numberOfLines={1}>{alt.name}</Text>
                  {alt.address ? (
                    <Text style={styles.alternativeAddress} numberOfLines={1}>{alt.address}</Text>
                  ) : null}
                </View>
                <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            ))}

            {/* Option to enter custom details */}
            <TouchableOpacity
              style={styles.customEntryButton}
              onPress={onEnterCustomPlace}
              activeOpacity={0.7}
            >
              <View style={styles.alternativeIcon}>
                <Icon name="edit" size={20} color={theme.colors.textTertiary} />
              </View>
              <View style={styles.alternativeContent}>
                <Text style={styles.customEntryText}>Enter custom details</Text>
                <Text style={styles.customEntrySubtext}>Place not listed above?</Text>
              </View>
              <Icon name="chevron-right" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Place Owner Banner (for friend's places) */}
        {placeOwner && !showAlternatives && (
          <View style={styles.ownerBanner}>
            <Icon name="person" size={20} color={theme.colors.secondary} />
            <Text style={styles.ownerText}>
              {placeOwner.display_name || placeOwner.username || 'Friend'}'s place
            </Text>
          </View>
        )}

        {/* Place Info Banner */}
        {placeDetails && !loadingPlaceDetails && !showAlternatives && (
          <View style={styles.infoBanner}>
            <Icon name="place" size={20} color={theme.colors.secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoName}>{placeDetails.name}</Text>
              {placeDetails.address ? (
                <Text style={styles.infoAddress}>{placeDetails.address}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Place Photos - Selectable (hide when showing alternatives) */}
        {placeDetails?.photos && placeDetails.photos.length > 0 && !showAlternatives ? (
          <View style={styles.photosSection}>
            <Text style={styles.label}>Select a Google Photo (tap to use)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosGrid}>
              {placeDetails.photos.map((photo: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => onSelectGooglePhoto(selectedGooglePhotoUrl === photo ? null : photo)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: photo }}
                    style={[
                      styles.googlePhoto,
                      selectedGooglePhotoUrl === photo && styles.googlePhotoSelected
                    ]}
                    resizeMode="cover"
                  />
                  {selectedGooglePhotoUrl === photo ? (
                    <View style={styles.selectedPhotoOverlay}>
                      <Icon name="check-circle" size={28} color={"#FFF"} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Hide form fields when showing alternatives */}
        {!showAlternatives && (
          <>
        {/* Price Level Selector */}
        <Text style={styles.label}>Price Level</Text>
        <View style={styles.priceLevelSelector}>
          {[1, 2, 3, 4].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.priceLevelButton,
                priceLevel === level && styles.priceLevelButtonActive
              ]}
              onPress={() => setPriceLevel(priceLevel === level ? 0 : level)}
              disabled={loading}
            >
              <Text style={[
                styles.priceLevelText,
                priceLevel === level && styles.priceLevelTextActive
              ]}>
                {'$'.repeat(level)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo Upload */}
        <View style={styles.photoSection}>
          <Text style={styles.label}>
            {selectedPhotos.length > 0 || selectedGooglePhotoUrl ? 'Your Photos (up to 5)' : 'Add a Photo *'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.userPhotosContainer}
          >
            {selectedPhotos.map((photo, index) => (
              <View key={index} style={styles.userPhotoWrapper}>
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.userPhotoPreview}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => onRemovePhoto(index)}
                >
                  <Icon name="close" size={16} color={"#FFF"} />
                </TouchableOpacity>
              </View>
            ))}
            {selectedPhotos.length < 5 && (
              <TouchableOpacity
                style={styles.addMorePhotoButton}
                onPress={onPickImage}
                disabled={loading || uploadingPhoto}
              >
                <Icon name="add-a-photo" size={24} color={theme.colors.textTertiary} />
                <Text style={styles.addMorePhotoText}>Add</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Place name *"
          placeholderTextColor={theme.colors.textTertiary}
          value={placeName}
          onChangeText={setPlaceName}
          editable={!loading}
        />

        {/* Not the right place button - shows when Google auto-filled */}
        {placeDetails && !isEditing && onClearSuggestion && !showAlternatives && (
          <TouchableOpacity
            style={styles.notRightPlaceButton}
            onPress={onClearSuggestion}
          >
            <Icon name="wrong-location" size={16} color={theme.colors.textTertiary} />
            <Text style={styles.notRightPlaceText}>
              {nearbyAlternatives.length > 0
                ? `Wrong place? See ${nearbyAlternatives.length} nearby options`
                : 'Not the right place? Enter custom details'}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoriesGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryButton,
                selectedCategory === cat.id && [styles.categoryButtonActive, { borderColor: cat.color, backgroundColor: cat.color + '15' }]
              ]}
              onPress={() => setSelectedCategory(cat.id)}
              disabled={loading}
            >
              <Icon
                name={cat.icon}
                size={20}
                color={selectedCategory === cat.id ? cat.color : theme.colors.textTertiary}
              />
              <Text style={[
                styles.categoryText,
                selectedCategory === cat.id && [styles.categoryTextActive, { color: cat.color }]
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Notes (optional)"
          placeholderTextColor={theme.colors.textTertiary}
          value={placeDescription}
          onChangeText={setPlaceDescription}
          multiline
          scrollEnabled={false}
          numberOfLines={4}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.saveButton, (loading || !placeName || !selectedCategory || !hasPhoto) && styles.buttonDisabled]}
          onPress={onSave}
          disabled={loading || !placeName || !selectedCategory || !hasPhoto}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Update Place' : 'Save Place'}
            </Text>
          )}
        </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(61, 85, 104, 0.5)',
  },
  scrollView: {
    maxHeight: '100%',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fonts.display.regular,
    fontWeight: '600',
    color: theme.colors.accent,
    letterSpacing: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    fontFamily: theme.typography.fonts.body.regular,
  },
  ownerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    gap: theme.spacing.sm,
  },
  ownerText: {
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.body.regular,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.secondarySubtle,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    gap: theme.spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoName: {
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.display.regular,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  infoAddress: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textTertiary,
    lineHeight: 18,
  },
  photosSection: {
    marginBottom: theme.spacing.lg,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  googlePhoto: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  googlePhotoSelected: {
    borderColor: theme.colors.accent,
    borderWidth: 3,
  },
  selectedPhotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceLevelSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  priceLevelButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    minWidth: 50,
    alignItems: 'center',
  },
  priceLevelButtonActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSubtle,
  },
  priceLevelText: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.medium,
    color: theme.colors.textTertiary,
    fontWeight: '600',
  },
  priceLevelTextActive: {
    color: theme.colors.accent,
  },
  photoSection: {
    marginBottom: theme.spacing.lg,
  },
  userPhotosContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  userPhotoWrapper: {
    position: 'relative',
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  userPhotoPreview: {
    width: 100,
    height: 100,
    backgroundColor: theme.colors.background,
  },
  addMorePhotoButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  addMorePhotoText: {
    marginTop: 4,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    fontFamily: theme.typography.fonts.body.regular,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.body.regular,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    color: theme.colors.primary,
  },
  notRightPlaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    marginTop: -theme.spacing.sm,
  },
  notRightPlaceText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontFamily: theme.typography.fonts.body.regular,
    textDecorationLine: 'underline',
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
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
  },
  categoryButtonActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSubtle,
  },
  categoryText: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.body.regular,
    fontWeight: '600',
  },
  // Alternatives selection styles
  alternativesSection: {
    marginBottom: theme.spacing.lg,
  },
  alternativesTitle: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fonts.body.semibold,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  alternativesSubtitle: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.md,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  alternativeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accentSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alternativeContent: {
    flex: 1,
  },
  alternativeName: {
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.body.semibold,
    color: theme.colors.primary,
  },
  alternativeAddress: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  customEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    gap: theme.spacing.sm,
  },
  customEntryText: {
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.body.medium,
    color: theme.colors.textSecondary,
  },
  customEntrySubtext: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
});

export default memo(AddPlaceModal);
