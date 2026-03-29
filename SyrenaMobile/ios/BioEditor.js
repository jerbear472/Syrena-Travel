/**
 * BioEditor Component for Syrena Mobile
 * Ensures text input is always visible when keyboard appears
 * 
 * Usage:
 * import BioEditor from './BioEditor';
 * 
 * <BioEditor
 *   initialBio="Your current bio"
 *   onSave={(newBio) => console.log(newBio)}
 *   onCancel={() => console.log('Cancelled')}
 * />
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Keyboard,
  Animated,
  Dimensions,
} from 'react-native';

const BioEditor = ({ initialBio = '', onSave, onCancel, maxLength = 500 }) => {
  const [bio, setBio] = useState(initialBio);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef(null);
  const textInputRef = useRef(null);
  const scrollOffset = useRef(new Animated.Value(0)).current;

  // Monitor keyboard
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to make input visible
        setTimeout(() => {
          scrollToInput();
        }, 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const scrollToInput = () => {
    if (textInputRef.current && scrollViewRef.current) {
      textInputRef.current.measureLayout(
        scrollViewRef.current.getInnerViewNode ? 
          scrollViewRef.current.getInnerViewNode() : 
          scrollViewRef.current,
        (x, y, width, height) => {
          // Scroll so input is 20px from top of visible area
          const scrollToY = Math.max(0, y - 20);
          scrollViewRef.current?.scrollTo({
            y: scrollToY,
            animated: true,
          });
        },
        (error) => {
          console.log('Measurement error:', error);
        }
      );
    }
  };

  const handleSave = () => {
    Keyboard.dismiss();
    onSave(bio);
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    onCancel();
  };

  const characterCount = bio.length;
  const isOverLimit = characterCount > maxLength;
  const percentage = (characterCount / maxLength) * 100;

  const counterColor = isOverLimit
    ? '#FF3B30'
    : percentage >= 90
    ? '#FF9500'
    : '#8E8E93';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Bio</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          style={[styles.headerButton, isOverLimit && styles.headerButtonDisabled]}
          disabled={isOverLimit}
        >
          <Text style={[styles.saveText, isOverLimit && styles.saveTextDisabled]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: keyboardHeight + 20 }
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
      >
        {/* Bio Input Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Your Bio</Text>
            {bio.length > 0 && (
              <Text style={styles.editingIndicator}>✏️ Editing</Text>
            )}
          </View>

          <View
            ref={textInputRef}
            style={styles.textInputContainer}
          >
            <TextInput
              style={styles.textInput}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself..."
              placeholderTextColor="#8E8E93"
              multiline
              textAlignVertical="top"
              maxLength={maxLength}
              autoFocus
              scrollEnabled={false} // Let parent ScrollView handle scrolling
              onFocus={scrollToInput}
            />
          </View>
        </View>

        {/* Character Counter */}
        <View style={[styles.counterCard, { borderColor: counterColor }]}>
          <Text style={[styles.counterText, { color: counterColor }]}>
            {characterCount} / {maxLength} characters
          </Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: counterColor,
                },
              ]}
            />
          </View>
        </View>

        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips for a Great Bio</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>✓ Be authentic and genuine</Text>
            <Text style={styles.tipItem}>✓ Share your interests</Text>
            <Text style={styles.tipItem}>✓ Keep it concise</Text>
            <Text style={styles.tipItem}>✓ Update regularly</Text>
          </View>
        </View>

        {/* Extra space to ensure input is always visible */}
        <View style={{ height: 200 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  cancelText: {
    fontSize: 17,
    color: '#007AFF',
  },
  saveText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  saveTextDisabled: {
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  editingIndicator: {
    fontSize: 13,
    color: '#007AFF',
  },
  textInputContainer: {
    minHeight: 200,
  },
  textInput: {
    fontSize: 17,
    lineHeight: 22,
    color: '#000000',
    minHeight: 200,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  counterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  counterText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    fontSize: 13,
    color: '#3C3C43',
    lineHeight: 18,
  },
});

export default BioEditor;
