import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';

class StorageService {
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
  );

  // Storage keys
  static const String _currentEmployeeKey = 'current_employee';
  static const String _authTokenKey = 'auth_token';
  static const String _deviceInfoKey = 'device_info';
  static const String _networkSettingsKey = 'network_settings';

  Future<void> init() async {
    // Initialize storage service
    try {
      await _secureStorage.containsKey(key: _currentEmployeeKey);
    } catch (e) {
      print('Storage initialization error: $e');
    }
  }

  // Employee management
  Future<void> saveCurrentEmployee(String employeeId) async {
    try {
      await _secureStorage.write(key: _currentEmployeeKey, value: employeeId);
    } catch (e) {
      print('Error saving current employee: $e');
      rethrow;
    }
  }

  Future<String?> getCurrentEmployee() async {
    try {
      return await _secureStorage.read(key: _currentEmployeeKey);
    } catch (e) {
      print('Error getting current employee: $e');
      return null;
    }
  }

  Future<void> clearCurrentEmployee() async {
    try {
      await _secureStorage.delete(key: _currentEmployeeKey);
    } catch (e) {
      print('Error clearing current employee: $e');
    }
  }

  // Auth token management
  Future<void> saveAuthToken(String token) async {
    try {
      await _secureStorage.write(key: _authTokenKey, value: token);
    } catch (e) {
      print('Error saving auth token: $e');
      rethrow;
    }
  }

  Future<String?> getAuthToken() async {
    try {
      return await _secureStorage.read(key: _authTokenKey);
    } catch (e) {
      print('Error getting auth token: $e');
      return null;
    }
  }

  Future<void> clearAuthToken() async {
    try {
      await _secureStorage.delete(key: _authTokenKey);
    } catch (e) {
      print('Error clearing auth token: $e');
    }
  }

  // Device info management
  Future<void> saveDeviceInfo(Map<String, dynamic> deviceInfo) async {
    try {
      final jsonString = jsonEncode(deviceInfo);
      await _secureStorage.write(key: _deviceInfoKey, value: jsonString);
    } catch (e) {
      print('Error saving device info: $e');
    }
  }

  Future<Map<String, dynamic>?> getDeviceInfo() async {
    try {
      final jsonString = await _secureStorage.read(key: _deviceInfoKey);
      if (jsonString != null) {
        return jsonDecode(jsonString) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      print('Error getting device info: $e');
      return null;
    }
  }

  // Network settings management
  Future<void> saveNetworkSettings(Map<String, dynamic> settings) async {
    try {
      final jsonString = jsonEncode(settings);
      await _secureStorage.write(key: _networkSettingsKey, value: jsonString);
    } catch (e) {
      print('Error saving network settings: $e');
    }
  }

  Future<Map<String, dynamic>?> getNetworkSettings() async {
    try {
      final jsonString = await _secureStorage.read(key: _networkSettingsKey);
      if (jsonString != null) {
        return jsonDecode(jsonString) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      print('Error getting network settings: $e');
      return null;
    }
  }

  // Generic key-value storage
  Future<void> save(String key, String value) async {
    try {
      await _secureStorage.write(key: key, value: value);
    } catch (e) {
      print('Error saving $key: $e');
      rethrow;
    }
  }

  Future<String?> get(String key) async {
    try {
      return await _secureStorage.read(key: key);
    } catch (e) {
      print('Error getting $key: $e');
      return null;
    }
  }

  Future<void> delete(String key) async {
    try {
      await _secureStorage.delete(key: key);
    } catch (e) {
      print('Error deleting $key: $e');
    }
  }

  // Clear all data
  Future<void> clearAll() async {
    try {
      await _secureStorage.deleteAll();
    } catch (e) {
      print('Error clearing all storage: $e');
    }
  }

  // Check if key exists
  Future<bool> contains(String key) async {
    try {
      return await _secureStorage.containsKey(key: key);
    } catch (e) {
      print('Error checking if $key exists: $e');
      return false;
    }
  }
}
