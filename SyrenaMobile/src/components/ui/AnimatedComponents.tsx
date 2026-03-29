import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ViewStyle,
  StyleProp,
  Easing,
  Pressable,
  TextStyle,
  Text,
} from 'react-native';

interface FadeInViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
  slideFrom?: 'bottom' | 'top' | 'left' | 'right' | 'none';
  slideDistance?: number;
}

// Fade in view with optional slide animation
export function FadeInView({
  children,
  style,
  delay = 0,
  duration = 300,
  slideFrom = 'bottom',
  slideDistance = 20,
}: FadeInViewProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(
    slideFrom === 'bottom' ? slideDistance :
    slideFrom === 'top' ? -slideDistance :
    slideFrom === 'left' ? -slideDistance :
    slideFrom === 'right' ? slideDistance : 0
  )).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const translateStyle = slideFrom === 'none' ? {} :
    slideFrom === 'left' || slideFrom === 'right'
      ? { translateX: slideAnim }
      : { translateY: slideAnim };

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [translateStyle],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  style?: StyleProp<ViewStyle>;
  staggerDelay?: number;
}

// Staggered fade-in list item
export function AnimatedListItem({
  children,
  index,
  style,
  staggerDelay = 50,
}: AnimatedListItemProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    const delay = index * staggerDelay;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleValue?: number;
}

// Pressable with smooth scale feedback
export function PressableScale({
  children,
  onPress,
  onLongPress,
  style,
  disabled = false,
  scaleValue = 0.97,
}: PressableScaleProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

interface ScaleFadeViewProps {
  children: React.ReactNode;
  visible: boolean;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}

// View that fades and scales based on visibility
export function ScaleFadeView({
  children,
  visible,
  style,
  duration = 250,
}: ScaleFadeViewProps) {
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(visible ? 1 : 0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: visible ? 1 : 0,
        duration,
        easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: visible ? 1 : 0.95,
        tension: 100,
        friction: 15,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {children}
    </Animated.View>
  );
}

interface FadeInTextProps {
  children: string | undefined | null;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  duration?: number;
}

// Text that fades in smoothly when content appears/changes
export function FadeInText({
  children,
  style,
  numberOfLines,
  duration = 200,
}: FadeInTextProps) {
  const fadeAnim = useRef(new Animated.Value(children ? 1 : 0)).current;
  const [displayText, setDisplayText] = useState(children);

  useEffect(() => {
    if (children) {
      // New text arrived - fade in
      setDisplayText(children);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [children]);

  if (!displayText) return null;

  return (
    <Animated.Text
      style={[style, { opacity: fadeAnim }]}
      numberOfLines={numberOfLines}
    >
      {displayText}
    </Animated.Text>
  );
}

interface AnimatedRowProps {
  children: React.ReactNode;
  visible: boolean;
  style?: StyleProp<ViewStyle>;
  duration?: number;
  minHeight?: number;
}

// Row that smoothly fades content without layout shift
export function AnimatedRow({
  children,
  visible,
  style,
  duration = 200,
  minHeight = 0,
}: AnimatedRowProps) {
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          minHeight: visible ? minHeight : 0,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
