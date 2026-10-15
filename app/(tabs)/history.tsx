import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';

import AppButton from '@/components/AppButton';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import { getEventQrPayload, type EventQrPayload } from '@/lib/events';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'unknown';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrEvent, setQrEvent] = useState<TeacherEventAttendance | null>(null);
  const [qrData, setQrData] = useState<EventQrPayload | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const profile = await getProfile(user.id);
    const currentRole = profile?.role ?? 'student';
    setRole(currentRole);

    if (currentRole === 'teacher') {
      const events = await getTeacherEventAttendance(user.id);
      setTeacherEvents(events);
      setStudentRecords([]);
    } else {
      const records = await getAttendanceHistory(user.id);
      setStudentRecords(records);
      setTeacherEvents([]);
    }

    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openQrCode = useCallback(
    async (item: TeacherEventAttendance) => {
      setQrEvent(item);
      setQrData(null);
      setQrLoading(true);

      if (!user) {
        setQrLoading(false);
        return;
      }

      const result = await getEventQrPayload(item.eventId, user.id);
      setQrData(result);
      setQrLoading(false);
    },
    [user]
  );

  const closeQrCode = useCallback(() => {
    setQrEvent(null);
    setQrData(null);
    setQrLoading(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <BackgroundDecorations />

        <View style={styles.loadingContent}>
          <View style={styles.loadingIcon}>
            <Ionicons name="time-outline" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Attendance History</Text>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.subtitle}>Loading records...</Text>
        </View>
      </View>
    );
  }

  // Teacher history
  if (role === 'teacher') {
    return (
      <View style={styles.container}>
        <BackgroundDecorations />

        <View style={styles.pageHeader}>
          <View style={styles.headerIcon}>
            <Ionicons name="calendar-outline" size={27} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>My Events</Text>
          <Text style={styles.pageSubtitle}>Attendance records for your events</Text>
        </View>

        {teacherEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="calendar-clear-outline"
              size={42}
              color="#EAF3FF"
            />
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.subtitle}>
              Create an event in the Events tab.
            </Text>
          </View>
        ) : (
          <FlatList
            data={teacherEvents}
            keyExtractor={(item) => item.eventId}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.eventIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={22}
                      color="#EAF3FF"
                    />
                  </View>

                  <View style={styles.eventHeading}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventMeta}>{item.eventCode}</Text>
                  </View>

                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{item.attendeeCount}</Text>
                  </View>
                </View>

                {item.startTime && (
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="play-circle-outline"
                      size={16}
                      color="#EAF3FF"
                    />
                    <Text style={styles.eventMeta}>
                      Start: {formatDate(item.startTime)}
                    </Text>
                  </View>
                )}

                {item.endTime && (
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="stop-circle-outline"
                      size={16}
                      color="#EAF3FF"
                    />
                    <Text style={styles.eventMeta}>
                      End: {formatDate(item.endTime)}
                    </Text>
                  </View>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.qrButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => openQrCode(item)}
                >
                  <Ionicons name="qr-code-outline" size={19} color="#163D70" />
                  <Text style={styles.qrButtonText}>View QR Code</Text>
                  <Ionicons
                    name="arrow-forward-outline"
                    size={18}
                    color="#163D70"
                  />
                </Pressable>

                <View style={styles.attendeesSection}>
                  <View style={styles.sectionHeading}>
                    <Ionicons
                      name="people-outline"
                      size={19}
                      color="#FFFFFF"
                    />
                    <Text style={styles.sectionTitle}>Attendees</Text>
                    <Text style={styles.attendeeTotal}>
                      {item.attendees.length}
                    </Text>
                  </View>

                  {item.attendees.length === 0 ? (
                    <Text style={styles.emptyAttendees}>No scans yet.</Text>
                  ) : (
                    <View style={styles.attendeeList}>
                      {item.attendees.map((a) => (
                        <View
                          key={`${item.eventId}-${a.studentId}`}
                          style={styles.attendeeRow}
                        >
                          <View style={styles.studentIcon}>
                            <Ionicons
                              name="person-outline"
                              size={16}
                              color="#EAF3FF"
                            />
                          </View>

                          <View style={styles.attendeeInfo}>
                            <Text style={styles.attendeeId}>
                              {(a as any).studentName ?? shortId(a.studentId)}
                            </Text>
                            <Text style={styles.attendeeTime}>
                              {formatDate(a.scannedAt)}
                            </Text>
                          </View>

                          <Ionicons
                            name="checkmark-circle"
                            size={19}
                            color="#C8E6FF"
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}
          />
        )}

        <Modal
          visible={qrEvent !== null}
          transparent
          animationType="fade"
          onRequestClose={closeQrCode}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeQrCode}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalIcon}>
                <Ionicons name="qr-code-outline" size={30} color="#FFFFFF" />
              </View>

              <Text style={styles.modalTitle}>
                {qrEvent?.title ?? 'Event QR Code'}
              </Text>
              <Text style={styles.modalMeta}>{qrEvent?.eventCode}</Text>

              {qrLoading ? (
                <View style={styles.modalBody}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.modalHint}>Loading QR code...</Text>
                </View>
              ) : qrData ? (
                <>
                  <View style={styles.qrBox}>
                    <QRCode value={qrData.payload} size={220} />
                  </View>
                  <Text style={styles.modalHint}>
                    {qrData.persisted
                      ? 'Students scan this code with the Scan tab.'
                      : 'Rebuilt from this event (created before QR codes were saved).'}
                  </Text>
                </>
              ) : (
                <View style={styles.modalBody}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={28}
                    color="#FFD6D6"
                  />
                  <Text style={styles.modalError}>
                    This QR code is not available.
                  </Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={closeQrCode}
              >
                <Ionicons name="close-outline" size={20} color="#FFFFFF" />
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  // Student history
  return (
    <View style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.pageHeader}>
        <View style={styles.headerIcon}>
          <Ionicons name="time-outline" size={27} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Attendance History</Text>
        <Text style={styles.pageSubtitle}>
          Keep track of your attendance
        </Text>
      </View>

      {studentRecords.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="document-text-outline"
            size={42}
            color="#EAF3FF"
          />
          <Text style={styles.emptyTitle}>No records yet</Text>
          <Text style={styles.subtitle}>
            Scan a QR code to register your attendance.
          </Text>
        </View>
      ) : (
        <FlatList
          data={studentRecords}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.studentCardHeader}>
                <View style={styles.eventIcon}>
                  <Ionicons
                    name="checkmark-done-outline"
                    size={23}
                    color="#EAF3FF"
                  />
                </View>

                <View style={styles.eventHeading}>
                  <Text style={styles.eventTitle}>{item.eventTitle}</Text>
                  <Text style={styles.eventMeta}>Attendance recorded</Text>
                </View>

                <View style={styles.completedBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color="#EAF3FF"
                  />
                </View>
              </View>

              <View style={styles.recordDivider} />

              <View style={styles.recordDetail}>
                <Ionicons
                  name="key-outline"
                  size={17}
                  color="#EAF3FF"
                />
                <Text style={styles.eventMeta}>{item.eventId}</Text>
              </View>

              <View style={styles.recordDetail}>
                <Ionicons
                  name="time-outline"
                  size={17}
                  color="#EAF3FF"
                />
                <Text style={styles.eventMeta}>{formatDate(item.scannedAt)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function BackgroundDecorations() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.backgroundCircleTop} />
      <View style={styles.backgroundCircleBottom} />
      <View style={styles.backgroundGlow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#102F57',
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // Same decorative background as Login
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

  pageHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },

  headerIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  title: {
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },

  pageSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 10,
  },

  list: {
    paddingBottom: 30,
  },

  // Frosted-glass cards based on Login
  card: {
    backgroundColor: 'rgba(225,239,255,0.19)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  studentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  eventIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  eventHeading: {
    flex: 1,
    minWidth: 0,
  },

  eventTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },

  eventMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
    lineHeight: 18,
    flexShrink: 1,
  },

  countBadge: {
    backgroundColor: '#EAF3FF',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countText: {
    color: '#163D70',
    fontSize: 14,
    fontWeight: '800',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 5,
  },

  qrButton: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },

  qrButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#163D70',
    flex: 1,
  },

  buttonPressed: {
    opacity: 0.7,
  },

  attendeesSection: {
    marginTop: 20,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 10,
  },

  sectionTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  attendeeTotal: {
    color: '#163D70',
    backgroundColor: '#EAF3FF',
    overflow: 'hidden',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: '800',
  },

  attendeeList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    paddingTop: 8,
  },

  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 10,
  },

  studentIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  attendeeInfo: {
    flex: 1,
    minWidth: 0,
  },

  attendeeId: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  attendeeTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },

  emptyAttendees: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
    fontStyle: 'italic',
  },

  emptyCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    backgroundColor: 'rgba(225,239,255,0.19)',
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 15,
  },

  completedBadge: {
    marginLeft: 8,
  },

  recordDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 16,
  },

  recordDetail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
  },

  // QR modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7,28,54,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  modalCard: {
    width: '100%',
    backgroundColor: '#21466F',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },

  modalIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  modalMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
    marginBottom: 20,
  },

  modalBody: {
    paddingVertical: 24,
    alignItems: 'center',
  },

  modalError: {
    fontSize: 14,
    color: '#FFD6D6',
    textAlign: 'center',
    marginTop: 8,
  },

  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 8,
    lineHeight: 18,
  },

  closeButton: {
    width: '100%',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#153F75',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 17,
    marginTop: 18,
  },

  closeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});