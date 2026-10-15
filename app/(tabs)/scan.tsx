import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth, useRole } from '@/lib/auth';
import { registerAttendance, type RegisterResult } from '@/lib/attendance';

export default function ScanScreen() {
  const { user } = useAuth();
  const { role, roleLoading } = useRole();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterResult | null>(null);

  const notEnrolled = result?.code === 'subject_not_enrolled';

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!user) {
      setScanned(true);
      setResult({
        success: false,
        message: 'Please sign in to scan.',
      });
      return;
    }

    setScanned(true);
    setLastData(data);

    registerAttendance(data, user.id).then((scanResult) => {
      setResult(scanResult);
    });
  };

  const handleScanAgain = () => {
    setScanned(false);
    setLastData(null);
    setResult(null);
  };

  // Role gate runs before anything camera related, so a teacher never gets a
  // permission prompt, a mounted CameraView, or a scanning session.
  if (!user) {
    return (
      <View style={styles.container}>
        <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.title}>Sign In Required</Text>
        <Text style={styles.subtitle}>Log in to scan attendance QR codes.</Text>
      </View>
    );
  }

  if (roleLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.subtitle}>Checking your account...</Text>
      </View>
    );
  }

  if (role !== 'student') {
    return (
      <View style={styles.container}>
        <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.title}>Students Only</Text>
        <Text style={styles.subtitle}>
          QR scanning is available for student accounts only.
        </Text>
      </View>
    );
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Camera Permission Needed</Text>
        <Text style={styles.subtitle}>
          We need access to your camera to scan QR codes.
        </Text>
        <AppButton
          theme="primary"
          title="Grant Permission"
          icon="camera"
          onPress={requestPermission}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View style={styles.overlay}>
        <Text style={styles.overlayText}>
          {scanned ? 'QR Code detected!' : 'Point your camera at a QR code'}
        </Text>

        {scanned && notEnrolled && (
          <View style={styles.warningBox}>
            <Ionicons name="book-outline" size={30} color={COLORS.warning} />
            <Text style={styles.warningTitle}>Subject Not Added!</Text>
            <Text style={styles.warningBody}>
              {result?.subjectName ?? 'This subject'}
              {result?.teacherName ? ` with ${result.teacherName}` : ''} is not in
              your Subjects list, so your attendance was not recorded.
            </Text>
            <AppButton
              theme="primary"
              title="Open Subjects"
              icon="book-outline"
              onPress={() => router.push('/(tabs)/subjects')}
            />
          </View>
        )}

        {scanned && !notEnrolled && result && (
          <Text style={[styles.scanResult, result.success ? styles.success : styles.error]}>
            {result.message}
          </Text>
        )}

        {scanned && lastData && (
          <Text style={styles.scanData}>{lastData}</Text>
        )}

        {scanned && (
          <AppButton
            theme="primary"
            title="Scan Again"
            icon="refresh"
            onPress={handleScanAgain}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  overlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 60,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  overlayText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  scanResult: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  success: {
    color: '#2E7D32',
  },
  error: {
    color: '#C62828',
  },
  scanData: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  warningBox: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.warning,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.warning,
    marginTop: 8,
    marginBottom: 6,
    textAlign: 'center',
  },
  warningBody: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
});
