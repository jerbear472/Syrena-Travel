import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { theme, shadows } from '../../theme';

interface SurfaceProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
  padding?: boolean;
  glassMorphism?: boolean;
}

export const Surface: React.FC<SurfaceProps> = ({
  children,
  style,
  elevation = 1,
  padding = true,
  glassMorphism = false,
}) => {
  const getShadowStyles = () => {
    switch (elevation) {
      case 0:
        return shadows.none;
      case 1:
        return shadows.xs;
      case 2:
        return shadows.sm;
      case 3:
        return shadows.md;
      case 4:
        return shadows.lg;
      case 5:
        return shadows.xl;
      default:
        return shadows.sm;
    }
  };

  return (
    <View
      style={[
        styles.surface,
        glassMorphism && styles.glassMorphism,
        getShadowStyles(),
        padding && styles.padding,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  surface: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  glassMorphism: {
    backgroundColor: theme.colors.glass,
    borderWidth: 2,
    borderColor: theme.colors.accent + '30',
  },
  padding: {
    padding: theme.spacing.lg,
  },
});