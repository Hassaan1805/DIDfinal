import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'dart:convert';
import '../services/did_service.dart';
import '../services/zk_proof_service.dart';

class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({super.key});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  MobileScannerController controller = MobileScannerController();
  bool _isProcessing = false;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0B),
      appBar: AppBar(
        title: const Text(
          'QR Scanner',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF1A1A1B),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on, color: Colors.white),
            onPressed: () => controller.toggleTorch(),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 4,
            child: Container(
              margin: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.blue, width: 2),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: MobileScanner(
                  controller: controller,
                  onDetect: (BarcodeCapture capture) {
                    final List<Barcode> barcodes = capture.barcodes;
                    for (final barcode in barcodes) {
                      if (!_isProcessing && barcode.rawValue != null) {
                        _processQRCode(barcode.rawValue!);
                        break;
                      }
                    }
                  },
                ),
              ),
            ),
          ),
          Expanded(
            flex: 1,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  const Text(
                    'Scan QR Code',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Point your camera at a QR code to authenticate',
                    style: TextStyle(color: Colors.grey, fontSize: 16),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  if (_isProcessing)
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.blue,
                            ),
                          ),
                        ),
                        SizedBox(width: 12),
                        Text(
                          'Processing...',
                          style: TextStyle(color: Colors.blue),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _processQRCode(String qrData) async {
    if (_isProcessing) return;

    setState(() {
      _isProcessing = true;
    });

    try {
      print('🔍 Raw QR Data: $qrData');

      final data = json.decode(qrData);
      print('✅ Parsed QR JSON: $data');
      print('📱 QR Type found: ${data['type']}');

      if (data['type'] == 'did_auth') {
        print('✅ Processing DID auth...');
        await _handleDIDAuth(data);
      } else if (data['type'] == 'zkp_challenge') {
        print('✅ Processing ZKP challenge...');
        await _handleZKPChallenge(data);
      } else {
        print('❌ Unsupported QR type: ${data['type']}');
        _showError('Unsupported QR code type: ${data['type']}');
      }
    } catch (e) {
      print('❌ QR Processing Error: $e');
      _showError('Invalid QR code format: $e');
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  Future<void> _handleDIDAuth(Map<String, dynamic> authData) async {
    try {
      // Sign the authentication challenge
      final signature = await DIDService.signAuthChallenge(
        authData['challenge'],
        authData['nonce'],
      );

      // Complete authentication
      final result = await DIDService.completeAuthentication(
        challenge: authData['challenge'],
        signature: signature,
        nonce: authData['nonce'],
      );

      if (result != null && result['success'] == true) {
        _showSuccess('Authentication successful!');
        Navigator.pop(context, true);
      } else {
        _showError('Authentication failed');
      }
    } catch (e) {
      _showError('Error during authentication: $e');
    }
  }

  Future<void> _handleZKPChallenge(Map<String, dynamic> zkpData) async {
    try {
      Map<String, dynamic>? proof;

      switch (zkpData['proofType']) {
        case 'identity':
          proof = await ZKProofService.generateIdentityProof(
            credentials: zkpData['credentials'] ?? {},
            requiredClaims: List<String>.from(zkpData['requiredClaims'] ?? []),
          );
          break;
        case 'membership':
          proof = await ZKProofService.generateMembershipProof(
            groupId: zkpData['groupId'],
            memberSecret: zkpData['memberSecret'] ?? '',
          );
          break;
        case 'range':
          proof = await ZKProofService.generateRangeProof(
            value: zkpData['value'] ?? 0,
            minRange: zkpData['minRange'] ?? 0,
            maxRange: zkpData['maxRange'] ?? 100,
          );
          break;
        case 'nft_ownership':
          proof = await ZKProofService.generateNFTOwnershipProof(
            nftContract: zkpData['nftContract'],
            tokenId: zkpData['tokenId'],
            ownerAddress: zkpData['ownerAddress'],
          );
          break;
        default:
          _showError('Unsupported proof type');
          return;
      }

      if (proof != null) {
        final verified = await ZKProofService.verifyProof(proof);
        if (verified) {
          _showSuccess('Zero-knowledge proof verified!');
          Navigator.pop(context, proof);
        } else {
          _showError('Proof verification failed');
        }
      } else {
        _showError('Failed to generate proof');
      }
    } catch (e) {
      _showError('Error processing ZK proof: $e');
    }
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }
}
