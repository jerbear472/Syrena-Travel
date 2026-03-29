import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { theme, getThemeColors } from '../theme';
import { Input } from '../components/ui/Input';
import { MaterialIcons as Icon } from '@expo/vector-icons';

// Import app logo
const appLogo = require('../assets/images/SyrenaStar.png');

export default function AuthScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getThemeColors(isDarkMode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address first');
      return;
    }

    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://syrena-web-new.vercel.app/auth/confirm',
      });
      if (error) throw error;
      Alert.alert(
        'Check Your Email',
        'We sent you a password reset link',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert(
          'Success!',
          'Check your email for verification link',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      Alert.alert(
        'Authentication Error',
        error.message,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Section with Logo */}
            <View style={styles.header}>
              <Image
                source={appLogo}
                style={styles.logoImage}
                resizeMode="contain"
              />

              <Text style={[styles.brandName, { color: colors.primary }]}>
                SYRENA
              </Text>
              <Text style={[styles.tagline, { color: colors.textSecondary }]}>
                Discover your next adventure
              </Text>
            </View>

            {/* Form Card */}
            <View
              style={[
                styles.formCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.formTitle, { color: colors.primary }]}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </Text>
              <Text style={[styles.formSubtitle, { color: colors.textTertiary }]}>
                {isSignUp
                  ? 'Start your travel journey'
                  : 'Sign in to continue'}
              </Text>

              <View style={styles.inputsContainer}>
                <Input
                  label="Email"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="your@email.com"
                  size="large"
                />

                <Input
                  label="Password"
                  icon="lock-outline"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Enter your password"
                  size="large"
                  rightIcon={showPassword ? 'visibility-off' : 'visibility'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />

                {/* Forgot Password - subtle, only on sign in */}
                {!isSignUp && (
                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    disabled={resettingPassword || loading}
                    style={styles.forgotPasswordButton}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.forgotPasswordText, { color: colors.textTertiary }]}>
                      {resettingPassword ? 'Sending...' : 'Forgot password?'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {isSignUp && (
                <View style={styles.passwordHint}>
                  <Icon name="info-outline" size={14} color={colors.textTertiary} />
                  <Text style={[styles.hintText, { color: colors.textTertiary }]}>
                    Password must be at least 6 characters
                  </Text>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.primary },
                  loading && styles.submitButtonDisabled,
                ]}
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={[styles.submitButtonText, { color: colors.surface }]}>
                    {isSignUp ? 'Get Started' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Toggle Sign In/Up */}
              <TouchableOpacity
                onPress={() => setIsSignUp(!isSignUp)}
                disabled={loading}
                style={styles.toggleButton}
              >
                <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                  <Text style={[styles.toggleTextBold, { color: colors.primary }]}>
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textTertiary }]}>
                By continuing, you agree to our Terms of Service
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 16,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 10,
    fontFamily: theme.typography.fonts.display.regular,
    marginBottom: 6,
  },
  tagline: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fonts.heading.italic,
    fontStyle: 'italic',
  },
  formCard: {
    borderRadius: theme.borderRadius.card,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  formTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: '600',
    fontFamily: theme.typography.fonts.heading.regular,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  formSubtitle: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fonts.body.regular,
    textAlign: 'center',
    marginBottom: 28,
  },
  inputsContainer: {
    marginBottom: 8,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontFamily: theme.typography.fonts.body.regular,
  },
  passwordHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  hintText: {
    fontSize: 12,
    fontFamily: theme.typography.fonts.body.regular,
  },
  submitButton: {
    height: 52,
    borderRadius: theme.borderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.typography.fonts.body.regular,
  },
  toggleButton: {
    paddingVertical: 16,
    marginTop: 8,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: theme.typography.fonts.body.regular,
    textAlign: 'center',
  },
  toggleTextBold: {
    fontWeight: '600',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontFamily: theme.typography.fonts.body.regular,
    textAlign: 'center',
  },
});
