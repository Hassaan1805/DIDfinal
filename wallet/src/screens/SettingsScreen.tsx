import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useNetwork } from '../context/NetworkContext';
import { useWallet } from '../context/WalletContext';

const BG = '#08080a';
const CARD = '#111115';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#f1f5f9';
const TEXT_MUTED = '#94a3b8';
const TEXT_DIM = '#475569';
const ACCENT = '#3b82f6';
const ACCENT_LIGHT = '#60a5fa';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentUrl, isConnected, setApiUrl, testUrl, discoverBestUrl } = useNetwork();
  const { exportWallet, clearWallet } = useWallet();

  const [customUrl, setCustomUrl] = useState(currentUrl);
  const [isLoading, setIsLoading] = useState(false);

  const handleTestUrl = async () => {
    if (!customUrl.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }
    setIsLoading(true);
    try {
      const result = await testUrl(customUrl);
      if (result.success) {
        Alert.alert(
          'Connection Successful',
          `Backend responded in ${result.latency}ms. Use this URL?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Use This URL',
              onPress: async () => {
                await setApiUrl(customUrl);
                Alert.alert('Updated', 'Backend URL updated successfully.');
              },
            },
          ]
        );
      } else {
        Alert.alert('Connection Failed', `Could not connect: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoDiscover = async () => {
    setIsLoading(true);
    try {
      const bestUrl = await discoverBestUrl();
      if (bestUrl) {
        setCustomUrl(bestUrl);
        Alert.alert('Found Backend', `Discovered working server at:\n${bestUrl}`);
      } else {
        Alert.alert('Not Found', 'Could not find any working backend server on your network.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportWallet = async () => {
    try {
      const wallet = await exportWallet();
      Alert.alert(
        'Wallet Info',
        `Address: ${wallet.address}\n\nPrivate keys are stored securely and not displayed for security.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleClearWallet = () => {
    Alert.alert(
      'Clear Wallet',
      'This permanently deletes all wallet data including private keys. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearWallet();
              Alert.alert('Cleared', 'All wallet data has been deleted.');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const quickIpButtons = [
    { label: 'Localhost', ip: 'http://localhost:3001' },
    { label: '192.168.1.x', ip: 'http://192.168.1.' },
    { label: '192.168.0.x', ip: 'http://192.168.0.' },
    { label: '10.0.0.x', ip: 'http://10.0.0.' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >

      {/* ── Connection Status Card ── */}
      <View style={[styles.statusCard, isConnected ? styles.statusConnected : styles.statusDisconnected]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isConnected ? styles.dotGreen : styles.dotRed]} />
          <Text style={styles.statusText}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
        </View>
        <Text style={styles.statusUrl} numberOfLines={2}>{currentUrl}</Text>
      </View>

      {/* ── Backend Connection ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
            <Ionicons name="server-outline" size={16} color={ACCENT_LIGHT} />
          </View>
          <Text style={styles.sectionTitle}>Backend Connection</Text>
        </View>

        <Text style={styles.fieldLabel}>Server URL</Text>
        <TextInput
          style={styles.input}
          value={customUrl}
          onChangeText={setCustomUrl}
          placeholder="http://192.168.1.100:3001"
          placeholderTextColor={TEXT_DIM}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <Text style={styles.fieldLabel}>Quick Fill</Text>
        <View style={styles.quickRow}>
          {quickIpButtons.map((btn) => (
            <TouchableOpacity
              key={btn.label}
              style={styles.quickChip}
              onPress={() => setCustomUrl(btn.ip)}
            >
              <Text style={styles.quickChipText}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
          onPress={handleTestUrl}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Test Connection</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineBtn, isLoading && styles.btnDisabled]}
          onPress={handleAutoDiscover}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={ACCENT_LIGHT} size="small" />
          ) : (
            <>
              <Ionicons name="search-outline" size={18} color={ACCENT_LIGHT} />
              <Text style={styles.outlineBtnText}>Auto Discover</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Wallet Management ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
            <Ionicons name="wallet-outline" size={16} color="#34d399" />
          </View>
          <Text style={styles.sectionTitle}>Wallet Management</Text>
        </View>

        <TouchableOpacity style={styles.outlineBtn} onPress={handleExportWallet}>
          <Ionicons name="share-outline" size={18} color={ACCENT_LIGHT} />
          <Text style={styles.outlineBtnText}>Export Wallet Info</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearWallet}>
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.dangerBtnText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>

      {/* ── App Info ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(148,163,184,0.1)' }]}>
            <Ionicons name="phone-portrait-outline" size={16} color={TEXT_MUTED} />
          </View>
          <Text style={styles.sectionTitle}>App Information</Text>
        </View>

        <View style={styles.infoCard}>
          {[
            { label: 'Version', value: '1.0.0' },
            { label: 'Platform', value: 'Expo React Native' },
            { label: 'Network', value: 'Sepolia Testnet' },
          ].map(({ label, value }) => (
            <View key={label} style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>{label}</Text>
              <Text style={styles.appInfoValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 18, paddingBottom: 48 },

  // Status banner
  statusCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
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
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: '#22c55e' },
  dotRed: { backgroundColor: '#ef4444' },
  statusText: { fontSize: 14, fontWeight: '600', color: TEXT },
  statusUrl: { fontSize: 12, color: TEXT_DIM, marginLeft: 16 },

  // Section
  section: { marginBottom: 26 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: TEXT },

  // Field label
  fieldLabel: {
    fontSize: 10,
    color: TEXT_DIM,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },

  // Input
  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: TEXT,
    marginBottom: 14,
  },

  // Quick chips
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickChip: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickChipText: { fontSize: 12, color: ACCENT_LIGHT, fontWeight: '600' },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 10,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 10,
  },
  outlineBtnText: { fontSize: 15, fontWeight: '700', color: ACCENT_LIGHT },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 10,
  },
  dangerBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.5 },

  // Info card
  infoCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 8,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_MUTED,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { fontSize: 13, color: TEXT_MUTED, flex: 1, lineHeight: 18 },
  infoDivider: { height: 1, backgroundColor: BORDER, marginVertical: 4 },

  // App info
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  appInfoLabel: { fontSize: 13, color: TEXT_MUTED },
  appInfoValue: { fontSize: 13, color: TEXT, fontWeight: '600' },
});

export default SettingsScreen;
