import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useWallet } from '../context/WalletContext';
import { useNetwork } from '../context/NetworkContext';

type AuthConfirmationRouteProp = RouteProp<RootStackParamList, 'AuthConfirmation'>;

interface LocationInfo {
  city?: string;
  region?: string;
  country?: string;
}

const BG = '#08080a';
const CARD = '#111115';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#f1f5f9';
const TEXT_MUTED = '#94a3b8';
const TEXT_DIM = '#475569';
const ACCENT = '#3b82f6';

const BADGE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  admin:    { bg: 'rgba(37,99,235,0.14)',   border: 'rgba(37,99,235,0.35)',   text: '#60a5fa' },
  auditor:  { bg: 'rgba(217,119,6,0.14)',   border: 'rgba(217,119,6,0.35)',   text: '#fbbf24' },
  manager:  { bg: 'rgba(124,58,237,0.14)',  border: 'rgba(124,58,237,0.35)',  text: '#a78bfa' },
  employee: { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.28)', text: '#94a3b8' },
};

const AuthConfirmationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AuthConfirmationRouteProp>();
  const {
    challengeId,
    platform,
    timestamp,
    type,
    challenge,
    apiEndpoint,
    employeeName,
    employeeId,
    expectedDID,
    badgeType,
    badgePermissions,
    employeeHashId,
    verifierId,
    verifierOrganizationName,
    verifierCredentialRequired,
    requestedClaims,
  } = route.params;
  const isZKWalletProve = type === 'zk-wallet-prove';
  const { did, employees, submitAuthResponse, submitZKWalletProve } = useWallet();
  const { isConnected } = useNetwork();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loginTime, setLoginTime] = useState<Date | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);
  const [location, setLocation] = useState<LocationInfo | null>(null);

  const successScale = useRef(new Animated.Value(0.7)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const resolvedEmployeeDID = useMemo(() => {
    if (expectedDID) return expectedDID;
    if (employeeId) {
      const match = employees.find((employee) => employee.id === employeeId);
      if (match?.did) return match.did;
    }
    return did || '';
  }, [did, employeeId, employees, expectedDID]);

  useEffect(() => {
    if (!isConnected) {
      Alert.alert(
        'Not Connected',
        'No backend connection. Please check Settings.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }
    if (submitted || isSubmitting) return;
    if (isZKWalletProve) {
      void handleZKProve();
      return;
    }
    if (!resolvedEmployeeDID) return;
    void handleAutoConfirm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, resolvedEmployeeDID]);

  const handleZKProve = async () => {
    if (!apiEndpoint || !badgeType) {
      Alert.alert('Error', 'Missing apiEndpoint or requiredBadge in QR data', [
        { text: 'Back', onPress: () => navigation.navigate('Home' as never) },
      ]);
      return;
    }
    setIsSubmitting(true);
    try {
      await submitZKWalletProve(challengeId, badgeType, apiEndpoint);
      const now = new Date();
      setLoginTime(now);
      setSessionExpiry(new Date(now.getTime() + 15 * 60 * 1000));
      setSubmitted(true);
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(successOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    } catch (error: any) {
      Alert.alert('ZK Proof Failed', error.message || 'Failed to generate ZK proof', [
        { text: 'Back', onPress: () => navigation.navigate('Home' as never) },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchLocation = async (): Promise<LocationInfo | null> => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal as RequestInit['signal'] });
      clearTimeout(timer);
      const data = await res.json() as { city?: string; region?: string; country_name?: string };
      return { city: data.city, region: data.region, country: data.country_name };
    } catch {
      return null;
    }
  };

  const handleAutoConfirm = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitAuthResponse(
        challengeId,
        resolvedEmployeeDID,
        challenge,
        apiEndpoint,
        employeeId,
        verifierId,
        requestedClaims,
        verifierCredentialRequired,
        badgeType,
      );

      if (result.success) {
        const now = new Date();
        const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        setLoginTime(now);
        setSessionExpiry(expiry);
        setSubmitted(true);
        // Animate success
        Animated.parallel([
          Animated.spring(successScale, {
            toValue: 1,
            tension: 55,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(successOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
        ]).start();
        fetchLocation().then(setLocation);
      } else {
        Alert.alert('Authentication Failed', result.error || 'Unknown error occurred', [
          { text: 'Back', onPress: () => navigation.navigate('Home' as never) },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit authentication', [
        { text: 'Back', onPress: () => navigation.navigate('Home' as never) },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.navigate('Home' as never);
  };

  const badgeKey = (badgeType || 'employee').toLowerCase();
  const badge = BADGE_STYLES[badgeKey] ?? BADGE_STYLES.employee;

  // ── Success screen ──
  if (submitted && loginTime) {
    const formatDate = (d: Date) =>
      d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

    const sessionMins = sessionExpiry
      ? Math.round((sessionExpiry.getTime() - loginTime.getTime()) / 60000)
      : 0;
    const sessionLabel = sessionMins >= 60
      ? `${Math.floor(sessionMins / 60)}h ${sessionMins % 60}m`
      : `${sessionMins}m`;

    const locationStr = location
      ? [location.city, location.region, location.country].filter(Boolean).join(', ')
      : null;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Animated success banner */}
        <Animated.View
          style={[
            styles.successBanner,
            { opacity: successOpacity, transform: [{ scale: successScale }] },
          ]}
        >
          <View style={styles.successIconRing}>
            <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
          </View>
          <Text style={styles.successTitle}>Authenticated</Text>
          <Text style={styles.successSubtitle}>Session active for {sessionLabel}</Text>
        </Animated.View>

        {/* Session card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={16} color={TEXT_MUTED} />
            <Text style={styles.cardTitle}>Session Details</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Employee</Text>
            <Text style={styles.rowValue}>{employeeName || employeeId || 'Unknown'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Badge</Text>
            <View style={[styles.badgePill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>
                {(badgeType || 'EMPLOYEE').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Logged in</Text>
            <Text style={styles.rowValue}>{formatDate(loginTime)}</Text>
          </View>

          {sessionExpiry && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Expires</Text>
              <Text style={styles.rowValue}>{formatDate(sessionExpiry)}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Location</Text>
            {locationStr ? (
              <Text style={styles.rowValue}>{locationStr}</Text>
            ) : (
              <View style={styles.locationDetecting}>
                <ActivityIndicator size="small" color={TEXT_DIM} />
                <Text style={styles.rowValueMuted}>Detecting...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Access card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#22c55e" />
            <Text style={styles.cardTitle}>Access Granted</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Platform</Text>
            <Text style={styles.rowValue}>{platform}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Verifier</Text>
            <Text style={styles.rowValue}>{verifierOrganizationName || verifierId || 'Default'}</Text>
          </View>

          {(badgePermissions || []).length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.permLabel}>Permissions</Text>
              <View style={styles.permGrid}>
                {(badgePermissions || []).map((p) => (
                  <View key={p} style={styles.permChip}>
                    <Ionicons name="checkmark-outline" size={11} color="#7dd3fc" />
                    <Text style={styles.permChipText}>{p}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.homeBtn} onPress={handleCancel}>
          <Ionicons name="home-outline" size={18} color="#fff" />
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Pending / loading screen ──
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fadeAnim }}>

        {/* Signing animation card */}
        <View style={styles.signingCard}>
          <View style={styles.signingIconRing}>
            {isSubmitting ? (
              <ActivityIndicator size="large" color={ACCENT} />
            ) : (
              <Ionicons name="lock-closed-outline" size={36} color={ACCENT} />
            )}
          </View>
          <Text style={styles.signingTitle}>
            {isSubmitting ? 'Signing & Verifying' : 'Authentication'}
          </Text>
          <Text style={styles.signingSubtitle}>
            {isSubmitting
              ? 'Cryptographically signing your challenge response...'
              : 'Review the details below'}
          </Text>
        </View>

        {/* Details card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={16} color={TEXT_MUTED} />
            <Text style={styles.cardTitle}>Request Details</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Platform</Text>
            <Text style={styles.rowValue}>{platform}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Employee</Text>
            <Text style={styles.rowValue}>{employeeName || employeeId || 'Unknown'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Badge</Text>
            <View style={[styles.badgePill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>
                {(badgeType || 'EMPLOYEE').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>DID</Text>
            <Text style={[styles.rowValue, styles.mono]} numberOfLines={1}>
              {resolvedEmployeeDID ? `${resolvedEmployeeDID.slice(0, 20)}...` : '—'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {!isSubmitting && !submitted && (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={handleAutoConfirm}
              disabled={isSubmitting}
            >
              <Ionicons name="refresh-outline" size={18} color="#fff" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.cancelBtn, isSubmitting && styles.btnDisabled]}
            onPress={handleCancel}
            disabled={isSubmitting}
          >
            <Ionicons name="close-outline" size={18} color={TEXT_MUTED} />
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 18, paddingBottom: 48 },

  // Success
  successBanner: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.28)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  successIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#22c55e' },
  successSubtitle: { fontSize: 14, color: '#86efac' },

  // Signing
  signingCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.22)',
    padding: 28,
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  signingIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  signingTitle: { fontSize: 20, fontWeight: '700', color: TEXT },
  signingSubtitle: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', lineHeight: 18 },

  // Card
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.8 },

  // Rows
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowLabel: { fontSize: 13, color: TEXT_DIM },
  rowValue: { fontSize: 13, color: TEXT, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  rowValueMuted: { fontSize: 13, color: TEXT_DIM, fontStyle: 'italic', marginLeft: 4 },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },
  locationDetecting: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Badge
  badgePill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Permissions
  permLabel: { fontSize: 11, color: TEXT_DIM, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  permGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  permChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(14,165,233,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.28)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  permChipText: { fontSize: 11, color: '#7dd3fc' },

  // Buttons
  actions: { gap: 10, marginTop: 4 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CARD,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cancelBtnText: { color: TEXT_MUTED, fontSize: 15, fontWeight: '600' },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 4,
  },
  homeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },
});

export default AuthConfirmationScreen;
