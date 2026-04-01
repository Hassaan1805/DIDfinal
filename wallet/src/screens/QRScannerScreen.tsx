import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, Camera } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useWallet } from '../context/WalletContext';

type QRScannerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'QRScanner'>;

const ACCENT = '#3b82f6';

const QRScannerScreen: React.FC = () => {
  const navigation = useNavigation<QRScannerNavigationProp>();
  const { parseQRCode } = useWallet();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const authRequest = parseQRCode(data);

    if (authRequest) {
      navigation.navigate('AuthConfirmation', {
        challengeId: authRequest.challengeId,
        platform: authRequest.platform,
        timestamp: String(authRequest.timestamp),
        challenge: authRequest.challenge,
        apiEndpoint: authRequest.apiEndpoint,
        employeeName: authRequest.employee?.name,
        employeeId: authRequest.employee?.id,
        expectedDID: authRequest.expectedDID,
        badgeType: authRequest.badge?.type || authRequest.employee?.badge,
        badgePermissions: authRequest.badge?.permissions,
        employeeHashId: authRequest.employeeHashId || authRequest.employee?.hashId,
        verifierId: authRequest.verifier?.verifierId || authRequest.verifierId,
        verifierOrganizationName: authRequest.verifier?.organizationName,
        verifierCredentialRequired: authRequest.verifier?.requireCredential,
        requestedClaims: authRequest.requestedClaims,
      });
    } else {
      // Show inline error instead of Alert for better UX
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.permText}>Requesting camera access...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permContainer}>
        <View style={styles.permIconRing}>
          <Ionicons name="eye-off-outline" size={40} color="#64748b" />
        </View>
        <Text style={styles.permTitle}>Camera Access Denied</Text>
        <Text style={styles.permSubtext}>
          Camera permission is required to scan QR codes for authentication.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestCameraPermission}>
          <Ionicons name="camera-outline" size={18} color="#fff" />
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      >
        {/* Dark overlays */}
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />

            {/* Scan area */}
            <View style={styles.scanArea}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />

              {/* Inner border glow */}
              <View style={styles.scanAreaInner} />
            </View>

            <View style={styles.sideOverlay} />
          </View>
          <View style={styles.bottomOverlay}>
            <View style={styles.instructionPill}>
              <Ionicons name="qr-code-outline" size={16} color="#fff" />
              <Text style={styles.instructionText}>
                {scanned ? 'Processing...' : 'Align QR code within the frame'}
              </Text>
            </View>
            {scanned && (
              <ActivityIndicator color={ACCENT} style={{ marginTop: 16 }} />
            )}
          </View>
        </View>
      </CameraView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerCancelBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close-outline" size={20} color="#fff" />
          <Text style={styles.footerCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: '100%',
  },

  // Permission screens
  permContainer: {
    flex: 1,
    backgroundColor: '#08080a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
  },
  permIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(100,116,139,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
  },
  permText: {
    fontSize: 15,
    color: '#94a3b8',
    marginTop: 12,
  },
  permSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  permBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  permBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: {
    paddingVertical: 10,
  },
  cancelBtnText: { fontSize: 14, color: '#64748b' },

  // Camera overlay
  overlay: { flex: 1 },
  topOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  middleRow: { flexDirection: 'row', height: 260 },
  sideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },

  // Scan area
  scanArea: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  scanAreaInner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.15)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: ACCENT,
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

  // Bottom info
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  instructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  instructionText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 48,
    width: '100%',
    alignItems: 'center',
  },
  footerCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.85)',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.5)',
  },
  footerCancelText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default QRScannerScreen;
