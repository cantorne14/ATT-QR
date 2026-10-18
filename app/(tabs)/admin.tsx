import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRole } from '@/lib/auth';
import { getAdminDashboardStats, type AdminDashboardStats } from '@/lib/admin';

type StatCard = {
  key: keyof AdminDashboardStats;
  label: string;
  caption: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const CARDS: StatCard[] = [
  {
    key: 'students',
    label: 'Total Students',
    caption: 'Registered student accounts',
    icon: 'school-outline',
  },
  {
    key: 'teachers',
    label: 'Total Teachers',
    caption: 'Registered teacher accounts',
    icon: 'briefcase-outline',
  },
  {
    key: 'generalEvents',
    label: 'Total Events',
    caption: 'General school events only',
    icon: 'calendar-outline',
  },
  {
    key: 'generalEventAttendance',
    label: 'Event Attendance',
    caption: 'Records from general events',
    icon: 'checkmark-done-outline',
  },
];

export default function AdminScreen() {
  const router = useRouter();
  const { role, roleLoading } = useRole();
  const admin = role === 'admin';

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!admin) {
      setLoading(false);
      return;
    }

    setError(null);

    try {
      const result = await getAdminDashboardStats();
      setStats(result.stats);
      setError(result.error);
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // The tab is hidden for everyone else and the database refuses the
  // query too, so this only covers a direct navigation attempt.
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
            This dashboard is available to administrator accounts.
          </Text>
        </View>
      </View>
    );
  }

  const isEmpty =
    !!stats &&
    CARDS.every((card) => (stats[card.key] ?? 0) === 0);

  return (
    <View style={styles.container}>
      <BackgroundDecorations />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && stats !== null}
            onRefresh={load}
            tintColor="#FFFFFF"
            colors={['#FFFFFF']}
          />
        }
      >
        <View style={styles.pageHeader}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark-outline" size={27} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>General school event overview</Text>
        </View>

        {loading && !stats ? (
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.subtitle}>Loading dashboard...</Text>
          </View>
        ) : error ? (
          <View style={styles.messageBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#FFD6D6" />
            <Text style={styles.messageText}>{error}</Text>
            <Pressable
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
              onPress={load}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyCard}>
            <Ionicons name="school-outline" size={38} color="#EAF3FF" />
            <Text style={styles.emptyTitle}>Nothing to show yet</Text>
            <Text style={styles.subtitle}>
              Students, teachers and general school events will appear here
              once they are registered.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {CARDS.map((card) => (
              <View key={card.key} style={styles.card}>
                <View style={styles.cardIcon}>
                  <Ionicons name={card.icon} size={22} color="#163D70" />
                </View>
                <Text style={styles.cardValue}>{stats?.[card.key] ?? 0}</Text>
                <Text style={styles.cardLabel}>{card.label}</Text>
                <Text style={styles.cardCaption}>{card.caption}</Text>
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          onPress={() => router.push('/admin/users')}
        >
          <View style={styles.navButtonIcon}>
            <Ionicons name="people-outline" size={21} color="#163D70" />
          </View>
          <View style={styles.navButtonText}>
            <Text style={styles.navButtonLabel}>User Management</Text>
            <Text style={styles.navButtonCaption}>
              View registered students and teachers
            </Text>
          </View>
          <Ionicons name="arrow-forward-outline" size={19} color="#163D70" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          onPress={() => router.push('/admin/reports')}
        >
          <View style={styles.navButtonIcon}>
            <Ionicons name="clipboard-outline" size={21} color="#163D70" />
          </View>
          <View style={styles.navButtonText}>
            <Text style={styles.navButtonLabel}>Attendance Reports</Text>
            <Text style={styles.navButtonCaption}>
              General school event summaries
            </Text>
          </View>
          <Ionicons name="arrow-forward-outline" size={19} color="#163D70" />
        </Pressable>

        <Text style={styles.footer}>
          Subject and class attendance is managed by teachers and is not
          included here.
        </Text>
      </ScrollView>
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
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
  },

  // Same decorative background as History and Profile
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

  title: {
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },

  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  card: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: 'rgba(225,239,255,0.19)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },

  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  cardValue: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    color: '#FFFFFF',
  },

  cardLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },

  cardCaption: {
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },

  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 9,
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

  pressed: {
    opacity: 0.7,
  },

  emptyCard: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 28,
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

  footer: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 22,
  },

  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 15,
    borderRadius: 22,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },

  navButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navButtonText: {
    flex: 1,
    minWidth: 0,
  },

  navButtonLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#163D70',
  },

  navButtonCaption: {
    fontSize: 11,
    color: 'rgba(22,61,112,0.8)',
    marginTop: 3,
  },
});