import 'dart:typed_data';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:web3dart/web3dart.dart';
import 'package:pointycastle/export.dart';
import 'dart:convert';
import 'dart:math';

class WalletService {
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage();

  // Generate a new wallet
  static Future<EthPrivateKey> generateWallet() async {
    final random = Random.secure();
    final privateKeyBytes = List<int>.generate(32, (i) => random.nextInt(256));
    final privateKey = EthPrivateKey.fromHex(
      privateKeyBytes
          .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
          .join(),
    );

    // Store securely
    await _secureStorage.write(
      key: 'wallet_private_key',
      value: privateKey.privateKey
          .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
          .join(),
    );

    return privateKey;
  }

  // Load existing wallet
  static Future<EthPrivateKey?> loadWallet() async {
    final privateKeyHex = await _secureStorage.read(key: 'wallet_private_key');
    if (privateKeyHex == null) return null;

    return EthPrivateKey.fromHex(privateKeyHex);
  }

  // Get wallet address
  static Future<String?> getWalletAddress() async {
    final privateKey = await loadWallet();
    if (privateKey == null) return null;

    return privateKey.address.hex;
  }

  // Check if wallet exists
  static Future<bool> hasWallet() async {
    final privateKey = await _secureStorage.read(key: 'wallet_private_key');
    return privateKey != null;
  }

  // Clear wallet (logout)
  static Future<void> clearWallet() async {
    await _secureStorage.delete(key: 'wallet_private_key');
  }

  // Sign message for authentication
  static Future<String> signMessage(String message) async {
    final privateKey = await loadWallet();
    if (privateKey == null) throw Exception('No wallet found');

    final messageBytes = utf8.encode(message);
    final signature = await privateKey.signPersonalMessageToUint8List(
      messageBytes,
    );

    return signature
        .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
        .join();
  }

  // Generate secure random bytes for ZK proofs
  static Uint8List generateSecureRandom(int length) {
    final random = SecureRandom('Fortuna');
    final seed = Uint8List(32);
    final secureRandom = Random.secure();
    for (int i = 0; i < 32; i++) {
      seed[i] = secureRandom.nextInt(256);
    }
    random.seed(KeyParameter(seed));

    final bytes = Uint8List(length);
    for (int i = 0; i < length; i++) {
      bytes[i] = random.nextUint8();
    }

    return bytes;
  }

  // Create DID from wallet address
  static Future<String> createDID() async {
    final address = await getWalletAddress();
    if (address == null) throw Exception('No wallet found');

    return 'did:ethr:$address';
  }

  // Backup wallet (return mnemonic-like backup)
  static Future<String> backupWallet() async {
    final privateKey = await loadWallet();
    if (privateKey == null) throw Exception('No wallet found');

    // Convert private key to recoverable format
    final keyHex = privateKey.privateKey
        .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
        .join();

    // Create checksum for verification
    final checksum = _calculateChecksum(keyHex);

    return '$keyHex:$checksum';
  }

  // Restore wallet from backup
  static Future<bool> restoreWallet(String backup) async {
    try {
      final parts = backup.split(':');
      if (parts.length != 2) return false;

      final keyHex = parts[0];
      final checksum = parts[1];

      // Verify checksum
      if (_calculateChecksum(keyHex) != checksum) return false;

      // Restore wallet
      final privateKey = EthPrivateKey.fromHex(keyHex);
      await _secureStorage.write(
        key: 'wallet_private_key',
        value: privateKey.privateKey
            .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
            .join(),
      );

      return true;
    } catch (e) {
      return false;
    }
  }

  static String _calculateChecksum(String data) {
    final bytes = utf8.encode(data);
    final digest = SHA256Digest();
    final hash = digest.process(Uint8List.fromList(bytes));
    return hash.take(4).map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }
}
