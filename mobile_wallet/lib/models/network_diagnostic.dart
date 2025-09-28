class DeviceInfo {
  final String userAgent;
  final String platform;
  final bool isMobile;
  final bool isIOS;
  final bool isAndroid;
  final String operatingSystem;
  final String deviceModel;
  final bool supportsCamera;

  const DeviceInfo({
    required this.userAgent,
    required this.platform,
    required this.isMobile,
    required this.isIOS,
    required this.isAndroid,
    required this.operatingSystem,
    required this.deviceModel,
    required this.supportsCamera,
  });

  factory DeviceInfo.fromJson(Map<String, dynamic> json) {
    return DeviceInfo(
      userAgent: json['userAgent'] as String,
      platform: json['platform'] as String,
      isMobile: json['isMobile'] as bool,
      isIOS: json['isIOS'] as bool,
      isAndroid: json['isAndroid'] as bool,
      operatingSystem: json['operatingSystem'] as String,
      deviceModel: json['deviceModel'] as String,
      supportsCamera: json['supportsCamera'] as bool,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userAgent': userAgent,
      'platform': platform,
      'isMobile': isMobile,
      'isIOS': isIOS,
      'isAndroid': isAndroid,
      'operatingSystem': operatingSystem,
      'deviceModel': deviceModel,
      'supportsCamera': supportsCamera,
    };
  }
}

class NetworkTestResult {
  final bool success;
  final String method;
  final String url;
  final int responseTime;
  final String? error;
  final String? suggestion;
  final int? statusCode;

  const NetworkTestResult({
    required this.success,
    required this.method,
    required this.url,
    required this.responseTime,
    this.error,
    this.suggestion,
    this.statusCode,
  });

  factory NetworkTestResult.fromJson(Map<String, dynamic> json) {
    return NetworkTestResult(
      success: json['success'] as bool,
      method: json['method'] as String,
      url: json['url'] as String,
      responseTime: json['responseTime'] as int,
      error: json['error'] as String?,
      suggestion: json['suggestion'] as String?,
      statusCode: json['statusCode'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'method': method,
      'url': url,
      'responseTime': responseTime,
      'error': error,
      'suggestion': suggestion,
      'statusCode': statusCode,
    };
  }

  @override
  String toString() {
    return success
        ? '✅ $method: SUCCESS (${responseTime}ms)'
        : '❌ $method: FAILED ($error)';
  }
}

class ConnectionStatus {
  final bool isConnected;
  final List<NetworkTestResult> testResults;
  final String? workingUrl;
  final List<String> recommendations;

  const ConnectionStatus({
    required this.isConnected,
    required this.testResults,
    this.workingUrl,
    required this.recommendations,
  });

  factory ConnectionStatus.fromJson(Map<String, dynamic> json) {
    return ConnectionStatus(
      isConnected: json['isConnected'] as bool,
      testResults: (json['testResults'] as List)
          .map((e) => NetworkTestResult.fromJson(e as Map<String, dynamic>))
          .toList(),
      workingUrl: json['workingUrl'] as String?,
      recommendations:
          (json['recommendations'] as List).map((e) => e as String).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'isConnected': isConnected,
      'testResults': testResults.map((e) => e.toJson()).toList(),
      'workingUrl': workingUrl,
      'recommendations': recommendations,
    };
  }
}
