import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../context/WalletContext';
import { useNetwork } from '../context/NetworkContext';
import { identityService } from '../services/identity';

const BG = '#08080a';
const CARD = '#111115';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#f1f5f9';
const TEXT_MUTED = '#94a3b8';
const TEXT_DIM = '#475569';
const ACCENT = '#3b82f6';
const ACCENT_LIGHT = '#60a5fa';

const IdentityProfileScreen: React.FC = () => {
  const { did, address, signMessage } = useWallet();
  const { isConnected, currentUrl } = useNetwork();

  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [location, setLocation] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [resumePublicUrl, setResumePublicUrl] = useState('');
  const [profileUri, setProfileUri] = useState('');
  const [profileHash, setProfileHash] = useState('');
  const [encryptedProfileUri, setEncryptedProfileUri] = useState('');
  const [cipherHash, setCipherHash] = useState('');
  const [encryptionScheme, setEncryptionScheme] = useState('xchacha20-poly1305');

  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const statusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const showStatus = (message: string) => {
    setStatusMessage(message);
    setErrorMessage('');
    Animated.sequence([
      Animated.timing(statusAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(statusAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setStatusMessage(''));
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setStatusMessage('');
    Animated.timing(statusAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  const parseSkills = (): string[] =>
    Array.from(
      new Set(
        skillsInput
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      )
    );

  const hydrateFromProfile = (profile: {
    displayName: string;
    headline?: string;
    summary?: string;
    location?: string;
    skills: string[];
    resumePublicUrl?: string;
    profileUri?: string;
    profileHash?: string;
    updatedAt: string;
  }) => {
    setDisplayName(profile.displayName || '');
    setHeadline(profile.headline || '');
    setSummary(profile.summary || '');
    setLocation(profile.location || '');
    setSkillsInput((profile.skills || []).join(', '));
    setResumePublicUrl(profile.resumePublicUrl || '');
    setProfileUri(profile.profileUri || '');
    setProfileHash(profile.profileHash || '');
    setLastUpdated(profile.updatedAt || null);
  };

  const loadProfile = async () => {
    if (!did) {
      showError('Wallet DID not available yet.');
      return;
    }
    setIsLoading(true);
    try {
      const result = await identityService.getPublicProfile(did);
      hydrateFromProfile(result.publicProfile);
      setLastUpdated(result.updatedAt || result.publicProfile.updatedAt || null);
      showStatus('Profile loaded successfully.');
    } catch (error: any) {
      showError(error?.message || 'Failed to load profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!did || !address) {
      showError('Wallet DID or address is missing.');
      return;
    }
    if (!displayName.trim()) {
      Alert.alert('Required', 'Please enter at least a display name.');
      return;
    }
    setIsLoading(true);
    try {
      const hasPrivatePointer = Boolean(
        encryptedProfileUri.trim() || cipherHash.trim() || encryptionScheme.trim()
      );
      const response = await identityService.registerIdentityProfile(
        {
          did,
          walletAddress: address,
          publicProfile: {
            displayName: displayName.trim(),
            headline: headline.trim() || undefined,
            summary: summary.trim() || undefined,
            location: location.trim() || undefined,
            skills: parseSkills(),
            resumePublicUrl: resumePublicUrl.trim() || undefined,
            profileUri: profileUri.trim() || undefined,
            profileHash: profileHash.trim() || undefined,
          },
          privateProfilePointer: hasPrivatePointer
            ? {
                encryptedProfileUri: encryptedProfileUri.trim() || undefined,
                cipherHash: cipherHash.trim() || undefined,
                encryptionScheme: encryptionScheme.trim() || undefined,
              }
            : undefined,
        },
        { did, walletAddress: address, signMessage }
      );
      setLastUpdated(response.updatedAt);
      showStatus('Identity profile saved successfully.');
    } catch (error: any) {
      showError(error?.message || 'Failed to save profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const truncate = (val: string | null, len = 38) =>
    val && val.length > len ? `${val.slice(0, len)}...` : val || 'Not available';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fadeAnim }}>

        {/* ── Identity Info ── */}
        <View style={styles.identityCard}>
          <View style={styles.identityHeader}>
            <View style={styles.identityIconWrap}>
              <Ionicons name="person-circle-outline" size={22} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.identityTitle}>Identity Profile</Text>
              <Text style={styles.identitySubtitle}>Public & private profile management</Text>
            </View>
            {lastUpdated && (
              <View style={styles.updatedBadge}>
                <Ionicons name="checkmark-circle-outline" size={12} color="#22c55e" />
                <Text style={styles.updatedText}>Saved</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="wifi-outline" size={13} color={isConnected ? '#22c55e' : '#ef4444'} />
              <Text style={[styles.metaValue, { color: isConnected ? '#22c55e' : '#ef4444' }]}>
                {isConnected ? 'Connected' : 'Offline'}
              </Text>
            </View>
            <Text style={styles.metaDivider}>·</Text>
            <Text style={styles.metaUrl} numberOfLines={1}>{currentUrl}</Text>
          </View>

          <View style={styles.didRow}>
            <Text style={styles.didLabel}>DID</Text>
            <Text style={styles.didValue} numberOfLines={1}>{truncate(did)}</Text>
          </View>
          <View style={styles.didRow}>
            <Text style={styles.didLabel}>Address</Text>
            <Text style={styles.didValue} numberOfLines={1}>{truncate(address)}</Text>
          </View>

          {lastUpdated && (
            <Text style={styles.lastUpdatedText}>
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </Text>
          )}
        </View>

        {/* ── Status / Error Message ── */}
        {(statusMessage || errorMessage) ? (
          <Animated.View
            style={[
              styles.messageBanner,
              statusMessage ? styles.successBanner : styles.errorBanner,
              { opacity: statusAnim },
            ]}
          >
            <Ionicons
              name={statusMessage ? 'checkmark-circle-outline' : 'warning-outline'}
              size={16}
              color={statusMessage ? '#86efac' : '#fca5a5'}
            />
            <Text style={[styles.messageText, statusMessage ? styles.successText : styles.errorText]}>
              {statusMessage || errorMessage}
            </Text>
          </Animated.View>
        ) : null}

        {/* ── Public Profile ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
              <Ionicons name="globe-outline" size={15} color={ACCENT_LIGHT} />
            </View>
            <Text style={styles.sectionTitle}>Public Profile</Text>
          </View>

          {[
            { label: 'Display Name *', value: displayName, setter: setDisplayName, placeholder: 'Your name', required: true },
            { label: 'Headline', value: headline, setter: setHeadline, placeholder: 'Identity Engineer' },
            { label: 'Location', value: location, setter: setLocation, placeholder: 'City, Country' },
            { label: 'Skills (comma separated)', value: skillsInput, setter: setSkillsInput, placeholder: 'TypeScript, React Native, DID' },
          ].map(({ label, value, setter, placeholder }) => (
            <View key={label}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                value={value}
                onChangeText={setter}
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor={TEXT_DIM}
              />
            </View>
          ))}

          <Text style={styles.fieldLabel}>Summary</Text>
          <TextInput
            value={summary}
            onChangeText={setSummary}
            style={[styles.input, styles.multilineInput]}
            placeholder="Short public bio"
            placeholderTextColor={TEXT_DIM}
            multiline
            textAlignVertical="top"
          />

          {[
            { label: 'Resume URL', value: resumePublicUrl, setter: setResumePublicUrl, placeholder: 'https://...', mono: true },
            { label: 'Profile URI', value: profileUri, setter: setProfileUri, placeholder: 'ipfs://...', mono: true },
            { label: 'Profile Hash', value: profileHash, setter: setProfileHash, placeholder: '0x...', mono: true },
          ].map(({ label, value, setter, placeholder, mono }) => (
            <View key={label}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                value={value}
                onChangeText={setter}
                style={[styles.input, mono && styles.monoInput]}
                placeholder={placeholder}
                placeholderTextColor={TEXT_DIM}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ))}
        </View>

        {/* ── Private Profile Pointer ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(167,139,250,0.12)' }]}>
              <Ionicons name="lock-closed-outline" size={15} color="#a78bfa" />
            </View>
            <Text style={styles.sectionTitle}>Private Profile Pointer</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Optional encrypted pointer to your private profile stored off-chain.
          </Text>

          {[
            { label: 'Encrypted Profile URI', value: encryptedProfileUri, setter: setEncryptedProfileUri, placeholder: 'ipfs://encrypted-profile' },
            { label: 'Cipher Hash', value: cipherHash, setter: setCipherHash, placeholder: '0x...' },
            { label: 'Encryption Scheme', value: encryptionScheme, setter: setEncryptionScheme, placeholder: 'xchacha20-poly1305' },
          ].map(({ label, value, setter, placeholder }) => (
            <View key={label}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                value={value}
                onChangeText={setter}
                style={[styles.input, styles.monoInput]}
                placeholder={placeholder}
                placeholderTextColor={TEXT_DIM}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ))}
        </View>

        {/* ── Actions ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.outlineBtn, (!isConnected || isLoading) && styles.btnDisabled]}
            onPress={loadProfile}
            disabled={!isConnected || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={ACCENT_LIGHT} size="small" />
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={18} color={ACCENT_LIGHT} />
                <Text style={styles.outlineBtnText}>Load</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, (!isConnected || isLoading) && styles.btnDisabled]}
            onPress={saveProfile}
            disabled={!isConnected || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Save Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {!isConnected && (
          <View style={styles.offlineNotice}>
            <Ionicons name="wifi-outline" size={14} color="#fbbf24" />
            <Text style={styles.offlineText}>
              Connect to backend in Settings before updating your profile.
            </Text>
          </View>
        )}

      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 48 },

  // Identity card
  identityCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    padding: 18,
    marginBottom: 14,
    gap: 10,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  identityIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  identitySubtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  updatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  updatedText: { fontSize: 10, color: '#22c55e', fontWeight: '700' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaValue: { fontSize: 12, fontWeight: '600' },
  metaDivider: { color: TEXT_DIM, fontSize: 12 },
  metaUrl: { fontSize: 11, color: TEXT_DIM, flex: 1 },

  didRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  didLabel: {
    fontSize: 10,
    color: TEXT_DIM,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    minWidth: 52,
  },
  didValue: { fontSize: 11, color: TEXT_MUTED, fontFamily: 'monospace', flex: 1 },
  lastUpdatedText: { fontSize: 11, color: '#22c55e', marginTop: 4 },

  // Message banner
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  successBanner: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderColor: 'rgba(34,197,94,0.28)',
  },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.28)',
  },
  messageText: { fontSize: 13, flex: 1, lineHeight: 18 },
  successText: { color: '#86efac' },
  errorText: { color: '#fca5a5' },

  // Section card
  sectionCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 14,
    gap: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  sectionDesc: { fontSize: 12, color: TEXT_DIM, marginBottom: 12, lineHeight: 17 },

  // Field
  fieldLabel: {
    fontSize: 10,
    color: TEXT_DIM,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#0a0a0d',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: TEXT,
  },
  multilineInput: {
    minHeight: 88,
    paddingTop: 11,
  },
  monoInput: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: TEXT_MUTED,
  },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  primaryBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 13,
    minHeight: 48,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.38)',
    borderRadius: 10,
    paddingVertical: 13,
    minHeight: 48,
  },
  outlineBtnText: { color: ACCENT_LIGHT, fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.4 },

  // Offline
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(251,191,36,0.07)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.22)',
  },
  offlineText: { fontSize: 12, color: '#fbbf24', flex: 1, lineHeight: 17 },
});

export default IdentityProfileScreen;
