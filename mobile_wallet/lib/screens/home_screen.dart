import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:convert';

import '../services/wallet_service.dart';
import '../services/network_service.dart';
import '../models/auth_request.dart';

import '../utils/theme.dart';
import 'qr_scanner_screen.dart';
import 'employee_selector_screen.dart';
import 'network_diagnostics_screen.dart';
import '../widgets/employee_card.dart';
import '../widgets/status_indicator.dart';
import '../widgets/gradient_background.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _initAnimations();
  }

  void _initAnimations() {
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );

    _slideController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeInOut,
    ));

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
    ));

    // Start animations
    _fadeController.forward();
    _slideController.forward();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientBackground(
        child: SafeArea(
          child: Consumer2<WalletService, NetworkService>(
            builder: (context, walletService, networkService, _) {
              return FadeTransition(
                opacity: _fadeAnimation,
                child: SlideTransition(
                  position: _slideAnimation,
                  child: CustomScrollView(
                    slivers: [
                      _buildAppBar(),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(20.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildWelcomeSection(walletService),
                              const SizedBox(height: 24),
                              _buildCurrentEmployeeCard(walletService),
                              const SizedBox(height: 24),
                              _buildConnectionStatus(networkService),
                              const SizedBox(height: 32),
                              _buildActionButtons(context),
                              const SizedBox(height: 24),
                              _buildQuickActions(context),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    return SliverAppBar(
      expandedHeight: 120.0,
      floating: false,
      pinned: true,
      backgroundColor: Colors.transparent,
      elevation: 0,
      flexibleSpace: FlexibleSpaceBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.security,
                color: Colors.white,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              'DID Wallet',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
            ),
          ],
        ),
        centerTitle: false,
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.settings, color: Colors.white),
          onPressed: () => _showSettingsBottomSheet(context),
        ),
      ],
    );
  }

  Widget _buildWelcomeSection(WalletService walletService) {
    final employee = walletService.currentEmployee;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.9),
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
                Icons.waving_hand,
                color: AppTheme.primaryColor,
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                'Welcome Back!',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: AppTheme.textPrimaryColor,
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            employee != null
                ? 'Ready to authenticate as ${employee.name}'
                : 'Loading wallet...',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppTheme.textSecondaryColor,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentEmployeeCard(WalletService walletService) {
    final employee = walletService.currentEmployee;

    if (employee == null) {
      return _buildLoadingCard();
    }

    return EmployeeCard(
      employee: employee,
      isSelected: true,
      showDetails: true,
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => const EmployeeSelectorScreen(),
        ),
      ),
    );
  }

  Widget _buildLoadingCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: AppTheme.cardDecoration,
      child: const Center(
        child: CircularProgressIndicator(),
      ),
    );
  }

  Widget _buildConnectionStatus(NetworkService networkService) {
    return StatusIndicator(
      isConnected: networkService.isConnected,
      workingUrl: networkService.workingUrl,
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => const NetworkDiagnosticsScreen(),
        ),
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Primary action button
        Container(
          height: 60,
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
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) => const QRScannerScreen(),
              ),
            ),
            icon: const Icon(
              Icons.qr_code_scanner,
              size: 28,
              color: Colors.white,
            ),
            label: const Text(
              'Scan QR Code',
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
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: AppTheme.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Quick Actions',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildQuickActionButton(
                  context,
                  icon: Icons.people_outline,
                  label: 'Switch Employee',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const EmployeeSelectorScreen(),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildQuickActionButton(
                  context,
                  icon: Icons.network_check,
                  label: 'Network Test',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const NetworkDiagnosticsScreen(),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildQuickActionButton(
                  context,
                  icon: Icons.science,
                  label: 'Test Sepolia',
                  color: Colors.green,
                  onTap: () => _testSepoliaAuthentication(context),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildQuickActionButton(
                  context,
                  icon: Icons.info_outline,
                  label: 'About App',
                  onTap: () => _showAboutDialog(context),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionButton(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color? color,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.backgroundColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: color?.withOpacity(0.3) ?? AppTheme.borderColor),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: color ?? AppTheme.primaryColor,
              size: 24,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _testSepoliaAuthentication(BuildContext context) async {
    final networkService = Provider.of<NetworkService>(context, listen: false);
    final walletService = Provider.of<WalletService>(context, listen: false);

    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const AlertDialog(
        title: Text('🧪 Testing Sepolia'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Testing Sepolia blockchain authentication...'),
          ],
        ),
      ),
    );

    try {
      // First test Sepolia service status
      final statusResult = await networkService.testSepoliaAuthentication();

      if (statusResult['success'] != true) {
        Navigator.of(context).pop(); // Close loading
        _showSepoliaTestResult(context, statusResult, false);
        return;
      }

      // Create a mock authentication request
      final mockRequest = AuthRequest(
        type: 'did-auth-request',
        challengeId: 'test_${DateTime.now().millisecondsSinceEpoch}',
        challenge: 'test_challenge_${DateTime.now().millisecondsSinceEpoch}',
        companyId: 'dtp_enterprise_001',
        apiEndpoint: '${networkService.workingUrl}/api/auth/sepolia-verify',
        expiresAt: DateTime.now()
            .add(const Duration(minutes: 15))
            .millisecondsSinceEpoch,
        employee: AuthEmployee(
          id: walletService.currentEmployee?.id ?? 'test_employee',
          name: walletService.currentEmployee?.name ?? 'Test Employee',
          role: walletService.currentEmployee?.role ?? 'Tester',
          department: walletService.currentEmployee?.department ?? 'Testing',
        ),
        expectedDID: walletService.currentEmployee?.did,
      );

      // Test authentication
      final authResult = await walletService.authenticate(mockRequest);

      Navigator.of(context).pop(); // Close loading
      _showSepoliaTestResult(context, authResult.toJson(), authResult.success);
    } catch (e) {
      Navigator.of(context).pop(); // Close loading
      _showSepoliaTestResult(
          context,
          {
            'success': false,
            'error': e.toString(),
          },
          false);
    }
  }

  void _showSepoliaTestResult(
      BuildContext context, Map<String, dynamic> result, bool success) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              success ? Icons.check_circle : Icons.error,
              color: success ? Colors.green : Colors.red,
            ),
            const SizedBox(width: 8),
            Text(success ? '✅ Sepolia Test Passed' : '❌ Sepolia Test Failed'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (success) ...[
                const Text('🔗 Sepolia blockchain authentication is working!'),
                const SizedBox(height: 12),
                if (result['blockchainData']?['txHash'] != null) ...[
                  const Text('Transaction Hash:',
                      style: TextStyle(fontWeight: FontWeight.bold)),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(8),
                    margin: const EdgeInsets.only(top: 4, bottom: 8),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: Colors.green.withOpacity(0.3)),
                    ),
                    child: SelectableText(
                      result['blockchainData']['txHash'],
                      style: const TextStyle(
                        fontSize: 10,
                        fontFamily: 'monospace',
                        color: Colors.green,
                      ),
                    ),
                  ),
                ],
              ] else ...[
                Text('Error: ${result['error'] ?? 'Unknown error'}'),
                const SizedBox(height: 8),
                const Text(
                  'Make sure the backend server is running with Sepolia configuration.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
              const SizedBox(height: 12),
              const Text('Full Response:',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.grey.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: SelectableText(
                  JsonEncoder.withIndent('  ').convert(result),
                  style: const TextStyle(fontSize: 9, fontFamily: 'monospace'),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showSettingsBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Settings',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 20),
            ListTile(
              leading: const Icon(Icons.info_outline),
              title: const Text('About'),
              onTap: () => _showAboutDialog(context),
            ),
            ListTile(
              leading: const Icon(Icons.bug_report),
              title: const Text('Debug Info'),
              onTap: () => _showDebugInfo(context),
            ),
            ListTile(
              leading: const Icon(Icons.clear_all),
              title: const Text('Clear Data'),
              onTap: () => _showClearDataDialog(context),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _showAboutDialog(BuildContext context) {
    Navigator.of(context).pop(); // Close bottom sheet
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('About DID Wallet'),
        content: const Text(
          'Enterprise DID Wallet Mobile\\n'
          'Version 1.0.0\\n\\n'
          'A secure mobile wallet for decentralized identity authentication '
          'in enterprise environments. Built with Flutter for iOS and Android.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showDebugInfo(BuildContext context) {
    Navigator.of(context).pop(); // Close bottom sheet
    final walletService = Provider.of<WalletService>(context, listen: false);
    final networkService = Provider.of<NetworkService>(context, listen: false);

    final walletInfo = walletService.getDebugInfo();
    final networkInfo = networkService.getDiagnosticSummary();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Debug Information'),
        content: SingleChildScrollView(
          child: Text(
            'Wallet Info:\\n${walletInfo.toString()}\\n\\n'
            'Network Info:\\n${networkInfo.toString()}',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showClearDataDialog(BuildContext context) {
    Navigator.of(context).pop(); // Close bottom sheet
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Data'),
        content: const Text(
          'Are you sure you want to clear all wallet data? This will reset '
          'your employee selection and remove all stored authentication tokens.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop();
              final walletService =
                  Provider.of<WalletService>(context, listen: false);
              await walletService.clearWalletData();

              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Wallet data cleared')),
                );
              }
            },
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }
}
