import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface QRScannerProps {
  navigation: any;
}

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
  jwt: string;
  credential: VerifiableCredential;
  addedAt: string;
  status: 'active' | 'expired' | 'revoked';
}

const QRScannerScreen: React.FC<QRScannerProps> = ({ navigation }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingCredential, setPendingCredential] = useState<{
    credential: VerifiableCredential;
    jwt: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Simulate QR code scanning (in real app, this would use camera)
  const simulateQRScan = useCallback(() => {
    setIsScanning(true);
    
    // Simulate scanning delay
    setTimeout(() => {
      setIsScanning(false);
      
      // Mock QR data for demonstration
      const mockQRData = {
        type: 'VC_OFFER',
        credential: 'eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiRW1wbG95ZWVDcmVkZW50aWFsIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOmV0aHI6MHhmZjNkNjdjZWQxMzVmZWU0M2Y5ZjI3YmM3MTQ1MTBlOGY1ZGMzNzNlIiwiZW1wbG95ZWVJZCI6IkVNUDAwMSIsInJvbGUiOiJTZW5pb3IgU29mdHdhcmUgRW5naW5lZXIiLCJkZXBhcnRtZW50IjoiRW5naW5lZXJpbmciLCJuYW1lIjoiSm9obiBEb2UiLCJlbWFpbCI6ImpvaG4uZG9lQGNvbXBhbnkuY29tIn0sImlzc3VlciI6ImRpZDpldGhyOjB4NzA5OTc5NzBjNTE4MTJkYzNhMDEwYzdkMDFiNTBlMGQxN2RjNzljOCIsImlzc3VhbmNlRGF0ZSI6IjIwMjUtMDctMjRUMTg6MDA6MDBaIiwiZXhwaXJhdGlvbkRhdGUiOiIyMDI2LTA3LTI0VDE4OjAwOjAwWiJ9LCJpc3MiOiJkaWQ6ZXRocjoweDA5OTc5NzBjNTE4MTJkYzNhMDEwYzdkMDFiNTBlMGQxN2RjNzljOCIsInN1YiI6ImRpZDpldGhyOjB4ZmYzZDY3Y2VkMTM1ZmVlNDNmOWYyN2JjNzE0NTEwZThmNWRjMzczZSIsImlhdCI6MTcyMTgzNjgwMCwiZXhwIjoxNzUzMzcyODAwfQ.mockSignature'
      };
      
      handleQRData(JSON.stringify(mockQRData));
    }, 2000);
  }, []);

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

  const handleQRData = async (data: string) => {
    try {
      setIsProcessing(true);
      
      const qrData = JSON.parse(data);
      
      if (qrData.type === 'VC_OFFER' && qrData.credential) {
        const credential = parseJWTPayload(qrData.credential);
        
        if (credential) {
          setPendingCredential({
            credential,
            jwt: qrData.credential
          });
          setShowPreview(true);
        } else {
          throw new Error('Invalid credential format');
        }
      } else {
        // Handle other QR types (authentication, etc.)
        Alert.alert('QR Code Scanned', 'This QR code type is not yet supported.');
      }
    } catch (error) {
      console.error('Error processing QR data:', error);
      Alert.alert('Error', 'Invalid QR code format');
    } finally {
      setIsProcessing(false);
    }
  };

  const acceptCredential = async () => {
    if (!pendingCredential) return;
    
    try {
      setIsProcessing(true);
      
      // Get existing credentials
      const existingCredentials = await AsyncStorage.getItem('verifiableCredentials');
      const credentials: StoredCredential[] = existingCredentials ? JSON.parse(existingCredentials) : [];
      
      // Create new credential entry
      const newCredential: StoredCredential = {
        id: `vc-${Date.now()}`,
        jwt: pendingCredential.jwt,
        credential: pendingCredential.credential,
        addedAt: new Date().toISOString(),
        status: 'active'
      };
      
      // Add to credentials array
      const updatedCredentials = [newCredential, ...credentials];
      
      // Save to storage
      await AsyncStorage.setItem('verifiableCredentials', JSON.stringify(updatedCredentials));
      
      // Close preview and show success
      setShowPreview(false);
      setPendingCredential(null);
      
      Alert.alert(
        'Credential Added!',
        `Your ${pendingCredential.credential.type.includes('EmployeeCredential') ? 'Employee' : 'Professional'} Credential has been successfully added to your wallet.`,
        [
          {
            text: 'View Credentials',
            onPress: () => navigation.navigate('Credentials')
          },
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
      
    } catch (error) {
      console.error('Error accepting credential:', error);
      Alert.alert('Error', 'Failed to add credential to wallet');
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectCredential = () => {
    Alert.alert(
      'Reject Credential',
      'Are you sure you want to reject this credential?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            setShowPreview(false);
            setPendingCredential(null);
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
        <Text style={styles.headerTitle}>QR Scanner</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {/* Scanner Area */}
        <View style={styles.scannerContainer}>
          <View style={styles.scannerFrame}>
            {isScanning ? (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.scanningText}>Scanning...</Text>
              </View>
            ) : (
              <View style={styles.scannerPlaceholder}>
                <Text style={styles.scannerIcon}>📱</Text>
                <Text style={styles.scannerTitle}>Ready to Scan</Text>
                <Text style={styles.scannerSubtitle}>Position QR code within the frame</Text>
              </View>
            )}
            
            {/* Scanner frame overlay */}
            <View style={styles.frameOverlay}>
              <View style={styles.frameCorner} />
              <View style={[styles.frameCorner, styles.topRight]} />
              <View style={[styles.frameCorner, styles.bottomLeft]} />
              <View style={[styles.frameCorner, styles.bottomRight]} />
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>How to scan:</Text>
          <Text style={styles.instructionsText}>
            • Position the QR code within the frame{'\n'}
            • Keep your device steady{'\n'}
            • Ensure good lighting
          </Text>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
          onPress={simulateQRScan}
          disabled={isScanning || isProcessing}
        >
          {isScanning ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.scanButtonText}>Demo: Simulate Scan</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Credential Preview Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPreview}
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {pendingCredential && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Credential Received</Text>
                  <Text style={styles.modalSubtitle}>Review and accept this credential</Text>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.credentialPreview}>
                    <View style={styles.credentialIconContainer}>
                      <Text style={styles.credentialIcon}>🎫</Text>
                    </View>
                    
                    <Text style={styles.credentialType}>
                      {pendingCredential.credential.type.includes('EmployeeCredential') 
                        ? 'Employee Credential' 
                        : 'Professional Credential'}
                    </Text>

                    <View style={styles.credentialDetails}>
                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Personal Information</Text>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Name:</Text>
                          <Text style={styles.detailValue}>{pendingCredential.credential.credentialSubject.name}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Employee ID:</Text>
                          <Text style={styles.detailValue}>{pendingCredential.credential.credentialSubject.employeeId}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Email:</Text>
                          <Text style={styles.detailValue}>{pendingCredential.credential.credentialSubject.email}</Text>
                        </View>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Position</Text>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Role:</Text>
                          <Text style={styles.detailValue}>{pendingCredential.credential.credentialSubject.role}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Department:</Text>
                          <Text style={styles.detailValue}>{pendingCredential.credential.credentialSubject.department}</Text>
                        </View>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Credential Info</Text>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Issued by:</Text>
                          <Text style={styles.detailValue}>{pendingCredential.credential.issuer}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Issue Date:</Text>
                          <Text style={styles.detailValue}>{formatDate(pendingCredential.credential.issuanceDate)}</Text>
                        </View>
                        {pendingCredential.credential.expirationDate && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Expires:</Text>
                            <Text style={styles.detailValue}>{formatDate(pendingCredential.credential.expirationDate)}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={rejectCredential}
                    disabled={isProcessing}
                  >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.acceptButton, isProcessing && styles.acceptButtonDisabled]}
                    onPress={acceptCredential}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.acceptButtonText}>Accept Credential</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scannerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  scannerFrame: {
    width: width - 80,
    height: width - 80,
    backgroundColor: '#000000',
    borderRadius: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningOverlay: {
    alignItems: 'center',
  },
  scanningText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  scannerPlaceholder: {
    alignItems: 'center',
  },
  scannerIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scannerSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  frameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  frameCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#6366F1',
    borderWidth: 3,
    top: 20,
    left: 20,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 20,
    right: 20,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 20,
    left: 20,
    top: 'auto',
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  bottomRight: {
    bottom: 20,
    right: 20,
    top: 'auto',
    left: 'auto',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  instructions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  scanButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
    maxHeight: '85%',
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  modalBody: {
    padding: 24,
  },
  credentialPreview: {
    alignItems: 'center',
  },
  credentialIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  credentialIcon: {
    fontSize: 32,
  },
  credentialType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
  },
  credentialDetails: {
    width: '100%',
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 2,
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptButton: {
    flex: 2,
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default QRScannerScreen;
