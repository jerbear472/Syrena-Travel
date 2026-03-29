import React, { memo } from 'react';
import { Image } from 'expo-image';
import { StyleProp, ImageStyle, View, StyleSheet } from 'react-native';
import theme from '../../theme';

interface CachedImageProps {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder?: React.ReactNode;
  transition?: number;
}

/**
 * Optimized cached image component using expo-image
 * - Uses memory and disk caching by default
 * - Supports blurhash placeholders
 * - Smooth transitions
 */
function CachedImage({
  uri,
  style,
  contentFit = 'cover',
  placeholder,
  transition = 200,
}: CachedImageProps) {
  if (!uri) {
    return placeholder ? <>{placeholder}</> : <View style={[styles.placeholder, style]} />;
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk"
      recyclingKey={uri}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: theme.colors.border,
  },
});

export default memo(CachedImage);
