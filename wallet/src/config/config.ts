export interface AppConfig {
  apiUrl: string;
  fallbackUrls: string[];
  networkTimeout: number;
  autoDiscover: boolean;
  chainId: number;
  network: string;
}

// ── Hardcoded configuration ──────────────────────────────────────────────────
// Change BACKEND_IP to match your machine's LAN IP (same network as the phone).
// Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) and look for the IPv4 address.
// IMPORTANT: This IP MUST match the IP in backend/.env PRIMARY_HOST_IP
const BACKEND_IP = '192.168.1.33';  // ← Your actual IP
const BACKEND_PORT = 3001;

export const config: AppConfig = {
  apiUrl: `http://${BACKEND_IP}:${BACKEND_PORT}`,
  fallbackUrls: [
    'https://did-platform-backend.railway.app',
  ],
  networkTimeout: 30000,  // Increased to 30 seconds for slow networks
  autoDiscover: false,
  chainId: 11155111,
  network: 'sepolia',
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
