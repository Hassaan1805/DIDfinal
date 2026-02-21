import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PRIVATE_KEY: 'wallet_private_key',
  DID: 'wallet_did',
  API_URL: 'api_url',
  EMPLOYEES: 'employees',
  AUTH_HISTORY: 'auth_history',
  EMPLOYEES_SEEDED_VERSION: 'employees_seeded_v1',
};

export const StorageService = {
  // Private Key
  async savePrivateKey(privateKey: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.PRIVATE_KEY, privateKey);
  },

  async getPrivateKey(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.PRIVATE_KEY);
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

  // Clear all data
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};
