// Polyfill for crypto.getRandomValues - must be first import before ethers.js
import 'react-native-get-random-values';

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AuthConfirmationScreen from './src/screens/AuthConfirmationScreen';
import AuthTimelineScreen from './src/screens/AuthTimelineScreen';
import IdentityProfileScreen from './src/screens/IdentityProfileScreen';
import EnrollmentRequestsScreen from './src/screens/EnrollmentRequestsScreen';

// Context
import { WalletProvider } from './src/context/WalletContext';
import { NetworkProvider } from './src/context/NetworkContext';

export type RootStackParamList = {
  Home: undefined;
  QRScanner: undefined;
  Settings: undefined;
  AuthTimeline: undefined;
  IdentityProfile: undefined;
  EnrollmentRequests: undefined;
  AuthConfirmation: {
    challengeId: string;
    platform: string;
    timestamp: string | number;
    challenge?: string;
    apiEndpoint?: string;
    employeeName?: string;
    employeeId?: string;
    expectedDID?: string;
    badgeType?: string;
    badgePermissions?: string[];
    employeeHashId?: string;
    verifierId?: string;
    verifierOrganizationName?: string;
    verifierCredentialRequired?: boolean;
    requestedClaims?: {
      requestType: 'portal_access' | 'general_auth';
      requiredClaims: Array<'subjectDid' | 'employeeId' | 'name' | 'role' | 'department' | 'email'>;
      policyVersion: number;
      proofRequired?: boolean;
      bindingVersion?: string;
    };
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NetworkProvider>
      <WalletProvider>
        <NavigationContainer>
          <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#0d0d10',
                },
                headerTintColor: '#f1f5f9',
                headerTitleStyle: {
                  fontWeight: '700',
                  fontSize: 16,
                },
                headerShadowVisible: false,
                contentStyle: {
                  backgroundColor: '#08080a',
                },
              }}
            >
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="QRScanner"
                component={QRScannerScreen}
                options={{ title: 'Scan QR Code', headerStyle: { backgroundColor: '#000' } }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: 'Settings' }}
              />
              <Stack.Screen
                name="AuthTimeline"
                component={AuthTimelineScreen}
                options={{ title: 'Auth Timeline' }}
              />
              <Stack.Screen
                name="IdentityProfile"
                component={IdentityProfileScreen}
                options={{ title: 'Identity Profile' }}
              />
              <Stack.Screen
                name="EnrollmentRequests"
                component={EnrollmentRequestsScreen}
                options={{ title: 'Enrollment Inbox' }}
              />
              <Stack.Screen
                name="AuthConfirmation"
                component={AuthConfirmationScreen}
                options={{ title: 'Authentication' }}
              />
            </Stack.Navigator>
          </View>
        </NavigationContainer>
      </WalletProvider>
    </NetworkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08080a',
  },
});
