import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  sanitizeCredentialStore,
  WALLET_CREDENTIAL_STORE_VERSION,
  WalletCredentialRecordV1,
  WalletCredentialStoreV1,
} from '../types/credentials';

const KEYS = {
  PRIVATE_KEY: 'wallet_private_key',
  DID: 'wallet_did',
  API_URL: 'api_url',
  EMPLOYEES: 'employees',
  CREDENTIAL_STORE: 'wallet_credentials_v1',
  AUTH_HISTORY: 'auth_history',
  CONSENT_HISTORY: 'consent_history',
  EMPLOYEES_SEEDED_VERSION: 'employees_seeded_v1',
};

// Check if SecureStore is available (not available in Expo Go web)
const isSecureStoreAvailable = async (): Promise<boolean> => {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

export const StorageService = {
  // Private Key - SECURE STORAGE
  async savePrivateKey(privateKey: string): Promise<void> {
    const secureAvailable = await isSecureStoreAvailable();
    if (secureAvailable) {
      await SecureStore.setItemAsync(KEYS.PRIVATE_KEY, privateKey);
    } else {
      // Fallback for development/web - warn about insecure storage
      console.warn('⚠️ SecureStore not available, using AsyncStorage for private key (insecure)');
      await AsyncStorage.setItem(KEYS.PRIVATE_KEY, privateKey);
    }
  },

  async getPrivateKey(): Promise<string | null> {
    const secureAvailable = await isSecureStoreAvailable();
    if (secureAvailable) {
      return await SecureStore.getItemAsync(KEYS.PRIVATE_KEY);
    } else {
      return await AsyncStorage.getItem(KEYS.PRIVATE_KEY);
    }
  },

  async deletePrivateKey(): Promise<void> {
    const secureAvailable = await isSecureStoreAvailable();
    if (secureAvailable) {
      await SecureStore.deleteItemAsync(KEYS.PRIVATE_KEY);
    } else {
      await AsyncStorage.removeItem(KEYS.PRIVATE_KEY);
    }
  },

  // DID
  async saveDID(did: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.DID, did);
  },

  async getDID(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.DID);
  },

  // API URL
  async saveApiUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.API_URL, url);
  },

  async getApiUrl(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.API_URL);
  },

  // Employees
  async saveEmployees(employees: any[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
  },

  async getEmployees(): Promise<any[]> {
    const data = await AsyncStorage.getItem(KEYS.EMPLOYEES);
    return data ? JSON.parse(data) : [];
  },

  async isEmployeesSeeded(): Promise<boolean> {
    const val = await AsyncStorage.getItem(KEYS.EMPLOYEES_SEEDED_VERSION);
    return val === 'true';
  },

  async markEmployeesSeeded(): Promise<void> {
    await AsyncStorage.setItem(KEYS.EMPLOYEES_SEEDED_VERSION, 'true');
  },

  // Credential store (typed + versioned)
  async saveCredentialRecords(records: WalletCredentialRecordV1[]): Promise<void> {
    const store: WalletCredentialStoreV1 = {
      version: WALLET_CREDENTIAL_STORE_VERSION,
      records,
    };
    await AsyncStorage.setItem(KEYS.CREDENTIAL_STORE, JSON.stringify(store));
  },

  async getCredentialRecords(): Promise<WalletCredentialRecordV1[]> {
    const data = await AsyncStorage.getItem(KEYS.CREDENTIAL_STORE);
    if (!data) {
      return [];
    }

    try {
      const parsed = JSON.parse(data);
      const store = sanitizeCredentialStore(parsed);
      return store.records;
    } catch {
      return [];
    }
  },

  // Auth History
  async saveAuthHistory(history: any[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.AUTH_HISTORY, JSON.stringify(history));
  },

  async getAuthHistory(): Promise<any[]> {
    const data = await AsyncStorage.getItem(KEYS.AUTH_HISTORY);
    return data ? JSON.parse(data) : [];
  },

  async addAuthRecord(record: any): Promise<void> {
    const history = await this.getAuthHistory();
    history.unshift(record);
    // Keep only last 50 records
    if (history.length > 50) {
      history.pop();
    }
    await this.saveAuthHistory(history);
  },

  // Consent History
  async saveConsentHistory(history: any[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.CONSENT_HISTORY, JSON.stringify(history));
  },

  async getConsentHistory(): Promise<any[]> {
    const data = await AsyncStorage.getItem(KEYS.CONSENT_HISTORY);
    return data ? JSON.parse(data) : [];
  },

  async addConsentRecord(record: any): Promise<void> {
    const history = await this.getConsentHistory();
    history.unshift(record);
    // Keep only last 100 consent records for local quick review
    if (history.length > 100) {
      history.length = 100;
    }
    await this.saveConsentHistory(history);
  },

  // Clear all data
  async clearAll(): Promise<void> {
    // Clear secure storage
    await this.deletePrivateKey();
    // Clear regular storage
    await AsyncStorage.multiRemove(Object.values(KEYS).filter(k => k !== KEYS.PRIVATE_KEY));
  },
};

