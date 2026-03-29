import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  Animated,
  ViewStyle,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { theme, shadows } from '../../theme';

interface FABProps {
  icon: string;
  onPress: () => void;
  label?: string;
  extended?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  style?: ViewStyle;
  color?: string;
  backgroundColor?: string;
}

export const FAB: React.FC<FABProps> = ({
  icon,
  onPress,
  label,
  extended = false,
  position = 'bottom-right',
  style,
  color = theme.colors.textInverse,
  backgroundColor = theme.colors.accent,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getPositionStyles = (): ViewStyle => {
    const base = {
      position: 'absolute' as const,
      bottom: theme.spacing.xl + theme.layout.tabBarHeight,
    };

    switch (position) {
      case 'bottom-left':
        return { ...base, left: theme.spacing.xl };
      case 'bottom-center':
        return { ...base, alignSelf: 'center' };
      case 'bottom-right':
      default:
        return { ...base, right: theme.spacing.xl };
    }
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        getPositionStyles(),
        {
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        style={[
          styles.fab,
          extended && styles.extended,
          { backgroundColor },
          shadows.xl,
        ]}
      >
        <Animated.View
          style={{
            transform: [{ rotate }],
          }}
        >
          <Icon name={icon} size={24} color={color} />
        </Animated.View>
        {extended && label && (
          <Text style={[styles.label, { color }]}>{label}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: theme.zIndex.fixed,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    height: 56,
    borderRadius: 28,
    paddingHorizontal: theme.spacing.lg,
  },
  extended: {
    paddingHorizontal: theme.spacing.xl,
  },
  label: {
    marginLeft: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fonts.body.semibold,
    fontWeight: '600',
  },
});