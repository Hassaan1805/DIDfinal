import Constants from 'expo-constants';

export interface AppConfig {
  apiUrl: string;
  fallbackUrls: string[];
  networkTimeout: number;
  autoDiscover: boolean;
  chainId: number;
  network: string;
}

// Get environment variables with fallbacks
const getEnvVar = (key: string, defaultValue: string): string => {
  return Constants.expoConfig?.extra?.[key] || process.env[key] || defaultValue;
};

// Main configuration
export const config: AppConfig = {
  apiUrl: getEnvVar('EXPO_PUBLIC_API_URL', 'http://192.168.1.100:3001'),
  fallbackUrls: [
    getEnvVar('EXPO_PUBLIC_API_URL_FALLBACK_1', 'http://localhost:3001'),
    getEnvVar('EXPO_PUBLIC_API_URL_FALLBACK_2', 'https://did-platform-backend.railway.app'),
  ],
  networkTimeout: parseInt(getEnvVar('EXPO_PUBLIC_NETWORK_TIMEOUT', '10000'), 10),
  autoDiscover: getEnvVar('EXPO_PUBLIC_AUTO_DISCOVER', 'true') === 'true',
  chainId: parseInt(getEnvVar('EXPO_PUBLIC_CHAIN_ID', '11155111'), 10),
  network: getEnvVar('EXPO_PUBLIC_NETWORK', 'sepolia'),
};

// Network discovery configuration
export const NETWORK_CONFIG = {
  DISCOVERY_TIMEOUT: 30000,
  HEALTH_CHECK_INTERVAL: 60000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
};

// Validation helpers
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export default config;
