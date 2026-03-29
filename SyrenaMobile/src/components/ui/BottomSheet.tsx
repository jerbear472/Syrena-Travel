import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  Keyboard,
  KeyboardEvent,
  Easing,
  useWindowDimensions,
} from 'react-native';
import theme from '../../theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number | `${number}%`;
  minHeight?: number;
}

export default function BottomSheet({
  visible,
  onClose,
  children,
  maxHeight = '92%',
  minHeight: minHeightProp,
}: BottomSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const minHeight = minHeightProp ?? screenHeight * 0.85;

  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Reset slide position when screen height changes (iPad rotation/multitasking)
  useEffect(() => {
    if (!visible) {
      slideAnim.setValue(screenHeight);
    }
  }, [screenHeight, visible, slideAnim]);

  useEffect(() => {
    if (visible) {
      setIsClosing(false);
      // Reset to off-screen position before animating in
      slideAnim.setValue(screenHeight);
      // Animate in: smooth spring with scale and fade
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!isClosing) {
      // Dismiss keyboard when closing
      Keyboard.dismiss();
      setIsClosing(true);
      // Animate out with smooth deceleration
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, screenHeight, slideAnim, fadeAnim, scaleAnim, isClosing]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Backdrop - fades in */}
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: fadeAnim },
          ]}
        >
          <TouchableWithoutFeedback onPress={() => {
            Keyboard.dismiss();
            if (!keyboardVisible) {
              onClose();
            }
          }}>
            <View style={styles.backdropTouchable} />
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Content - slides up with scale */}
        <Animated.View
          style={[
            styles.content,
            {
              maxHeight: keyboardVisible ? '100%' : maxHeight,
              minHeight: keyboardVisible ? undefined : minHeight,
              // Use paddingBottom for keyboard offset to avoid layout calculation issues on iPad
              paddingBottom: keyboardVisible ? Math.max(keyboardHeight, 40) : 40,
            },
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
              opacity: fadeAnim,
            },
          ]}
        >
          {children}
          {/* Handle bar - overlay on top */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(61, 85, 104, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  content: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  handleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 12,
    zIndex: 50,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 2,
  },
});
