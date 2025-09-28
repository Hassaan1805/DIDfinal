import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:vibration/vibration.dart';
import 'dart:convert';

import '../models/auth_request.dart';
import '../utils/theme.dart';
import '../widgets/gradient_background.dart';
import 'auth_confirmation_screen.dart';

class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({Key? key}) : super(key: key);

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  MobileScannerController cameraController = MobileScannerController();
  bool _isFlashOn = false;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    cameraController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;

    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isNotEmpty) {
      final barcode = barcodes.first;
      if (barcode.rawValue != null) {
        setState(() {
          _isProcessing = true;
        });

        // Provide haptic feedback
        try {
          if (await Vibration.hasVibrator() == true) {
            Vibration.vibrate(duration: 100);
          }
        } catch (e) {
          // Ignore vibration errors
        }

        try {
          // Parse the QR code data
          final qrData = barcode.rawValue!;
          final authRequest = await _parseAuthRequest(qrData);

          if (authRequest != null) {
            // Navigate to auth confirmation
            if (mounted) {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (context) => AuthConfirmationScreen(
                    authRequest: AuthRequest.fromJson(authRequest),
                  ),
                ),
              );
            }
          } else {
            _showError('Invalid QR code: Not a DID authentication request');
          }
        } catch (e) {
          _showError('Error processing QR code: ${e.toString()}');
        }

        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  Future<Map<String, dynamic>?> _parseAuthRequest(String qrData) async {
    try {
      print('📱 Parsing QR data: ${qrData.substring(0, 100)}...');

      // For demo purposes, if it's a simple URL, create a mock auth request
      if (qrData.startsWith('http') && qrData.contains('auth-request')) {
        // Extract challenge ID from URL if available
        final uri = Uri.parse(qrData);
        final challengeId = uri.queryParameters['challengeId'] ??
            DateTime.now().millisecondsSinceEpoch.toString();

        // Create a mock auth request
        return {
          'type': 'did-auth-request',
          'challengeId': challengeId,
          'challenge':
              'mock-challenge-${DateTime.now().millisecondsSinceEpoch}',
          'companyId': 'dtp_enterprise_001',
          'apiEndpoint': 'http://localhost:3001/api/auth/wallet-response',
          'expiresAt': DateTime.now()
              .add(const Duration(minutes: 15))
              .millisecondsSinceEpoch,
          'employee': {
            'id': 'Unknown',
            'name': 'From QR Code',
            'role': 'Employee',
            'department': 'Enterprise'
          }
        };
      }

      // Try to parse as JSON - FIXED: Actually use dart:convert
      final data = qrData.trim();
      if (data.startsWith('{') && data.endsWith('}')) {
        try {
          final jsonData = jsonDecode(data);
          if (jsonData['type'] == 'did-auth-request') {
            print('✅ Valid DID auth request found');
            return jsonData;
          } else {
            print('❌ Invalid type: ${jsonData['type']}');
            return null;
          }
        } catch (jsonError) {
          print('❌ JSON parse error: $jsonError');
          return null;
        }
      }

      return null;
    } catch (e) {
      print('Error parsing QR data: $e');
      return null;
    }
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: AppTheme.errorColor,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  void _toggleFlash() async {
    try {
      await cameraController.toggleTorch();
      setState(() {
        _isFlashOn = !_isFlashOn;
      });
    } catch (e) {
      _showError('Could not toggle flashlight');
    }
  }

  void _switchCamera() async {
    try {
      await cameraController.switchCamera();
    } catch (e) {
      _showError('Could not switch camera');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientBackground(
        child: SafeArea(
          child: Column(
            children: [
              _buildAppBar(),
              Expanded(
                child: Container(
                  margin: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        blurRadius: 15,
                        offset: const Offset(0, 5),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: _buildScanner(),
                  ),
                ),
              ),
              _buildControlButtons(),
              _buildInstructions(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: Row(
        children: [
          Container(
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
          const SizedBox(width: 16),
          const Expanded(
            child: Text(
              '📱 Scan QR Code',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          if (_isProcessing)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildScanner() {
    return Stack(
      children: [
        MobileScanner(
          controller: cameraController,
          onDetect: _onDetect,
        ),
        _buildScannerOverlay(),
      ],
    );
  }

  Widget _buildScannerOverlay() {
    return Container(
      decoration: ShapeDecoration(
        shape: QRScannerOverlayShape(
          borderColor: AppTheme.primaryColor,
          borderRadius: 16,
          borderLength: 30,
          borderWidth: 4,
          cutOutSize: 250,
        ),
      ),
    );
  }

  Widget _buildControlButtons() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildControlButton(
            icon: _isFlashOn ? Icons.flash_on : Icons.flash_off,
            label: 'Flash',
            onPressed: _toggleFlash,
          ),
          _buildControlButton(
            icon: Icons.flip_camera_ios,
            label: 'Flip',
            onPressed: _switchCamera,
          ),
          _buildControlButton(
            icon: Icons.keyboard,
            label: 'Manual',
            onPressed: _showManualInput,
          ),
        ],
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: Colors.white, size: 24),
              const SizedBox(height: 4),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInstructions() {
    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(
                Icons.info_outline,
                color: Colors.white.withValues(alpha: 0.8),
                size: 20,
              ),
              const SizedBox(width: 8),
              const Text(
                'How to scan:',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            '1. Point camera at QR code from the web portal\n'
            '2. Keep the QR code within the frame\n'
            '3. Wait for automatic detection\n'
            '4. Confirm authentication request',
            style: TextStyle(
              color: Colors.white,
              fontSize: 14,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  void _showManualInput() {
    final TextEditingController textController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.8,
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 12),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(20),
              child: Text(
                'Manual QR Code Input',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    TextField(
                      controller: textController,
                      maxLines: 8,
                      decoration: const InputDecoration(
                        hintText: 'Paste QR code data here...',
                        border: OutlineInputBorder(),
                        helperText:
                            'Paste the complete JSON data from the QR code',
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () async {
                          final qrData = textController.text.trim();
                          if (qrData.isEmpty) {
                            _showError('Please enter QR code data');
                            return;
                          }

                          Navigator.pop(context);

                          // Process manual input - same logic as QR scan
                          try {
                            final authRequest = await _parseAuthRequest(qrData);
                            if (authRequest != null) {
                              if (mounted) {
                                Navigator.of(context).pushReplacement(
                                  MaterialPageRoute(
                                    builder: (context) =>
                                        AuthConfirmationScreen(
                                      authRequest:
                                          AuthRequest.fromJson(authRequest),
                                    ),
                                  ),
                                );
                              }
                            } else {
                              _showError(
                                  'Invalid QR code: Not a DID authentication request');
                            }
                          } catch (e) {
                            _showError(
                                'Error processing QR code: ${e.toString()}');
                          }
                        },
                        style: AppTheme.primaryButtonStyle,
                        child: const Text('Process QR Data'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Custom overlay shape for QR scanner
class QRScannerOverlayShape extends ShapeBorder {
  const QRScannerOverlayShape({
    this.borderColor = Colors.white,
    this.borderWidth = 3.0,
    this.overlayColor = const Color.fromRGBO(0, 0, 0, 80),
    this.borderRadius = 0,
    this.borderLength = 40,
    this.cutOutSize = 250,
  });

  final Color borderColor;
  final double borderWidth;
  final Color overlayColor;
  final double borderRadius;
  final double borderLength;
  final double cutOutSize;

  @override
  EdgeInsetsGeometry get dimensions => const EdgeInsets.all(10);

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) {
    return Path()
      ..fillType = PathFillType.evenOdd
      ..addPath(getOuterPath(rect), Offset.zero);
  }

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    final width = rect.width;
    final height = rect.height;
    final cutOutWidth = cutOutSize < width ? cutOutSize : width - borderWidth;
    final cutOutHeight =
        cutOutSize < height ? cutOutSize : height - borderWidth;

    final cutOutRect = Rect.fromLTWH(
      rect.left + (width - cutOutWidth) / 2 + borderWidth,
      rect.top + (height - cutOutHeight) / 2 + borderWidth,
      cutOutWidth - borderWidth * 2,
      cutOutHeight - borderWidth * 2,
    );

    final cutOutRRect = RRect.fromRectAndRadius(
      cutOutRect,
      Radius.circular(borderRadius),
    );

    final outerRect = Offset.zero & rect.size;
    final outerRRect = RRect.fromRectAndRadius(outerRect, Radius.zero);

    return Path.combine(
      PathOperation.difference,
      Path()..addRRect(outerRRect),
      Path()..addRRect(cutOutRRect),
    );
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final width = rect.width;
    final height = rect.height;
    final cutOutWidth = cutOutSize < width ? cutOutSize : width - borderWidth;
    final cutOutHeight =
        cutOutSize < height ? cutOutSize : height - borderWidth;

    final cutOutRect = Rect.fromLTWH(
      rect.left + (width - cutOutWidth) / 2 + borderWidth,
      rect.top + (height - cutOutHeight) / 2 + borderWidth,
      cutOutWidth - borderWidth * 2,
      cutOutHeight - borderWidth * 2,
    );

    final cutOutRRect = RRect.fromRectAndRadius(
      cutOutRect,
      Radius.circular(borderRadius),
    );

    // Draw overlay
    final backgroundPaint = Paint()
      ..color = overlayColor
      ..style = PaintingStyle.fill;

    final backgroundPath = Path.combine(
      PathOperation.difference,
      (Path()..addRect(rect)),
      (Path()..addRRect(cutOutRRect)),
    );

    canvas.drawPath(backgroundPath, backgroundPaint);

    // Draw corners
    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = borderWidth;

    final path = Path();

    // Top left corner
    path.moveTo(cutOutRect.left - borderLength, cutOutRect.top);
    path.lineTo(cutOutRect.left, cutOutRect.top);
    path.lineTo(cutOutRect.left, cutOutRect.top - borderLength);

    // Top right corner
    path.moveTo(cutOutRect.right + borderLength, cutOutRect.top);
    path.lineTo(cutOutRect.right, cutOutRect.top);
    path.lineTo(cutOutRect.right, cutOutRect.top - borderLength);

    // Bottom left corner
    path.moveTo(cutOutRect.left - borderLength, cutOutRect.bottom);
    path.lineTo(cutOutRect.left, cutOutRect.bottom);
    path.lineTo(cutOutRect.left, cutOutRect.bottom + borderLength);

    // Bottom right corner
    path.moveTo(cutOutRect.right + borderLength, cutOutRect.bottom);
    path.lineTo(cutOutRect.right, cutOutRect.bottom);
    path.lineTo(cutOutRect.right, cutOutRect.bottom + borderLength);

    canvas.drawPath(path, borderPaint);
  }

  @override
  ShapeBorder scale(double t) {
    return QRScannerOverlayShape(
      borderColor: borderColor,
      borderWidth: borderWidth,
      overlayColor: overlayColor,
    );
  }
}
