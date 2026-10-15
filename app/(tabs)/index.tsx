import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Header from '@/components/Header';
import TodayClasses from '@/components/TodayClasses';
import { COLORS } from '@/constants/colors';
import { useRole } from '@/lib/auth';

export default function Index() {
  const { role } = useRole();
  const insets = useSafeAreaInsets();
  const teacher = role === 'teacher';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.backgroundCircleTop} />
      <View style={styles.backgroundCircleBottom} />
      <View style={styles.backgroundGlow} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <View style={styles.logoBox}>
            <View style={styles.qrBadge}>
              <Ionicons name="qr-code-outline" size={38} color="#163D70" />
            </View>
          </View>

          <Text style={styles.brandName}>QR ATTENDANCE</Text>
          <Text style={styles.brandSubtitle}>SCAN • ATTEND • TRACK</Text>

          <View style={styles.headerComponent}>
            <Header title="QR Attendance" />
            <Text style={styles.byLine}>by: Joshua Cantorne</Text>
          </View>
        </View>

        <View style={styles.bodyContainer}>
          <View style={styles.accentBar} />

          <View style={styles.bodyText}>
            <Text style={styles.mainTitle}>
              {teacher ? 'My School Classes' : 'School Event Attendance'}
            </Text>

            <Text style={styles.subtitle}>
              {teacher
                ? 'Create QR codes for your classes and track who attended.'
                : 'Scan QR Codes to record attendance during school activities.'}
            </Text>
          </View>

          <View style={styles.roleBadge}>
            <Ionicons
              name={teacher ? 'school-outline' : 'person-outline'}
              size={16}
              color="#EAF3FF"
            />
            <Text style={styles.roleBadgeText}>
              {teacher ? 'TEACHER' : 'STUDENT'}
            </Text>
          </View>
        </View>

        <View style={styles.classesContainer}>
          <TodayClasses />
        </View>

        <Text style={styles.footer}>
          QR ATTENDANCE • SCHOOL MANAGEMENT
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#102F57',
  },

  content: {
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },

  backgroundCircleTop: {
    position: 'absolute',
    width: 310,
    height: 310,
    borderRadius: 155,
    top: -145,
    right: -105,
    backgroundColor: '#3C6FA6',
    opacity: 0.65,
  },

  backgroundCircleBottom: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    bottom: -190,
    left: -130,
    backgroundColor: '#071C36',
    opacity: 0.75,
  },

  backgroundGlow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    top: '32%',
    left: -120,
    backgroundColor: '#6C9ACB',
    opacity: 0.18,
  },

  headerContainer: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 25,
  },

  logoBox: {
    width: 76,
    height: 76,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  qrBadge: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandName: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },

  brandSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 5,
  },

  headerComponent: {
    alignItems: 'center',
    width: '100%',
    marginTop: 18,
  },

  byLine: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
    textAlign: 'center',
  },

  bodyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginBottom: 22,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    backgroundColor: 'rgba(225,239,255,0.19)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 15,
    elevation: 5,
  },

  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: '#EAF3FF',
    marginRight: 13,
  },

  bodyText: {
    flex: 1,
  },

  mainTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#FFFFFF',
    marginBottom: 7,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.82)',
  },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(10,35,66,0.55)',
  },

  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#EAF3FF',
  },

  classesContainer: {
    padding: 16,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    backgroundColor: 'rgba(225,239,255,0.19)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 15,
    elevation: 4,
  },

  footer: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 8,
  },
});