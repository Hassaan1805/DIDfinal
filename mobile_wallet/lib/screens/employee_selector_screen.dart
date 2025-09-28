import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/wallet_service.dart';
import '../models/employee.dart';
import '../utils/theme.dart';
import '../widgets/employee_card.dart';
import '../widgets/gradient_background.dart';

class EmployeeSelectorScreen extends StatefulWidget {
  const EmployeeSelectorScreen({Key? key}) : super(key: key);

  @override
  State<EmployeeSelectorScreen> createState() => _EmployeeSelectorScreenState();
}

class _EmployeeSelectorScreenState extends State<EmployeeSelectorScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientBackground(
        child: SafeArea(
          child: Consumer<WalletService>(
            builder: (context, walletService, _) {
              return Column(
                children: [
                  _buildAppBar(walletService),
                  Expanded(
                    child: _buildEmployeeList(walletService),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar(WalletService walletService) {
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
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '👤 Select Employee',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Current: ${walletService.currentEmployee?.name ?? 'None'}',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.8),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmployeeList(WalletService walletService) {
    final employees = walletService.availableEmployees;
    final currentEmployee = walletService.currentEmployee;

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: employees.length,
      itemBuilder: (context, index) {
        final employee = employees[index];
        final isSelected = currentEmployee?.id == employee.id;

        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: EmployeeCard(
            employee: employee,
            isSelected: isSelected,
            showDetails: false,
            onTap: () => _selectEmployee(walletService, employee),
          ),
        );
      },
    );
  }

  Future<void> _selectEmployee(
      WalletService walletService, Employee employee) async {
    try {
      await walletService.switchEmployee(employee.id);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Switched to ${employee.name}'),
            backgroundColor: AppTheme.successColor,
            behavior: SnackBarBehavior.floating,
          ),
        );

        // Go back after a short delay
        await Future.delayed(const Duration(milliseconds: 500));
        if (mounted) {
          Navigator.of(context).pop();
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error switching employee: ${e.toString()}'),
            backgroundColor: AppTheme.errorColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }
}
