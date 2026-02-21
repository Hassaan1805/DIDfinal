import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { networkService, NetworkTestResult } from '../services/network';

interface NetworkContextType {
  currentUrl: string;
  isConnected: boolean;
  setApiUrl: (url: string) => Promise<void>;
  testUrl: (url: string) => Promise<NetworkTestResult>;
  discoverBestUrl: () => Promise<string | null>;
  refreshConnection: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    initializeNetwork();
  }, []);

  const initializeNetwork = async () => {
    try {
      await networkService.initialize();
      setCurrentUrl(networkService.getApiUrl());
      setIsConnected(networkService.getConnectionStatus());
    } catch (error) {
      console.error('Failed to initialize network:', error);
    }
  };

  const setApiUrl = async (url: string) => {
    await networkService.setApiUrl(url);
    setCurrentUrl(url);
    
    // Test the new URL
    const result = await networkService.testUrl(url);
    setIsConnected(result.success);
  };

  const testUrl = async (url: string): Promise<NetworkTestResult> => {
    return await networkService.testUrl(url);
  };

  const discoverBestUrl = async (): Promise<string | null> => {
    const url = await networkService.discoverBestUrl();
    if (url) {
      setCurrentUrl(url);
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
    return url;
  };

  const refreshConnection = async () => {
    await initializeNetwork();
  };

  return (
    <NetworkContext.Provider
      value={{
        currentUrl,
        isConnected,
        setApiUrl,
        testUrl,
        discoverBestUrl,
        refreshConnection,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
};
