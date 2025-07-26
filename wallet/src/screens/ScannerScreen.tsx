import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Dimensions,
} from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { RNCamera } from 'react-native-camera';
import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ScannerScreenProps {
  navigation: any; // Replace with proper navigation type if using React Navigation
}

interface QRCodeData {
  challenge: string;
  expiresAt: string;
  challengeId: string;
}

interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    did: string;
    userAddress: string;
  };
  error?: string;
  message?: string;
  timestamp: string;
}

type AuthStatus = 'idle' | 'scanning' | 'authenticating' | 'success' | 'error';

const { width, height } = Dimensions.get('window');

/**
 * Utility function to format DID from Ethereum address
 */
const formatDID = (address: string): string => {
  return `did:ethr:${address.toLowerCase()}`;
};

const ScannerScreen: React.FC<ScannerScreenProps> = ({ navigation }) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle');
  const [isScanning, setIsScanning] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [wallet, setWallet] = useState<ethers.HDNodeWallet | ethers.Wallet | null>(null);
  const [userDID, setUserDID] = useState<string>('');

  // Backend API URL - configured for Android testing
  // Use 10.0.2.2 for emulator, or your computer's IP for physical device
  const API_BASE_URL = __DEV__ 
    ? Platform.OS === 'android' 
      ? 'http://10.0.2.2:3001/api'  // Android emulator
      : 'http://localhost:3001/api'  // iOS simulator or other
    : 'http://localhost:3001/api';   // Production

  /**
   * Request camera permissions on component mount
   */
  useEffect(() => {
    requestCameraPermission();
    loadWalletFromStorage();
  }, []);

  /**
   * Request camera permission based on platform
   */
  const requestCameraPermission = async (): Promise<void> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs camera access to scan QR codes for authentication.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        // iOS permissions are handled automatically by react-native-qrcode-scanner
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
      setErrorMessage('Failed to request camera permission');
      setAuthStatus('error');
    }
  };

  /**
   * Load the user's wallet from secure storage
   */
  const loadWalletFromStorage = async (): Promise<void> => {
    try {
      const walletData = await AsyncStorage.getItem('userWallet');
      const didData = await AsyncStorage.getItem('userDID');
      
      if (!walletData || !didData) {
        setErrorMessage('No wallet found. Please create an identity first.');
        setAuthStatus('error');
        return;
      }

      const walletInfo = JSON.parse(walletData);
      const restoredWallet = new ethers.Wallet(walletInfo.privateKey);
      setWallet(restoredWallet);
      setUserDID(didData);
      
      console.log('Wallet loaded successfully:', {
        address: restoredWallet.address,
        did: didData
      });
    } catch (error) {
      console.error('Error loading wallet:', error);
      setErrorMessage('Failed to load wallet from storage');
      setAuthStatus('error');
    }
  };

  /**
   * Handle QR code scan success
   */
  const onSuccess = async (e: any): Promise<void> => {
    if (!isScanning || authStatus === 'authenticating') {
      return;
    }

    setIsScanning(false);
    setAuthStatus('authenticating');

    try {
      // Parse QR code data
      const qrData: QRCodeData = JSON.parse(e.data);
      
      if (!qrData.challenge || !qrData.challengeId) {
        throw new Error('Invalid QR code format. Missing challenge or challengeId.');
      }

      // Check if challenge has expired
      const expiresAt = new Date(qrData.expiresAt);
      if (expiresAt < new Date()) {
        throw new Error('This QR code has expired. Please refresh the login page.');
      }

      console.log('QR Code scanned successfully:', {
        challengeId: qrData.challengeId,
        challenge: qrData.challenge.substring(0, 16) + '...',
        expiresAt: qrData.expiresAt
      });

      await authenticateWithChallenge(qrData.challenge, qrData.challengeId);
      
    } catch (error) {
      console.error('QR code processing error:', error);
      const message = error instanceof Error ? error.message : 'Failed to process QR code';
      setErrorMessage(message);
      setAuthStatus('error');
      
      // Allow scanning again after error
      setTimeout(() => {
        resetScanner();
      }, 3000);
    }
  };

  /**
   * Sign the challenge and authenticate with backend using stored credential
   */
  const authenticateWithChallenge = async (challenge: string, challengeId: string): Promise<void> => {
    if (!wallet || !userDID) {
      throw new Error('Wallet not loaded or DID not found');
    }

    try {
      // Step 1: Sign the challenge using the wallet
      console.log('🔐 Step 1: Signing challenge with wallet:', wallet.address);
      const signature = await wallet.signMessage(challenge);
      
      console.log('✅ Challenge signed successfully');

      // Step 2: Retrieve stored Employee Credential from AsyncStorage
      console.log('📋 Step 2: Retrieving stored Employee Credential');
      const storedCredentials = await AsyncStorage.getItem('verifiableCredentials');
      
      if (!storedCredentials) {
        throw new Error('No stored credentials found. Please obtain an Employee Credential first.');
      }

      const credentials = JSON.parse(storedCredentials);
      
      // Find an active Employee Credential
      const employeeCredential = credentials.find((cred: any) => 
        cred.status === 'active' && 
        cred.credential.type.includes('EmployeeCredential')
      );

      if (!employeeCredential) {
        throw new Error('No valid Employee Credential found. Please contact your HR department.');
      }

      console.log('✅ Employee Credential found:', {
        id: employeeCredential.id,
        employeeId: employeeCredential.credential.credentialSubject.employeeId,
        role: employeeCredential.credential.credentialSubject.role
      });

      // Step 3: Submit enhanced authentication to backend
      console.log('🚀 Step 3: Submitting credential-aware authentication');
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          did: userDID,
          signature: signature,
          credential: employeeCredential.jwt, // Send the JWT string
          challengeId: challengeId,
          message: challenge // Include the original challenge message
        }),
      });

      const result: AuthResponse = await response.json();

      if (response.ok && result.success && result.data) {
        console.log('🎉 Credential-based authentication successful:', {
          did: result.data.did,
          userAddress: result.data.userAddress,
          role: (result.data as any).user?.role,
          isAdmin: (result.data as any).user?.isAdmin,
          tokenLength: result.data.token.length
        });

        // Store enhanced authentication token
        await AsyncStorage.setItem('authToken', result.data.token);
        
        // Store user profile information
        if ((result.data as any).user) {
          await AsyncStorage.setItem('userProfile', JSON.stringify({
            ...((result.data as any).user),
            lastLogin: new Date().toISOString()
          }));
        }
        
        setAuthStatus('success');
        
        // Navigate back or to dashboard after successful auth
        setTimeout(() => {
          Alert.alert(
            'Authentication Successful!',
            `Welcome back, ${(result.data as any).user?.name || 'User'}! Your role (${(result.data as any).user?.role || 'Employee'}) has been verified.`,
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack()
              }
            ]
          );
        }, 2000);
        
      } else {
        throw new Error(result.error || result.message || 'Credential authentication failed');
      }
      
    } catch (error) {
      console.error('❌ Credential authentication error:', error);
      throw error;
    }
  };

  /**
   * Reset scanner to allow scanning again
   */
  const resetScanner = (): void => {
    setAuthStatus('scanning');
    setIsScanning(true);
    setErrorMessage('');
  };

  /**
   * Handle scanner error
   */
  const onScannerError = (error: any): void => {
    console.error('Scanner error:', error);
    setErrorMessage('Camera error occurred. Please try again.');
    setAuthStatus('error');
  };

  /**
   * Render permission denied view
   */
  const renderPermissionDenied = (): JSX.Element => (
    <View style={styles.centerContainer}>
      <Text style={styles.errorText}>Camera permission is required to scan QR codes</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={requestCameraPermission}
      >
        <Text style={styles.retryButtonText}>Request Permission</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render loading view
   */
  const renderLoading = (): JSX.Element => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading camera...</Text>
    </View>
  );

  /**
   * Render authenticating overlay
   */
  const renderAuthenticatingOverlay = (): JSX.Element => (
    <View style={styles.overlay}>
      <View style={styles.overlayContent}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.overlayText}>Authenticating...</Text>
        <Text style={styles.overlaySubtext}>Verifying your signature</Text>
      </View>
    </View>
  );

  /**
   * Render success overlay
   */
  const renderSuccessOverlay = (): JSX.Element => (
    <View style={styles.overlay}>
      <View style={styles.overlayContent}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.overlayText}>Authentication Successful!</Text>
        <Text style={styles.overlaySubtext}>You can now access the web portal</Text>
      </View>
    </View>
  );

  /**
   * Render error overlay
   */
  const renderErrorOverlay = (): JSX.Element => (
    <View style={styles.overlay}>
      <View style={styles.overlayContent}>
        <Text style={styles.errorIcon}>✕</Text>
        <Text style={styles.overlayText}>Authentication Failed</Text>
        <Text style={styles.overlaySubtext}>{errorMessage}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={resetScanner}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Render scanner viewfinder overlay
   */
  const renderScannerOverlay = (): JSX.Element => (
    <View style={styles.scannerOverlay}>
      <View style={styles.topOverlay}>
        <Text style={styles.instructionText}>
          Position the QR code within the frame to authenticate
        </Text>
      </View>
      
      <View style={styles.middleContainer}>
        <View style={styles.sideOverlay} />
        <View style={styles.scanArea}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
        </View>
        <View style={styles.sideOverlay} />
      </View>
      
      <View style={styles.bottomOverlay}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Show loading if permission is being requested
  if (hasPermission === null) {
    return renderLoading();
  }

  // Show permission denied if camera access was denied
  if (hasPermission === false) {
    return renderPermissionDenied();
  }

  return (
    <View style={styles.container}>
      <QRCodeScanner
        onRead={onSuccess}
        showMarker={false}
        cameraStyle={styles.camera}
        topViewStyle={styles.zeroContainer}
        bottomViewStyle={styles.zeroContainer}
        containerStyle={styles.scannerContainer}
      />
      
      {authStatus === 'scanning' && renderScannerOverlay()}
      {authStatus === 'authenticating' && renderAuthenticatingOverlay()}
      {authStatus === 'success' && renderSuccessOverlay()}
      {authStatus === 'error' && renderErrorOverlay()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  scannerContainer: {
    flex: 1,
  },
  camera: {
    height: height,
    width: width,
  },
  zeroContainer: {
    height: 0,
    flex: 0,
  },
  
  // Scanner overlay styles
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  middleContainer: {
    flexDirection: 'row',
    height: 250,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Corner styles for scan area
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: '#007AFF',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderColor: '#007AFF',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#007AFF',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#007AFF',
  },
  
  // Text styles
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
    fontWeight: '500',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Button styles
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Overlay styles
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    maxWidth: 300,
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 15,
  },
  overlaySubtext: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  successIcon: {
    color: '#34C759',
    fontSize: 48,
    fontWeight: 'bold',
  },
  errorIcon: {
    color: '#FF3B30',
    fontSize: 48,
    fontWeight: 'bold',
  },
});

export default ScannerScreen;
