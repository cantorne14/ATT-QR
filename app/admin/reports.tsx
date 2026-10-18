import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRole } from '@/lib/auth';
import {
  getGeneralEventAttendanceReport,
  type GeneralEventReport,
} from '@/lib/admin';

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function formatSchedule(iso: string | null) {
  if (!iso) return null;

  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateOnly(date: Date | null) {
  if (!date) return 'Any date';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Admin only, general school events only.
 *
 * Every number comes from `get_general_event_attendance_report`,
 * which filters on `events.subject_id is null`, so subject and
 * teacher-managed class attendance cannot appear here. The unfiltered
 * total is the same value the dashboard shows as "Event Attendance".
 */
export default function AdminReportsScreen() {
  const router = useRouter();
  const { role, roleLoading } = useRole();
  const admin = role === 'admin';

  const [report, setReport] = useState<GeneralEventReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const fromIso = from ? startOfDay(from).toISOString() : null;
  const toIso = to ? endOfDay(to).toISOString() : null;

  const load = useCallback(
    async (nextFrom: string | null, nextTo: string | null) => {
      if (!admin) {
        setLoading(false);
        return;
      }

      setError(null);

      try {
        const result = await getGeneralEventAttendanceReport(nextFrom, nextTo);
        setReport(result.report);
        setError(result.error);
      } finally {
        setLoading(false);
      }
    },
    [admin]
  );

  // Refetches on first view, when the screen regains focus, and
  // whenever the date range changes.
  useFocusEffect(
    useCallback(() => {
      load(fromIso, toIso);
    }, [load, fromIso, toIso])
  );

  const visibleEvents = useMemo(() => {
    const events = report?.events ?? [];

    if (!selectedEventId) {
      return events;
    }

    return events.filter((item) => item.eventId === selectedEventId);
  }, [report, selectedEventId]);

  const onDateChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (pickerTarget !== 'from' && pickerTarget !== 'to') {
      return;
    }

    const target = pickerTarget;

    if (event.type === 'dismissed' || !selected) {
      if (Platform.OS === 'android') {
        setPickerTarget(null);
      }
      return;
    }

    if (target === 'from') {
      if (to && endOfDay(selected) < startOfDay(to)) {
        setMessage('The start date must be on or before the end date.');
        setPickerTarget(null);
        return;
      }

      setMessage(null);
      setFrom(selected);
    } else {
      if (from && startOfDay(selected) > endOfDay(from)) {
        setMessage('The end date must be on or after the start date.');
        setPickerTarget(null);
        return;
      }

      setMessage(null);
      setTo(selected);
    }

    if (Platform.OS === 'android') {
      setPickerTarget(null);
    }
  };

  const clearRange = () => {
    setMessage(null);
    setFrom(null);
    setTo(null);
  };

  if (roleLoading) {
    return (
      <View style={styles.container}>
        <BackgroundDecorations />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.subtitle}>Checking your account...</Text>
        </View>
      </View>
    );
  }

  if (!admin) {
    return (
      <View style={styles.container}>
        <BackgroundDecorations />
        <View style={styles.loadingContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="lock-closed-outline" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Admins Only</Text>
          <Text style={styles.subtitle}>
            Only administrator accounts can view these reports.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back-outline" size={18} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const hasRecords = (report?.events.length ?? 0) > 0;

  return (
    <View style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backIcon, pressed && styles.pressed]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back-outline" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Attendance Reports</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        <Pressable
          style={({ pressed }) => [
            styles.dateChip,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            setMessage(null);
            setPickerTarget('from');
          }}
        >
          <Ionicons name="calendar-outline" size={15} color="#163D70" />
          <Text style={styles.dateChipText}>From: {formatDateOnly(from)}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.dateChip,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            setMessage(null);
            setPickerTarget('to');
          }}
        >
          <Ionicons name="calendar-outline" size={15} color="#163D70" />
          <Text style={styles.dateChipText}>To: {formatDateOnly(to)}</Text>
        </Pressable>

        {(from || to) && (
          <Pressable
            style={({ pressed }) => [
              styles.dateChip,
              styles.clearChip,
              pressed && styles.pressed,
            ]}
            onPress={clearRange}
          >
            <Ionicons name="close-circle-outline" size={15} color="#EAF3FF" />
            <Text style={styles.clearChipText}>Clear</Text>
          </Pressable>
        )}
      </ScrollView>

      {pickerTarget && (
        <View style={styles.pickerContainer}>
          {Platform.OS === 'ios' && (
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {pickerTarget === 'from' ? 'From date' : 'To date'}
              </Text>
              <Pressable onPress={() => setPickerTarget(null)}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
          )}

          <DateTimePicker
            value={
              pickerTarget === 'from' ? from ?? new Date() : to ?? new Date()
            }
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
          />
        </View>
      )}

      {message && (
        <View style={styles.warnBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#FFE3B3" />
          <Text style={styles.warnText}>{message}</Text>
        </View>
      )}

      <FlatList
        data={visibleEvents}
        keyExtractor={(item) => item.eventId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryIcon}>
                  <Ionicons
                    name="checkmark-done-outline"
                    size={22}
                    color="#163D70"
                  />
                </View>
                <View style={styles.summaryText}>
                  <Text style={styles.summaryValue}>
                    {report?.totalRecords ?? 0}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    General event attendance records
                    {from || to ? ' in the selected dates' : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="calendar-outline" size={22} color="#163D70" />
                </View>
                <View style={styles.summaryText}>
                  <Text style={styles.summaryValue}>
                    {report?.events.length ?? 0}
                  </Text>
                  <Text style={styles.summaryLabel}>
                    General events with attendance
                  </Text>
                </View>
              </View>
            </View>

            {hasRecords && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chipRow}
              >
                <Pressable
                  style={[
                    styles.filterChip,
                    selectedEventId === null && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedEventId(null)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedEventId === null && styles.filterChipTextActive,
                    ]}
                  >
                    All events
                  </Text>
                </Pressable>

                {(report?.events ?? []).map((item) => (
                  <Pressable
                    key={item.eventId}
                    style={[
                      styles.filterChip,
                      selectedEventId === item.eventId &&
                        styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedEventId(item.eventId)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedEventId === item.eventId &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {item.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {loading && !report ? (
              <View style={styles.loadingInline}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.subtitle}>Loading report...</Text>
              </View>
            ) : error ? (
              <View style={styles.messageBox}>
                <Ionicons name="alert-circle-outline" size={20} color="#FFD6D6" />
                <Text style={styles.messageText}>{error}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => load(fromIso, toIso)}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyCard}>
              <Ionicons name="clipboard-outline" size={38} color="#EAF3FF" />
              <Text style={styles.emptyTitle}>
                {selectedEventId
                  ? 'No records for the selected event'
                  : from || to
                    ? 'No records in this date range'
                    : 'No general event attendance yet'}
              </Text>
              <Text style={styles.subtitle}>
                Attendance records appear here once students scan the QR code
                of a general school event.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="flag-outline" size={20} color="#163D70" />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{item.records}</Text>
              </View>
            </View>

            {item.startTime ? (
              <View style={styles.metaRow}>
                <Ionicons name="play-circle-outline" size={15} color="#EAF3FF" />
                <Text style={styles.metaText}>
                  Start: {formatSchedule(item.startTime)}
                </Text>
              </View>
            ) : null}

            {item.endTime ? (
              <View style={styles.metaRow}>
                <Ionicons name="stop-circle-outline" size={15} color="#EAF3FF" />
                <Text style={styles.metaText}>
                  End: {formatSchedule(item.endTime)}
                </Text>
              </View>
            ) : null}

            {!item.startTime && !item.endTime && (
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={15} color="#EAF3FF" />
                <Text style={styles.metaText}>Schedule not set</Text>
              </View>
            )}
          </View>
        )}
      />

      <Text style={styles.footer}>
        General school events only. Subject and class attendance is managed
        by teachers and is not included here.
      </Text>
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
    paddingTop: 20,
  },

  // Same decorative background as the Admin dashboard
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },

  backIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
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
    paddingVertical: 40,
  },

  loadingInline: {
    alignItems: 'center',
    paddingVertical: 30,
  },

  chipScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },

  chipRow: {
    gap: 8,
    paddingRight: 8,
    paddingVertical: 2,
  },

  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },

  dateChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#163D70',
  },

  clearChip: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.4)',
  },

  clearChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EAF3FF',
  },

  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },

  filterChipActive: {
    backgroundColor: '#153F75',
    borderColor: 'rgba(255,255,255,0.7)',
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EAF3FF',
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  pickerContainer: {
    marginBottom: 12,
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

  list: {
    paddingBottom: 16,
    flexGrow: 1,
  },

  summaryCard: {
    backgroundColor: 'rgba(225,239,255,0.19)',
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 14,
  },

  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryText: {
    flex: 1,
    minWidth: 0,
  },

  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#FFFFFF',
  },

  summaryLabel: {
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  card: {
    backgroundColor: 'rgba(225,239,255,0.19)',
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  countBadge: {
    minWidth: 40,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: '#EAF3FF',
  },

  countText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#163D70',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },

  metaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.8)',
  },

  emptyCard: {
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 30,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    backgroundColor: 'rgba(225,239,255,0.19)',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
  },

  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(127,29,29,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,214,214,0.5)',
  },

  messageText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 19,
    color: '#FFD6D6',
    fontWeight: '600',
  },

  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(127,84,29,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,227,179,0.45)',
  },

  warnText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#FFE3B3',
    fontWeight: '600',
  },

  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },

  backButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.7,
  },

  footer: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    paddingBottom: 16,
  },
});