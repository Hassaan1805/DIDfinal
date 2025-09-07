import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'wallet_service.dart';

class DIDService {
  static const String baseUrl = 'http://localhost:3000/api';

  // Create DID document
  static Future<Map<String, dynamic>> createDIDDocument() async {
    final walletAddress = await WalletService.getWalletAddress();
    if (walletAddress == null) throw Exception('No wallet found');

    final did = 'did:ethr:$walletAddress';

    final didDocument = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/secp256k1recovery-2020/v2',
      ],
      'id': did,
      'verificationMethod': [
        {
          'id': '$did#controller',
          'type': 'EcdsaSecp256k1RecoveryMethod2020',
          'controller': did,
          'blockchainAccountId': 'eip155:1:$walletAddress',
        },
      ],
      'authentication': ['$did#controller'],
      'assertionMethod': ['$did#controller'],
      'keyAgreement': ['$did#controller'],
      'capabilityInvocation': ['$did#controller'],
      'capabilityDelegation': ['$did#controller'],
    };

    return didDocument;
  }

  // Register DID on blockchain
  static Future<bool> registerDID() async {
    try {
      final didDocument = await createDIDDocument();

      final response = await http.post(
        Uri.parse('$baseUrl/did/register'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'didDocument': didDocument,
          'address': await WalletService.getWalletAddress(),
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Error registering DID: $e');
      return false;
    }
  }

  // Resolve DID document
  static Future<Map<String, dynamic>?> resolveDID(String did) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/did/resolve/$did'));

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return null;
    } catch (e) {
      print('Error resolving DID: $e');
      return null;
    }
  }

  // Create authentication challenge
  static Future<Map<String, dynamic>?> createAuthChallenge(
    String domain,
  ) async {
    try {
      final did = await WalletService.createDID();

      final response = await http.post(
        Uri.parse('$baseUrl/auth/challenge'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'did': did, 'domain': domain}),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return null;
    } catch (e) {
      print('Error creating auth challenge: $e');
      return null;
    }
  }

  // Sign authentication challenge
  static Future<String> signAuthChallenge(
    String challenge,
    String nonce,
  ) async {
    final message =
        '$challenge:$nonce:${DateTime.now().millisecondsSinceEpoch}';
    return await WalletService.signMessage(message);
  }

  // Complete authentication
  static Future<Map<String, dynamic>?> completeAuthentication({
    required String challenge,
    required String signature,
    required String nonce,
  }) async {
    try {
      final did = await WalletService.createDID();

      final response = await http.post(
        Uri.parse('$baseUrl/auth/verify'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'did': did,
          'challenge': challenge,
          'signature': signature,
          'nonce': nonce,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        }),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return null;
    } catch (e) {
      print('Error completing authentication: $e');
      return null;
    }
  }

  // Create verifiable credential request
  static Future<Map<String, dynamic>> createCredentialRequest({
    required String credentialType,
    required Map<String, dynamic> claims,
  }) async {
    final did = await WalletService.createDID();

    return {
      'type': ['VerifiableCredential', credentialType],
      'issuer': did,
      'issuanceDate': DateTime.now().toIso8601String(),
      'credentialSubject': {'id': did, ...claims},
    };
  }

  // Verify credential signature
  static Future<bool> verifyCredential(Map<String, dynamic> credential) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/did/verify-credential'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(credential),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Error verifying credential: $e');
      return false;
    }
  }

  // Get DID authentication QR code data
  static Future<Map<String, dynamic>?> getQRAuthData(String domain) async {
    try {
      final challenge = await createAuthChallenge(domain);
      if (challenge == null) return null;

      return {
        'type': 'did_auth',
        'challenge': challenge['challenge'],
        'nonce': challenge['nonce'],
        'domain': domain,
        'callback': '$baseUrl/auth/verify',
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      };
    } catch (e) {
      print('Error creating QR auth data: $e');
      return null;
    }
  }
}
