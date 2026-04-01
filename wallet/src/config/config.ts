export interface AppConfig {
  apiUrl: string;
  fallbackUrls: string[];
  networkTimeout: number;
  autoDiscover: boolean;
  chainId: number;
  network: string;
}

const DEFAULT_API_URL = 'http://127.0.0.1:3001';

const primaryApiUrl = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
const fallbackApiUrl1 = process.env.EXPO_PUBLIC_API_URL_FALLBACK_1 || 'http://localhost:3001';
const fallbackApiUrl2 = process.env.EXPO_PUBLIC_API_URL_FALLBACK_2 || 'https://did-platform-backend.railway.app';

const parsedTimeout = Number.parseInt(process.env.EXPO_PUBLIC_NETWORK_TIMEOUT || '30000', 10);
const parsedChainId = Number.parseInt(process.env.EXPO_PUBLIC_CHAIN_ID || '11155111', 10);

const networkTimeout = Number.isFinite(parsedTimeout) ? parsedTimeout : 30000;
const chainId = Number.isFinite(parsedChainId) ? parsedChainId : 11155111;
const autoDiscover = (process.env.EXPO_PUBLIC_AUTO_DISCOVER || 'true').toLowerCase() === 'true';

const fallbackUrls = [fallbackApiUrl1, fallbackApiUrl2].filter(
  (url, index, allUrls) => Boolean(url) && url !== primaryApiUrl && allUrls.indexOf(url) === index
);

export const config: AppConfig = {
  apiUrl: primaryApiUrl,
  fallbackUrls,
  networkTimeout,
  autoDiscover,
  chainId,
  network: process.env.EXPO_PUBLIC_NETWORK || 'sepolia',
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
