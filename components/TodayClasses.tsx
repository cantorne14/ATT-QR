import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { HOME_COLORS } from '@/constants/home';
import { useAuth } from '@/lib/auth';
import { getTodaysClasses, type TodayClass } from '@/lib/events';
import { getProfile, type Role } from '@/lib/profiles';

function formatTime(value: string | null) {
  if (!value) return 'Time not set';
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Home screen section listing today's classes.
 *
 * Students see only today's events linked to a subject they enrolled in.
 * Teachers see every event they created today.
 *
 * A class shows up as soon as it is saved, including before its start time,
 * and disappears once its Class End Time has passed. The card shows the
 * class end, falling back to the QR expiration time only for events that
 * were created before class durations existed.
 */
export default function TodayClasses() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [classes, setClasses] = useState<TodayClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const profile = await getProfile(user.id);
    const currentRole = profile?.role ?? 'student';
    setRole(currentRole);

    const result = await getTodaysClasses(user.id, currentRole);
    setClasses(result.classes);
    setError(result.error);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const showCount = !loading && !error && classes.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.heading}>Today's Classes</Text>
        {showCount && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {classes.length} {classes.length === 1 ? 'class' : 'classes'}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.muted}>Loading today's classes...</Text>
        </View>
      ) : error ? (
        <View style={styles.status}>
          <Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : classes.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No classes scheduled today</Text>
          <Text style={styles.muted}>
            {role === 'student'
              ? "Add subjects in the Subjects tab to see matching classes here. Enrollment is optional."
              : 'Classes you create for today will appear here.'}
          </Text>
        </View>
      ) : (
        classes.map((item) => {
          const classEnd = item.class_end_time ?? item.end_time;

          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.icon}>
                  <Ionicons name="book-outline" size={20} color={COLORS.primary} />
                </View>

                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.subjectPill}>
                    <Text style={styles.subjectText} numberOfLines={1}>
                      {item.subject_name ?? 'General event'}
                    </Text>
                  </View>
                </View>
              </View>

              {role === 'student' && !!item.teacher_name && (
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.teacher_name}
                  </Text>
                </View>
              )}

              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={14} color={HOME_COLORS.accentInk} />
                <Text style={styles.time}>
                  {formatTime(item.start_time)}
                  {classEnd ? ` - ${formatTime(classEnd)}` : ''}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: COLORS.textPrimary,
  },
  countBadge: {
    backgroundColor: HOME_COLORS.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: HOME_COLORS.accentInk,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  muted: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.danger,
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 26,
    paddingHorizontal: 20,
    backgroundColor: HOME_COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: HOME_COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: HOME_COLORS.card,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: HOME_COLORS.shadowOpacity,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: HOME_COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subjectPill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: HOME_COLORS.cardMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  time: {
    fontSize: 12,
    fontWeight: '700',
    color: HOME_COLORS.accentInk,
  },
});