import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Share,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useWallet } from '../context/WalletContext';
import { useNetwork } from '../context/NetworkContext';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const BG = '#08080a';
const CARD = '#111115';
const BORDER = 'rgba(255,255,255,0.08)';
const BORDER_ACCENT = 'rgba(59,130,246,0.22)';
const TEXT = '#f1f5f9';
const TEXT_MUTED = '#94a3b8';
const TEXT_DIM = '#475569';
const ACCENT = '#3b82f6';
const ACCENT_LIGHT = '#60a5fa';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { address, did, employees, credentials, isInitialized } = useWallet();
  const { currentUrl, isConnected, refreshConnection } = useNetwork();
  const [refreshing, setRefreshing] = React.useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isInitialized) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }).start();
    }
  }, [isInitialized, fadeAnim]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshConnection();
    setRefreshing(false);
  };

  const shareValue = async (label: string, value: string) => {
    try {
      await Share.share({ message: value, title: label });
    } catch {
      Alert.alert('Value', value);
    }
  };

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIconRing}>
          <Ionicons name="wallet-outline" size={36} color={ACCENT} />
        </View>
        <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 24 }} />
        <Text style={styles.loadingTitle}>DID Wallet</Text>
        <Text style={styles.loadingText}>Initializing secure wallet...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
      }
    >
      <Animated.View style={{ opacity: fadeAnim }}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="wallet-outline" size={18} color={ACCENT} />
            </View>
            <Text style={styles.title}>DID Wallet</Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        {/* ── Connection Status ── */}
        <View style={[styles.statusCard, isConnected ? styles.statusConnected : styles.statusDisconnected]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isConnected ? styles.dotGreen : styles.dotRed]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Connected to Backend' : 'Disconnected'}
            </Text>
          </View>
          <Text style={styles.urlText} numberOfLines={1}>{currentUrl}</Text>
        </View>

        {/* ── Identity Card ── */}
        <View style={styles.identityCard}>
          <View style={styles.identityHeader}>
            <View style={styles.identityIconWrap}>
              <Ionicons name="finger-print-outline" size={22} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.identityTitle}>Your Identity</Text>
              <Text style={styles.identitySubtitle}>Decentralized wallet credentials</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Wallet Address</Text>
          <View style={styles.copyRow}>
            <TextInput
              style={styles.copyInput}
              value={address || 'Not initialized'}
              editable={false}
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => address && shareValue('Wallet Address', address)}
            >
              <Ionicons name="copy-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Decentralized Identifier (DID)</Text>
          <View style={styles.copyRow}>
            <TextInput
              style={styles.copyInput}
              value={did || 'Not initialized'}
              editable={false}
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => did && shareValue('Your DID', did)}
            >
              <Ionicons name="copy-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="ribbon-outline" size={20} color="#a78bfa" />
            <Text style={styles.statValue}>{credentials.length}</Text>
            <Text style={styles.statLabel}>Credentials</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people-outline" size={20} color="#34d399" />
            <Text style={styles.statValue}>{employees.length}</Text>
            <Text style={styles.statLabel}>Employees</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons
              name="wifi-outline"
              size={20}
              color={isConnected ? '#22c55e' : '#ef4444'}
            />
            <Text style={[styles.statValue, { color: isConnected ? '#22c55e' : '#ef4444' }]}>
              {isConnected ? 'Live' : 'Off'}
            </Text>
            <Text style={styles.statLabel}>Network</Text>
          </View>
        </View>

        {/* ── Quick Actions 2×2 Grid ── */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, !isConnected && styles.actionCardDisabled]}
            onPress={() => navigation.navigate('QRScanner')}
            disabled={!isConnected}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(59,130,246,0.14)' }]}>
              <Ionicons name="qr-code-outline" size={26} color={ACCENT} />
            </View>
            <Text style={styles.actionLabel}>Scan QR</Text>
            <Text style={styles.actionSub}>Authenticate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AuthTimeline')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(167,139,250,0.14)' }]}>
              <Ionicons name="time-outline" size={26} color="#a78bfa" />
            </View>
            <Text style={styles.actionLabel}>Timeline</Text>
            <Text style={styles.actionSub}>Auth history</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('IdentityProfile')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(52,211,153,0.14)' }]}>
              <Ionicons name="person-circle-outline" size={26} color="#34d399" />
            </View>
            <Text style={styles.actionLabel}>Identity</Text>
            <Text style={styles.actionSub}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('EnrollmentRequests')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(251,191,36,0.14)' }]}>
              <Ionicons name="mail-outline" size={26} color="#fbbf24" />
            </View>
            <Text style={styles.actionLabel}>Inbox</Text>
            <Text style={styles.actionSub}>Enrollment</Text>
          </TouchableOpacity>
        </View>

        {/* ── Credentials ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: 'rgba(167,139,250,0.12)' }]}>
              <Ionicons name="ribbon-outline" size={16} color="#a78bfa" />
            </View>
            <Text style={styles.cardTitle}>Credentials</Text>
          </View>

          {credentials.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="ribbon-outline" size={36} color="#334155" />
              <Text style={styles.emptyText}>No credentials yet</Text>
              <Text style={styles.emptySubtext}>
                Issue one from the admin portal after enrolling
              </Text>
            </View>
          ) : (
            credentials.map((cred, i) => (
              <View key={cred.recordId || i} style={styles.credRow}>
                <View style={styles.credIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#22c55e" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.credType}>
                    {cred.credentialJwt ? 'Employment VC' : 'Credential'}
                  </Text>
                  <Text style={styles.credSource}>{cred.source || 'unknown'}</Text>
                </View>
                <View style={styles.credActiveBadge}>
                  <Text style={styles.credActiveBadgeText}>ACTIVE</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Company Directory ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
              <Ionicons name="business-outline" size={16} color={ACCENT_LIGHT} />
            </View>
            <Text style={styles.cardTitle}>Company Directory</Text>
            {employees.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{employees.length}</Text>
              </View>
            )}
          </View>

          {employees.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={36} color="#334155" />
              <Text style={styles.emptyText}>No employees loaded</Text>
              <Text style={styles.emptySubtext}>Connect to backend to sync directory</Text>
            </View>
          ) : (
            employees.map((emp, i) => (
              <View key={emp.id} style={[styles.empRow, i > 0 && styles.empRowBorder]}>
                <View style={styles.empAvatar}>
                  <Text style={styles.empAvatarText}>
                    {emp.name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.empNameRow}>
                    <Text style={styles.empName}>{emp.name}</Text>
                    <Text style={styles.empId}>{emp.id}</Text>
                  </View>
                  <Text style={styles.empRole}>{emp.role} · {emp.department}</Text>
                  <Text style={styles.empDid} numberOfLines={1}>{emp.did}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Disconnected Warning ── */}
        {!isConnected && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={22} color="#fbbf24" />
            <Text style={styles.warningText}>
              Not connected to backend.{'\n'}Update the server IP in Settings.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
              <Ionicons name="refresh-outline" size={15} color="#000" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: { fontSize: 20, fontWeight: '700', color: TEXT, marginTop: 8 },
  loadingText: { fontSize: 14, color: TEXT_MUTED },

  // Layout
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 18, paddingTop: 56, paddingBottom: 48 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: TEXT },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Status
  statusCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusConnected: {
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderColor: 'rgba(34,197,94,0.24)',
  },
  statusDisconnected: {
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderColor: 'rgba(239,68,68,0.24)',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  dotGreen: { backgroundColor: '#22c55e' },
  dotRed: { backgroundColor: '#ef4444' },
  statusText: { fontSize: 14, fontWeight: '600', color: TEXT },
  urlText: { fontSize: 11, color: TEXT_DIM, marginLeft: 16 },

  // Identity
  identityCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_ACCENT,
    padding: 18,
    marginBottom: 14,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  identityIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  identitySubtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  fieldLabel: {
    fontSize: 10,
    color: TEXT_DIM,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  copyInput: {
    flex: 1,
    backgroundColor: '#0a0a0d',
    color: TEXT_MUTED,
    fontSize: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    fontFamily: 'monospace',
  },
  copyBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enrollBox: {
    backgroundColor: 'rgba(59,130,246,0.05)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.16)',
    marginTop: 4,
    gap: 6,
  },
  enrollBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  enrollBoxTitle: { fontSize: 12, fontWeight: '700', color: ACCENT_LIGHT },
  enrollStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(59,130,246,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepBadgeText: { fontSize: 9, color: ACCENT_LIGHT, fontWeight: '800' },
  stepText: { fontSize: 12, color: TEXT_MUTED, flex: 1, lineHeight: 18 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: TEXT },
  statLabel: { fontSize: 11, color: TEXT_MUTED },

  // Actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  actionCard: {
    width: '47.5%',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  actionCardDisabled: { opacity: 0.38 },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  actionLabel: { fontSize: 14, fontWeight: '700', color: TEXT },
  actionSub: { fontSize: 11, color: TEXT_MUTED },

  // Card
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT, flex: 1 },
  countBadge: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: { fontSize: 12, color: ACCENT_LIGHT, fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#4b5563' },
  emptySubtext: { fontSize: 12, color: TEXT_DIM, textAlign: 'center' },

  // Credentials
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(34,197,94,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.16)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  credIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  credType: { fontSize: 13, fontWeight: '600', color: TEXT },
  credSource: { fontSize: 11, color: TEXT_MUTED, marginTop: 1 },
  credActiveBadge: {
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.28)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  credActiveBadgeText: { fontSize: 9, color: '#86efac', fontWeight: '800' },

  // Employees
  empRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 11,
  },
  empRowBorder: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  empAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empAvatarText: { fontSize: 14, fontWeight: '800', color: ACCENT_LIGHT },
  empNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  empName: { fontSize: 14, fontWeight: '600', color: TEXT },
  empId: { fontSize: 11, color: ACCENT, fontWeight: '600' },
  empRole: { fontSize: 12, color: TEXT_MUTED, marginBottom: 2 },
  empDid: { fontSize: 10, color: TEXT_DIM },

  // Warning
  warningCard: {
    backgroundColor: 'rgba(251,191,36,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.24)',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#fbbf24',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },
});

export default HomeScreen;
