import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { ethers, HDNodeWallet, Wallet } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CreateIdentityScreenProps {
  navigation: any; // Replace with proper navigation type if using React Navigation
}

interface CreateIdentityResponse {
  success: boolean;
  data?: {
    did: string;
    userAddress: string;
    publicKey: string;
    transaction: {
      hash: string;
      blockNumber: number;
      gasUsed: string;
    };
  };
  error?: string;
  message?: string;
  timestamp: string;
}

const CreateIdentityScreen: React.FC<CreateIdentityScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [wallet, setWallet] = useState<HDNodeWallet | Wallet | null>(null);
  const [didCreated, setDidCreated] = useState<string | null>(null);

  // Backend API URL - should be configurable
  const API_BASE_URL = 'http://localhost:3001/api';

  /**
   * Generate a new Ethereum wallet with private/public key pair
   */
  const generateWallet = (): HDNodeWallet => {
    const newWallet = ethers.Wallet.createRandom();
    setWallet(newWallet);
    return newWallet;
  };

  /**
   * Create DID on-chain using the backend gas station API
   */
  const createDID = async (): Promise<void> => {
    if (!wallet) {
      Alert.alert('Error', 'Please generate a wallet first');
      return;
    }

    setIsLoading(true);

    try {
      // Get the compressed public key from the wallet's signing key
      const signingKey = wallet.signingKey;
      const publicKey = signingKey.compressedPublicKey;
      
      console.log('Creating DID for:', {
        address: wallet.address,
        publicKey: publicKey
      });

      const response = await fetch(`${API_BASE_URL}/did/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: wallet.address,
          publicKey: publicKey
        }),
      });

      const result: CreateIdentityResponse = await response.json();

      if (response.ok && result.success && result.data) {
        setDidCreated(result.data.did);
        
        // Save wallet and DID to storage
        await saveWalletToStorage(wallet, result.data.did);
        
        Alert.alert(
          'Success!',
          `Identity created successfully!\n\nDID: ${result.data.did}\n\nTransaction: ${result.data.transaction.hash}`,
          [
            {
              text: 'View Details',
              onPress: () => showDIDDetails(result.data!)
            },
            {
              text: 'Go to Home',
              onPress: () => navigation.navigate('Home'),
              style: 'default'
            }
          ]
        );

        // Save wallet and DID to AsyncStorage
        await saveWalletToStorage(wallet, result.data.did);
      } else {
        throw new Error(result.error || 'Failed to create DID');
      }
    } catch (error: any) {
      console.error('DID creation error:', error);
      Alert.alert(
        'Error',
        `Failed to create DID: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Save wallet data to AsyncStorage
   */
  const saveWalletToStorage = async (walletInstance: HDNodeWallet | Wallet, did: string): Promise<void> => {
    try {
      const walletData = {
        address: walletInstance.address,
        privateKey: walletInstance.privateKey,
        publicKey: walletInstance.signingKey.compressedPublicKey,
      };
      
      await AsyncStorage.setItem('userWallet', JSON.stringify(walletData));
      await AsyncStorage.setItem('userDID', did);
      
      console.log('Wallet and DID saved to storage successfully');
    } catch (error) {
      console.error('Error saving wallet to storage:', error);
      throw new Error('Failed to save wallet data');
    }
  };

  /**
   * Show detailed information about the created DID
   */
  const showDIDDetails = (data: NonNullable<CreateIdentityResponse['data']>): void => {
    Alert.alert(
      'DID Details',
      `DID: ${data.did}\n\nAddress: ${data.userAddress}\n\nPublic Key: ${data.publicKey}\n\nTransaction Hash: ${data.transaction.hash}\n\nBlock Number: ${data.transaction.blockNumber}\n\nGas Used: ${data.transaction.gasUsed}`,
      [{ text: 'OK' }]
    );
  };

  /**
   * Import an existing wallet from private key
   */
  const importWallet = (): void => {
    Alert.prompt(
      'Import Wallet',
      'Enter your private key (64 hex characters):',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Import',
          onPress: (privateKey?: string) => {
            if (!privateKey || privateKey.trim().length === 0) {
              Alert.alert('Error', 'Private key is required');
              return;
            }

            try {
              // Add 0x prefix if not present
              const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
              const importedWallet = new ethers.Wallet(formattedKey);
              setWallet(importedWallet);
              Alert.alert('Success', `Wallet imported successfully!\n\nAddress: ${importedWallet.address}`);
            } catch (error: any) {
              Alert.alert('Error', `Invalid private key: ${error.message}`);
            }
          }
        }
      ],
      'secure-text'
    );
  };

  /**
   * Reset the current session
   */
  const resetSession = (): void => {
    setWallet(null);
    setDidCreated(null);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Identity</Text>
          <Text style={styles.subtitle}>
            Generate a new decentralized identity on the blockchain
          </Text>
        </View>

        {/* Wallet Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 1: Wallet Setup</Text>
          
          {wallet ? (
            <View style={styles.walletInfo}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.addressText}>{wallet.address}</Text>
              
              <Text style={styles.label}>Public Key:</Text>
              <Text style={styles.publicKeyText}>{wallet.signingKey.compressedPublicKey}</Text>
              
              <TouchableOpacity style={styles.resetButton} onPress={resetSession}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.walletActions}>
              <TouchableOpacity style={styles.primaryButton} onPress={generateWallet}>
                <Text style={styles.primaryButtonText}>Generate New Wallet</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton} onPress={importWallet}>
                <Text style={styles.secondaryButtonText}>Import Existing Wallet</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* DID Creation Section */}
        {wallet && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 2: Create DID</Text>
            <Text style={styles.sectionDescription}>
              Register your identity on the blockchain using our gas station service
            </Text>
            
            {didCreated ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>✅ DID Created Successfully!</Text>
                <Text style={styles.didText}>{didCreated}</Text>
                <TouchableOpacity style={styles.viewButton} onPress={() => {
                  // Navigate to DID details or profile screen
                  Alert.alert('Navigation', 'Navigate to DID profile screen');
                }}>
                  <Text style={styles.viewButtonText}>View My Profile</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.primaryButton, isLoading && styles.disabledButton]} 
                onPress={createDID}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.primaryButtonText}>Creating DID...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>Create My DID</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About DIDs</Text>
          <Text style={styles.infoText}>
            Decentralized Identifiers (DIDs) give you complete control over your digital identity. 
            No central authority can revoke or control your DID - it's truly yours.
          </Text>
          <Text style={styles.infoText}>
            • Cryptographically secure
            • Globally resolvable
            • Completely decentralized
            • Interoperable across platforms
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  walletInfo: {
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#007AFF',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6,
  },
  publicKeyText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#007AFF',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6,
  },
  walletActions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 12,
  },
  didText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#007AFF',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    marginBottom: 16,
  },
  viewButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default CreateIdentityScreen;
