"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeWallets = exports.EmployeeSignature = exports.EMPLOYEE_WALLETS = void 0;
const ethers_1 = require("ethers");
function generateEmployeePrivateKey(employeeId) {
    const hash = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(`employee_${employeeId}_private_key_2025`));
    return hash;
}
const employeeWallets = [
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
exports.employeeWallets = employeeWallets;
employeeWallets.forEach(wallet => {
    const ethersWallet = new ethers_1.ethers.Wallet(wallet.privateKey);
    wallet.address = ethersWallet.address;
    wallet.did = `did:ethr:${wallet.address}`;
});
exports.EMPLOYEE_WALLETS = new Map(employeeWallets.map(wallet => [wallet.id, wallet]));
class EmployeeSignature {
    static async signChallenge(employeeId, challenge) {
        const wallet = exports.EMPLOYEE_WALLETS.get(employeeId);
        if (!wallet) {
            throw new Error(`Employee ${employeeId} not found`);
        }
        const ethersWallet = new ethers_1.ethers.Wallet(wallet.privateKey);
        const signature = await ethersWallet.signMessage(challenge);
        return signature;
    }
    static async verifySignature(challenge, signature, expectedAddress) {
        try {
            const recoveredAddress = ethers_1.ethers.verifyMessage(challenge, signature);
            return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
        }
        catch (error) {
            console.error('Signature verification error:', error);
            return false;
        }
    }
    static getEmployeeByAddress(address) {
        for (const wallet of exports.EMPLOYEE_WALLETS.values()) {
            if (wallet.address.toLowerCase() === address.toLowerCase()) {
                return wallet;
            }
        }
        return undefined;
    }
}
exports.EmployeeSignature = EmployeeSignature;
//# sourceMappingURL=employeeWallets.js.map