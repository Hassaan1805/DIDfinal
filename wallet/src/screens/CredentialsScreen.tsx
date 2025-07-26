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
  Modal,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface VerifiableCredential {
  '@context': string[];
  type: string[];
  credentialSubject: {
    id: string;
    employeeId: string;
    role: string;
    department: string;
    name: string;
    email: string;
  };
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
}

interface StoredCredential {
  id: string;
  jwt: string; // The full JWT token
  credential: VerifiableCredential; // Decoded credential
  addedAt: string;
  status: 'active' | 'expired' | 'revoked';
}

interface CredentialsScreenProps {
  navigation: any;
}

const CredentialsScreen: React.FC<CredentialsScreenProps> = ({ navigation }) => {
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCredential, setSelectedCredential] = useState<StoredCredential | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadStoredCredentials();
  }, []);

  const loadStoredCredentials = async () => {
    try {
      setIsLoading(true);
      const storedCredentials = await AsyncStorage.getItem('verifiableCredentials');
      
      if (storedCredentials) {
        const parsedCredentials: StoredCredential[] = JSON.parse(storedCredentials);
        
        // Update status based on expiration
        const updatedCredentials = parsedCredentials.map(cred => {
          if (cred.credential.expirationDate) {
            const isExpired = new Date(cred.credential.expirationDate) < new Date();
            return {
              ...cred,
              status: isExpired ? 'expired' : cred.status
            } as StoredCredential;
          }
          return cred;
        });
        
        setCredentials(updatedCredentials);
        
        // Save updated credentials back to storage
        await AsyncStorage.setItem('verifiableCredentials', JSON.stringify(updatedCredentials));
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      Alert.alert('Error', 'Failed to load credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const parseJWTPayload = (jwt: string): VerifiableCredential | null => {
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1]));
      return payload.vc;
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  };

  const addCredential = async (jwt: string): Promise<boolean> => {
    try {
      const credential = parseJWTPayload(jwt);
      if (!credential) {
        throw new Error('Invalid credential format');
      }

      const newCredential: StoredCredential = {
        id: `vc-${Date.now()}`,
        jwt,
        credential,
        addedAt: new Date().toISOString(),
        status: 'active'
      };

      const updatedCredentials = [newCredential, ...credentials];
      setCredentials(updatedCredentials);
      
      await AsyncStorage.setItem('verifiableCredentials', JSON.stringify(updatedCredentials));
      
      Alert.alert(
        'Credential Added!',
        `Your ${credential.type.includes('EmployeeCredential') ? 'Employee' : 'Professional'} Credential has been successfully added to your wallet.`
      );
      
      return true;
    } catch (error) {
      console.error('Error adding credential:', error);
      Alert.alert('Error', 'Failed to add credential');
      return false;
    }
  };

  const removeCredential = async (credentialId: string) => {
    Alert.alert(
      'Remove Credential',
      'Are you sure you want to remove this credential from your wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedCredentials = credentials.filter(cred => cred.id !== credentialId);
              setCredentials(updatedCredentials);
              await AsyncStorage.setItem('verifiableCredentials', JSON.stringify(updatedCredentials));
              setModalVisible(false);
              setSelectedCredential(null);
            } catch (error) {
              console.error('Error removing credential:', error);
              Alert.alert('Error', 'Failed to remove credential');
            }
          }
        }
      ]
    );
  };

  const getCredentialIcon = (types: string[]) => {
    if (types.includes('EmployeeCredential')) {
      return '👨‍💼';
    }
    return '🎫';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'expired': return '#F59E0B';
      case 'revoked': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const openCredentialDetails = (credential: StoredCredential) => {
    setSelectedCredential(credential);
    setModalVisible(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading credentials...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Credentials</Text>
        <View style={styles.headerRight}>
          <Text style={styles.credentialCount}>{credentials.length}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {credentials.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyTitle}>No Credentials Yet</Text>
            <Text style={styles.emptyDescription}>
              Your verifiable credentials will appear here once you receive them from authorized issuers.
            </Text>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={() => navigation.navigate('QRScanner')}
            >
              <Text style={styles.scanButtonText}>Scan QR Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.credentialsList}>
            {credentials.map((credential) => (
              <TouchableOpacity
                key={credential.id}
                style={styles.credentialCard}
                onPress={() => openCredentialDetails(credential)}
              >
                <View style={styles.credentialHeader}>
                  <View style={styles.credentialIcon}>
                    <Text style={styles.credentialIconText}>
                      {getCredentialIcon(credential.credential.type)}
                    </Text>
                  </View>
                  <View style={styles.credentialInfo}>
                    <Text style={styles.credentialType}>
                      {credential.credential.type.includes('EmployeeCredential') 
                        ? 'Employee Credential' 
                        : 'Professional Credential'}
                    </Text>
                    <Text style={styles.credentialSubject}>
                      {credential.credential.credentialSubject.name}
                    </Text>
                  </View>
                  <View 
                    style={[
                      styles.statusIndicator, 
                      { backgroundColor: getStatusColor(credential.status) }
                    ]}
                  />
                </View>
                
                <View style={styles.credentialDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Role:</Text>
                    <Text style={styles.detailValue}>{credential.credential.credentialSubject.role}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Department:</Text>
                    <Text style={styles.detailValue}>{credential.credential.credentialSubject.department}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Issued:</Text>
                    <Text style={styles.detailValue}>{formatDate(credential.credential.issuanceDate)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Credential Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedCredential && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Credential Details</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalCloseText}>×</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalCredentialHeader}>
                    <Text style={styles.modalCredentialIcon}>
                      {getCredentialIcon(selectedCredential.credential.type)}
                    </Text>
                    <Text style={styles.modalCredentialType}>
                      {selectedCredential.credential.type.includes('EmployeeCredential') 
                        ? 'Employee Credential' 
                        : 'Professional Credential'}
                    </Text>
                    <View 
                      style={[
                        styles.modalStatusBadge, 
                        { backgroundColor: getStatusColor(selectedCredential.status) }
                      ]}
                    >
                      <Text style={styles.modalStatusText}>{selectedCredential.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailsSection}>
                    <Text style={styles.modalSectionTitle}>Personal Information</Text>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Name:</Text>
                      <Text style={styles.modalDetailValue}>{selectedCredential.credential.credentialSubject.name}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Employee ID:</Text>
                      <Text style={styles.modalDetailValue}>{selectedCredential.credential.credentialSubject.employeeId}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Email:</Text>
                      <Text style={styles.modalDetailValue}>{selectedCredential.credential.credentialSubject.email}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailsSection}>
                    <Text style={styles.modalSectionTitle}>Position Details</Text>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Role:</Text>
                      <Text style={styles.modalDetailValue}>{selectedCredential.credential.credentialSubject.role}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Department:</Text>
                      <Text style={styles.modalDetailValue}>{selectedCredential.credential.credentialSubject.department}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailsSection}>
                    <Text style={styles.modalSectionTitle}>Credential Information</Text>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Issuer:</Text>
                      <Text style={styles.modalDetailValue}>{selectedCredential.credential.issuer}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Issued Date:</Text>
                      <Text style={styles.modalDetailValue}>{formatDate(selectedCredential.credential.issuanceDate)}</Text>
                    </View>
                    {selectedCredential.credential.expirationDate && (
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Expires:</Text>
                        <Text style={styles.modalDetailValue}>{formatDate(selectedCredential.credential.expirationDate)}</Text>
                      </View>
                    )}
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Added to Wallet:</Text>
                      <Text style={styles.modalDetailValue}>{formatDate(selectedCredential.addedAt)}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeCredential(selectedCredential.id)}
                  >
                    <Text style={styles.removeButtonText}>Remove from Wallet</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Export the addCredential function for use in QR scanner
export { CredentialsScreen };
export type { StoredCredential, VerifiableCredential };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#6366F1',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerRight: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  credentialCount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  scanButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  credentialsList: {
    gap: 16,
  },
  credentialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
  credentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  credentialIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  credentialIconText: {
    fontSize: 24,
  },
  credentialInfo: {
    flex: 1,
  },
  credentialType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  credentialSubject: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  credentialDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#6B7280',
  },
  modalBody: {
    padding: 24,
  },
  modalCredentialHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  modalCredentialIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalCredentialType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalDetailsSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  modalDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 2,
    textAlign: 'right',
  },
  removeButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CredentialsScreen;
