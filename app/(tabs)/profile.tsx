
import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const p = await getProfile(user.id);
    setProfile(p);
    setDraftName(p?.full_name ?? '');
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await updateProfile(user.id, {
      full_name: draftName.trim(),
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      setProfile((prev) =>
        prev ? { ...prev, full_name: draftName.trim() } : prev
      );
      setEditing(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      router.replace('/login');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screenBackground}>
      {/* Decorative background matching Login and Subjects */}
      <View style={styles.backgroundCircleTop} />
      <View style={styles.backgroundCircleBottom} />
      <View style={styles.backgroundGlow} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* QR-ATT Branding */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons
              name="person-outline"
              size={44}
              color="#FFFFFF"
            />
            <View style={styles.qrBadge}>
              <Ionicons
                name="qr-code-outline"
                size={20}
                color="#163D70"
              />
            </View>
          </View>

          <Text style={styles.brandName}>QR-ATT</Text>
          <Text style={styles.brandSubtitle}>
            ATTENDANCE MADE EASY
          </Text>
        </View>

        {/* Profile Card */}
        <View style={styles.glassCard}>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>
            Manage your account information
          </Text>

          {/* Role Badge */}
          {profile?.role === 'teacher' ? (
            <View style={styles.roleBadge}>
              <Ionicons
                name="school-outline"
                size={16}
                color="#163D70"
              />
              <Text style={styles.roleBadgeText}>Teacher</Text>
            </View>
          ) : (
            <View style={[styles.roleBadge, styles.roleBadgeStudent]}>
              <Ionicons
                name="person-outline"
                size={16}
                color="#163D70"
              />
              <Text style={styles.roleBadgeText}>Student</Text>
            </View>
          )}

          {user && (
            <View>
              {/* Full Name */}
              <Text style={styles.label}>Full Name</Text>

              {editing ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder="Enter your name"
                    placeholderTextColor="rgba(255,255,255,0.65)"
                    editable={!saving}
                  />

                  <Pressable
                    style={[
                      styles.saveButton,
                      saving && styles.disabledButton,
                    ]}
                    onPress={handleSaveName}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setEditing(true)}
                  style={styles.nameRow}
                >
                  <Text style={styles.value}>
                    {profile?.full_name || 'Tap to add your name'}
                  </Text>

                  <View style={styles.editAction}>
                    <Ionicons
                      name="create-outline"
                      size={17}
                      color="#EAF3FF"
                    />
                    <Text style={styles.editHint}>Edit</Text>
                  </View>
                </Pressable>
              )}

              <View style={styles.divider} />

              {/* Email */}
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#163D70"
                  />
                </View>
                <Text style={styles.value}>{user.email}</Text>
              </View>

              {/* Role */}
              <Text style={styles.label}>Role</Text>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#163D70"
                  />
                </View>
                <Text style={styles.value}>
                  {profile?.role ?? 'student'}
                </Text>
              </View>

              {/* User ID */}
              <Text style={styles.label}>User ID</Text>
              <View style={styles.userIdBox}>
                <Ionicons
                  name="finger-print-outline"
                  size={19}
                  color="#EAF3FF"
                />
                <Text style={styles.valueSmall}>{user.id}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Sign Out */}
        <View style={styles.signOutContainer}>
          <AppButton
            title={loading ? 'Signing Out...' : 'Sign Out'}
            icon="log-out-outline"
            onPress={handleSignOut}
            disabled={loading}
          />
        </View>

        <Text style={styles.footer}>
          Scan  •  Attend  •  Track
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenBackground: {
    flex: 1,
    backgroundColor: '#102F57',
    overflow: 'hidden',
  },

  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 30,
  },

  // Decorative background copied from Login
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

  // Glass card
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
    marginBottom: 20,
  },

  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#EAF3FF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },

  roleBadgeStudent: {
    backgroundColor: '#EAF3FF',
  },

  roleBadgeText: {
    color: '#163D70',
    fontSize: 12,
    fontWeight: '800',
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 9,
    marginTop: 17,
  },

  value: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },

  editAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  editHint: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },

  nameInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },

  saveButton: {
    minHeight: 52,
    backgroundColor: '#153F75',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingHorizontal: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#071C36',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  disabledButton: {
    opacity: 0.7,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginTop: 22,
    marginBottom: 8,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  userIdBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  valueSmall: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: '#FFFFFF',
  },

  signOutContainer: {
    marginTop: 24,
  },

  footer: {
    textAlign: 'center',
    marginTop: 25,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.72)',
  },
});
