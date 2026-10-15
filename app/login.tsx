import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { signIn } from '@/lib/auth';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await signIn(
        email.trim(),
        password
      );

      if (authError) {
        setError(authError.message);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Decorative background shapes */}
      <View style={styles.backgroundCircleTop} />
      <View style={styles.backgroundCircleBottom} />
      <View style={styles.backgroundGlow} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + 20,
                paddingBottom: insets.bottom + 30,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* App Branding */}
            <View style={styles.header}>
              <View style={styles.logoBox}>
                <Ionicons
                  name="scan-outline"
                  size={48}
                  color="#FFFFFF"
                />
                <View style={styles.qrBadge}>
                  <Ionicons
                    name="qr-code-outline"
                    size={23}
                    color="#163D70"
                  />
                </View>
              </View>

              <Text style={styles.brandName}>QR-ATT</Text>
              <Text style={styles.brandSubtitle}>
                ATTENDANCE MADE EASY
              </Text>
            </View>

            {/* Glassmorphism Card */}
            <View style={styles.glassCard}>
              <Text style={styles.title}>Welcome Back!</Text>

              <Text style={styles.subtitle}>
                Sign in to record your attendance
              </Text>

              {/* Email */}
              <Text style={styles.label}>Email Address</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={21}
                  color="#EAF3FF"
                />

                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email address"
                  placeholderTextColor="rgba(255,255,255,0.65)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>

              {/* Password */}
              <Text style={styles.label}>Password</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={21}
                  color="#EAF3FF"
                />

                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(255,255,255,0.65)"
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />

                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                >
                  <Ionicons
                    name={
                      showPassword
                        ? 'eye-outline'
                        : 'eye-off-outline'
                    }
                    size={21}
                    color="#EAF3FF"
                  />
                </TouchableOpacity>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color="#FFD6D6"
                  />
                  <Text style={styles.error}>{error}</Text>
                </View>
              )}

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  loading && styles.disabledButton,
                ]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.loginButtonText}>
                      Sign In
                    </Text>
                    <Ionicons
                      name="arrow-forward-outline"
                      size={21}
                      color="#FFFFFF"
                    />
                  </View>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>QR-ATT</Text>
                <View style={styles.divider} />
              </View>

              {/* Register Link */}
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>
                  Don't have an account?{' '}
                </Text>

                <Link href="/register" asChild>
                  <Text style={styles.signupLink}>Register</Text>
                </Link>
              </View>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              Scan  •  Attend  •  Track
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#102F57',
    overflow: 'hidden',
  },

  keyboardView: {
    flex: 1,
  },

  // Background decorations
  backgroundCircleTop: {
    position: 'absolute',
    width: 310,
    height: 310,
    borderRadius: 155,
    backgroundColor: '#3C6FA6',
    opacity: 0.65,
    top: -145,
    right: -105,
  },

  backgroundCircleBottom: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#071C36',
    opacity: 0.75,
    bottom: -190,
    left: -130,
  },

  backgroundGlow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#6C9ACB',
    opacity: 0.18,
    top: '32%',
    left: -120,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Branding
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },

  logoBox: {
    width: 76,
    height: 76,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  qrBadge: {
    position: 'absolute',
    right: -7,
    bottom: -5,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#EAF3FF',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandName: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },

  brandSubtitle: {
    marginTop: 5,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },

  // Frosted glass card
  glassCard: {
    width: '100%',
    paddingHorizontal: 23,
    paddingVertical: 29,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    backgroundColor: 'rgba(225,239,255,0.19)',

    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },

  title: {
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#FFFFFF',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 27,
  },

  // Input fields
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 9,
    marginTop: 17,
  },

  inputContainer: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 15,
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
  },

  error: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#FFD6D6',
  },

  // Button
  loginButton: {
    minHeight: 59,
    borderRadius: 17,
    backgroundColor: '#153F75',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 29,

    shadowColor: '#071C36',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },

  disabledButton: {
    opacity: 0.7,
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 27,
    marginBottom: 24,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.75)',
  },

  // Register
  signupContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },

  signupText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },

  signupLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },

  // Footer
  footer: {
    textAlign: 'center',
    marginTop: 25,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.72)',
  },
});
