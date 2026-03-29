import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../theme';
import BottomSheet from '../ui/BottomSheet';
import { FadeInText } from '../ui/AnimatedComponents';

const { width: screenWidth } = Dimensions.get('window');

// Helper to clean city name by removing postal codes and numeric fragments
const cleanCityName = (rawCity: string | undefined | null): string => {
  if (!rawCity) return '';
  return rawCity
    .replace(/\b\d{2,5}[-–]\d{2,4}\b/g, '')
    .replace(/\b\d{4,6}\b/g, '')
    .replace(/\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b/gi, '')
    .replace(/\b\d{4}\s?[A-Z]{2}\b/gi, '')
    .replace(/^\d+\s*[-–]\s*/g, '')
    .replace(/\s*[-–]\s*\d+$/g, '')
    .replace(/\s*[-–]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

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
  city?: string;
  source?: string;
}

interface PlaceOwner {
  id: string;
  username?: string;
  display_name?: string;
}

interface Visitor {
  id: string;
  visitor_id: string;
  visited_at: string;
  profiles?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
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

interface PlaceDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  place: Place | null;
  placeOwner: PlaceOwner | null;
  currentUserId?: string;
  comments: Comment[];
  visitors: Visitor[];
  newComment: string;
  setNewComment: (comment: string) => void;
  submittingComment: boolean;
  onSubmitComment: () => void;
  onMarkAsVisited: (placeId: string) => void;
  onShare: (place: Place) => void;
  onSave: (place: Place) => void;
  onEdit?: (place: Place) => void;
  onDelete: (placeId: string, placeName: string) => void;
  onViewOnMap?: (place: Place) => void;
  likeCount?: number;
  hasLiked?: boolean;
  onToggleLike?: (placeId: string) => void;
}

const categories = [
  { id: 'hotel', name: 'Stay', icon: 'hotel', color: '#457B9D' },
  { id: 'restaurant', name: 'Dine', icon: 'restaurant', color: '#E63946' },
  { id: 'bar', name: 'Drink', icon: 'local-bar', color: '#9B59B6' },
  { id: 'activity', name: 'Experience', icon: 'explore', color: '#2A9D8F' },
];

const getCategoryInfo = (categoryId?: string) => {
  const category = categories.find(c => c.id === categoryId);
  return category || { name: 'Place', icon: 'explore', color: theme.colors.accent };
};

// Category gradient colors for beautiful placeholders (subtle, matching MyPlaces)
const categoryGradients: { [key: string]: string[] } = {
  hotel: ['#457B9D', '#5A8FAD', '#7BA8C2'],
  restaurant: ['#E63946', '#EB5A5A', '#F07A7A'],
  bar: ['#9B59B6', '#A86FC4', '#B585D2'],
  activity: ['#2A9D8F', '#3DAFA1', '#5BC4B6'],
};

// Category background patterns
const getCategoryGradient = (categoryId?: string): string[] => {
  return categoryGradients[categoryId || 'activity'] || categoryGradients.activity;
};

// Avatar colors for visitors (subtle, matching app palette)
const avatarColors = ['#457B9D', '#E63946', '#2A9D8F', '#B8860B', '#1E3A5F'];
const getAvatarColor = (index: number): string => avatarColors[index % avatarColors.length];

function PlaceDetailsModal({
  visible,
  onClose,
  place,
  placeOwner,
  currentUserId,
  comments,
  visitors,
  newComment,
  setNewComment,
  submittingComment,
  onSubmitComment,
  onMarkAsVisited,
  onShare,
  onSave,
  onEdit,
  onDelete,
  onViewOnMap,
  likeCount = 0,
  hasLiked = false,
  onToggleLike,
}: PlaceDetailsModalProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll to comment input when focused so it stays visible above keyboard
  const handleCommentFocus = useCallback(() => {
    const scrollDown = () => scrollViewRef.current?.scrollToEnd({ animated: true });
    setTimeout(scrollDown, 200);
    setTimeout(scrollDown, 500);
  }, []);

  // Reset image states when place changes
  useEffect(() => {
    if (place?.id) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [place?.id]);

  if (!place) return null;

  const categoryInfo = getCategoryInfo(place.category);
  const isVisited = (place.visit_count ?? 0) > 0;
  const isOwnPlace = place.user_id === currentUserId;
  const hasVisited = visitors.some(v => v.visitor_id === currentUserId);
  const gradientColors = getCategoryGradient(place.category);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        {/* Elegant Close Button */}
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="close" size={24} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Hero Section */}
          {place.photo_url && !imageError ? (
            <View style={styles.heroContainer}>
              {imageLoading && (
                <View style={styles.imageLoadingContainer}>
                  <ActivityIndicator size="large" color={categoryInfo.color} />
                </View>
              )}
              <Image
                source={{ uri: place.photo_url }}
                style={[styles.heroImage, imageLoading && styles.imageHidden]}
                resizeMode="cover"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)']}
                style={styles.heroGradient}
              />
              {/* Category Badge on Image */}
              <View style={[styles.categoryBadgeOnImage, { backgroundColor: categoryInfo.color }]}>
                <Icon name={categoryInfo.icon} size={14} color={"#FFF"} />
                <Text style={styles.categoryBadgeText}>{categoryInfo.name}</Text>
              </View>
              {/* Visited Badge */}
              {isVisited && (
                <View style={styles.visitedBadgeOnImage}>
                  <Icon name="verified" size={14} color={"#FFF"} />
                  <Text style={styles.visitedBadgeText}>Visited</Text>
                </View>
              )}
            </View>
          ) : (
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroPlaceholder}
            >
              {/* Decorative circles */}
              <View style={styles.decorativeCircle1} />
              <View style={styles.decorativeCircle2} />

              {/* Main icon */}
              <View style={styles.placeholderIconContainer}>
                <View style={styles.iconOuter}>
                  <View style={styles.iconInner}>
                    <Icon name={categoryInfo.icon} size={48} color={"#FFF"} />
                  </View>
                </View>
              </View>

              {/* Category Badge */}
              <View style={styles.categoryBadgeStandalone}>
                <Text style={styles.categoryBadgeText}>{categoryInfo.name}</Text>
              </View>
            </LinearGradient>
          )}

          {/* Place Name */}
          <Text style={styles.placeName}>{place.name}</Text>

          {/* City */}
          {cleanCityName(place.city) ? (
            <View style={styles.cityRow}>
              <Icon name="place" size={14} color={theme.colors.textTertiary} />
              <Text style={styles.cityText} numberOfLines={1}>
                {cleanCityName(place.city)}
              </Text>
            </View>
          ) : null}

          {/* Recommended By */}
          {place.source === 'syrena' ? (
            <View style={styles.recommendedBy}>
              <View style={[styles.recommenderAvatar, { backgroundColor: theme.colors.accent }]}>
                <Icon name="auto-awesome" size={18} color="#FFF" />
              </View>
              <View>
                <Text style={styles.recommendedLabel}>Recommended by</Text>
                <Text style={[styles.recommenderName, { color: theme.colors.accent }]}>Syrena</Text>
              </View>
            </View>
          ) : placeOwner ? (
            <View style={styles.recommendedBy}>
              <View style={styles.recommenderAvatar}>
                <Text style={styles.recommenderInitial}>
                  {(placeOwner.display_name || placeOwner.username || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.recommendedLabel}>Recommended by</Text>
                <Text style={styles.recommenderName}>
                  {placeOwner.display_name || placeOwner.username || 'A friend'}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Notes Card */}
          {place.description && (
            <View style={styles.notesCard}>
              <View style={styles.notesHeader}>
                <Icon name="format-quote" size={20} color={theme.colors.accent} />
                <Text style={styles.notesTitle}>Notes</Text>
              </View>
              <Text style={styles.notesText}>{place.description}</Text>
            </View>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => onToggleLike?.(place.id)}
              activeOpacity={0.6}
              disabled={!onToggleLike}
            >
              <Icon
                name={hasLiked ? "favorite" : "favorite-border"}
                size={18}
                color={hasLiked ? "#E63946" : theme.colors.textTertiary}
              />
              <Text style={styles.statValue}>{likeCount}</Text>
              <Text style={styles.statLabel}>likes</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Icon name="visibility" size={18} color={theme.colors.textTertiary} />
              <Text style={styles.statValue}>{place.visit_count || 0}</Text>
              <Text style={styles.statLabel}>visits</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Icon name="chat-bubble-outline" size={18} color={theme.colors.textTertiary} />
              <Text style={styles.statValue}>{comments.length}</Text>
              <Text style={styles.statLabel}>comments</Text>
            </View>
          </View>

          {/* Visitors Section */}
          {visitors.length > 0 && (
            <View style={styles.visitorsSection}>
              <View style={styles.visitorsSectionHeader}>
                <Icon name="people" size={18} color={theme.colors.primary} />
                <Text style={styles.visitorsTitle}>Who's been here</Text>
              </View>
              <View style={styles.visitorsRow}>
                <View style={styles.visitorAvatars}>
                  {visitors.slice(0, 5).map((visitor, index) => (
                    <View
                      key={visitor.id}
                      style={[
                        styles.visitorAvatar,
                        { marginLeft: index === 0 ? 0 : -10, zIndex: 5 - index },
                      ]}
                    >
                      {visitor.profiles?.avatar_url ? (
                        <Image
                          source={{ uri: visitor.profiles.avatar_url }}
                          style={styles.visitorAvatarImage}
                        />
                      ) : (
                        <View style={[styles.visitorAvatarPlaceholder, { backgroundColor: getAvatarColor(index) }]}>
                          <Text style={styles.visitorAvatarInitial}>
                            {(visitor.profiles?.display_name || visitor.profiles?.username || 'V')[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                  {visitors.length > 5 && (
                    <View style={[styles.visitorAvatar, styles.visitorAvatarMore, { marginLeft: -10 }]}>
                      <Text style={styles.visitorAvatarMoreText}>+{visitors.length - 5}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.visitorsNames}>
                  {visitors.length === 1 ? (
                    <Text style={styles.visitorName}>
                      {visitors[0].profiles?.display_name || visitors[0].profiles?.username || 'A traveler'}
                    </Text>
                  ) : visitors.length === 2 ? (
                    <Text style={styles.visitorName}>
                      {visitors[0].profiles?.display_name || visitors[0].profiles?.username || 'A traveler'} and{' '}
                      {visitors[1].profiles?.display_name || visitors[1].profiles?.username || 'another traveler'}
                    </Text>
                  ) : (
                    <Text style={styles.visitorName}>
                      {visitors[0].profiles?.display_name || visitors[0].profiles?.username || 'A traveler'} and{' '}
                      {visitors.length - 1} others
                    </Text>
                  )}
                  <Text style={styles.visitedLabel}>have visited</Text>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {!hasVisited && !isOwnPlace && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => onMarkAsVisited(place.id)}
              >
                <Icon name="check-circle" size={20} color={"#FFF"} />
                <Text style={styles.primaryButtonText}>Mark as Visited</Text>
              </TouchableOpacity>
            )}
            {hasVisited && (
              <View style={styles.visitedConfirmation}>
                <Icon name="check-circle" size={20} color={theme.colors.success} />
                <Text style={styles.visitedConfirmationText}>You've visited this place</Text>
              </View>
            )}
            <View style={styles.secondaryButtons}>
              {onViewOnMap && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => onViewOnMap(place)}
                >
                  <Icon name="map" size={22} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => onShare(place)}
              >
                <Icon name="share" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => onSave(place)}
              >
                <Icon name="directions" size={22} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.sectionDivider} />

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Conversation</Text>

            {/* Add Comment */}
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Share your thoughts..."
                placeholderTextColor={theme.colors.textTertiary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                scrollEnabled={true}
                textAlignVertical="top"
                blurOnSubmit={false}
                editable={!submittingComment}
                onFocus={handleCommentFocus}
              />
              <TouchableOpacity
                style={[styles.submitButton, (!newComment.trim() || submittingComment) && styles.submitButtonDisabled]}
                onPress={onSubmitComment}
                disabled={submittingComment || !newComment.trim()}
              >
                {submittingComment ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Icon name="send" size={18} color={"#FFF"} />
                )}
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {comments.length > 0 ? (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {(comment.profiles?.display_name || comment.profiles?.username || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentContent}>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentAuthor}>
                        {comment.profiles?.display_name || comment.profiles?.username || 'Traveler'}
                      </Text>
                      <Text style={styles.commentDate}>
                        {new Date(comment.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{comment.comment}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyComments}>
                <Icon name="chat-bubble-outline" size={32} color={theme.colors.border} />
                <Text style={styles.emptyCommentsText}>Start the conversation</Text>
              </View>
            )}
          </View>

          {/* Owner Actions */}
          {isOwnPlace && (
            <View style={styles.ownerActions}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => onEdit(place)}
                >
                  <Icon name="edit" size={18} color={theme.colors.primary} />
                  <Text style={styles.editButtonText}>Edit Place</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => onDelete(place.id, place.name)}
              >
                <Text style={styles.deleteButtonText}>Remove this place</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 100,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    height: 220,
    position: 'relative',
    marginBottom: theme.spacing.lg,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageHidden: {
    opacity: 0,
  },
  imageLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  categoryBadgeOnImage: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  visitedBadgeOnImage: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.success || '#10B981',
  },
  visitedBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  heroPlaceholder: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -30,
    right: -30,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -20,
    left: -20,
  },
  placeholderIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  iconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadgeStandalone: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  placeName: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: theme.typography.fonts.display.regular,
    color: theme.colors.primary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xs,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: theme.spacing.sm,
    minHeight: 20, // Reserve space to prevent layout shift
  },
  cityText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
    fontFamily: theme.typography.fonts.body.regular,
  },
  recommendedBy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  recommenderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  recommenderInitial: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  recommendedLabel: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '500',
  },
  recommenderName: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '600',
    fontFamily: theme.typography.fonts.heading.regular,
  },
  notesCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  notesText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    fontFamily: theme.typography.fonts.body.regular,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: theme.typography.fonts.display.regular,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.lg,
  },
  visitorsSection: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  visitorsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  visitorsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.typography.fonts.heading.regular,
    letterSpacing: 0.3,
  },
  visitorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  visitorAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    overflow: 'hidden',
  },
  visitorAvatarImage: {
    width: '100%',
    height: '100%',
  },
  visitorAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitorAvatarInitial: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  visitorAvatarMore: {
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitorAvatarMoreText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  visitorsNames: {
    flex: 1,
  },
  visitorName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  visitedLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  actionButtons: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.button,
    paddingVertical: 14,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.typography.fonts.body.regular,
    letterSpacing: 0.3,
  },
  visitedConfirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.successSubtle,
    borderRadius: theme.borderRadius.button,
    paddingVertical: 14,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.success + '40',
  },
  visitedConfirmationText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
  },
  commentsSection: {
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fonts.heading.regular,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addCommentContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    fontSize: 14,
    minHeight: 40,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fonts.body.regular,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  commentItem: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  commentContent: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  commentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.typography.fonts.heading.regular,
  },
  commentDate: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commentText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    fontFamily: theme.typography.fonts.body.regular,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyCommentsText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.sm,
    fontFamily: theme.typography.fonts.body.regular,
  },
  ownerActions: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.typography.fonts.body.regular,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  deleteButtonText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    textDecorationLine: 'underline',
  },
  bottomPadding: {
    height: 20,
  },
});

export default memo(PlaceDetailsModal);
