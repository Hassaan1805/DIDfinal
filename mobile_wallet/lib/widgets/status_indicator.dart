import 'package:flutter/material.dart';
import '../utils/theme.dart';

class StatusIndicator extends StatelessWidget {
  final bool isConnected;
  final String? workingUrl;
  final VoidCallback? onTap;

  const StatusIndicator({
    Key? key,
    required this.isConnected,
    this.workingUrl,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Status icon
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color:
                      isConnected ? AppTheme.successColor : AppTheme.errorColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              // Status text
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isConnected
                          ? 'Connected to Backend'
                          : 'Backend Disconnected',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: isConnected
                                ? AppTheme.successColor
                                : AppTheme.errorColor,
                          ),
                    ),
                    if (workingUrl != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        workingUrl!.replaceFirst('http://', ''),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppTheme.textSecondaryColor,
                              fontFamily: 'monospace',
                            ),
                      ),
                    ] else if (!isConnected) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Tap to run diagnostics',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppTheme.textSecondaryColor,
                            ),
                      ),
                    ],
                  ],
                ),
              ),
              // Action icon
              Icon(
                isConnected ? Icons.check_circle : Icons.error,
                color:
                    isConnected ? AppTheme.successColor : AppTheme.errorColor,
                size: 24,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
