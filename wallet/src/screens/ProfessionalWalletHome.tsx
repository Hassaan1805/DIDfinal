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
  StatusBar,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ZKProofService from '../services/ZKProofService';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: any;
}

interface UserProfile {
  did: string;
  address: string;
  hasWallet: boolean;
  name?: string;
  company?: string;
  employeeId?: string;
  totalAuthentications?: number;
  securityLevel: 'high' | 'medium' | 'low';
}

interface RecentActivity {
  id: string;
  type: 'authentication' | 'identity_created' | 'company_access';
  company: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  details: string;
}

const ProfessionalHomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  
  // ZK-Proof related state
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [lastAuthTime, setLastAuthTime] = useState<string>('');

  const zkProofService = ZKProofService.getInstance();

  useEffect(() => {
    loadUserProfile();
    updateTime();
    checkPremiumAccess();
    const timeInterval = setInterval(updateTime, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const updateTime = () => {
    const now = new Date();
    setCurrentTime(now.toLocaleString('en-US', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    }));
  };

  const loadUserProfile = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const [walletData, didData, profileData] = await Promise.all([
        AsyncStorage.getItem('userWallet'),
        AsyncStorage.getItem('userDID'),
        AsyncStorage.getItem('userProfile')
      ]);
      
      if (walletData && didData) {
        const wallet = JSON.parse(walletData);
        const profile = profileData ? JSON.parse(profileData) : {};
        
        const userProfile: UserProfile = {
          did: didData,
          address: wallet.address || 'Unknown',
          hasWallet: true,
          name: profile.name || 'Professional User',
          company: profile.company || 'Decentralized Trust Platform',
          employeeId: profile.employeeId || 'EMP001',
          totalAuthentications: profile.totalAuthentications || 12,
          securityLevel: 'high'
        };
        
        setUserProfile(userProfile);
        
        // Mock recent activity for demo
        const mockActivity: RecentActivity[] = [
          {
            id: '1',
            type: 'authentication',
            company: 'Decentralized Trust Platform',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            status: 'success',
            details: 'Portal access granted'
          },
          {
            id: '2',
            type: 'company_access',
            company: 'TechCorp Inc.',
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            status: 'success',
            details: 'Financial data access'
          },
          {
            id: '3',
            type: 'authentication',
            company: 'Startup Hub',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            status: 'success',
            details: 'Meeting room access'
          }
        ];
        setRecentActivity(mockActivity);
      } else {
        setUserProfile({
          did: '',
          address: '',
          hasWallet: false,
          securityLevel: 'low'
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUserProfile({
        did: '',
        address: '',
        hasWallet: false,
        securityLevel: 'low'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToScanner = (): void => {
    if (!userProfile?.hasWallet) {
      Alert.alert(
        'Digital Identity Required',
        'Create your secure digital identity to start authenticating with companies and organizations.',
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

  const navigateToCreateIdentity = (): void => {
    navigation.navigate('CreateIdentity');
  };

  // ZK-Proof related methods
  
  /**
   * Check if user has premium access from stored anonymous token
   */
  const checkPremiumAccess = async (): Promise<void> => {
    try {
      const hasAccess = await zkProofService.hasPremiumAccess();
      setHasPremiumAccess(hasAccess);

      if (hasAccess) {
        const authTime = await zkProofService.getLastAuthenticationTime();
        if (authTime) {
          setLastAuthTime(new Date(authTime).toLocaleString());
        }
      }
    } catch (error) {
      console.error('Error checking premium access:', error);
      setHasPremiumAccess(false);
    }
  };

  /**
   * Handle "Unlock Premium Content" button press
   * This initiates the complete ZK-proof authentication flow
   */
  const handleUnlockPremiumContent = async (): Promise<void> => {
    if (!userProfile?.hasWallet) {
      Alert.alert(
        'Digital Identity Required',
        'You need a digital identity to generate zero-knowledge proofs. Create one first.',
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

    // Show confirmation dialog explaining the process
    Alert.alert(
      'Generate Zero-Knowledge Proof',
      'This will prove you own a Corporate Excellence 2025 NFT without revealing your wallet address. The process may take 10-30 seconds.',
      [
        {
          text: 'Continue',
          onPress: () => performZKProofAuthentication(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  /**
   * Perform the complete ZK-proof authentication flow
   */
  const performZKProofAuthentication = async (): Promise<void> => {
    setIsGeneratingProof(true);

    try {
      // Get the user's private key from secure storage
      const privateKey = await AsyncStorage.getItem('userPrivateKey');
      
      if (!privateKey) {
        throw new Error('Private key not found. Please recreate your identity.');
      }

      console.log('🚀 Starting ZK-proof authentication flow...');

      // Perform the complete authentication flow
      const result = await zkProofService.authenticateWithZKProof(privateKey);

      if (result.success) {
        // Update premium access status
        setHasPremiumAccess(true);
        
        if (result.details?.timestamp) {
          setLastAuthTime(new Date(result.details.timestamp).toLocaleString());
        }

        // Show success message
        Alert.alert(
          'Success! 🎉',
          result.message,
          [
            {
              text: 'View Premium Content',
              onPress: () => navigation.navigate('PremiumAccess'),
            },
            {
              text: 'OK',
              style: 'default',
            },
          ]
        );

        console.log('✅ ZK-proof authentication completed successfully');
        console.log('   - Access Level:', result.details?.accessLevel);
        console.log('   - Expires In:', result.details?.expiresIn);
        console.log('   - Verification Time:', result.details?.verificationTime);

      } else {
        throw new Error(result.error || 'Authentication failed');
      }

    } catch (error) {
      console.error('💥 ZK-proof authentication error:', error);
      
      Alert.alert(
        'Authentication Failed',
        `${error.message}\n\nPlease ensure you own a Corporate Excellence 2025 NFT and try again.`,
        [{ text: 'OK' }]
      );
      
      setHasPremiumAccess(false);
    } finally {
      setIsGeneratingProof(false);
    }
  };

  /**
   * Navigate to Premium Access screen
   */
  const navigateToPremiumAccess = (): void => {
    navigation.navigate('PremiumAccess');
  };

  /**
   * Clear premium access and stored tokens
   */
  const handleClearPremiumAccess = async (): Promise<void> => {
    Alert.alert(
      'Clear Premium Access',
      'This will remove your stored anonymous access token. You will need to generate a new proof to access premium content.',
      [
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await zkProofService.clearStoredData();
              setHasPremiumAccess(false);
              setLastAuthTime('');
              Alert.alert('Success', 'Premium access cleared successfully.');
            } catch (error) {
              console.error('Error clearing premium access:', error);
              Alert.alert('Error', 'Failed to clear premium access.');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diffInHours = Math.floor((now - time) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading your digital identity...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.timeText}>{currentTime}</Text>
            </View>
            <TouchableOpacity style={styles.settingsButton}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
          
          {userProfile?.hasWallet ? (
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {userProfile.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{userProfile.name}</Text>
                <Text style={styles.profileCompany}>{userProfile.company}</Text>
                <View style={styles.securityBadge}>
                  <Text style={styles.securityIcon}>🛡️</Text>
                  <Text style={styles.securityText}>Verified Identity</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.noIdentitySection}>
              <Text style={styles.noIdentityIcon}>👤</Text>
              <Text style={styles.noIdentityTitle}>No Digital Identity</Text>
              <Text style={styles.noIdentitySubtitle}>Create your secure identity to get started</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Credentials */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Credentials</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('Credentials')}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.credentialsCard}
            onPress={() => navigation.navigate('Credentials')}
          >
            <View style={styles.credentialsIconContainer}>
              <Text style={styles.credentialsIcon}>🎫</Text>
            </View>
            <View style={styles.credentialsInfo}>
              <Text style={styles.credentialsTitle}>Verifiable Credentials</Text>
              <Text style={styles.credentialsSubtitle}>Tap to view and manage your credentials</Text>
            </View>
            <Text style={styles.credentialsArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={[styles.actionCard, styles.scanCard]} onPress={navigateToScanner}>
              <Text style={styles.actionIcon}>📱</Text>
              <Text style={styles.actionTitle}>Scan QR</Text>
              <Text style={styles.actionSubtitle}>Authenticate with companies</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, userProfile?.hasWallet ? styles.manageCard : styles.createCard]} 
              onPress={navigateToCreateIdentity}
            >
              <Text style={styles.actionIcon}>
                {userProfile?.hasWallet ? '⚡' : '➕'}
              </Text>
              <Text style={styles.actionTitle}>
                {userProfile?.hasWallet ? 'Manage' : 'Create'}
              </Text>
              <Text style={styles.actionSubtitle}>
                {userProfile?.hasWallet ? 'Update identity' : 'Digital identity'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Premium Access Section */}
        {userProfile?.hasWallet && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Access</Text>
            
            {hasPremiumAccess ? (
              <View style={styles.premiumAccessCard}>
                <View style={styles.premiumHeader}>
                  <Text style={styles.premiumIcon}>🎉</Text>
                  <View style={styles.premiumInfo}>
                    <Text style={styles.premiumTitle}>Premium Access Active</Text>
                    <Text style={styles.premiumSubtitle}>
                      Corporate Excellence 2025 • Zero-Knowledge
                    </Text>
                    {lastAuthTime && (
                      <Text style={styles.premiumTime}>
                        Authenticated: {lastAuthTime}
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.premiumActions}>
                  <TouchableOpacity 
                    style={styles.premiumButton}
                    onPress={navigateToPremiumAccess}
                  >
                    <Text style={styles.premiumButtonText}>View Content</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.premiumClearButton}
                    onPress={handleClearPremiumAccess}
                  >
                    <Text style={styles.premiumClearText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.premiumUnlockCard, isGeneratingProof && styles.premiumUnlockCardDisabled]}
                onPress={handleUnlockPremiumContent}
                disabled={isGeneratingProof}
              >
                <View style={styles.premiumUnlockContent}>
                  <Text style={styles.premiumUnlockIcon}>🔐</Text>
                  <View style={styles.premiumUnlockInfo}>
                    <Text style={styles.premiumUnlockTitle}>
                      {isGeneratingProof ? 'Generating Proof...' : 'Unlock Premium Content'}
                    </Text>
                    <Text style={styles.premiumUnlockSubtitle}>
                      {isGeneratingProof 
                        ? 'Please wait while we generate your zero-knowledge proof'
                        : 'Prove Corporate Excellence 2025 NFT ownership anonymously'
                      }
                    </Text>
                  </View>
                  {isGeneratingProof && (
                    <ActivityIndicator 
                      size="small" 
                      color="#4F46E5" 
                      style={styles.premiumLoader}
                    />
                  )}
                </View>
                
                <View style={styles.premiumFeatures}>
                  <View style={styles.premiumFeature}>
                    <Text style={styles.premiumFeatureIcon}>🎯</Text>
                    <Text style={styles.premiumFeatureText}>Zero-Knowledge Proof</Text>
                  </View>
                  <View style={styles.premiumFeature}>
                    <Text style={styles.premiumFeatureIcon}>🔒</Text>
                    <Text style={styles.premiumFeatureText}>Complete Privacy</Text>
                  </View>
                  <View style={styles.premiumFeature}>
                    <Text style={styles.premiumFeatureIcon}>⚡</Text>
                    <Text style={styles.premiumFeatureText}>Anonymous Access</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Stats */}
        {userProfile?.hasWallet && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{userProfile.totalAuthentications}</Text>
                <Text style={styles.statLabel}>Total Authentications</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>5</Text>
                <Text style={styles.statLabel}>Trusted Companies</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>100%</Text>
                <Text style={styles.statLabel}>Success Rate</Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent Activity */}
        {userProfile?.hasWallet && recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityList}>
              {recentActivity.slice(0, 5).map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Text style={styles.activityIconText}>
                      {activity.type === 'authentication' ? '🔐' : 
                       activity.type === 'identity_created' ? '🆔' : '🏢'}
                    </Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.company}</Text>
                    <Text style={styles.activityDetails}>{activity.details}</Text>
                  </View>
                  <Text style={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Identity Info */}
        {userProfile?.hasWallet && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Identity Information</Text>
            <View style={styles.identityCard}>
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>DID Address</Text>
                <Text style={styles.identityValue}>
                  {userProfile.did.length > 20 ? `${userProfile.did.substring(0, 20)}...` : userProfile.did}
                </Text>
              </View>
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>Wallet Address</Text>
                <Text style={styles.identityValue}>
                  {userProfile.address.length > 20 ? `${userProfile.address.substring(0, 20)}...` : userProfile.address}
                </Text>
              </View>
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>Security Level</Text>
                <View style={styles.securityLevelContainer}>
                  <View style={styles.securityDot} />
                  <Text style={[styles.identityValue, { color: '#10B981' }]}>High</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#4F46E5',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#4F46E5',
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  timeText: {
    color: '#e2e8f0',
    fontSize: 14,
    marginTop: 4,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileCompany: {
    color: '#e2e8f0',
    fontSize: 16,
    marginBottom: 8,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  securityIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  securityText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  noIdentitySection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noIdentityIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  noIdentityTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noIdentitySubtitle: {
    color: '#e2e8f0',
    fontSize: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  scanCard: {
    backgroundColor: '#10B981',
  },
  createCard: {
    backgroundColor: '#3B82F6',
  },
  manageCard: {
    backgroundColor: '#6B7280',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionSubtitle: {
    color: '#e2e8f0',
    fontSize: 12,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  activityList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIconText: {
    fontSize: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  activityDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  identityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  identityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  identityLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  identityValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  securityLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  bottomPadding: {
    height: 40,
  },
  // Credentials styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  viewAllText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  credentialsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  credentialsIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  credentialsIcon: {
    fontSize: 24,
  },
  credentialsInfo: {
    flex: 1,
  },
  credentialsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  credentialsSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  credentialsArrow: {
    fontSize: 18,
    color: '#6b7280',
  },
  
  // Premium Access Styles
  premiumAccessCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  premiumInfo: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 2,
  },
  premiumTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  premiumActions: {
    flexDirection: 'row',
    gap: 12,
  },
  premiumButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  premiumButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  premiumClearButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  premiumClearText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  premiumUnlockCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  premiumUnlockCardDisabled: {
    opacity: 0.7,
  },
  premiumUnlockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumUnlockIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  premiumUnlockInfo: {
    flex: 1,
  },
  premiumUnlockTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  premiumUnlockSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  premiumLoader: {
    marginLeft: 12,
  },
  premiumFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  premiumFeature: {
    alignItems: 'center',
    flex: 1,
  },
  premiumFeatureIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  premiumFeatureText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default ProfessionalHomeScreen;
