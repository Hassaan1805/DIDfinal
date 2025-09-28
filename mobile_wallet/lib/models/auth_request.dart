class AuthRequest {
  final String type;
  final String challengeId;
  final String challenge;
  final String companyId;
  final AuthEmployee employee;
  final String apiEndpoint;
  final int expiresAt;
  final String? expectedDID;

  const AuthRequest({
    required this.type,
    required this.challengeId,
    required this.challenge,
    required this.companyId,
    required this.employee,
    required this.apiEndpoint,
    required this.expiresAt,
    this.expectedDID,
  });

  factory AuthRequest.fromJson(Map<String, dynamic> json) {
    return AuthRequest(
      type: json['type'] as String,
      challengeId: json['challengeId'] as String,
      challenge: json['challenge'] as String,
      companyId: json['companyId'] as String,
      employee: AuthEmployee.fromJson(json['employee'] as Map<String, dynamic>),
      apiEndpoint: json['apiEndpoint'] as String,
      expiresAt: json['expiresAt'] as int,
      expectedDID: json['expectedDID'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'challengeId': challengeId,
      'challenge': challenge,
      'companyId': companyId,
      'employee': employee.toJson(),
      'apiEndpoint': apiEndpoint,
      'expiresAt': expiresAt,
      'expectedDID': expectedDID,
    };
  }

  bool get isExpired => DateTime.now().millisecondsSinceEpoch > expiresAt;

  DateTime get expirationDate => DateTime.fromMillisecondsSinceEpoch(expiresAt);

  String get shortChallenge {
    if (challenge.length > 20) {
      return '${challenge.substring(0, 10)}...${challenge.substring(challenge.length - 10)}';
    }
    return challenge;
  }
}

class AuthEmployee {
  final String id;
  final String name;
  final String role;
  final String department;

  const AuthEmployee({
    required this.id,
    required this.name,
    required this.role,
    required this.department,
  });

  factory AuthEmployee.fromJson(Map<String, dynamic> json) {
    return AuthEmployee(
      id: json['id'] as String,
      name: json['name'] as String,
      role: json['role'] as String,
      department: json['department'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'role': role,
      'department': department,
    };
  }
}

class AuthResponse {
  final String challengeId;
  final String signature;
  final String address;
  final String message;

  const AuthResponse({
    required this.challengeId,
    required this.signature,
    required this.address,
    required this.message,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      challengeId: json['challengeId'] as String,
      signature: json['signature'] as String,
      address: json['address'] as String,
      message: json['message'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'challengeId': challengeId,
      'signature': signature,
      'address': address,
      'message': message,
    };
  }
}

class AuthResult {
  final bool success;
  final String? error;
  final String? token;
  final Map<String, dynamic>? user;
  final String? message;

  const AuthResult({
    required this.success,
    this.error,
    this.token,
    this.user,
    this.message,
  });

  factory AuthResult.fromJson(Map<String, dynamic> json) {
    return AuthResult(
      success: json['success'] as bool,
      error: json['error'] as String?,
      token: json['token'] as String?,
      user: json['user'] as Map<String, dynamic>?,
      message: json['message'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'error': error,
      'token': token,
      'user': user,
      'message': message,
    };
  }
}
