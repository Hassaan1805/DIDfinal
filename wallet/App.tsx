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

// Context
import { WalletProvider } from './src/context/WalletContext';
import { NetworkProvider } from './src/context/NetworkContext';

export type RootStackParamList = {
  Home: undefined;
  QRScanner: undefined;
  Settings: undefined;
  AuthConfirmation: {
    challengeId: string;
    platform: string;
    timestamp: string | number;
    challenge?: string;      // actual challenge string to sign
    apiEndpoint?: string;    // where to submit the response
    employeeName?: string;   // pre-filled from QR
    employeeId?: string;
    expectedDID?: string;
    badgeType?: string;
    badgePermissions?: string[];
    employeeHashId?: string;
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
                  backgroundColor: '#1a1a2e',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                contentStyle: {
                  backgroundColor: '#16213e',
                },
              }}
            >
              <Stack.Screen 
                name="Home" 
                component={HomeScreen}
                options={{ title: 'DID Wallet' }}
              />
              <Stack.Screen 
                name="QRScanner" 
                component={QRScannerScreen}
                options={{ title: 'Scan QR Code' }}
              />
              <Stack.Screen 
                name="Settings" 
                component={SettingsScreen}
                options={{ title: 'Settings' }}
              />
              <Stack.Screen 
                name="AuthConfirmation" 
                component={AuthConfirmationScreen}
                options={{ title: 'Confirm Authentication' }}
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
    backgroundColor: '#16213e',
  },
});
