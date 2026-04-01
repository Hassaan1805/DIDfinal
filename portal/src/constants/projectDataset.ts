export interface ProjectRecord {
  code: string;
  name: string;
  ownerId: string;
  owner: string;
  progress: number;
  risk: 'Low' | 'Medium' | 'High';
  networkTx: number;
  budget: string;
  eta: string;
  teamMembers: string[];
}

export const PROJECT_DATASET: {
  managerTeamMap: Record<string, string[]>;
  catalog: ProjectRecord[];
} = {
  managerTeamMap: {
    EMP001: ['EMP001', 'EMP002', 'EMP003', 'EMP004'],
    EMP002: ['EMP002', 'EMP003', 'EMP004'],
  },
  catalog: [
    {
      code: 'PRJ-001',
      name: 'DID Wallet Authentication Revamp',
      ownerId: 'EMP001',
      owner: 'Zaid',
      progress: 84,
      risk: 'Medium',
      networkTx: 128,
      budget: '$46,000',
      eta: '6 days',
      teamMembers: ['EMP001', 'EMP002', 'EMP003'],
    },
    {
      code: 'PRJ-002',
      name: 'Role Credential Issuance Automation',
      ownerId: 'EMP002',
      owner: 'Hassaan',
      progress: 71,
      risk: 'Low',
      networkTx: 93,
      budget: '$32,500',
      eta: '11 days',
      teamMembers: ['EMP002', 'EMP003', 'EMP004'],
    },
    {
      code: 'PRJ-003',
      name: 'Enterprise Access Insights Dashboard',
      ownerId: 'EMP003',
      owner: 'Atharva',
      progress: 63,
      risk: 'Medium',
      networkTx: 77,
      budget: '$27,300',
      eta: '15 days',
      teamMembers: ['EMP003', 'EMP004'],
    },
    {
      code: 'PRJ-004',
      name: 'Auditor Evidence Vault Integration',
      ownerId: 'EMP004',
      owner: 'Gracian',
      progress: 58,
      risk: 'Medium',
      networkTx: 42,
      budget: '$19,800',
      eta: '19 days',
      teamMembers: ['EMP004', 'EMP001'],
    },
    {
      code: 'PRJ-005',
      name: 'Sepolia Traceability Control Plane',
      ownerId: 'EMP002',
      owner: 'Hassaan',
      progress: 52,
      risk: 'High',
      networkTx: 156,
      budget: '$54,900',
      eta: '24 days',
      teamMembers: ['EMP001', 'EMP002', 'EMP003', 'EMP004'],
    },
  ],
};
