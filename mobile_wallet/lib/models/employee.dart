class Employee {
  final String id;
  final String name;
  final String department;
  final String role;
  final String email;
  final String privateKeyHex;
  final String address;
  final String did;
  final String companyId;

  const Employee({
    required this.id,
    required this.name,
    required this.department,
    required this.role,
    required this.email,
    required this.privateKeyHex,
    required this.address,
    required this.did,
    required this.companyId,
  });

  factory Employee.fromJson(Map<String, dynamic> json) {
    return Employee(
      id: json['id'] as String,
      name: json['name'] as String,
      department: json['department'] as String,
      role: json['role'] as String,
      email: json['email'] as String,
      privateKeyHex: json['privateKeyHex'] as String,
      address: json['address'] as String,
      did: json['did'] as String,
      companyId: json['companyId'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'department': department,
      'role': role,
      'email': email,
      'privateKeyHex': privateKeyHex,
      'address': address,
      'did': did,
      'companyId': companyId,
    };
  }

  // Get initials for avatar
  String get initials {
    List<String> nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return '${nameParts[0][0]}${nameParts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  // Get short DID for display
  String get shortDid {
    if (did.length > 20) {
      return '${did.substring(0, 10)}...${did.substring(did.length - 8)}';
    }
    return did;
  }

  // Get short address for display
  String get shortAddress {
    if (address.length > 20) {
      return '${address.substring(0, 6)}...${address.substring(address.length - 4)}';
    }
    return address;
  }

  @override
  String toString() {
    return 'Employee(id: $id, name: $name, role: $role)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Employee && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}

// Default employee wallets (same as the HTML wallet)
class EmployeeWallets {
  static const List<Employee> defaultEmployees = [
    Employee(
      id: 'EMP001',
      name: 'Zaid',
      department: 'Engineering',
      role: 'CEO & Founder',
      email: 'zaid@decentralized-trust.platform',
      privateKeyHex:
          '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
      address: '0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F',
      did: 'did:ethr:0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F',
      companyId: 'dtp_enterprise_001',
    ),
    Employee(
      id: 'EMP002',
      name: 'Hassaan',
      department: 'Engineering',
      role: 'CTO & Co-Founder',
      email: 'hassaan@decentralized-trust.platform',
      privateKeyHex:
          '0x7c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b926',
      address: '0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F',
      did: 'did:ethr:0x742d35Cc6Dd03A30DE0F7b5A7A8a8Dd1CE4Aaa2F',
      companyId: 'dtp_enterprise_001',
    ),
    Employee(
      id: 'EMP003',
      name: 'Atharva',
      department: 'Engineering',
      role: 'Lead Frontend Developer',
      email: 'atharva@decentralized-trust.platform',
      privateKeyHex:
          '0x6c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b927',
      address: '0x1234567890123456789012345678901234567890',
      did: 'did:ethr:0x1234567890123456789012345678901234567890',
      companyId: 'dtp_enterprise_001',
    ),
    Employee(
      id: 'EMP004',
      name: 'Gracian',
      department: 'Engineering',
      role: 'Senior Backend Developer',
      email: 'gracian@decentralized-trust.platform',
      privateKeyHex:
          '0x5c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b928',
      address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
      did: 'did:ethr:0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
      companyId: 'dtp_enterprise_001',
    ),
  ];

  static Employee? getEmployeeById(String id) {
    try {
      return defaultEmployees.firstWhere((emp) => emp.id == id);
    } catch (e) {
      return null;
    }
  }

  static Employee? getEmployeeByDid(String did) {
    try {
      return defaultEmployees.firstWhere((emp) => emp.did == did);
    } catch (e) {
      return null;
    }
  }

  static Employee? getEmployeeByAddress(String address) {
    try {
      return defaultEmployees.firstWhere((emp) => emp.address == address);
    } catch (e) {
      return null;
    }
  }
}
