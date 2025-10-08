import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'dart:convert';
import 'dart:io';
import 'dart:async';

import '../models/network_diagnostic.dart';
import '../models/auth_request.dart';

class NetworkService extends ChangeNotifier {
  // Base URLs to test - includes Railway deployment and local development
  final List<String> _baseUrls = [
    // Production Railway URLs (update these with your actual Railway URLs)
    'https://did-platform-backend.railway.app',
    'https://your-backend-service.railway.app',

    // Local development URLs
    'http://192.168.1.100:3001', // Specific PC IP (Ethernet)
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://10.0.2.2:3001', // Android emulator
  ];

  String? _workingUrl;
  bool _isConnected = false;
  List<NetworkTestResult> _lastTestResults = [];
  DeviceInfo? _deviceInfo;
  bool _isDiscovering = false;

  // Getters
  String? get workingUrl => _workingUrl;
  bool get isConnected => _isConnected;
  List<NetworkTestResult> get lastTestResults => _lastTestResults;
  DeviceInfo? get deviceInfo => _deviceInfo;
  bool get isDiscovering => _isDiscovering;

  // Initialize network service with automatic discovery
  Future<void> init() async {
    await _generateDeviceInfo();
    await _discoverNetworkBackends();
    await runDiagnostics();
  }

  // Discover backend servers on local network
  Future<void> _discoverNetworkBackends() async {
    if (_isDiscovering) return;

    _isDiscovering = true;
    notifyListeners();

    print('🔍 Starting automatic backend discovery...');

    try {
      // Get local IP address to determine network range
      final localIps = await _getLocalIpAddresses();
      final discoveredUrls = <String>[];

      for (final localIp in localIps) {
        final networkUrls = _generateNetworkUrls(localIp);
        discoveredUrls.addAll(networkUrls);
      }

      // Add discovered URLs to base URLs if not already present
      for (final url in discoveredUrls) {
        if (!_baseUrls.contains(url)) {
          _baseUrls.add(url);
        }
      }

      print('📡 Discovery complete. Testing ${_baseUrls.length} URLs');
    } catch (e) {
      print('❌ Network discovery error: $e');
    } finally {
      _isDiscovering = false;
      notifyListeners();
    }
  }

  // Get local IP addresses
  Future<List<String>> _getLocalIpAddresses() async {
    try {
      final interfaces = await NetworkInterface.list();
      final ipAddresses = <String>[];

      for (final interface in interfaces) {
        if (interface.name.toLowerCase().contains('wi-fi') ||
            interface.name.toLowerCase().contains('wlan') ||
            interface.name.toLowerCase().contains('eth')) {
          for (final address in interface.addresses) {
            if (address.type == InternetAddressType.IPv4 &&
                !address.isLoopback) {
              ipAddresses.add(address.address);
              print('🌐 Found local IP: ${address.address}');
            }
          }
        }
      }

      return ipAddresses;
    } catch (e) {
      print('❌ Error getting local IPs: $e');
      return [];
    }
  }

  // Generate network URLs based on local IP
  List<String> _generateNetworkUrls(String localIp) {
    final urls = <String>[];

    try {
      final parts = localIp.split('.');
      if (parts.length == 4) {
        final subnet = '${parts[0]}.${parts[1]}.${parts[2]}';

        // Common IP ranges for backend servers
        final commonIps = [
          1, 100, 101, 102, 103, 104, 105, // Common router/server IPs
          10, 20, 50, // Other common server IPs
          int.tryParse(parts[3]) ?? 1, // Same IP as device
        ];

        for (final ip in commonIps) {
          final testIp = '$subnet.$ip';
          if (testIp != localIp) {
            // Don't test device's own IP
            urls.add('http://$testIp:3001');
          }
        }
      }
    } catch (e) {
      print('❌ Error generating network URLs: $e');
    }

    return urls;
  }

  // Generate device information
  Future<void> _generateDeviceInfo() async {
    try {
      final deviceInfoPlugin = DeviceInfoPlugin();

      if (Platform.isAndroid) {
        final androidInfo = await deviceInfoPlugin.androidInfo;
        _deviceInfo = DeviceInfo(
          userAgent:
              'DIDWallet/${androidInfo.version.release} (Android ${androidInfo.version.sdkInt})',
          platform: 'Android',
          isMobile: true,
          isIOS: false,
          isAndroid: true,
          operatingSystem: 'Android ${androidInfo.version.release}',
          deviceModel: '${androidInfo.manufacturer} ${androidInfo.model}',
          supportsCamera: true,
        );
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfoPlugin.iosInfo;
        _deviceInfo = DeviceInfo(
          userAgent: 'DIDWallet/${iosInfo.systemVersion} (iOS)',
          platform: 'iOS',
          isMobile: true,
          isIOS: true,
          isAndroid: false,
          operatingSystem: 'iOS ${iosInfo.systemVersion}',
          deviceModel: '${iosInfo.name} (${iosInfo.model})',
          supportsCamera: true,
        );
      } else {
        _deviceInfo = DeviceInfo(
          userAgent: 'DIDWallet/1.0.0 (Unknown)',
          platform: Platform.operatingSystem,
          isMobile: Platform.isAndroid || Platform.isIOS,
          isIOS: Platform.isIOS,
          isAndroid: Platform.isAndroid,
          operatingSystem: Platform.operatingSystem,
          deviceModel: 'Unknown Device',
          supportsCamera: false,
        );
      }

      notifyListeners();
    } catch (e) {
      print('Error generating device info: $e');
    }
  }

  // Check network connectivity
  Future<bool> checkConnectivity() async {
    try {
      final connectivityResult = await Connectivity().checkConnectivity();
      return connectivityResult != ConnectivityResult.none;
    } catch (e) {
      print('Error checking connectivity: $e');
      return false;
    }
  }

  // Run comprehensive network diagnostics
  Future<ConnectionStatus> runDiagnostics() async {
    print('🔧 Running network diagnostics on ${_baseUrls.length} URLs...');

    final List<NetworkTestResult> results = [];
    String? workingUrl;

    // Check basic connectivity first
    final hasConnection = await checkConnectivity();
    if (!hasConnection) {
      const noConnectionResult = NetworkTestResult(
        success: false,
        method: 'connectivity',
        url: 'system',
        responseTime: 0,
        error: 'No internet connection',
        suggestion: 'Check your WiFi or cellular data connection',
      );
      results.add(noConnectionResult);
      _lastTestResults = results;
      _isConnected = false;
      notifyListeners();

      return ConnectionStatus(
        isConnected: false,
        testResults: results,
        recommendations: _getRecommendations(results),
      );
    }

    // Test each backend URL with timeout
    final futures =
        _baseUrls.take(20).map((url) => _testSingleConnection(url).timeout(
              const Duration(seconds: 5),
              onTimeout: () => NetworkTestResult(
                success: false,
                method: 'http',
                url: url,
                responseTime: 5000,
                error: 'Connection timeout',
                suggestion: 'Server may be unreachable or slow',
              ),
            ));

    final testResults = await Future.wait(futures);
    results.addAll(testResults);

    // Find first working URL
    for (final result in results) {
      if (result.success && workingUrl == null) {
        workingUrl = result.url.replaceAll('/api/health', '');
        print('✅ Found working backend: $workingUrl');
        break;
      }
    }

    _workingUrl = workingUrl;
    _isConnected = workingUrl != null;
    _lastTestResults = results;
    notifyListeners();

    print(
        '📊 Diagnostics complete: ${results.where((r) => r.success).length}/${results.length} successful');

    return ConnectionStatus(
      isConnected: _isConnected,
      testResults: results,
      workingUrl: workingUrl,
      recommendations: _getRecommendations(results),
    );
  }

  // Test connection to a single URL
  Future<NetworkTestResult> _testSingleConnection(String baseUrl) async {
    final url = '$baseUrl/api/health';
    final startTime = DateTime.now();

    try {
      final headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      if (_deviceInfo != null) {
        headers['X-Device-Info'] = jsonEncode(_deviceInfo!.toJson());
      }

      final response = await http
          .get(
            Uri.parse(url),
            headers: headers,
          )
          .timeout(const Duration(seconds: 10));

      final responseTime = DateTime.now().difference(startTime).inMilliseconds;

      if (response.statusCode == 200) {
        // Try to parse JSON response
        try {
          final data = jsonDecode(response.body);
          print('✅ Health check successful for $baseUrl: ${data['status']}');
        } catch (e) {
          print('✅ Health check successful for $baseUrl (non-JSON response)');
        }

        return NetworkTestResult(
          success: true,
          method: 'http',
          url: url,
          responseTime: responseTime,
          statusCode: response.statusCode,
        );
      } else {
        return NetworkTestResult(
          success: false,
          method: 'http',
          url: url,
          responseTime: responseTime,
          error: 'HTTP ${response.statusCode}: ${response.reasonPhrase}',
          statusCode: response.statusCode,
          suggestion: _getSuggestionForStatus(response.statusCode),
        );
      }
    } catch (e) {
      final responseTime = DateTime.now().difference(startTime).inMilliseconds;
      return NetworkTestResult(
        success: false,
        method: 'http',
        url: url,
        responseTime: responseTime,
        error: e.toString(),
        suggestion: _getSuggestionForError(e),
      );
    }
  }

  // Get suggestion based on HTTP status code
  String _getSuggestionForStatus(int status) {
    switch (status) {
      case 404:
        return 'Backend server is running but endpoint not found. Check API routes.';
      case 500:
        return 'Backend server error. Check server logs for details.';
      case 403:
        return 'Access forbidden. Check CORS configuration or authentication.';
      case 502:
        return 'Bad gateway. Backend server may be down or unreachable.';
      case 503:
        return 'Service unavailable. Backend server may be overloaded.';
      default:
        return 'HTTP $status error. Server may be misconfigured.';
    }
  }

  // Get suggestion based on error type
  String _getSuggestionForError(dynamic error) {
    final errorMsg = error.toString().toLowerCase();

    if (errorMsg.contains('timeout')) {
      return 'Connection timeout. Backend server may be slow or unreachable.';
    }

    if (errorMsg.contains('connection refused') ||
        errorMsg.contains('failed to connect')) {
      return 'Connection refused. Backend server may not be running.';
    }

    if (errorMsg.contains('network is unreachable')) {
      return 'Network unreachable. Check your internet connection.';
    }

    if (errorMsg.contains('no route to host')) {
      return 'No route to host. Check network configuration or firewall.';
    }

    if (errorMsg.contains('certificate') ||
        errorMsg.contains('ssl') ||
        errorMsg.contains('tls')) {
      return 'SSL/TLS error. Check certificate configuration.';
    }

    return 'Network error: ${error.toString()}. Check connection and try again.';
  }

  // Get recommendations based on test results
  List<String> _getRecommendations(List<NetworkTestResult> results) {
    final recommendations = <String>[];
    final allFailed = results.every((r) => !r.success);

    if (allFailed) {
      recommendations.add('🔄 Pull down to refresh and try again');
      recommendations.add('📶 Check your internet connection (WiFi/Cellular)');
      recommendations
          .add('🖥️ Verify backend server is running on the local network');

      if (_deviceInfo?.isAndroid == true) {
        recommendations.add(
            '📱 Android users: Try switching between WiFi and mobile data');
        recommendations.add(
            '🔧 Check if localhost is accessible (try 10.0.2.2 for emulator)');
      } else if (_deviceInfo?.isIOS == true) {
        recommendations
            .add('📱 iOS users: Check WiFi network allows local connections');
        recommendations.add(
            '🛡️ Disable any VPN or proxy that might block local connections');
      }

      recommendations
          .add('🔥 Temporarily disable any firewall or security software');
      recommendations.add('📋 Copy diagnostic info and contact IT support');
    } else if (results.any((r) => r.success)) {
      recommendations.add('✅ Connection established successfully');
    }

    return recommendations;
  }

  // Authenticate using the working URL with Sepolia blockchain
  Future<AuthResult> authenticate(
      AuthRequest request, String signature, String address) async {
    if (_workingUrl == null) {
      await runDiagnostics();
      if (_workingUrl == null) {
        return const AuthResult(
          success: false,
          error: 'No backend connection available',
        );
      }
    }

    try {
      print('🔗 Starting Sepolia blockchain authentication...');
      print('📡 Using backend: $_workingUrl');
      print('🔐 Address: $address');
      print('📝 Challenge ID: ${request.challengeId}');

      // Prepare Sepolia authentication request
      final sepoliaAuthData = {
        'challengeId': request.challengeId,
        'signature': signature,
        'address': address,
        'message': 'Authentication challenge: ${request.challenge}',
        'storeOnChain': true, // Enable blockchain storage
      };

      // Use Sepolia endpoint for authentication
      final sepoliaEndpoint = '$_workingUrl/api/auth/sepolia-verify';

      final response = await http
          .post(
            Uri.parse(sepoliaEndpoint),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Device-Info':
                  _deviceInfo != null ? jsonEncode(_deviceInfo!.toJson()) : '',
            },
            body: jsonEncode(sepoliaAuthData),
          )
          .timeout(const Duration(
              seconds: 30)); // Longer timeout for blockchain operations

      print('📊 Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ Sepolia authentication response received');

        // Check if it was successful
        if (data['success'] == true) {
          final verification = data['verification'];
          final blockchain = verification?['blockchain'];
          final txHash = blockchain?['verification']?['txHash'];

          if (txHash != null) {
            print('🔗 Transaction stored on Sepolia blockchain: $txHash');
          }

          return AuthResult(
            success: true,
            message: 'Authentication successful via Sepolia blockchain',
            token: data['token'],
            user: data['user'],
            blockchainData: {
              'txHash': txHash,
              'network': 'Sepolia',
              'contractAddress': blockchain?['contract']?['address'],
              'verification': blockchain?['verification'],
            },
          );
        } else {
          return AuthResult(
            success: false,
            error: data['error'] ?? 'Sepolia authentication failed',
            details: data['details'],
          );
        }
      } else {
        final errorData =
            response.statusCode >= 400 && response.statusCode < 500
                ? jsonDecode(response.body)
                : null;

        return AuthResult(
          success: false,
          error: 'Sepolia authentication failed: HTTP ${response.statusCode}',
          details: errorData?['error'] ?? response.reasonPhrase,
        );
      }
    } catch (e) {
      print('❌ Sepolia authentication error: $e');

      // Test if backend is still working
      final testResult = await _testSingleConnection(_workingUrl!);
      if (!testResult.success) {
        _workingUrl = null; // Reset working URL
        _isConnected = false;
        notifyListeners();

        return const AuthResult(
          success: false,
          error: 'Backend connection lost. Please run diagnostics again.',
        );
      }

      return AuthResult(
        success: false,
        error: 'Sepolia authentication error: ${e.toString()}',
      );
    }
  }

  // Test Sepolia authentication endpoint
  Future<Map<String, dynamic>> testSepoliaAuthentication() async {
    if (_workingUrl == null) {
      await runDiagnostics();
      if (_workingUrl == null) {
        return {'success': false, 'error': 'No backend connection available'};
      }
    }

    try {
      // Test Sepolia status endpoint
      final statusResponse = await http.get(
        Uri.parse('$_workingUrl/api/auth/sepolia-status'),
        headers: {'Accept': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      if (statusResponse.statusCode == 200) {
        final statusData = jsonDecode(statusResponse.body);
        print('✅ Sepolia service status: ${statusData['status']}');
        return statusData;
      } else {
        return {
          'success': false,
          'error':
              'Sepolia service unavailable: HTTP ${statusResponse.statusCode}',
          'details': statusResponse.reasonPhrase,
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': 'Sepolia service test failed: ${e.toString()}',
      };
    }
  }

  // Get diagnostic summary for support
  Map<String, dynamic> getDiagnosticSummary() {
    return {
      'timestamp': DateTime.now().toIso8601String(),
      'deviceInfo': _deviceInfo?.toJson(),
      'isConnected': _isConnected,
      'workingUrl': _workingUrl,
      'testResults': _lastTestResults.map((r) => r.toJson()).toList(),
      'testedUrls': _baseUrls,
    };
  }

  // Manual URL testing (for advanced users)
  Future<NetworkTestResult> testCustomUrl(String url) async {
    return await _testSingleConnection(url);
  }
}
