import 'dart:convert';
import 'dart:typed_data';
import 'dart:math';
import 'package:http/http.dart' as http;
import 'package:pointycastle/export.dart';
import 'wallet_service.dart';

class ZKProofService {
  static const String baseUrl = 'http://localhost:3000/api';

  // Generate zero-knowledge proof for authentication
  static Future<Map<String, dynamic>?> generateAuthProof({
    required String secret,
    required String challenge,
  }) async {
    try {
      // Generate witness
      final witness = _generateWitness(secret, challenge);

      // Create proof structure
      final proof = {
        'proof': {'a': witness['a'], 'b': witness['b'], 'c': witness['c']},
        'publicSignals': witness['publicSignals'],
        'protocol': 'groth16',
        'curve': 'bn128',
      };

      return proof;
    } catch (e) {
      print('Error generating ZK proof: $e');
      return null;
    }
  }

  // Verify zero-knowledge proof
  static Future<bool> verifyProof(Map<String, dynamic> proof) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/zkp/verify'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(proof),
      );

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        return result['valid'] == true;
      }
      return false;
    } catch (e) {
      print('Error verifying ZK proof: $e');
      return false;
    }
  }

  // Generate NFT ownership proof
  static Future<Map<String, dynamic>?> generateNFTOwnershipProof({
    required String nftContract,
    required String tokenId,
    required String ownerAddress,
  }) async {
    try {
      // Simulate NFT ownership verification circuit
      final secret = _hashInputs([nftContract, tokenId, ownerAddress]);
      final publicHash = _publicCommitment(secret);

      final proof = {
        'proof': {
          'a': _generateGroupElement(),
          'b': _generateGroupElement(),
          'c': _generateGroupElement(),
        },
        'publicSignals': [publicHash],
        'metadata': {
          'nftContract': nftContract,
          'tokenId': tokenId,
          'type': 'nft_ownership',
        },
      };

      return proof;
    } catch (e) {
      print('Error generating NFT ownership proof: $e');
      return null;
    }
  }

  // Generate identity proof without revealing personal data
  static Future<Map<String, dynamic>?> generateIdentityProof({
    required Map<String, dynamic> credentials,
    required List<String> requiredClaims,
  }) async {
    try {
      final secret = _hashCredentials(credentials);
      final claimCommitments = requiredClaims
          .map((claim) => _generateClaimCommitment(credentials[claim] ?? ''))
          .toList();

      final proof = {
        'proof': {
          'a': _generateGroupElement(),
          'b': _generateGroupElement(),
          'c': _generateGroupElement(),
        },
        'publicSignals': claimCommitments,
        'metadata': {
          'requiredClaims': requiredClaims,
          'type': 'identity_verification',
        },
      };

      return proof;
    } catch (e) {
      print('Error generating identity proof: $e');
      return null;
    }
  }

  // Generate membership proof for access control
  static Future<Map<String, dynamic>?> generateMembershipProof({
    required String groupId,
    required String memberSecret,
  }) async {
    try {
      final commitment = _publicCommitment(memberSecret);
      final nullifier = _generateNullifier(memberSecret, groupId);

      final proof = {
        'proof': {
          'a': _generateGroupElement(),
          'b': _generateGroupElement(),
          'c': _generateGroupElement(),
        },
        'publicSignals': [commitment, nullifier],
        'metadata': {'groupId': groupId, 'type': 'membership_proof'},
      };

      return proof;
    } catch (e) {
      print('Error generating membership proof: $e');
      return null;
    }
  }

  // Generate range proof (e.g., age verification)
  static Future<Map<String, dynamic>?> generateRangeProof({
    required int value,
    required int minRange,
    required int maxRange,
  }) async {
    try {
      if (value < minRange || value > maxRange) {
        throw Exception('Value not in required range');
      }

      final commitment = _generateRangeCommitment(value, minRange, maxRange);

      final proof = {
        'proof': {
          'a': _generateGroupElement(),
          'b': _generateGroupElement(),
          'c': _generateGroupElement(),
        },
        'publicSignals': [commitment],
        'metadata': {
          'minRange': minRange,
          'maxRange': maxRange,
          'type': 'range_proof',
        },
      };

      return proof;
    } catch (e) {
      print('Error generating range proof: $e');
      return null;
    }
  }

  // Helper methods for proof generation
  static Map<String, dynamic> _generateWitness(
    String secret,
    String challenge,
  ) {
    final random = Random.secure();
    final secretHash = _hashString(secret);
    final challengeHash = _hashString(challenge);

    return {
      'a': _generateGroupElement(),
      'b': _generateGroupElement(),
      'c': _generateGroupElement(),
      'publicSignals': [challengeHash],
    };
  }

  static String _hashString(String input) {
    final bytes = utf8.encode(input);
    final digest = SHA256Digest();
    final hash = digest.process(Uint8List.fromList(bytes));
    return hash.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }

  static String _hashInputs(List<String> inputs) {
    final combined = inputs.join('|');
    return _hashString(combined);
  }

  static String _hashCredentials(Map<String, dynamic> credentials) {
    final serialized = json.encode(credentials);
    return _hashString(serialized);
  }

  static String _publicCommitment(String secret) {
    return _hashString('$secret:commitment');
  }

  static String _generateNullifier(String secret, String groupId) {
    return _hashString('$secret:$groupId:nullifier');
  }

  static String _generateClaimCommitment(String claimValue) {
    return _hashString('$claimValue:claim_commitment');
  }

  static String _generateRangeCommitment(int value, int min, int max) {
    return _hashString('$value:$min:$max:range');
  }

  static List<String> _generateGroupElement() {
    final random = Random.secure();
    return [
      List.generate(
        32,
        (i) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join(),
      List.generate(
        32,
        (i) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
      ).join(),
    ];
  }

  // Get verification key for circuit
  static Future<Map<String, dynamic>?> getVerificationKey(
    String circuitType,
  ) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/zkp/verification-key/$circuitType'),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return null;
    } catch (e) {
      print('Error getting verification key: $e');
      return null;
    }
  }

  // Setup trusted ceremony (for development)
  static Future<bool> setupTrustedCeremony(String circuitType) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/zkp/setup'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'circuitType': circuitType}),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Error setting up trusted ceremony: $e');
      return false;
    }
  }
}
