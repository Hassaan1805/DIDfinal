import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/ProfessionalWalletHome';
import CreateIdentityScreen from './src/screens/CreateIdentityScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import CredentialsScreen from './src/screens/CredentialsScreen';
import PremiumAccessScreen from './src/screens/PremiumAccessScreen';

const Stack = createStackNavigator();

const App: React.FC = () => {
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#f8f9fa',
          },
          headerTintColor: '#1a1a1a',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Trust Wallet',
            headerShown: false, // Hide header for home screen as it has its own header
          }}
        />
        <Stack.Screen
          name="CreateIdentity"
          component={CreateIdentityScreen}
          options={{
            title: 'Create Identity',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Scanner"
          component={ScannerScreen}
          options={{
            title: 'Scan QR Code',
            headerShown: true,
            headerStyle: {
              backgroundColor: '#000000',
            },
            headerTintColor: '#ffffff',
          }}
        />
        <Stack.Screen
          name="QRScanner"
          component={QRScannerScreen}
          options={{
            title: 'QR Scanner',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Credentials"
          component={CredentialsScreen}
          options={{
            title: 'My Credentials',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="PremiumAccess"
          component={PremiumAccessScreen}
          options={{
            title: 'Premium Access',
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
