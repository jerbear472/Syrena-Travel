import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import theme from '../theme';

interface ScreenHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  user?: any;
  userProfile?: { avatar_url?: string } | null;
  onProfilePress?: () => void;
  rightContent?: React.ReactNode;
}

export default function ScreenHeader({
  title,
  showBackButton = false,
  onBackPress,
  user,
  userProfile,
  onProfilePress,
  rightContent,
}: ScreenHeaderProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {showBackButton && onBackPress && (
            <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>{title}</Text>
        </View>

        {rightContent ? (
          rightContent
        ) : onProfilePress ? (
          <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
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
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerSafeArea: {
    backgroundColor: theme.colors.surface,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: theme.typography.fonts.heading.regular,
    letterSpacing: 2,
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
    borderColor: theme.colors.accent,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  avatarText: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
  },
});
