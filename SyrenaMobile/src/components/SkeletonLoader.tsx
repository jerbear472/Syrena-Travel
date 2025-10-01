import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import theme from '../theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const PlaceCardSkeleton: React.FC = () => {
  return (
    <View style={styles.placeCard}>
      <View style={styles.placeCardHeader}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View style={styles.placeCardInfo}>
          <SkeletonLoader width="70%" height={18} style={{ marginBottom: 6 }} />
          <SkeletonLoader width="40%" height={14} />
        </View>
      </View>
      <SkeletonLoader width="90%" height={14} style={{ marginTop: 12 }} />
      <View style={styles.placeCardFooter}>
        <SkeletonLoader width={60} height={14} />
        <SkeletonLoader width={80} height={14} />
      </View>
    </View>
  );
};

export const FriendCardSkeleton: React.FC = () => {
  return (
    <View style={styles.friendCard}>
      <SkeletonLoader width={40} height={40} borderRadius={20} />
      <View style={styles.friendInfo}>
        <SkeletonLoader width="60%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonLoader width="40%" height={12} />
      </View>
      <SkeletonLoader width={24} height={24} borderRadius={12} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.seaMist,
  },
  placeCard: {
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.seaMist,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  placeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeCardInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  placeCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.seaMist,
  },
  friendInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
});
