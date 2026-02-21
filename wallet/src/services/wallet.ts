import { ethers } from 'ethers';
import { StorageService } from './storage';
import { networkService } from './network';
import { isValidEthereumAddress } from '../config/config';

export interface Employee {
  id: string;
  name: string;
  did: string;
  role: string;
}

export interface AuthRequest {
  challengeId: string;
  platform: string;       // mapped from domain
  timestamp: number | string;
  nonce?: string;
  challenge?: string;
  apiEndpoint?: string;
  employee?: {
    id: string;
    name: string;
    department?: string;
    role?: string;
  };
  expectedDID?: string;
  type?: string;
  domain?: string;
}

class WalletService {
  private wallet: ethers.Wallet | null = null;
  private employees: Employee[] = [];

  /**
   * Initialize wallet (load or create)
   */
  // Default employees matching the backend & portal
  private static readonly DEFAULT_EMPLOYEES: Employee[] = [
    { id: 'EMP001', name: 'Zaid',    did: 'did:ethr:0xcB65d5364c1aF83Bf77344634EE4029b765F0167', role: 'CEO & Founder' },
    { id: 'EMP002', name: 'Hassaan', did: 'did:ethr:0x2345678901234567890123456789012345678901', role: 'CTO' },
    { id: 'EMP003', name: 'Atharva', did: 'did:ethr:0x3456789012345678901234567890123456789012', role: 'Product Manager' },
    { id: 'EMP004', name: 'Gracian', did: 'did:ethr:0x4567890123456789012345678901234567890123', role: 'Senior Designer' },
  ];

  async initialize(): Promise<void> {
    const privateKey = await StorageService.getPrivateKey();
    
    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey);
    } else {
      await this.createWallet();
    }

    // Load employees; seed defaults if not yet seeded (version check)
    this.employees = await StorageService.getEmployees();
    const alreadySeeded = await StorageService.isEmployeesSeeded();
    if (!alreadySeeded) {
      this.employees = [...WalletService.DEFAULT_EMPLOYEES];
      await StorageService.saveEmployees(this.employees);
      await StorageService.markEmployeesSeeded();
      console.log('✅ Seeded default employees:', this.employees.length);
    }
  }

  /**
   * Create a new wallet
   */
  async createWallet(): Promise<ethers.Wallet> {
    const wallet = ethers.Wallet.createRandom();
    await StorageService.savePrivateKey(wallet.privateKey);
    
    const did = this.formatDID(wallet.address);
    await StorageService.saveDID(did);
    
    this.wallet = wallet;
    return wallet;
  }

  /**
   * Get current wallet
   */
  getWallet(): ethers.Wallet | null {
    return this.wallet;
  }

  /**
   * Get wallet address
   */
  getAddress(): string | null {
    return this.wallet?.address || null;
  }

  /**
   * Get DID
   */
  getDID(): string | null {
    const address = this.getAddress();
    return address ? this.formatDID(address) : null;
  }

  /**
   * Format address as DID
   */
  private formatDID(address: string): string {
    return `did:ethr:${address}`;
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }
    return await this.wallet.signMessage(message);
  }

  /**
   * Add an employee
   */
  async addEmployee(employee: Employee): Promise<void> {
    if (!isValidEthereumAddress(employee.did.replace('did:ethr:', ''))) {
      throw new Error('Invalid DID format');
    }

    this.employees.push(employee);
    await StorageService.saveEmployees(this.employees);
  }

  /**
   * Get all employees
   */
  getEmployees(): Employee[] {
    return this.employees;
  }

  /**
   * Remove an employee
   */
  async removeEmployee(id: string): Promise<void> {
    this.employees = this.employees.filter(emp => emp.id !== id);
    await StorageService.saveEmployees(this.employees);
  }

  /**
   * Get auth challenge from backend
   */
  async getAuthChallenge(): Promise<AuthRequest> {
    const response = await networkService.get('/api/auth/challenge');
    return response.data;
  }

  /**
   * Submit auth response
   */
  async submitAuthResponse(challengeId: string, employeeDID: string, challenge?: string, apiEndpoint?: string): Promise<any> {
    const address = this.getAddress();
    // Sign a message that includes the actual challenge string (backend verifies this)
    const message = challenge
      ? `${challenge}`
      : `Challenge: ${challengeId}\nDID: ${employeeDID}`;
    const signature = await this.signMessage(message);

    // Use the apiEndpoint from QR if available, otherwise fall back
    let response: any;
    if (apiEndpoint) {
      // Direct POST to the full URL from QR code
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, signature, address, message }),
      });
      response = await res.json();
    } else {
      response = await networkService.post('/api/auth/verify', {
        challengeId,
        signature,
        address,
        message,
      });
    }

    // Save to history
    await StorageService.addAuthRecord({
      challengeId,
      employeeDID,
      timestamp: new Date().toISOString(),
      success: response.success,
    });

    return response;
  }

  /**
   * Parse QR code data
   */
  parseQRCode(data: string): AuthRequest | null {
    try {
      console.log('📷 QR raw data length:', data.length);
      console.log('📷 QR raw data:', data.substring(0, 200));
      const parsed = JSON.parse(data);
      console.log('📷 QR parsed keys:', Object.keys(parsed));
      console.log('📷 QR challengeId:', parsed.challengeId);
      console.log('📷 QR domain:', parsed.domain);
      console.log('📷 QR platform:', parsed.platform);
      console.log('📷 QR type:', parsed.type);
      // Accept both portal format (domain) and legacy format (platform)
      if (parsed.challengeId && (parsed.platform || parsed.domain || parsed.type === 'did-auth-request')) {
        return {
          ...parsed,
          platform: parsed.platform || parsed.domain || 'Enterprise Portal',
        } as AuthRequest;
      }
      console.log('📷 QR rejected: missing challengeId or platform/domain');
      return null;
    } catch (e) {
      console.log('📷 QR parse error:', e);
      return null;
    }
  }

  /**
   * Export wallet (for backup)
   */
  async exportWallet(): Promise<{ privateKey: string; did: string; address: string }> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    return {
      privateKey: this.wallet.privateKey,
      did: this.getDID()!,
      address: this.wallet.address,
    };
  }

  /**
   * Import wallet from private key
   */
  async importWallet(privateKey: string): Promise<void> {
    const wallet = new ethers.Wallet(privateKey);
    await StorageService.savePrivateKey(privateKey);
    
    const did = this.formatDID(wallet.address);
    await StorageService.saveDID(did);
    
    this.wallet = wallet;
  }

  /**
   * Clear wallet data
   */
  async clearWallet(): Promise<void> {
    await StorageService.clearAll();
    this.wallet = null;
    this.employees = [];
  }
}

export const walletService = new WalletService();
