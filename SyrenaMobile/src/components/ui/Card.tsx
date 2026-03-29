import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Animated,
  Image,
  Text,
  ImageSourcePropType,
} from 'react-native';
import { theme, shadows } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  onPress?: () => void;
  style?: ViewStyle;
  padding?: boolean;
  image?: ImageSourcePropType;
  imageHeight?: number;
  title?: string;
  subtitle?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  onPress,
  style,
  padding = true,
  image,
  imageHeight = 200,
  title,
  subtitle,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (onPress) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: theme.colors.surfaceElevated,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...shadows.lg,
        };
      case 'outlined':
        return {
          backgroundColor: theme.colors.surface,
          borderWidth: 2,
          borderColor: theme.colors.accent + '40',
        };
      case 'filled':
        return {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      default:
        return {};
    }
  };

  const content = (
    <Animated.View
      style={[
        styles.card,
        getVariantStyles(),
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      {image && (
        <View style={styles.imageContainer}>
          <Image source={image} style={[styles.image, { height: imageHeight }]} />
          <View style={styles.imageOverlay} />
        </View>
      )}
      
      {(title || subtitle) && (
        <View style={[styles.header, padding && styles.headerPadding]}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      
      <View style={padding ? styles.content : undefined}>
        {children}
      </View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden',
  },
  content: {
    padding: theme.spacing.lg,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlayLight,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerPadding: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fonts.heading.regular, // Now uses Georgia serif
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textSecondary,
  },
});