import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  Animated,
  Pressable,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { theme, shadows } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  rounded?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  children,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  rounded = false,
  disabled = false,
  style,
  ...props
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.primary,
          borderWidth: 1,
          borderColor: theme.colors.primaryDark,
          ...shadows.md,
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.secondary,
          borderWidth: 1,
          borderColor: theme.colors.secondaryDark,
          ...shadows.sm,
        };
      case 'accent':
        return {
          backgroundColor: theme.colors.accent,
          borderWidth: 1,
          borderColor: theme.colors.accentDark,
          ...shadows.md,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: theme.colors.accent,
        };
      case 'danger':
        return {
          backgroundColor: theme.colors.error,
          borderWidth: 1,
          borderColor: theme.colors.errorDark,
          ...shadows.md,
        };
      default:
        return {};
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          minHeight: 36,
        };
      case 'large':
        return {
          paddingVertical: theme.spacing.lg,
          paddingHorizontal: theme.spacing.xxl,
          minHeight: 56,
        };
      default:
        return {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          minHeight: 44,
        };
    }
  };

  const getTextStyles = (): TextStyle => {
    const baseStyles: TextStyle = {
      fontFamily: theme.typography.fonts.heading.regular, // Serif for elegance
      fontWeight: '600',
      letterSpacing: 0.8,
    };

    switch (size) {
      case 'small':
        return { ...baseStyles, fontSize: theme.typography.sizes.sm };
      case 'large':
        return { ...baseStyles, fontSize: theme.typography.sizes.md, letterSpacing: 1.2 };
      default:
        return { ...baseStyles, fontSize: theme.typography.sizes.base };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'ghost':
      case 'outline':
        return theme.colors.accent;
      case 'accent':
        return theme.colors.textPrimary;
      default:
        return theme.colors.textInverse;
    }
  };

  const getIconSize = (): number => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 24;
      default:
        return 20;
    }
  };

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && { width: '100%' },
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        {...props}
      >
        <View
          style={[
            styles.button,
            getVariantStyles(),
            getSizeStyles(),
            rounded && styles.rounded,
            (disabled || loading) && styles.disabled,
            style as ViewStyle,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={getTextColor()} />
          ) : (
            <View style={styles.content}>
              {icon && iconPosition === 'left' && (
                <Icon
                  name={icon}
                  size={getIconSize()}
                  style={[styles.iconLeft, { color: getTextColor() }]}
                />
              )}
              <Text style={[styles.text, getTextStyles(), { color: getTextColor() }]}>
                {children}
              </Text>
              {icon && iconPosition === 'right' && (
                <Icon
                  name={icon}
                  size={getIconSize()}
                  style={[styles.iconRight, { color: getTextColor() }]}
                />
              )}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  rounded: {
    borderRadius: theme.borderRadius.full,
  },
  disabled: {
    opacity: 0.5,
  },
  iconLeft: {
    marginRight: theme.spacing.sm,
  },
  iconRight: {
    marginLeft: theme.spacing.sm,
  },
});