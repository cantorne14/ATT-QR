import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useRole } from '@/lib/auth';
import { getAdminUsers, type AdminUser } from '@/lib/admin';

type RoleFilter = 'all' | 'student' | 'teacher';

const FILTERS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'student', label: 'Students' },
  { key: 'teacher', label: 'Teachers' },
];

function initials(user: AdminUser) {
  const name = user.full_name?.trim();

  if (!name) {
    return user.email.slice(0, 2).toUpperCase();
  }

  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Admin only, read only. The list comes from the admin RLS policy on
 * `profiles`, so a student or teacher account sees no rows and no
 * action other than going back.
 */
export default function AdminUsersScreen() {
  const router = useRouter();
  const { role, roleLoading } = useRole();
  const admin = role === 'admin';

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RoleFilter>('all');

  const load = useCallback(async () => {
    if (!admin) {
      setLoading(false);
      return;
    }

    setError(null);

    try {
      const result = await getAdminUsers();
      setUsers(result.users);
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

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      if (filter !== 'all' && user.role !== filter) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        (user.full_name ?? '').toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    });
  }, [users, search, filter]);

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
            Only administrator accounts can manage users.
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
        <Text style={styles.headerTitle}>User Management</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={19} color="#EAF3FF" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email"
          placeholderTextColor="rgba(255,255,255,0.65)"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.filters}>
        {FILTERS.map((item) => (
          <Pressable
            key={item.key}
            style={[
              styles.filterChip,
              filter === item.key && styles.filterChipActive,
            ]}
            onPress={() => setFilter(item.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === item.key && styles.filterChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.subtitle}>Loading users...</Text>
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
      ) : (
        <FlatList
          data={visibleUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !loading && !error ? (
              <Text style={styles.countText}>
                {visibleUsers.length}{' '}
                {visibleUsers.length === 1 ? 'account' : 'accounts'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={38} color="#EAF3FF" />
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.subtitle}>
                {search.trim() || filter !== 'all'
                  ? 'No account matches your search or filter.'
                  : 'No student or teacher accounts are registered yet.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(item)}</Text>
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.full_name?.trim() || 'No name provided'}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>

              <View style={styles.roleBadge}>
                <Ionicons
                  name={item.role === 'teacher' ? 'school-outline' : 'person-outline'}
                  size={13}
                  color="#163D70"
                />
                <Text style={styles.roleBadgeText}>
                  {item.role === 'teacher' ? 'Teacher' : 'Student'}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      <Text style={styles.footer}>
        Viewing student and teacher accounts only.
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
    marginBottom: 18,
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

  searchContainer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: '#FFFFFF',
    paddingVertical: 12,
  },

  filters: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 14,
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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

  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 10,
  },

  list: {
    paddingBottom: 20,
    flexGrow: 1,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(225,239,255,0.19)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#163D70',
  },

  userInfo: {
    flex: 1,
    minWidth: 0,
  },

  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  userEmail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 3,
  },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#EAF3FF',
  },

  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#163D70',
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
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    paddingBottom: 16,
  },
});