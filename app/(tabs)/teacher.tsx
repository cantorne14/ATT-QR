import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { addDuration, createEvent } from '@/lib/events';
import { buildQRPayload } from '@/lib/qr';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import { getSubjects, type Subject } from '@/lib/subjects';


function toLocalISO(date: Date): string {
  return date.toISOString();
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const QUICK_END_OPTIONS = [
  { label: '+30 min', ms: 30 * 60 * 1000 },
  { label: '+1 hour', ms: 60 * 60 * 1000 },
  { label: '+2 hours', ms: 2 * 60 * 60 * 1000 },
];

const MAX_DURATION_MINUTES = 12 * 60;

type EditTarget = 'start' | 'end';

export default function TeacherScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000)
  );
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');
  const [durationHours, setDurationHours] = useState('1');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const isAndroid = Platform.OS === 'android';

  const durationInMinutes =
    (Number(durationHours) || 0) * 60 +
    (Number(durationMinutes) || 0);

  const classEnd = new Date(
    startDate.getTime() + durationInMinutes * 60 * 1000
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadRole() {
        if (!user) {
          if (active) {
            setRole(null);
            setSubjects([]);
            setRoleLoading(false);
          }
          return;
        }

        try {
          const profile = await getProfile(user.id);
          if (!active) return;

          setRole(profile?.role === 'teacher' ? 'teacher' : 'student');

          if (profile?.role === 'teacher') {
            const result = await getSubjects(user.id, 'teacher');
            if (active) setSubjects(result.subjects);
          } else {
            setSubjects([]);
          }
        } catch (error) {
          console.error('Could not load teacher profile:', error);
          if (active) setRole(null);
        } finally {
          if (active) setRoleLoading(false);
        }
      }

      setRoleLoading(true);
      loadRole();

      return () => {
        active = false;
      };
    }, [user])
  );

  const openPicker = (target: EditTarget) => {
    setMessage(null);
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editTarget) return;

    if (event.type === 'dismissed' || !selected) {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }

    const current = editTarget === 'start' ? startDate : endDate;
    const next = new Date(current);

    if (editingPart === 'date') {
      next.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate()
      );
    } else {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }

    if (editTarget === 'start') setStartDate(next);
    else setEndDate(next);

    if (isAndroid && editingPart === 'date') {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const handleQuickEnd = (ms: number) => {
    setMessage(null);
    setEndDate(new Date(startDate.getTime() + ms));
  };

  const handleDurationHours = (text: string) => {
    setMessage(null);
    setDurationHours(text.replace(/[^0-9]/g, '').slice(0, 2));
  };

  const handleDurationMinutes = (text: string) => {
    setMessage(null);
    const digits = text.replace(/[^0-9]/g, '').slice(0, 2);
    setDurationMinutes(Number(digits) > 59 ? '59' : digits);
  };

  const handleCreateEvent = async () => {
    setMessage(null);
    setPayload(null);

    if (!eventId.trim() || !title.trim()) {
      setMessage('Event title and code are required.');
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setMessage('End time must be after start time.');
      return;
    }

    if (durationInMinutes < 1) {
      setMessage('Class duration must be at least 1 minute.');
      return;
    }

    if (durationInMinutes > MAX_DURATION_MINUTES) {
      setMessage('Class duration cannot be longer than 12 hours.');
      return;
    }

    const event = {
      eventId: eventId.trim(),
      title: title.trim(),
      start: toLocalISO(startDate),
      end: toLocalISO(endDate),
      subjectId: selectedSubjectId,
      classEnd: classEnd.toISOString(),
    };

    try {
      const { error } = await createEvent(event);

      if (error) {
        console.error('CREATE EVENT ERROR:', error);
        setMessage(`Could not save the event: ${error}`);
        return;
      }

      setMessage('Event saved successfully! Scan the QR code to test it.');
      setPayload(buildQRPayload(event));
    } catch (error) {
      console.error('CREATE EVENT ERROR:', error);
      setMessage('Something went wrong while saving the event.');
    }
  };

  if (roleLoading || role !== 'teacher') {
    const loading = roleLoading;

    return (
      <View style={styles.container}>
        <View style={styles.backgroundCircleTop} />
        <View style={styles.backgroundCircleBottom} />
        <View style={styles.backgroundGlow} />

        <View style={styles.center}>
          <View style={styles.statusCard}>
            <View style={styles.logoBox}>
              <Ionicons
                name={loading ? 'hourglass-outline' : 'lock-closed-outline'}
                size={34}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.statusTitle}>
              {loading ? 'Checking your account...' : 'Teachers Only'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {loading
                ? 'Please wait while we verify your access.'
                : 'Only teacher accounts can create attendance events.'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backgroundCircleTop} />
      <View style={styles.backgroundCircleBottom} />
      <View style={styles.backgroundGlow} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="scan-outline" size={44} color="#FFFFFF" />
            <View style={styles.qrBadge}>
              <Ionicons name="qr-code-outline" size={21} color="#163D70" />
            </View>
          </View>
          <Text style={styles.brandName}>QR-ATT</Text>
          <Text style={styles.brandSubtitle}>TEACHER PORTAL</Text>
          <Text style={styles.headerSubtitle}>
            Create an event and generate its attendance QR code.
          </Text>
        </View>

        <View style={styles.glassCard}>
          <View style={styles.cardHeading}>
            <View style={styles.headingIcon}>
              <Ionicons name="calendar-outline" size={23} color="#FFFFFF" />
            </View>
            <View style={styles.headingText}>
              <Text style={styles.cardTitle}>Create Event</Text>
              <Text style={styles.cardSubtitle}>
                Enter your event details below.
              </Text>
            </View>
          </View>

          <Text style={styles.label}>EVENT TITLE</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="school-outline" size={20} color="#EAF3FF" />
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                setMessage(null);
              }}
              placeholder="e.g. Founders Day Assembly"
              placeholderTextColor="rgba(255,255,255,0.6)"
            />
          </View>

          <Text style={styles.label}>EVENT CODE</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="key-outline" size={20} color="#EAF3FF" />
            <TextInput
              style={styles.input}
              value={eventId}
              onChangeText={(value) => {
                setEventId(value);
                setMessage(null);
              }}
              placeholder="e.g. EVT-2026-0002"
              placeholderTextColor="rgba(255,255,255,0.6)"
              autoCapitalize="characters"
            />
          </View>

          <Text style={styles.label}>SUBJECT (OPTIONAL)</Text>
          <View style={styles.subjectOptions}>
            <Pressable
              style={[
                styles.subjectChip,
                selectedSubjectId === null && styles.subjectChipActive,
              ]}
              onPress={() => setSelectedSubjectId(null)}
            >
              <Ionicons
                name="apps-outline"
                size={16}
                color={selectedSubjectId === null ? '#FFFFFF' : '#EAF3FF'}
              />
              <Text
                style={[
                  styles.subjectChipText,
                  selectedSubjectId === null && styles.subjectChipTextActive,
                ]}
              >
                General event
              </Text>
            </Pressable>

            {subjects.map((subject) => (
              <Pressable
                key={subject.id}
                style={[
                  styles.subjectChip,
                  selectedSubjectId === subject.id && styles.subjectChipActive,
                ]}
                onPress={() => setSelectedSubjectId(subject.id)}
              >
                <Text
                  style={[
                    styles.subjectChipText,
                    selectedSubjectId === subject.id && styles.subjectChipTextActive,
                  ]}
                >
                  {subject.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionDivider} />
          <Text style={styles.sectionTitle}>Event Schedule</Text>

          <Text style={styles.label}>START DATE &amp; TIME</Text>
          <Pressable style={styles.dateButton} onPress={() => openPicker('start')}>
            <View style={styles.dateIcon}>
              <Ionicons name="calendar-outline" size={21} color="#FFFFFF" />
            </View>
            <View style={styles.dateTextContainer}>
              <Text style={styles.dateCaption}>Starts</Text>
              <Text style={styles.dateValue}>{formatDateTime(startDate)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color="#EAF3FF" />
          </Pressable>

          <Text style={styles.label}>END DATE &amp; TIME</Text>
          <Pressable style={styles.dateButton} onPress={() => openPicker('end')}>
            <View style={styles.dateIcon}>
              <Ionicons name="time-outline" size={21} color="#FFFFFF" />
            </View>
            <View style={styles.dateTextContainer}>
              <Text style={styles.dateCaption}>Ends</Text>
              <Text style={styles.dateValue}>{formatDateTime(endDate)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color="#EAF3FF" />
          </Pressable>

          {editTarget && (
            <View style={styles.pickerContainer}>
              {Platform.OS === 'ios' && (
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Choose {editingPart}</Text>
                  <Pressable
                    onPress={() => {
                      setEditTarget(null);
                      setEditingPart('date');
                    }}
                  >
                    <Text style={styles.doneText}>Done</Text>
                  </Pressable>
                </View>
              )}

              <DateTimePicker
                value={editTarget === 'start' ? startDate : endDate}
                mode={editingPart}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onPickerChange}
                minimumDate={editTarget === 'end' ? startDate : undefined}
              />

              {isAndroid && editingPart === 'time' && (
                <Pressable
                  style={styles.doneButton}
                  onPress={() => {
                    setEditTarget(null);
                    setEditingPart('date');
                  }}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </Pressable>
              )}
            </View>
          )}

          <Text style={styles.label}>QUICK END TIME</Text>
          <View style={styles.quickOptions}>
            {QUICK_END_OPTIONS.map((option) => (
              <Pressable
                key={option.label}
                style={styles.quickChip}
                onPress={() => handleQuickEnd(option.ms)}
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.quickChipText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionDivider} />
          <Text style={styles.sectionTitle}>Class Duration</Text>
          <Text style={styles.helperText}>
            Set how long the class lasts after its start time.
          </Text>

          <View style={styles.durationRow}>
            <View style={styles.durationField}>
              <Text style={styles.durationLabel}>HOURS</Text>
              <View style={styles.durationInputContainer}>
                <TextInput
                  style={styles.durationInput}
                  value={durationHours}
                  onChangeText={handleDurationHours}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="1"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                />
                <Text style={styles.durationUnit}>hr</Text>
              </View>
            </View>

            <View style={styles.durationField}>
              <Text style={styles.durationLabel}>MINUTES</Text>
              <View style={styles.durationInputContainer}>
                <TextInput
                  style={styles.durationInput}
                  value={durationMinutes}
                  onChangeText={handleDurationMinutes}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="30"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                />
                <Text style={styles.durationUnit}>min</Text>
              </View>
            </View>
          </View>

          <View style={styles.classEndBox}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#EAF3FF" />
            <View style={styles.classEndTextContainer}>
              <Text style={styles.classEndLabel}>Estimated class end</Text>
              <Text style={styles.classEndValue}>{formatDateTime(classEnd)}</Text>
            </View>
          </View>

          {message && (
            <View
              style={[
                styles.messageBox,
                message.startsWith('Event saved') && styles.successMessage,
              ]}
            >
              <Ionicons
                name={
                  message.startsWith('Event saved')
                    ? 'checkmark-circle'
                    : 'alert-circle-outline'
                }
                size={20}
                color={message.startsWith('Event saved') ? '#B8FFD0' : '#FFD6D6'}
              />
              <Text
                style={[
                  styles.messageText,
                  message.startsWith('Event saved') && styles.successMessageText,
                ]}
              >
                {message}
              </Text>
            </View>
          )}

          <Pressable style={styles.createButton} onPress={handleCreateEvent}>
            <Ionicons name="qr-code-outline" size={21} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Event &amp; Generate QR</Text>
            <Ionicons name="arrow-forward-outline" size={19} color="#FFFFFF" />
          </Pressable>
        </View>

        {payload && (
          <View style={styles.qrCard}>
            <View style={styles.qrHeader}>
              <View style={styles.qrSuccessIcon}>
                <Ionicons name="checkmark" size={21} color="#163D70" />
              </View>
              <View style={styles.qrHeaderText}>
                <Text style={styles.qrTitle}>QR Code Ready</Text>
                <Text style={styles.qrSubtitle}>Your event has been saved.</Text>
              </View>
            </View>

            <View style={styles.qrCodeContainer}>
              <QRCode value={payload} size={210} />
            </View>

            <Text style={styles.qrEventTitle}>{title}</Text>
            <Text style={styles.qrEventCode}>{eventId}</Text>
            <Text style={styles.qrInstructions}>
              Open the Scan tab and scan this QR code to test attendance.
            </Text>
          </View>
        )}

        <Text style={styles.footerText}>SCAN  •  ATTEND  •  TRACK</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#102F57',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
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
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 35,
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  statusCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 30,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    backgroundColor: 'rgba(225,239,255,0.19)',
  },
  statusTitle: {
    marginTop: 18,
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statusSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
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
  headerSubtitle: {
    maxWidth: 300,
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  glassCard: {
    width: '100%',
    paddingHorizontal: 22,
    paddingVertical: 25,
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
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 12,
  },
  headingIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  cardSubtitle: {
    marginTop: 5,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#FFFFFF',
    marginBottom: 9,
    marginTop: 18,
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
  subjectOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  subjectChipActive: {
    backgroundColor: '#153F75',
    borderColor: 'rgba(255,255,255,0.7)',
  },
  subjectChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EAF3FF',
  },
  subjectChipTextActive: {
    color: '#FFFFFF',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 27,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dateButton: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dateIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateTextContainer: {
    flex: 1,
  },
  dateCaption: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 5,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pickerContainer: {
    marginTop: 12,
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#EAF3FF',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#102F57',
  },
  doneText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#153F75',
  },
  doneButton: {
    marginTop: 8,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#153F75',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  quickOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
    lineHeight: 18,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  durationField: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  durationInputContainer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  durationInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingVertical: 10,
  },
  durationUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  classEndBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    gap: 10,
  },
  classEndTextContainer: {
    flex: 1,
  },
  classEndLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  classEndValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 13,
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(127,29,29,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,214,214,0.5)',
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: '#FFD6D6',
    fontWeight: '600',
  },
  successMessage: {
    backgroundColor: 'rgba(20,83,45,0.4)',
    borderColor: 'rgba(184,255,208,0.5)',
  },
  successMessageText: {
    color: '#B8FFD0',
  },
  createButton: {
    minHeight: 59,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    marginTop: 27,
    borderRadius: 17,
    backgroundColor: '#153F75',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    shadowColor: '#071C36',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  qrCard: {
    alignItems: 'center',
    marginTop: 22,
    padding: 22,
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
  qrHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  qrSuccessIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF3FF',
  },
  qrHeaderText: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  qrSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
  },
  qrEventTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
  },
  qrEventCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EAF3FF',
    marginTop: 6,
  },
  qrInstructions: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 14,
  },
  footerText: {
    marginTop: 25,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
});


