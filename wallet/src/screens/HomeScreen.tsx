import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HomeScreenProps {
  navigation: any; // Replace with proper navigation type if using React Navigation
}

interface UserInfo {
  did: string;
  address: string;
  hasWallet: boolean;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserInfo();
  }, []);

  /**
   * Load user information from storage
   */
  const loadUserInfo = async (): Promise<void> => {
    try {
      const walletData = await AsyncStorage.getItem('userWallet');
      const didData = await AsyncStorage.getItem('userDID');
      
      if (walletData && didData) {
        const wallet = JSON.parse(walletData);
        setUserInfo({
          did: didData,
          address: wallet.address || 'Unknown',
          hasWallet: true,
        });
      } else {
        setUserInfo({
          did: '',
          address: '',
          hasWallet: false,
        });
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      setUserInfo({
        did: '',
        address: '',
        hasWallet: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navigate to Scanner Screen
   */
  const navigateToScanner = (): void => {
    if (!userInfo?.hasWallet) {
      Alert.alert(
        'Identity Required',
        'You need to create an identity first before you can authenticate.',
        [
          {
            text: 'Create Identity',
            onPress: () => navigation.navigate('CreateIdentity'),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    navigation.navigate('Scanner');
  };

  /**
   * Navigate to Create Identity Screen
   */
  const navigateToCreateIdentity = (): void => {
    navigation.navigate('CreateIdentity');
  };

  /**
   * Clear stored data (for testing/reset)
   */
  const clearData = (): void => {
    Alert.alert(
      'Clear All Data',
      'This will remove your identity and all stored data. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['userWallet', 'userDID', 'authToken']);
              setUserInfo({
                did: '',
                address: '',
                hasWallet: false,
              });
              Alert.alert('Success', 'All data has been cleared.');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data.');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Trust Wallet</Text>
          <Text style={styles.subtitle}>Decentralized Identity & Authentication</Text>
        </View>

        {/* User Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Identity Status</Text>
          {userInfo?.hasWallet ? (
            <View style={styles.statusContent}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>✓ Active</Text>
                </View>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>DID:</Text>
                <Text style={styles.statusValue} numberOfLines={1} ellipsizeMode="middle">
                  {userInfo.did}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Address:</Text>
                <Text style={styles.statusValue} numberOfLines={1} ellipsizeMode="middle">
                  {userInfo.address}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.statusContent}>
              <Text style={styles.noIdentityText}>No identity created yet</Text>
              <Text style={styles.noIdentitySubtext}>
                Create a decentralized identity to start using authentication features
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {userInfo?.hasWallet ? (
            <>
              {/* Primary Action - Scan QR Code */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={navigateToScanner}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>📱 Scan to Login</Text>
                <Text style={styles.primaryButtonSubtext}>
                  Scan QR code to authenticate with web portal
                </Text>
              </TouchableOpacity>

              {/* Secondary Actions */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('CreateIdentity')}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>View Identity Details</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Create Identity Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={navigateToCreateIdentity}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>🆔 Create Identity</Text>
                <Text style={styles.primaryButtonSubtext}>
                  Generate your decentralized identity
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Developer Options */}
          <View style={styles.developerSection}>
            <Text style={styles.developerTitle}>Developer Options</Text>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={clearData}
              activeOpacity={0.8}
            >
              <Text style={styles.dangerButtonText}>Clear All Data</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoStep}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Create your decentralized identity</Text>
          </View>
          <View style={styles.infoStep}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Visit the web portal login page</Text>
          </View>
          <View style={styles.infoStep}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Scan the QR code with this app</Text>
          </View>
          <View style={styles.infoStep}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>Authenticate instantly without passwords</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  
  // Header styles
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  
  // Status Card styles
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  statusContent: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    minWidth: 60,
  },
  statusValue: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  statusBadge: {
    backgroundColor: '#d1ecf1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#0c5460',
    fontWeight: '600',
  },
  noIdentityText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 5,
  },
  noIdentitySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Action buttons
  actionsContainer: {
    gap: 15,
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 5,
  },
  primaryButtonSubtext: {
    fontSize: 14,
    color: '#b3d9ff',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  
  // Developer section
  developerSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  developerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 10,
  },
  dangerButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  
  // Info section
  infoSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#007AFF',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  stepText: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
    lineHeight: 20,
  },
  
  // Loading
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 10,
  },
});

export default HomeScreen;
