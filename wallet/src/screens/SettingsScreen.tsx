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
import { useNavigation } from '@react-navigation/native';
import { useNetwork } from '../context/NetworkContext';
import { useWallet } from '../context/WalletContext';

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
          `Backend responded in ${result.latency}ms. Do you want to use this URL?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Use This URL',
              onPress: async () => {
                await setApiUrl(customUrl);
                Alert.alert('Success', 'Backend URL updated!');
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Connection Failed',
          `Could not connect to backend: ${result.error || 'Unknown error'}`
        );
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
        Alert.alert('Success', `Found working backend at: ${bestUrl}`);
      } else {
        Alert.alert('No Backend Found', 'Could not find any working backend server.');
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
        'Wallet Export',
        `Address: ${wallet.address}\n\n⚠️ IMPORTANT: Keep your private key secure!\n\nPrivate Key: ${wallet.privateKey}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleClearWallet = () => {
    Alert.alert(
      'Clear Wallet',
      'This will delete all wallet data including private keys and employees. This action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearWallet();
              Alert.alert('Success', 'Wallet data cleared');
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Connection Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend Connection</Text>
        
        <View style={[styles.statusCard, isConnected ? styles.connected : styles.disconnected]}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, isConnected ? styles.dotGreen : styles.dotRed]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
          <Text style={styles.currentUrl} numberOfLines={2}>
            {currentUrl}
          </Text>
        </View>

        <Text style={styles.label}>Custom Backend URL</Text>
        <TextInput
          style={styles.input}
          value={customUrl}
          onChangeText={setCustomUrl}
          placeholder="http://192.168.1.33:3001"
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.quickButtons}>
          {quickIpButtons.map((btn) => (
            <TouchableOpacity
              key={btn.label}
              style={styles.quickButton}
              onPress={() => setCustomUrl(btn.ip)}
            >
              <Text style={styles.quickButtonText}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleTestUrl}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Test Connection</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleAutoDiscover}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#0ea5e9" />
          ) : (
            <Text style={styles.secondaryButtonText}>🔍 Auto Discover</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network Help</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How to find your IP address:</Text>
          <Text style={styles.infoText}>
            • Windows: Open CMD and type "ipconfig"{'\n'}
            • Mac: Open Terminal and type "ifconfig"{'\n'}
            • Look for "IPv4 Address" or "inet"
          </Text>
          <Text style={[styles.infoText, { marginTop: 10 }]}>
            Make sure your phone and computer are on the same WiFi network!
          </Text>
        </View>
      </View>

      {/* Wallet Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wallet Management</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleExportWallet}
        >
          <Text style={styles.secondaryButtonText}>📤 Export Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleClearWallet}
        >
          <Text style={styles.buttonText}>🗑️ Clear All Data</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Information</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoRow}>Version: 1.0.0</Text>
          <Text style={styles.infoRow}>Platform: Expo React Native</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  connected: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  disconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dotGreen: {
    backgroundColor: '#22c55e',
  },
  dotRed: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  currentUrl: {
    fontSize: 12,
    color: '#94a3b8',
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#fff',
    marginBottom: 12,
  },
  quickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickButton: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickButtonText: {
    fontSize: 12,
    color: '#0ea5e9',
    fontWeight: '600',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0ea5e9',
  },
  infoCard: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },
  infoRow: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
});

export default SettingsScreen;
