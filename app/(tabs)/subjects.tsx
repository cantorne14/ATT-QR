
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import {
  createSubject,
  enrollInSubject,
  getSubjects,
  saveTeacherDepartment,
  unenrollFromSubject,
  type Subject,
} from '@/lib/subjects';

export default function SubjectsScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [department, setDepartment] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const isTeacher = role === 'teacher';

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const profile = await getProfile(user.id);
    const currentRole = profile?.role ?? 'student';
    setRole(currentRole);
    setDepartment(profile?.department ?? '');

    const result = await getSubjects(user.id, currentRole);
    setSubjects(result.subjects);
    if (result.error) {
      setMessage(result.error);
    }

    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSaveDepartment = async () => {
    if (!user) return;
    if (!department.trim()) {
      setMessage('Enter your department first.');
      return;
    }

    setSaving(true);
    setMessage('');

    const { error } = await saveTeacherDepartment(user.id, department);
    setMessage(error ?? 'Department saved.');
    setSaving(false);
  };

  const handleCreateSubject = async () => {
    if (!subjectName.trim() || !department.trim()) {
      setMessage('Enter your department and subject name.');
      return;
    }

    setSaving(true);
    setMessage('');

    const { error } = await createSubject({
      name: subjectName,
      department,
      subject_code: subjectCode,
    });

    if (error) {
      setMessage(error);
    } else {
      setSubjectName('');
      setSubjectCode('');
      setMessage('Subject added successfully.');
      await load();
    }

    setSaving(false);
  };

  const handleEnrollment = async (subject: Subject) => {
    if (!user) return;

    setSaving(true);
    setMessage('');

    const { error } = subject.enrolled
      ? await unenrollFromSubject(subject.id, user.id)
      : await enrollInSubject(subject.id, user.id);

    setMessage(
      error ??
        (subject.enrolled
          ? 'Subject removed from your list.'
          : 'You are now enrolled in this subject.')
    );

    await load();
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.backgroundCircleTop} />
        <View style={styles.backgroundCircleBottom} />
        <View style={styles.backgroundGlow} />

        <ActivityIndicator color="#EAF3FF" />
        <Text style={styles.muted}>Loading subjects...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <View style={styles.backgroundCircleTop} />
        <View style={styles.backgroundCircleBottom} />
        <View style={styles.backgroundGlow} />

        <Text style={styles.title}>Sign in required</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenBackground}>
      {/* Same decorative background as Login */}
      <View style={styles.backgroundCircleTop} />
      <View style={styles.backgroundCircleBottom} />
      <View style={styles.backgroundGlow} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Screen heading */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons
              name="book-outline"
              size={42}
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

        <View style={styles.glassCard}>
          <Text style={styles.title}>
            {isTeacher ? 'My Subjects' : 'Subjects'}
          </Text>

          <Text style={styles.subtitle}>
            {isTeacher
              ? 'Set your department and add the subjects you teach.'
              : 'Browse subjects and optionally add the classes you attend. You can still use the rest of the app without enrolling.'}
          </Text>

          {isTeacher && (
            <View>
              <Text style={styles.sectionTitle}>Teacher details</Text>

              <Text style={styles.label}>Department</Text>
              <TextInput
                style={styles.input}
                value={department}
                onChangeText={setDepartment}
                placeholder="e.g. College of Computer Studies"
                placeholderTextColor="rgba(255,255,255,0.65)"
                editable={!saving}
              />

              <AppButton
                theme="primary"
                title={saving ? 'Saving...' : 'Save Department'}
                icon="save-outline"
                onPress={handleSaveDepartment}
                disabled={saving}
              />

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Add a subject</Text>

              <Text style={styles.label}>Subject name</Text>
              <TextInput
                style={styles.input}
                value={subjectName}
                onChangeText={setSubjectName}
                placeholder="e.g. Systems Analysis and Design"
                placeholderTextColor="rgba(255,255,255,0.65)"
                editable={!saving}
              />

              <Text style={styles.label}>Subject code (optional)</Text>
              <TextInput
                style={styles.input}
                value={subjectCode}
                onChangeText={setSubjectCode}
                placeholder="e.g. SAD-201"
                placeholderTextColor="rgba(255,255,255,0.65)"
                autoCapitalize="characters"
                editable={!saving}
              />

              <AppButton
                theme="primary"
                title={saving ? 'Saving...' : 'Add Subject'}
                icon="add-circle-outline"
                onPress={handleCreateSubject}
                disabled={saving}
              />
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>
          {isTeacher ? 'Subjects you teach' : 'Available subjects'}
        </Text>

        {subjects.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.subjectIcon}>
              <Ionicons
                name="book-outline"
                size={25}
                color="#163D70"
              />
            </View>

            <Text style={styles.emptyTitle}>No subjects yet</Text>

            <Text style={styles.muted}>
              {isTeacher
                ? 'Add your first subject above.'
                : 'Your teachers have not added subjects yet. You can continue using Home, Scan, History, and Profile.'}
            </Text>
          </View>
        ) : (
          subjects.map((subject) => (
            <View key={subject.id} style={styles.subjectCard}>
              <View style={styles.subjectIcon}>
                <Ionicons
                  name="book"
                  size={21}
                  color="#163D70"
                />
              </View>

              <View style={styles.subjectInfo}>
                <Text style={styles.subjectName}>
                  {subject.name}
                </Text>

                {!!subject.subject_code && (
                  <Text style={styles.meta}>
                    Code: {subject.subject_code}
                  </Text>
                )}

                <Text style={styles.meta}>
                  {subject.department}
                </Text>

                {!isTeacher && (
                  <Text style={styles.meta}>
                    Teacher: {subject.teacher_name || 'Teacher'}
                  </Text>
                )}
              </View>

              {!isTeacher && (
                <Pressable
                  disabled={saving}
                  onPress={() => handleEnrollment(subject)}
                  style={[
                    styles.enrollButton,
                    subject.enrolled && styles.enrolledButton,
                  ]}
                >
                  <Text
                    style={[
                      styles.enrollText,
                      subject.enrolled && styles.enrolledText,
                    ]}
                  >
                    {subject.enrolled ? 'Added' : 'Add'}
                  </Text>
                </Pressable>
              )}
            </View>
          ))
        )}

        {!!message && (
          <Text style={styles.message}>{message}</Text>
        )}

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

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#102F57',
    padding: 24,
    overflow: 'hidden',
  },

  // Background decorations copied from Login
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

  // Branding inspired by Login
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

  // Glass card matching Login
  glassCard: {
    width: '100%',
    paddingHorizontal: 23,
    paddingVertical: 29,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    backgroundColor: 'rgba(225,239,255,0.19)',
    marginBottom: 24,
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

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    marginTop: 8,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 9,
    marginTop: 17,
  },

  input: {
    minHeight: 57,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 16,
    marginBottom: 10,
    fontSize: 14,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginVertical: 22,
  },

  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(225,239,255,0.19)',
    borderRadius: 22,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },

  subjectIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  subjectInfo: {
    flex: 1,
    minWidth: 0,
  },

  subjectName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 5,
  },

  meta: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  muted: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
  },

  enrollButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#153F75',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },

  enrolledButton: {
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#EAF3FF',
  },

  enrollText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  enrolledText: {
    color: '#153F75',
  },

  empty: {
    alignItems: 'center',
    backgroundColor: 'rgba(225,239,255,0.19)',
    borderRadius: 30,
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },

  emptyTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 12,
  },

  message: {
    marginTop: 14,
    color: '#FFD6D6',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    padding: 13,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
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
