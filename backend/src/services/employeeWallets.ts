import { ethers } from 'ethers';

// Employee wallets with real private keys for signature generation
// Note: In production, private keys should NEVER be stored in code or database
// This is for development/testing only
export interface EmployeeWallet {
  id: string;
  name: string;
  department: string;
  role: string;
  email: string;
  privateKey: string;
  address: string;
  did: string;
}

// Generate deterministic private keys for consistent testing
function generateEmployeePrivateKey(employeeId: string): string {
  // Create a deterministic private key based on employee ID
  // In production, each employee would generate their own key pair
  const hash = ethers.keccak256(ethers.toUtf8Bytes(`employee_${employeeId}_private_key_2025`));
  return hash;
}

// Create employee wallets
const employeeWallets: EmployeeWallet[] = [
  {
    id: 'EMP001',
    name: 'Zaid',
    department: 'Engineering',
    role: 'CEO',
    email: 'zaid@company.com',
    privateKey: generateEmployeePrivateKey('EMP001'),
    address: '',
    did: ''
  },
  {
    id: 'EMP002',
    name: 'Hassaan',
    department: 'Engineering',
    role: 'CTO',
    email: 'hassaan@company.com',
    privateKey: generateEmployeePrivateKey('EMP002'),
    address: '',
    did: ''
  },
  {
    id: 'EMP003',
    name: 'Atharva',
    department: 'Product',
    role: 'Product Manager',
    email: 'atharva@company.com',
    privateKey: generateEmployeePrivateKey('EMP003'),
    address: '',
    did: ''
  },
  {
    id: 'EMP004',
    name: 'Gracian',
    department: 'Design',
    role: 'Senior Designer',
    email: 'gracian@company.com',
    privateKey: generateEmployeePrivateKey('EMP004'),
    address: '',
    did: ''
  }
];

// Generate addresses and DIDs from private keys
employeeWallets.forEach(wallet => {
  const ethersWallet = new ethers.Wallet(wallet.privateKey);
  wallet.address = ethersWallet.address;
  wallet.did = `did:ethr:${wallet.address}`;
});

// Export employee wallets for use in other modules
export const EMPLOYEE_WALLETS = new Map(
  employeeWallets.map(wallet => [wallet.id, wallet])
);

// Utility functions for signature operations
export class EmployeeSignature {
  static async signChallenge(employeeId: string, challenge: string): Promise<string> {
    const wallet = EMPLOYEE_WALLETS.get(employeeId);
    if (!wallet) {
      throw new Error(`Employee ${employeeId} not found`);
    }

    const ethersWallet = new ethers.Wallet(wallet.privateKey);
    const signature = await ethersWallet.signMessage(challenge);
    return signature;
  }

  static async verifySignature(challenge: string, signature: string, expectedAddress: string): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(challenge, signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  static getEmployeeByAddress(address: string): EmployeeWallet | undefined {
    for (const wallet of EMPLOYEE_WALLETS.values()) {
      if (wallet.address.toLowerCase() === address.toLowerCase()) {
        return wallet;
      }
    }
    return undefined;
  }
}

// Export for easy access
export { employeeWallets };
