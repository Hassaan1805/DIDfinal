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

const { width, height } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: any;
}

interface UserProfile {
  did: string;
  address: string;
  hasWallet: boolean;
  name?: string;
  avatar?: string;
  company?: string;
  employeeId?: string;
  lastAuthentication?: string;
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

  useEffect(() => {
    loadUserProfile();
    updateTime();
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
      const [walletData, didData, profileData, activityData] = await Promise.all([
        AsyncStorage.getItem('userWallet'),
        AsyncStorage.getItem('userDID'),
        AsyncStorage.getItem('userProfile'),
        AsyncStorage.getItem('recentActivity')
      ]);
      
      if (walletData && didData) {
        const wallet = JSON.parse(walletData);
        const profile = profileData ? JSON.parse(profileData) : {};
        
        const userProfile: UserProfile = {
          did: didData,
          address: wallet.address || 'Unknown',
          hasWallet: true,
          name: profile.name || 'User',
          avatar: profile.avatar || `https://ui-avatars.com/api/?name=${profile.name || 'User'}&background=4F46E5&color=fff&size=200`,
          company: profile.company || 'Decentralized Trust Platform',
          employeeId: profile.employeeId || 'EMP001',
          lastAuthentication: profile.lastAuthentication,
          totalAuthentications: profile.totalAuthentications || 0,
          securityLevel: 'high'
        };
        
        setUserProfile(userProfile);
        
        if (activityData) {
          setRecentActivity(JSON.parse(activityData));
        } else {
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
        }
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

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diffInHours = Math.floor((now - time) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getActivityIcon = (type: string): string => {
    switch (type) {
      case 'authentication': return 'shield-checkmark';
      case 'identity_created': return 'person-add';
      case 'company_access': return 'business';
      default: return 'checkmark-circle';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success': return '#10B981';
      case 'failed': return '#EF4444';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading your digital identity...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.timeText}>{currentTime}</Text>
            </View>
            <TouchableOpacity style={styles.settingsButton}>
              <Ionicons name="settings-outline" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          {userProfile?.hasWallet ? (
            <View style={styles.profileSection}>
              <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{userProfile.name}</Text>
                <Text style={styles.profileCompany}>{userProfile.company}</Text>
                <View style={styles.securityBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                  <Text style={styles.securityText}>Verified Identity</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.noIdentitySection}>
              <Ionicons name="person-circle-outline" size={80} color="#ffffff" />
              <Text style={styles.noIdentityTitle}>No Digital Identity</Text>
              <Text style={styles.noIdentitySubtitle}>Create your secure identity to get started</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={navigateToScanner}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.actionGradient}
              >
                <Ionicons name="qr-code-outline" size={32} color="#ffffff" />
                <Text style={styles.actionTitle}>Scan QR</Text>
                <Text style={styles.actionSubtitle}>Authenticate with companies</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={navigateToCreateIdentity}>
              <LinearGradient
                colors={userProfile?.hasWallet ? ['#6B7280', '#4B5563'] : ['#3B82F6', '#2563EB']}
                style={styles.actionGradient}
              >
                <Ionicons 
                  name={userProfile?.hasWallet ? "refresh-outline" : "person-add-outline"} 
                  size={32} 
                  color="#ffffff" 
                />
                <Text style={styles.actionTitle}>
                  {userProfile?.hasWallet ? 'Manage' : 'Create'}
                </Text>
                <Text style={styles.actionSubtitle}>
                  {userProfile?.hasWallet ? 'Update identity' : 'Digital identity'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

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
                    <Ionicons 
                      name={getActivityIcon(activity.type) as any} 
                      size={20} 
                      color={getStatusColor(activity.status)} 
                    />
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
                  <View style={[styles.securityDot, { backgroundColor: '#10B981' }]} />
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
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  header: {
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
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#ffffff',
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
  securityText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  noIdentitySection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noIdentityTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  noIdentitySubtitle: {
    color: '#e2e8f0',
    fontSize: 16,
    marginTop: 8,
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
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  actionGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  actionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  actionSubtitle: {
    color: '#e2e8f0',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
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
    marginRight: 6,
  },
  bottomPadding: {
    height: 40,
  },
});

export default ProfessionalHomeScreen;
