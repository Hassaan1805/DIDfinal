import 'dart:io';

class AppConfig {
  static const String appName = 'DID Wallet';
  static const String version = '1.0.0';

  // Environment detection
  static bool get isProduction => !isDebug;
  static bool get isDebug {
    bool inDebugMode = false;
    assert(inDebugMode = true);
    return inDebugMode;
  }

  // API Configuration
  static List<String> get baseUrls {
    if (isProduction) {
      return productionUrls;
    } else {
      return developmentUrls;
    }
  }

  // Production URLs (Railway deployment)
  static const List<String> productionUrls = [
    'https://did-platform-backend.railway.app',
    'https://your-backend-service.railway.app', // Replace with actual URL
  ];

  // Development URLs (local development)
  static const List<String> developmentUrls = [
    'http://192.168.1.100:3001',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://10.0.2.2:3001', // Android emulator
  ];

  // Network configuration
  static const int timeoutSeconds = 10;
  static const int maxRetries = 3;
  static const int discoveryTimeoutSeconds = 30;

  // Feature flags
  static const bool enableAnalytics = false;
  static const bool enableCrashReporting = false;
  static const bool enableDebugLogging = true;

  // Blockchain configuration
  static const String ethereumNetwork = 'sepolia';
  static const int chainId = 11155111;
  static const String contractAddress =
      '0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48';

  // App store configuration
  static const String androidPackageId = 'com.didplatform.wallet';
  static const String iosAppId = 'your-ios-app-id';

  // Deep linking
  static const String deepLinkScheme = 'didwallet';
  static const String deepLinkHost = 'auth';

  // QR Code configuration
  static const int qrCodeSize = 256;
  static const int qrRefreshInterval = 30; // seconds

  // Platform specific configuration
  static Map<String, dynamic> get platformConfig {
    if (Platform.isAndroid) {
      return {
        'platform': 'android',
        'packageId': androidPackageId,
        'minSdkVersion': 21,
        'targetSdkVersion': 34,
      };
    } else if (Platform.isIOS) {
      return {
        'platform': 'ios',
        'bundleId': 'com.didplatform.wallet',
        'minIosVersion': '12.0',
        'appId': iosAppId,
      };
    } else {
      return {
        'platform': 'unknown',
      };
    }
  }

  // Get the primary backend URL for production
  static String get primaryBackendUrl {
    return isProduction ? productionUrls.first : developmentUrls.first;
  }

  // Helper method to update production URLs dynamically
  static List<String> getProductionUrls(String backendUrl) {
    return [
      backendUrl,
      ...productionUrls.where((url) => url != backendUrl),
    ];
  }
}
