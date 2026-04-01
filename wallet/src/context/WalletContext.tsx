import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { walletService, Employee, AuthRequest, RequestedClaimsContract } from '../services/wallet';
import { WalletCredentialRecordV1, WalletCredentialSource } from '../types/credentials';

interface WalletContextType {
  address: string | null;
  did: string | null;
  employees: Employee[];
  credentials: WalletCredentialRecordV1[];
  isInitialized: boolean;
  addEmployee: (employee: Employee) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;
  addCredential: (
    credentialJwt: string,
    options?: {
      employeeId?: string;
      subjectDid?: string;
      source?: WalletCredentialSource;
    },
  ) => Promise<WalletCredentialRecordV1>;
  signMessage: (message: string) => Promise<string>;
  getAuthChallenge: () => Promise<AuthRequest>;
  submitAuthResponse: (
    challengeId: string,
    employeeDID: string,
    challenge?: string,
    apiEndpoint?: string,
    employeeId?: string,
    verifierId?: string,
    requestedClaims?: RequestedClaimsContract,
    verifierCredentialRequired?: boolean,
    badgeType?: string,
  ) => Promise<any>;
  parseQRCode: (data: string) => AuthRequest | null;
  exportWallet: () => Promise<{ privateKey: string; did: string; address: string }>;
  importWallet: (privateKey: string) => Promise<void>;
  clearWallet: () => Promise<void>;
  refreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [did, setDID] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [credentials, setCredentials] = useState<WalletCredentialRecordV1[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      await walletService.initialize();
      setAddress(walletService.getAddress());
      setDID(walletService.getDID());
      setEmployees(walletService.getEmployees());
      setCredentials(walletService.getCredentials());
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
    }
  };

  const addEmployee = async (employee: Employee) => {
    await walletService.addEmployee(employee);
    setEmployees(walletService.getEmployees());
  };

  const removeEmployee = async (id: string) => {
    await walletService.removeEmployee(id);
    setEmployees(walletService.getEmployees());
    setCredentials(walletService.getCredentials());
  };

  const addCredential = async (
    credentialJwt: string,
    options?: {
      employeeId?: string;
      subjectDid?: string;
      source?: WalletCredentialSource;
    },
  ): Promise<WalletCredentialRecordV1> => {
    const record = await walletService.addCredential(credentialJwt, options);
    setCredentials(walletService.getCredentials());
    return record;
  };

  const signMessage = async (message: string): Promise<string> => {
    return await walletService.signMessage(message);
  };

  const getAuthChallenge = async (): Promise<AuthRequest> => {
    return await walletService.getAuthChallenge();
  };

  const submitAuthResponse = async (
    challengeId: string,
    employeeDID: string,
    challenge?: string,
    apiEndpoint?: string,
    employeeId?: string,
    verifierId?: string,
    requestedClaims?: RequestedClaimsContract,
    verifierCredentialRequired?: boolean,
    badgeType?: string,
  ): Promise<any> => {
    return await walletService.submitAuthResponse(
      challengeId,
      employeeDID,
      challenge,
      apiEndpoint,
      employeeId,
      verifierId,
      requestedClaims,
      verifierCredentialRequired,
      badgeType,
    );
  };

  const parseQRCode = (data: string): AuthRequest | null => {
    return walletService.parseQRCode(data);
  };

  const exportWallet = async () => {
    return await walletService.exportWallet();
  };

  const importWallet = async (privateKey: string) => {
    await walletService.importWallet(privateKey);
    await refreshWallet();
  };

  const clearWallet = async () => {
    await walletService.clearWallet();
    setAddress(null);
    setDID(null);
    setEmployees([]);
    setCredentials([]);
    setIsInitialized(false);
  };

  const refreshWallet = async () => {
    await initializeWallet();
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        did,
        employees,
        credentials,
        isInitialized,
        addEmployee,
        removeEmployee,
        addCredential,
        signMessage,
        getAuthChallenge,
        submitAuthResponse,
        parseQRCode,
        exportWallet,
        importWallet,
        clearWallet,
        refreshWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
