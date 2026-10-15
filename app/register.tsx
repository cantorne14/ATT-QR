
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
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { signUp } from '@/lib/auth';

type Role = 'student' | 'teacher';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<Role>('student');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);

    if (
      !email.trim() ||
      !password ||
      !confirmPassword ||
      !fullName.trim()
    ) {
      setError(
        'Full name, email, password, and confirmation are required.'
      );
      return;
    }

    if (role === 'teacher' && !department.trim()) {
      setError('Please enter your department as a teacher.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signUp(
        email.trim(),
        password,
        {
          full_name: fullName.trim(),
          role,
          department: role === 'teacher' ? department.trim() : '',
        }
      );

      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        router.replace('/(tabs)');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Decorative background */}
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
                paddingTop: insets.top + 18,
                paddingBottom: insets.bottom + 30,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Branding */}
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

            {/* Glass card */}
            <View style={styles.glassCard}>
              {success ? (
                <View style={styles.successContainer}>
                  <View style={styles.successIcon}>
                    <Ionicons
                      name="mail-open-outline"
                      size={38}
                      color="#FFFFFF"
                    />
                  </View>

                  <Text style={styles.title}>Check Your Email!</Text>

                  <Text style={styles.subtitle}>
                    We sent a confirmation link to {email}. Open the
                    email and verify your account before signing in.
                  </Text>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.replace('/login')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryButtonText}>
                      Back to Sign In
                    </Text>
                    <Ionicons
                      name="arrow-forward-outline"
                      size={21}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.title}>Create Account</Text>

                  <Text style={styles.subtitle}>
                    Fill in your details to get started
                  </Text>

                  {/* Full name */}
                  <Text style={styles.label}>Full Name</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color="#EAF3FF"
                    />

                    <TextInput
                      style={styles.input}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Enter your full name"
                      placeholderTextColor="rgba(255,255,255,0.65)"
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={!loading}
                      returnKeyType="next"
                    />
                  </View>

                  {/* Email */}
                  <Text style={styles.label}>Email Address</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
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
                      size={20}
                      color="#EAF3FF"
                    />

                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="At least 6 characters"
                      placeholderTextColor="rgba(255,255,255,0.65)"
                      secureTextEntry={!showPassword}
                      textContentType="newPassword"
                      editable={!loading}
                      returnKeyType="next"
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

                  {/* Confirm password */}
                  <Text style={styles.label}>Confirm Password</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#EAF3FF"
                    />

                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter your password"
                      placeholderTextColor="rgba(255,255,255,0.65)"
                      secureTextEntry={!showConfirmPassword}
                      textContentType="newPassword"
                      editable={!loading}
                      returnKeyType="done"
                      onSubmitEditing={handleRegister}
                    />

                    <TouchableOpacity
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      disabled={loading}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showConfirmPassword
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                    >
                      <Ionicons
                        name={
                          showConfirmPassword
                            ? 'eye-outline'
                            : 'eye-off-outline'
                        }
                        size={21}
                        color="#EAF3FF"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Role selection */}
                  <Text style={styles.label}>Select Your Role</Text>

                  <View style={styles.roleRow}>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected: role === 'student' }}
                      style={[
                        styles.roleChip,
                        role === 'student' && styles.roleChipActive,
                      ]}
                      onPress={() => setRole('student')}
                      disabled={loading}
                    >
                      <Ionicons
                        name="school-outline"
                        size={21}
                        color="#FFFFFF"
                      />
                      <Text style={styles.roleChipText}>Student</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected: role === 'teacher' }}
                      style={[
                        styles.roleChip,
                        role === 'teacher' && styles.roleChipActive,
                      ]}
                      onPress={() => setRole('teacher')}
                      disabled={loading}
                    >
                      <Ionicons
                        name="people-outline"
                        size={21}
                        color="#FFFFFF"
                      />
                      <Text style={styles.roleChipText}>Teacher</Text>
                    </Pressable>
                  </View>

                  {/* Teacher department */}
                  {role === 'teacher' && (
                    <>
                      <Text style={styles.label}>Department</Text>

                      <View style={styles.inputContainer}>
                        <Ionicons
                          name="business-outline"
                          size={20}
                          color="#EAF3FF"
                        />

                        <TextInput
                          style={styles.input}
                          value={department}
                          onChangeText={setDepartment}
                          placeholder="Enter your department"
                          placeholderTextColor="rgba(255,255,255,0.65)"
                          editable={!loading}
                          returnKeyType="next"
                        />
                      </View>
                    </>
                  )}

                  {/* Error message */}
                  {error && (
                    <View style={styles.errorContainer}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={19}
                        color="#FFD6D6"
                      />
                      <Text style={styles.error}>{error}</Text>
                    </View>
                  )}

                  {/* Register button */}
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      loading && styles.disabledButton,
                    ]}
                    onPress={handleRegister}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.primaryButtonText}>
                          Create Account
                        </Text>
                        <Ionicons
                          name="arrow-forward-outline"
                          size={21}
                          color="#FFFFFF"
                        />
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>QR-ATT</Text>
                    <View style={styles.divider} />
                  </View>

                  {/* Login link */}
                  <View style={styles.loginContainer}>
                    <Text style={styles.loginText}>
                      Already have an account?{' '}
                    </Text>

                    <Link href="/login" asChild>
                      <Text style={styles.loginLink}>Sign In</Text>
                    </Link>
                  </View>
                </>
              )}
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

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  // Background
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

  // Branding
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },

  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  qrBadge: {
    position: 'absolute',
    right: -7,
    bottom: -5,
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#EAF3FF',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandName: {
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },

  brandSubtitle: {
    marginTop: 5,
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },

  // Glass card
  glassCard: {
    width: '100%',
    paddingHorizontal: 21,
    paddingVertical: 25,
    borderRadius: 28,
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
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#FFFFFF',
    marginBottom: 7,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 14,
  },

  // Input fields
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 15,
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 13,
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Role selection
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },

  roleChip: {
    flex: 1,
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },

  roleChipActive: {
    backgroundColor: '#153F75',
    borderColor: '#BBD9FF',
  },

  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Errors
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 15,
  },

  error: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#FFD6D6',
  },

  // Primary button
  primaryButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#153F75',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    marginTop: 25,
    shadowColor: '#071C36',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },

  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  disabledButton: {
    opacity: 0.7,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 25,
    marginBottom: 21,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  dividerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.75)',
  },

  // Login link
  loginContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loginText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },

  loginLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },

  // Success screen
  successContainer: {
    alignItems: 'center',
    paddingVertical: 15,
  },

  successIcon: {
    width: 75,
    height: 75,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  // Footer
  footer: {
    textAlign: 'center',
    marginTop: 23,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.72)',
  },
});
