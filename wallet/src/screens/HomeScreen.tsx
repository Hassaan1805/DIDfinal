import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useWallet } from '../context/WalletContext';
import { useNetwork } from '../context/NetworkContext';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { address, did, employees, isInitialized } = useWallet();
  const { currentUrl, isConnected, refreshConnection } = useNetwork();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshConnection();
    setRefreshing(false);
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Initializing wallet...</Text>
      </View>
    );
  }

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>DID Wallet</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Connection Status */}
      <View style={[styles.statusCard, isConnected ? styles.connected : styles.disconnected]}>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, isConnected ? styles.dotGreen : styles.dotRed]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        <Text style={styles.urlText} numberOfLines={1}>
          {currentUrl}
        </Text>
      </View>

      {/* Wallet Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Wallet</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>{address ? formatAddress(address) : 'N/A'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>DID:</Text>
          <Text style={styles.value} numberOfLines={1}>
            {did || 'N/A'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Employees:</Text>
          <Text style={styles.value}>{employees.length}</Text>
        </View>
      </View>

      {/* Employees List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Employees</Text>
        
        {employees.length === 0 ? (
          <Text style={styles.emptyText}>No employees added yet</Text>
        ) : (
          employees.map((employee) => (
            <View key={employee.id} style={styles.employeeCard}>
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{employee.name}</Text>
                <Text style={styles.employeeRole}>{employee.role}</Text>
              </View>
              <Text style={styles.employeeDid} numberOfLines={1}>
                {employee.did}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        style={[styles.button, !isConnected && styles.buttonDisabled]}
        onPress={() => navigation.navigate('QRScanner')}
        disabled={!isConnected}
      >
        <Text style={styles.buttonText}>📷 Scan QR Code</Text>
      </TouchableOpacity>

      {!isConnected && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            ⚠️ Not connected to backend. Please check your network settings.
          </Text>
          <TouchableOpacity style={styles.reconnectButton} onPress={onRefresh}>
            <Text style={styles.reconnectText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#94a3b8',
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
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
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
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
  urlText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
  },
  value: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    maxWidth: '60%',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  employeeCard: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  employeeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  employeeRole: {
    fontSize: 14,
    color: '#0ea5e9',
  },
  employeeDid: {
    fontSize: 12,
    color: '#64748b',
  },
  button: {
    backgroundColor: '#0ea5e9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  warningCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
    marginTop: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#fbbf24',
    textAlign: 'center',
    marginBottom: 12,
  },
  reconnectButton: {
    backgroundColor: '#fbbf24',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reconnectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});

export default HomeScreen;
