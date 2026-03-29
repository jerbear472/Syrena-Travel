import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { theme } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  variant?: 'outlined' | 'filled' | 'underlined';
  size?: 'small' | 'medium' | 'large';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  icon,
  rightIcon,
  onRightIconPress,
  variant = 'outlined',
  size = 'medium',
  value,
  onFocus,
  onBlur,
  style,
  placeholder,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getInputHeight = () => {
    switch (size) {
      case 'small':
        return 44;
      case 'large':
        return 56;
      default:
        return 50;
    }
  };

  const getVariantStyles = () => {
    const baseStyles = {
      backgroundColor: theme.colors.surfaceElevated,
    };

    if (variant === 'outlined') {
      return {
        ...baseStyles,
        borderWidth: 1.5,
        borderColor: error
          ? theme.colors.error
          : isFocused
            ? theme.colors.accent
            : theme.colors.border,
      };
    }

    if (variant === 'underlined') {
      return {
        ...baseStyles,
        borderBottomWidth: 2,
        borderBottomColor: error
          ? theme.colors.error
          : isFocused
            ? theme.colors.accent
            : theme.colors.border,
        borderRadius: 0,
      };
    }

    return {
      ...baseStyles,
      borderWidth: isFocused ? 1.5 : 1,
      borderColor: error
        ? theme.colors.error
        : isFocused
          ? theme.colors.accent
          : theme.colors.borderSubtle,
    };
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[
          styles.label,
          error && { color: theme.colors.error },
          isFocused && { color: theme.colors.accent },
        ]}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          getVariantStyles(),
          { height: getInputHeight() },
          style,
        ]}
      >
        {icon && (
          <Icon
            name={icon}
            size={20}
            style={[styles.leftIcon, { color: error ? theme.colors.error : isFocused ? theme.colors.accent : theme.colors.textTertiary }]}
          />
        )}

        <TextInput
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            {
              fontSize: size === 'small' ? 14 : size === 'large' ? 17 : 16,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSubtle}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.rightIconButton}
          >
            <Icon
              name={rightIcon}
              size={20}
              color={error ? theme.colors.error : theme.colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>

      {(error || helper) && (
        <View style={styles.messageContainer}>
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          {helper && !error && (
            <Text style={styles.helperText}>{helper}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontFamily: theme.typography.fonts.heading.regular, // Serif label
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs + 2,
    marginLeft: theme.spacing.xxs,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.input,
    paddingHorizontal: theme.spacing.md,
  },
  leftIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: theme.typography.fonts.body.regular,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    padding: 0,
    letterSpacing: 0.2,
  },
  rightIconButton: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  messageContainer: {
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  errorText: {
    fontFamily: theme.typography.fonts.body.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.error,
  },
  helperText: {
    fontFamily: theme.typography.fonts.body.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
  },
});
