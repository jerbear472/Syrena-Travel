import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons as Icon, MaterialCommunityIcons } from '@expo/vector-icons';
import theme from '../../theme';

interface Friend {
  id: string;
  friend_id: string;
  status: string;
  friend?: {
    id: string;
    username?: string;
    display_name?: string;
  };
}

interface FriendsSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  friends: Friend[];
  selectedFriendFilters: string[];
  onFilterChange: (friendId: string) => void;
  onNavigateToFriends: () => void;
  // New filter props
  selectedCategories: string[];
  onCategoryChange: (category: string) => void;
  selectedPriceLevels: number[];
  onPriceLevelChange: (level: number) => void;
  showSyrenaPicks?: boolean;
  onSyrenaPicksChange?: (show: boolean) => void;
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

const priceLevels = [
  { level: 1, label: '$' },
  { level: 2, label: '$$' },
  { level: 3, label: '$$$' },
  { level: 4, label: '$$$$' },
];

function FriendsSelectorModal({
  visible,
  onClose,
  friends,
  selectedFriendFilters,
  onFilterChange,
  onNavigateToFriends,
  selectedCategories,
  onCategoryChange,
  selectedPriceLevels,
  onPriceLevelChange,
  showSyrenaPicks = true,
  onSyrenaPicksChange,
}: FriendsSelectorModalProps) {
  const handleMyPlacesToggle = () => {
    onFilterChange('MY_PLACES');
  };

  const activeFiltersCount =
    (selectedCategories.length < categories.length ? selectedCategories.length : 0) +
    (selectedPriceLevels.length < 4 ? selectedPriceLevels.length : 0) +
    selectedFriendFilters.filter(f => f !== 'MY_PLACES').length;

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.container}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Filter Places</Text>
                {activeFiltersCount > 0 && (
                  <Text style={styles.count}>
                    {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={onClose}>
                <Icon name="close" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Category Filter */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Place Type</Text>
                <View style={styles.chipRow}>
                  {categories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() => onCategoryChange(cat.id)}
                      >
                        <Icon
                          name={cat.icon as any}
                          size={16}
                          color={isSelected ? theme.colors.surface : theme.colors.primary}
                        />
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Price Level Filter */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Price Level</Text>
                <View style={styles.chipRow}>
                  {priceLevels.map((price) => {
                    const isSelected = selectedPriceLevels.includes(price.level);
                    return (
                      <TouchableOpacity
                        key={price.level}
                        style={[styles.priceChip, isSelected && styles.chipSelected]}
                        onPress={() => onPriceLevelChange(price.level)}
                      >
                        <Text style={[styles.priceText, isSelected && styles.chipTextSelected]}>
                          {price.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Friends Filter */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Show Places From</Text>

                {friends.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No friends yet</Text>
                    <TouchableOpacity
                      style={styles.findFriendsButton}
                      onPress={onNavigateToFriends}
                    >
                      <Icon name="people" size={16} color={theme.colors.surface} />
                      <Text style={styles.findFriendsButtonText}>Find Friends</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.friendsList}>
                    {/* Syrena Picks toggle */}
                    {onSyrenaPicksChange && (
                      <TouchableOpacity
                        style={[
                          styles.friendItem,
                          showSyrenaPicks && styles.syrenaItemActive,
                        ]}
                        onPress={() => onSyrenaPicksChange(!showSyrenaPicks)}
                      >
                        <View style={[styles.avatar, styles.syrenaAvatar]}>
                          <MaterialCommunityIcons name="star-four-points" size={14} color={theme.colors.surface} />
                        </View>
                        <Text style={styles.friendName}>Recommended by Syrena</Text>
                        <View style={[
                          styles.checkbox,
                          showSyrenaPicks && styles.syrenaCheckboxChecked
                        ]}>
                          {showSyrenaPicks && (
                            <Icon name="check" size={14} color={theme.colors.surface} />
                          )}
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* My Places option */}
                    <TouchableOpacity
                      style={[
                        styles.friendItem,
                        selectedFriendFilters.includes('MY_PLACES') && styles.friendItemActive,
                      ]}
                      onPress={handleMyPlacesToggle}
                    >
                      <View style={styles.avatar}>
                        <Icon name="person" size={16} color={theme.colors.surface} />
                      </View>
                      <Text style={styles.friendName}>My Places</Text>
                      <View style={[
                        styles.checkbox,
                        selectedFriendFilters.includes('MY_PLACES') && styles.checkboxChecked
                      ]}>
                        {selectedFriendFilters.includes('MY_PLACES') && (
                          <Icon name="check" size={14} color={theme.colors.surface} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Friends list */}
                    {friends.map((friendship) => {
                      const isSelected = selectedFriendFilters.includes(friendship.friend_id);
                      const displayName = friendship.friend?.display_name ||
                                         friendship.friend?.username ||
                                         'Unknown';

                      return (
                        <TouchableOpacity
                          key={friendship.friend_id}
                          style={[
                            styles.friendItem,
                            isSelected && styles.friendItemActive,
                          ]}
                          onPress={() => onFilterChange(friendship.friend_id)}
                        >
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                              {displayName[0]?.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.friendName}>{displayName}</Text>
                          <View style={[
                            styles.checkbox,
                            isSelected && styles.checkboxChecked
                          ]}>
                            {isSelected && (
                              <Icon name="check" size={14} color={theme.colors.surface} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Apply Button */}
            <TouchableOpacity style={styles.applyButton} onPress={onClose}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(61, 85, 104, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  content: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    maxHeight: 580,
    shadowColor: theme.colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fonts.display.regular,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  count: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.accent,
    marginTop: 2,
  },
  scrollView: {
    maxHeight: 400,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: theme.colors.surface,
  },
  priceChip: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    minWidth: 50,
    alignItems: 'center',
  },
  priceText: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
  findFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  findFriendsButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    fontWeight: '600',
    color: theme.colors.surface,
  },
  friendsList: {
    gap: theme.spacing.xs,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  friendItemActive: {
    backgroundColor: theme.colors.border,
    borderWidth: 1.5,
    borderColor: theme.colors.secondary,
  },
  syrenaItemActive: {
    backgroundColor: theme.colors.accentSubtle,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
  },
  syrenaAvatar: {
    backgroundColor: theme.colors.accent,
  },
  syrenaCheckboxChecked: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
  },
  friendName: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.primary,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.textTertiary,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  applyButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.body.regular,
    fontWeight: '600',
  },
});

export default memo(FriendsSelectorModal);
