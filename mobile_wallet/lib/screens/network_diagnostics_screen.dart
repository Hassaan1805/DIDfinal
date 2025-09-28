import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../services/network_service.dart';
import '../models/network_diagnostic.dart';
import '../utils/theme.dart';
import '../widgets/gradient_background.dart';

class NetworkDiagnosticsScreen extends StatefulWidget {
  const NetworkDiagnosticsScreen({Key? key}) : super(key: key);

  @override
  State<NetworkDiagnosticsScreen> createState() =>
      _NetworkDiagnosticsScreenState();
}

class _NetworkDiagnosticsScreenState extends State<NetworkDiagnosticsScreen> {
  bool _isRunningDiagnostics = false;
  ConnectionStatus? _lastResult;

  @override
  void initState() {
    super.initState();
    // Run diagnostics automatically when screen opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _runDiagnostics();
    });
  }

  Future<void> _runDiagnostics() async {
    if (_isRunningDiagnostics) return;

    setState(() {
      _isRunningDiagnostics = true;
    });

    try {
      final networkService =
          Provider.of<NetworkService>(context, listen: false);
      final result = await networkService.runDiagnostics();

      setState(() {
        _lastResult = result;
        _isRunningDiagnostics = false;
      });
    } catch (e) {
      setState(() {
        _isRunningDiagnostics = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error running diagnostics: ${e.toString()}'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
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
                child: RefreshIndicator(
                  onRefresh: _runDiagnostics,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        _buildConnectionStatus(),
                        const SizedBox(height: 20),
                        if (_lastResult != null) ...[
                          _buildTestResults(_lastResult!.testResults),
                          const SizedBox(height: 20),
                          _buildRecommendations(_lastResult!.recommendations),
                          const SizedBox(height: 20),
                        ],
                        _buildDeviceInfo(),
                        const SizedBox(height: 20),
                        _buildActionButtons(),
                      ],
                    ),
                  ),
                ),
              ),
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
              color: Colors.white.withOpacity(0.2),
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
              '🌐 Network Diagnostics',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          if (_isRunningDiagnostics)
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

  Widget _buildConnectionStatus() {
    final networkService = Provider.of<NetworkService>(context);

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
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: networkService.isConnected
                      ? AppTheme.successColor
                      : AppTheme.errorColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                networkService.isConnected
                    ? 'Backend Connected'
                    : 'Backend Disconnected',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: networkService.isConnected
                          ? AppTheme.successColor
                          : AppTheme.errorColor,
                    ),
              ),
            ],
          ),
          if (networkService.workingUrl != null) ...[
            const SizedBox(height: 8),
            Text(
              'URL: ${networkService.workingUrl}',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontFamily: 'monospace',
                    color: AppTheme.textSecondaryColor,
                  ),
            ),
          ],
          const SizedBox(height: 12),
          Text(
            _isRunningDiagnostics
                ? 'Running network diagnostics...'
                : 'Pull down to refresh and run diagnostics again',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textSecondaryColor,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildTestResults(List<NetworkTestResult> results) {
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
          Text(
            'Test Results',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),
          ...results.map((result) => _buildTestResultItem(result)),
        ],
      ),
    );
  }

  Widget _buildTestResultItem(NetworkTestResult result) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            result.success ? Icons.check_circle : Icons.error,
            color: result.success ? AppTheme.successColor : AppTheme.errorColor,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  result.url,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  result.success
                      ? 'SUCCESS (${result.responseTime}ms)'
                      : 'FAILED: ${result.error}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: result.success
                            ? AppTheme.successColor
                            : AppTheme.errorColor,
                      ),
                ),
                if (result.suggestion != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    result.suggestion!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppTheme.textSecondaryColor,
                          fontStyle: FontStyle.italic,
                        ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendations(List<String> recommendations) {
    if (recommendations.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.infoColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.infoColor.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.lightbulb,
                color: AppTheme.infoColor,
                size: 24,
              ),
              const SizedBox(width: 12),
              Text(
                'Recommendations',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.infoColor,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...recommendations.map((recommendation) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '•',
                      style: TextStyle(
                        color: AppTheme.infoColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        recommendation,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppTheme.infoColor,
                            ),
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildDeviceInfo() {
    final networkService = Provider.of<NetworkService>(context);
    final deviceInfo = networkService.deviceInfo;

    if (deviceInfo == null) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.8),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderColor.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Device Information',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),
          _buildDeviceInfoRow('Platform', deviceInfo.platform),
          _buildDeviceInfoRow('OS', deviceInfo.operatingSystem),
          _buildDeviceInfoRow('Device', deviceInfo.deviceModel),
          _buildDeviceInfoRow('Mobile', deviceInfo.isMobile ? 'Yes' : 'No'),
          _buildDeviceInfoRow('Camera',
              deviceInfo.supportsCamera ? 'Available' : 'Not Available'),
        ],
      ),
    );
  }

  Widget _buildDeviceInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondaryColor,
                  ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppTheme.textPrimaryColor,
                  ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ElevatedButton.icon(
          onPressed: _isRunningDiagnostics ? null : _runDiagnostics,
          icon: Icon(
              _isRunningDiagnostics ? Icons.hourglass_empty : Icons.refresh),
          label: Text(_isRunningDiagnostics ? 'Running...' : 'Run Diagnostics'),
          style: AppTheme.primaryButtonStyle,
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _copyDiagnosticInfo,
          icon: const Icon(Icons.content_copy),
          label: const Text('Copy Debug Info'),
          style: AppTheme.secondaryButtonStyle,
        ),
      ],
    );
  }

  void _copyDiagnosticInfo() {
    final networkService = Provider.of<NetworkService>(context, listen: false);
    final diagnosticSummary = networkService.getDiagnosticSummary();

    final info = '''
Network Diagnostic Report
========================
Generated: ${DateTime.now().toString()}

Connection Status: ${networkService.isConnected ? 'Connected' : 'Disconnected'}
Working URL: ${networkService.workingUrl ?? 'None'}

Test Results:
${networkService.lastTestResults.map((r) => '${r.success ? "✅" : "❌"} ${r.url} (${r.responseTime}ms)${r.error != null ? " - ${r.error}" : ""}').join('\\n')}

Device Information:
${networkService.deviceInfo?.toJson().entries.map((e) => '${e.key}: ${e.value}').join('\\n') ?? 'Not available'}

Full Diagnostic Data:
${diagnosticSummary.toString()}
    ''';

    Clipboard.setData(ClipboardData(text: info));

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Diagnostic information copied to clipboard'),
        backgroundColor: AppTheme.successColor,
      ),
    );
  }
}
