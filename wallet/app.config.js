module.exports = ({ config }) => ({
  ...config,
  name: 'DID Wallet',
  slug: 'did-wallet',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1a1a2e',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.didplatform.wallet',
    infoPlist: {
      NSCameraUsageDescription:
        'This app needs access to camera to scan QR codes for authentication.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1a1a2e',
    },
    package: 'com.didplatform.wallet',
    permissions: ['CAMERA'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-camera',
      {
        cameraPermission:
          'Allow $(PRODUCT_NAME) to access your camera to scan QR codes',
      },
    ],
  ],
  extra: {
    // These are read at Metro start time from wallet/.env
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.33:3001',
    apiFallback1:
      process.env.EXPO_PUBLIC_API_URL_FALLBACK_1 || 'http://localhost:3001',
    apiFallback2:
      process.env.EXPO_PUBLIC_API_URL_FALLBACK_2 ||
      'https://did-platform-backend.railway.app',
    networkTimeout: process.env.EXPO_PUBLIC_NETWORK_TIMEOUT || '10000',
    autoDiscover: process.env.EXPO_PUBLIC_AUTO_DISCOVER || 'true',
    chainId: process.env.EXPO_PUBLIC_CHAIN_ID || '11155111',
    network: process.env.EXPO_PUBLIC_NETWORK || 'sepolia',
  },
});
