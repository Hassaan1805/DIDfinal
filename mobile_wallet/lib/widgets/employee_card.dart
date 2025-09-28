import 'package:flutter/material.dart';
import '../models/employee.dart';
import '../utils/theme.dart';

class EmployeeCard extends StatelessWidget {
  final Employee employee;
  final bool isSelected;
  final bool showDetails;
  final VoidCallback? onTap;

  const EmployeeCard({
    Key? key,
    required this.employee,
    this.isSelected = false,
    this.showDetails = false,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: isSelected ? 8 : 4,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: isSelected ? AppTheme.primaryGradient : null,
            color: isSelected ? null : Colors.white,
            border: isSelected
                ? null
                : Border.all(color: AppTheme.borderColor.withOpacity(0.5)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Avatar
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: isSelected
                        ? Colors.white.withOpacity(0.2)
                        : AppTheme.primaryColor,
                    child: Text(
                      employee.initials,
                      style: TextStyle(
                        color: isSelected ? Colors.white : Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  // Employee info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          employee.name,
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(
                                color: isSelected
                                    ? Colors.white
                                    : AppTheme.textPrimaryColor,
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          employee.role,
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: isSelected
                                        ? Colors.white.withOpacity(0.9)
                                        : AppTheme.textSecondaryColor,
                                  ),
                        ),
                      ],
                    ),
                  ),
                  if (isSelected)
                    Icon(
                      Icons.check_circle,
                      color: Colors.white,
                      size: 24,
                    ),
                ],
              ),
              if (showDetails) ...[
                const SizedBox(height: 16),
                _buildDetailRow(
                  context,
                  icon: Icons.business,
                  label: 'Department',
                  value: employee.department,
                  isSelected: isSelected,
                ),
                const SizedBox(height: 8),
                _buildDetailRow(
                  context,
                  icon: Icons.email,
                  label: 'Email',
                  value: employee.email,
                  isSelected: isSelected,
                ),
                const SizedBox(height: 8),
                _buildDetailRow(
                  context,
                  icon: Icons.fingerprint,
                  label: 'DID',
                  value: employee.shortDid,
                  isSelected: isSelected,
                ),
                const SizedBox(height: 8),
                _buildDetailRow(
                  context,
                  icon: Icons.account_balance_wallet,
                  label: 'Address',
                  value: employee.shortAddress,
                  isSelected: isSelected,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
    required bool isSelected,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: isSelected
              ? Colors.white.withOpacity(0.8)
              : AppTheme.textSecondaryColor,
        ),
        const SizedBox(width: 8),
        Text(
          '$label:',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: isSelected
                    ? Colors.white.withOpacity(0.8)
                    : AppTheme.textSecondaryColor,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: isSelected
                      ? Colors.white.withOpacity(0.9)
                      : AppTheme.textPrimaryColor,
                  fontFamily: 'monospace',
                ),
          ),
        ),
      ],
    );
  }
}
