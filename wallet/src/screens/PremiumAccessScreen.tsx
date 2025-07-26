/**
 * PremiumAccessScreen.tsx
 * 
 * Screen that displays premium content after successful ZK-proof authentication.
 * Shows the user's anonymous access status and premium features.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';

import ZKProofService from '../services/ZKProofService';

interface PremiumAccessScreenProps {
  navigation: any;
}

interface PremiumContent {
  title: string;
  description: string;
  content: string;
  accessLevel: string;
  timestamp: string;
}

const PremiumAccessScreen: React.FC<PremiumAccessScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [premiumContent, setPremiumContent] = useState<PremiumContent | null>(null);
  const [lastAuthTime, setLastAuthTime] = useState<string>('');

  const zkProofService = ZKProofService.getInstance();

  useEffect(() => {
    checkPremiumAccess();
  }, []);

  const checkPremiumAccess = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Check if user has valid premium access
      const accessStatus = await zkProofService.hasPremiumAccess();
      setHasAccess(accessStatus);

      if (accessStatus) {
        // Fetch premium content
        const contentResult = await zkProofService.testPremiumAccess();
        
        if (contentResult.success && contentResult.data) {
          setPremiumContent({
            title: 'Corporate Excellence 2025 - Premium Content',
            description: 'Exclusive content for NFT holders',
            content: contentResult.data.content,
            accessLevel: contentResult.data.accessLevel,
            timestamp: contentResult.data.timestamp
          });
        }

        // Get last authentication time
        const authTime = await zkProofService.getLastAuthenticationTime();
        if (authTime) {
          setLastAuthTime(new Date(authTime).toLocaleString());
        }
      }

    } catch (error) {
      console.error('Error checking premium access:', error);
      Alert.alert('Error', 'Failed to check premium access status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshAccess = (): void => {
    checkPremiumAccess();
  };

  const handleGoBack = (): void => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00d4ff" />
          <Text style={styles.loadingText}>Checking Premium Access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <View style={styles.centerContent}>
          <Text style={styles.noAccessIcon}>🔒</Text>
          <Text style={styles.noAccessTitle}>Premium Access Required</Text>
          <Text style={styles.noAccessText}>
            You need to prove ownership of a Corporate Excellence 2025 NFT to access premium content.
          </Text>
          <TouchableOpacity style={styles.goBackButton} onPress={handleGoBack}>
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Access</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshAccess}>
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Access Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusIcon}>✅</Text>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Premium Access Active</Text>
              <Text style={styles.statusSubtitle}>Anonymous • Privacy-Preserving</Text>
            </View>
          </View>
          
          {lastAuthTime && (
            <View style={styles.authTimeContainer}>
              <Text style={styles.authTimeLabel}>Last Authentication:</Text>
              <Text style={styles.authTimeValue}>{lastAuthTime}</Text>
            </View>
          )}
        </View>

        {/* Premium Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🎯</Text>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Zero-Knowledge Authentication</Text>
              <Text style={styles.featureDescription}>
                Your wallet address remains completely private while proving NFT ownership
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🔐</Text>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Anonymous Access</Text>
              <Text style={styles.featureDescription}>
                Access premium content without revealing your identity
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>⚡</Text>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Instant Verification</Text>
              <Text style={styles.featureDescription}>
                Fast cryptographic proof verification in seconds
              </Text>
            </View>
          </View>
        </View>

        {/* Premium Content */}
        {premiumContent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Content</Text>
            
            <View style={styles.contentCard}>
              <Text style={styles.contentTitle}>{premiumContent.title}</Text>
              <Text style={styles.contentDescription}>{premiumContent.description}</Text>
              
              <View style={styles.contentBody}>
                <Text style={styles.contentText}>{premiumContent.content}</Text>
              </View>
              
              <View style={styles.contentFooter}>
                <Text style={styles.contentAccessLevel}>
                  Access Level: {premiumContent.accessLevel}
                </Text>
                <Text style={styles.contentTimestamp}>
                  {new Date(premiumContent.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Technical Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technical Details</Text>
          
          <View style={styles.techCard}>
            <View style={styles.techRow}>
              <Text style={styles.techLabel}>Proof System:</Text>
              <Text style={styles.techValue}>Groth16 zk-SNARKs</Text>
            </View>
            <View style={styles.techRow}>
              <Text style={styles.techLabel}>Curve:</Text>
              <Text style={styles.techValue}>BN254</Text>
            </View>
            <View style={styles.techRow}>
              <Text style={styles.techLabel}>Hash Function:</Text>
              <Text style={styles.techValue}>Poseidon</Text>
            </View>
            <View style={styles.techRow}>
              <Text style={styles.techLabel}>Privacy Level:</Text>
              <Text style={styles.techValue}>Zero-Knowledge</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noAccessIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  noAccessTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  noAccessText: {
    color: '#b0b0b0',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  goBackButton: {
    backgroundColor: '#00d4ff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goBackButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333366',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#00d4ff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusSubtitle: {
    color: '#00d4ff',
    fontSize: 14,
    marginTop: 4,
  },
  authTimeContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333366',
  },
  authTimeLabel: {
    color: '#b0b0b0',
    fontSize: 14,
  },
  authTimeValue: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  featureDescription: {
    color: '#b0b0b0',
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  contentCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
  },
  contentTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  contentDescription: {
    color: '#00d4ff',
    fontSize: 14,
    marginBottom: 16,
  },
  contentBody: {
    backgroundColor: '#0f1929',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  contentText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 22,
  },
  contentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentAccessLevel: {
    color: '#00d4ff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentTimestamp: {
    color: '#b0b0b0',
    fontSize: 12,
  },
  techCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  techRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  techLabel: {
    color: '#b0b0b0',
    fontSize: 14,
  },
  techValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default PremiumAccessScreen;
