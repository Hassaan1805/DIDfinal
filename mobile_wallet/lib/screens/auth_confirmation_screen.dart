import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/auth_request.dart';
import '../services/wallet_service.dart';
import '../utils/theme.dart';
import '../widgets/gradient_background.dart';

class AuthConfirmationScreen extends StatefulWidget {
  final AuthRequest authRequest;

  const AuthConfirmationScreen({
    Key? key,
    required this.authRequest,
  }) : super(key: key);

  @override
  State<AuthConfirmationScreen> createState() => _AuthConfirmationScreenState();
}

class _AuthConfirmationScreenState extends State<AuthConfirmationScreen>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late AnimationController _progressController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  bool _isAuthenticating = false;
  String? _errorMessage;
  bool _authenticationComplete = false;

  @override
  void initState() {
    super.initState();
    _initAnimations();
    _checkDIDMatch();
  }

  void _initAnimations() {
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _progressController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));

    _scaleAnimation = Tween<double>(
      begin: 0.8,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.elasticOut,
    ));

    _animationController.forward();
  }

  void _checkDIDMatch() {
    final walletService = Provider.of<WalletService>(context, listen: false);
    if (!walletService.checkDIDMatch(widget.authRequest)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showDIDMismatchDialog();
      });
    }
  }

  void _showDIDMismatchDialog() {
    final walletService = Provider.of<WalletService>(context, listen: false);
    final currentEmployee = walletService.currentEmployee;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('⚠️ DID Mismatch Warning'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('The request expects a different employee DID:'),
            const SizedBox(height: 12),
            Text(
              'Expected: ${widget.authRequest.expectedDID}',
              style: const TextStyle(fontFamily: 'monospace'),
            ),
            const SizedBox(height: 8),
            Text(
              'Your DID: ${currentEmployee?.did}',
              style: const TextStyle(fontFamily: 'monospace'),
            ),
            const SizedBox(height: 12),
            const Text(
              'This might be a request for a different employee. Do you want to proceed anyway?',
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop(false); // Cancel authentication
            },
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              // Continue with authentication
            },
            child: const Text('Proceed'),
          ),
        ],
      ),
    );
  }

  Future<void> _authenticate() async {
    if (_isAuthenticating) return;

    setState(() {
      _isAuthenticating = true;
      _errorMessage = null;
    });

    _progressController.forward();

    try {
      final walletService = Provider.of<WalletService>(context, listen: false);
      final result = await walletService.authenticate(widget.authRequest);

      if (result.success) {
        setState(() {
          _authenticationComplete = true;
        });

        // Show success for 2 seconds then return
        await Future.delayed(const Duration(seconds: 2));

        if (mounted) {
          Navigator.of(context).pop(true);
        }
      } else {
        setState(() {
          _isAuthenticating = false;
          _errorMessage = result.error ?? 'Authentication failed';
        });
        _progressController.reset();
      }
    } catch (e) {
      setState(() {
        _isAuthenticating = false;
        _errorMessage = e.toString();
      });
      _progressController.reset();
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientBackground(
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: ScaleTransition(
              scale: _scaleAnimation,
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    _buildAppBar(),
                    Expanded(
                      child: SingleChildScrollView(
                        child: Column(
                          children: [
                            const SizedBox(height: 20),
                            _buildAuthRequestCard(),
                            const SizedBox(height: 20),
                            _buildCurrentUserCard(),
                            const SizedBox(height: 20),
                            if (_errorMessage != null) _buildErrorCard(),
                            if (_isAuthenticating) _buildProgressIndicator(),
                          ],
                        ),
                      ),
                    ),
                    _buildActionButtons(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    return Row(
      children: [
        Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => Navigator.of(context).pop(false),
          ),
        ),
        const SizedBox(width: 16),
        const Expanded(
          child: Text(
            '🔐 Authentication Request',
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAuthRequestCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.business,
                color: AppTheme.primaryColor,
                size: 24,
              ),
              const SizedBox(width: 12),
              Text(
                'Authentication Request',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildDetailRow('Company', widget.authRequest.companyId),
          _buildDetailRow('Employee ID', widget.authRequest.employee.id),
          _buildDetailRow('Name', widget.authRequest.employee.name),
          _buildDetailRow('Role', widget.authRequest.employee.role),
          _buildDetailRow('Department', widget.authRequest.employee.department),
          _buildDetailRow(
            'Expires',
            widget.authRequest.expirationDate.toString().split('.')[0],
          ),
          _buildDetailRow('Challenge', widget.authRequest.shortChallenge),
        ],
      ),
    );
  }

  Widget _buildCurrentUserCard() {
    final walletService = Provider.of<WalletService>(context, listen: false);
    final employee = walletService.currentEmployee;

    if (employee == null) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.95),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primaryColor.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppTheme.primaryColor,
                child: Text(
                  employee.initials,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Your DID Identity',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              employee.did,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondaryColor,
                  ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textPrimaryColor,
                  ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.errorColor.withOpacity(0.1),
        border: Border.all(color: AppTheme.errorColor),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(
            Icons.error,
            color: AppTheme.errorColor,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _errorMessage!,
              style: TextStyle(
                color: AppTheme.errorColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator() {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          AnimatedBuilder(
            animation: _progressController,
            builder: (context, child) {
              return CircularProgressIndicator(
                value: _progressController.value,
                strokeWidth: 4,
                backgroundColor: Colors.white.withOpacity(0.3),
                valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
              );
            },
          ),
          const SizedBox(height: 16),
          Text(
            _authenticationComplete
                ? '✅ Authentication Successful!'
                : 'Authenticating...',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    if (_isAuthenticating) {
      return const SizedBox(height: 80); // Space for progress indicator
    }

    return Column(
      children: [
        // Authenticate button
        Container(
          width: double.infinity,
          height: 56,
          decoration: BoxDecoration(
            gradient: AppTheme.primaryGradient,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primaryColor.withOpacity(0.3),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: ElevatedButton.icon(
            onPressed: _authenticate,
            icon: const Icon(
              Icons.fingerprint,
              size: 24,
              color: Colors.white,
            ),
            label: const Text(
              'Authenticate',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              shadowColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Cancel button
        SizedBox(
          width: double.infinity,
          height: 48,
          child: OutlinedButton.icon(
            onPressed: () => Navigator.of(context).pop(false),
            icon: const Icon(
              Icons.cancel,
              size: 20,
              color: Colors.white,
            ),
            label: const Text(
              'Cancel',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white,
              ),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.white, width: 2),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
