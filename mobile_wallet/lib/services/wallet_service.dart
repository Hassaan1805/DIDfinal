import 'package:flutter/foundation.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';

import '../models/employee.dart';
import '../models/auth_request.dart';
import 'storage_service.dart';
import 'network_service.dart';

class WalletService extends ChangeNotifier {
  final StorageService _storageService;
  final NetworkService _networkService;

  Employee? _currentEmployee;
  bool _isLoaded = false;

  WalletService(this._storageService, this._networkService);

  // Getters
  Employee? get currentEmployee => _currentEmployee;
  bool get isLoaded => _isLoaded;
  List<Employee> get availableEmployees => EmployeeWallets.defaultEmployees;

  // Initialize wallet service
  Future<void> init() async {
    try {
      // Load current employee from storage
      final employeeId = await _storageService.getCurrentEmployee();
      if (employeeId != null) {
        _currentEmployee = EmployeeWallets.getEmployeeById(employeeId);
      }

      // Default to first employee if none selected
      _currentEmployee ??= EmployeeWallets.defaultEmployees.first;

      _isLoaded = true;
      notifyListeners();

      print(
          '🚀 Wallet service initialized with employee: ${_currentEmployee?.name}');
    } catch (e) {
      print('Error initializing wallet service: $e');
      _isLoaded = true;
      notifyListeners();
    }
  }

  // Switch to a different employee
  Future<void> switchEmployee(String employeeId) async {
    try {
      final employee = EmployeeWallets.getEmployeeById(employeeId);
      if (employee == null) {
        throw Exception('Employee not found: $employeeId');
      }

      _currentEmployee = employee;
      await _storageService.saveCurrentEmployee(employeeId);
      notifyListeners();

      print('✅ Switched to employee: ${employee.name}');
    } catch (e) {
      print('Error switching employee: $e');
      rethrow;
    }
  }

  // Get employee by various identifiers
  Employee? getEmployeeById(String id) => EmployeeWallets.getEmployeeById(id);
  Employee? getEmployeeByDid(String did) =>
      EmployeeWallets.getEmployeeByDid(did);
  Employee? getEmployeeByAddress(String address) =>
      EmployeeWallets.getEmployeeByAddress(address);

  // Parse QR code data into AuthRequest
  AuthRequest parseQRCode(String qrData) {
    try {
      final data = jsonDecode(qrData);
      return AuthRequest.fromJson(data);
    } catch (e) {
      throw Exception('Invalid QR code: Not valid JSON data. Error: $e');
    }
  }

  // Validate authentication request
  bool validateAuthRequest(AuthRequest request) {
    // Check if request is expired
    if (request.isExpired) {
      throw Exception('Authentication request has expired');
    }

    // Validate request type
    if (request.type != 'did-auth-request') {
      throw Exception('Invalid QR code: Not a DID authentication request');
    }

    return true;
  }

  // Check DID mismatch
  bool checkDIDMatch(AuthRequest request) {
    if (_currentEmployee == null) return false;

    if (request.expectedDID != null &&
        request.expectedDID != _currentEmployee!.did) {
      return false;
    }

    return true;
  }

  // Generate demo signature (same logic as HTML wallet)
  Future<String> generateDemoSignature(
      String challenge, String privateKeyHex) async {
    try {
      // For demo purposes - generate a consistent signature based on challenge and private key
      // This simulates what ethers.js would do but without external dependencies

      final data = '$challenge$privateKeyHex';
      final bytes = utf8.encode(data);

      // Use crypto library to generate a hash
      final digest = sha256.convert(bytes);
      final hashHex = digest.toString();

      // Format as Ethereum signature (0x + 64 bytes + recovery byte)
      return '0x${hashHex}1b'; // Add recovery byte
    } catch (e) {
      print('Error generating signature: $e');
      rethrow;
    }
  }

  // Authenticate with parsed QR request
  Future<AuthResult> authenticate(AuthRequest request) async {
    try {
      if (_currentEmployee == null) {
        throw Exception('No employee selected');
      }

      // Validate the request
      validateAuthRequest(request);

      print('🔍 Starting authentication for ${_currentEmployee!.name}');
      print('🆔 User DID: ${_currentEmployee!.did}');

      // Check DID mismatch warning
      if (!checkDIDMatch(request)) {
        print('⚠️ DID mismatch detected:');
        print('   Expected: ${request.expectedDID}');
        print('   Actual: ${_currentEmployee!.did}');
        // In a real app, you might want to show a confirmation dialog
      }

      // Generate signature using the current employee's private key
      final signature = await generateDemoSignature(
        request.challenge,
        _currentEmployee!.privateKeyHex,
      );

      print('🔐 Generated signature: ${signature.substring(0, 20)}...');

      // Send authentication request to backend
      final result = await _networkService.authenticate(
        request,
        signature,
        _currentEmployee!.address,
      );

      if (result.success) {
        // Save auth token if provided
        if (result.token != null) {
          await _storageService.saveAuthToken(result.token!);
        }

        print('✅ Authentication successful for ${_currentEmployee!.name}');
      } else {
        print('❌ Authentication failed: ${result.error}');
      }

      return result;
    } catch (e) {
      print('❌ Authentication error: $e');
      return AuthResult(
        success: false,
        error: e.toString(),
      );
    }
  }

  // Get wallet debug information
  Map<String, dynamic> getDebugInfo() {
    return {
      'isLoaded': _isLoaded,
      'currentEmployee': _currentEmployee?.toJson(),
      'availableEmployees': availableEmployees.length,
      'employeeList': availableEmployees
          .map((e) => {
                'id': e.id,
                'name': e.name,
                'role': e.role,
                'did': e.shortDid,
              })
          .toList(),
      'networkConnected': _networkService.isConnected,
      'workingUrl': _networkService.workingUrl,
    };
  }

  // Clear wallet data
  Future<void> clearWalletData() async {
    try {
      await _storageService.clearCurrentEmployee();
      await _storageService.clearAuthToken();

      _currentEmployee = EmployeeWallets.defaultEmployees.first;
      notifyListeners();

      print('🗑️ Wallet data cleared');
    } catch (e) {
      print('Error clearing wallet data: $e');
      rethrow;
    }
  }

  // Export wallet information (for backup or support)
  Map<String, dynamic> exportWalletInfo() {
    return {
      'currentEmployeeId': _currentEmployee?.id,
      'availableEmployees': availableEmployees
          .map((e) => {
                'id': e.id,
                'name': e.name,
                'role': e.role,
                'department': e.department,
                'did': e.did,
                'address': e.address,
                // Don't include private keys in export
              })
          .toList(),
      'exportTimestamp': DateTime.now().toIso8601String(),
      'version': '1.0.0',
    };
  }

  // Validate DID format
  static bool isValidDID(String did) {
    // Basic DID format validation: did:ethr:0x[40 hex chars]
    final didRegex = RegExp(r'^did:ethr:0x[a-fA-F0-9]{40}$');
    return didRegex.hasMatch(did);
  }

  // Validate Ethereum address format
  static bool isValidEthereumAddress(String address) {
    final addressRegex = RegExp(r'^0x[a-fA-F0-9]{40}$');
    return addressRegex.hasMatch(address);
  }

  @override
  void dispose() {
    super.dispose();
  }
}
