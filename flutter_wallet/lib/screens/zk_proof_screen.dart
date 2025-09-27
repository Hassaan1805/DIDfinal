import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import '../services/zk_proof_service.dart';

class ZKProofScreen extends StatefulWidget {
  const ZKProofScreen({super.key});

  @override
  State<ZKProofScreen> createState() => _ZKProofScreenState();
}

class _ZKProofScreenState extends State<ZKProofScreen>
    with TickerProviderStateMixin {
  bool _isLoading = false;
  Map<String, dynamic>? _currentProof;
  String _selectedProofType = 'identity';
  final _valueController = TextEditingController();
  final _minRangeController = TextEditingController();
  final _maxRangeController = TextEditingController();
  final _groupIdController = TextEditingController();
  final _secretController = TextEditingController();
  late TabController _tabController;

  final List<String> _proofTypes = [
    'identity',
    'membership',
    'range',
    'nft_ownership',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _valueController.dispose();
    _minRangeController.dispose();
    _maxRangeController.dispose();
    _groupIdController.dispose();
    _secretController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0B),
      appBar: AppBar(
        title: const Text(
          'Zero-Knowledge Proofs',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF1A1A1B),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.purple,
          labelColor: Colors.purple,
          unselectedLabelColor: Colors.grey,
          tabs: const [
            Tab(text: 'Identity'),
            Tab(text: 'Membership'),
            Tab(text: 'Range'),
            Tab(text: 'NFT'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Info Banner
          Container(
            width: double.infinity,
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.purple.withOpacity(0.1),
                  Colors.blue.withOpacity(0.1),
                ],
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.purple.withOpacity(0.3),
                width: 1,
              ),
            ),
            child: const Row(
              children: [
                Icon(Icons.security, color: Colors.purple),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Generate cryptographic proofs without revealing sensitive data',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Tab Views
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildIdentityProofTab(),
                _buildMembershipProofTab(),
                _buildRangeProofTab(),
                _buildNFTProofTab(),
              ],
            ),
          ),

          // Current Proof Display
          if (_currentProof != null) _buildProofDisplay(),

          // Action Buttons
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                if (_currentProof != null) ...[
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _verifyProof,
                      icon: const Icon(Icons.verified),
                      label: const Text('Verify Proof'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green.withOpacity(0.2),
                        foregroundColor: Colors.green,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _shareProof,
                      icon: const Icon(Icons.share),
                      label: const Text('Share'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue.withOpacity(0.2),
                        foregroundColor: Colors.blue,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ] else ...[
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _generateProof,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.purple,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ),
                              ),
                            )
                          : const Text(
                              'Generate Proof',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
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

  Widget _buildIdentityProofTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildInfoCard(
            'Identity Verification',
            'Prove you meet certain criteria without revealing personal information',
            Icons.person_outline,
            Colors.blue,
          ),
          const SizedBox(height: 20),
          const Text(
            'Required Claims',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          _buildClaimToggle('Age verification', Icons.cake),
          _buildClaimToggle('Location verification', Icons.location_on),
          _buildClaimToggle('Education verification', Icons.school),
          _buildClaimToggle('Employment verification', Icons.work),
        ],
      ),
    );
  }

  Widget _buildMembershipProofTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildInfoCard(
            'Membership Proof',
            'Prove you belong to a group without revealing your identity',
            Icons.group_outlined,
            Colors.green,
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _groupIdController,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: 'Group ID',
              labelStyle: const TextStyle(color: Colors.grey),
              prefixIcon: const Icon(Icons.group, color: Colors.green),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.withOpacity(0.3)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Colors.green),
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _secretController,
            style: const TextStyle(color: Colors.white),
            obscureText: true,
            decoration: InputDecoration(
              labelText: 'Member Secret',
              labelStyle: const TextStyle(color: Colors.grey),
              prefixIcon: const Icon(Icons.key, color: Colors.green),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.withOpacity(0.3)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Colors.green),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRangeProofTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildInfoCard(
            'Range Proof',
            'Prove a value is within a range without revealing the exact value',
            Icons.straighten,
            Colors.orange,
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _valueController,
            style: const TextStyle(color: Colors.white),
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: 'Value to Prove',
              labelStyle: const TextStyle(color: Colors.grey),
              prefixIcon: const Icon(Icons.numbers, color: Colors.orange),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.withOpacity(0.3)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Colors.orange),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _minRangeController,
                  style: const TextStyle(color: Colors.white),
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: 'Min Range',
                    labelStyle: const TextStyle(color: Colors.grey),
                    prefixIcon: const Icon(Icons.remove, color: Colors.orange),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: Colors.grey.withOpacity(0.3),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Colors.orange),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _maxRangeController,
                  style: const TextStyle(color: Colors.white),
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: 'Max Range',
                    labelStyle: const TextStyle(color: Colors.grey),
                    prefixIcon: const Icon(Icons.add, color: Colors.orange),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: Colors.grey.withOpacity(0.3),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Colors.orange),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNFTProofTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildInfoCard(
            'NFT Ownership Proof',
            'Prove you own an NFT without revealing your wallet address',
            Icons.image_outlined,
            Colors.purple,
          ),
          const SizedBox(height: 20),
          const Text(
            'Demo NFT Collections',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          _buildNFTCollection('CryptoPunks', '0x...punk', 100),
          _buildNFTCollection('Bored Apes', '0x...ape', 50),
          _buildNFTCollection('Art Blocks', '0x...art', 25),
        ],
      ),
    );
  }

  Widget _buildInfoCard(
    String title,
    String description,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3), width: 1),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 32),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClaimToggle(String claim, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: CheckboxListTile(
        value: true,
        onChanged: (value) {},
        title: Text(claim, style: const TextStyle(color: Colors.white)),
        secondary: Icon(icon, color: Colors.blue),
        checkColor: Colors.white,
        activeColor: Colors.blue,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        tileColor: Colors.blue.withOpacity(0.1),
      ),
    );
  }

  Widget _buildNFTCollection(String name, String address, int owned) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.purple.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.purple.withOpacity(0.3), width: 1),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.purple.withOpacity(0.3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.image, color: Colors.purple),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  address,
                  style: const TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.purple.withOpacity(0.2),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              '$owned owned',
              style: const TextStyle(
                color: Colors.purple,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProofDisplay() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.green.withOpacity(0.3), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green),
              SizedBox(width: 8),
              Text(
                'Proof Generated Successfully',
                style: TextStyle(
                  color: Colors.green,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Type: ${_currentProof!['metadata']?['type'] ?? 'Unknown'}',
            style: const TextStyle(color: Colors.white),
          ),
          const SizedBox(height: 4),
          Text(
            'Proof Hash: ${_currentProof!['proof']?['a']?.first?.substring(0, 16) ?? 'N/A'}...',
            style: const TextStyle(
              color: Colors.grey,
              fontFamily: 'monospace',
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _generateProof() async {
    setState(() {
      _isLoading = true;
    });

    try {
      Map<String, dynamic>? proof;

      switch (_tabController.index) {
        case 0: // Identity
          proof = await ZKProofService.generateIdentityProof(
            credentials: {
              'age': 25,
              'location': 'Mumbai',
              'education': 'Bachelor',
              'employment': 'Engineer',
            },
            requiredClaims: ['age', 'location'],
          );
          break;
        case 1: // Membership
          if (_groupIdController.text.isEmpty ||
              _secretController.text.isEmpty) {
            _showError('Please fill in all fields');
            return;
          }
          proof = await ZKProofService.generateMembershipProof(
            groupId: _groupIdController.text,
            memberSecret: _secretController.text,
          );
          break;
        case 2: // Range
          if (_valueController.text.isEmpty ||
              _minRangeController.text.isEmpty ||
              _maxRangeController.text.isEmpty) {
            _showError('Please fill in all fields');
            return;
          }
          proof = await ZKProofService.generateRangeProof(
            value: int.tryParse(_valueController.text) ?? 0,
            minRange: int.tryParse(_minRangeController.text) ?? 0,
            maxRange: int.tryParse(_maxRangeController.text) ?? 100,
          );
          break;
        case 3: // NFT
          proof = await ZKProofService.generateNFTOwnershipProof(
            nftContract: '0x1234567890123456789012345678901234567890',
            tokenId: '1',
            ownerAddress: '0x0987654321098765432109876543210987654321',
          );
          break;
      }

      if (proof != null) {
        setState(() {
          _currentProof = proof;
        });
        _showSuccess('Proof generated successfully!');
      } else {
        _showError('Failed to generate proof');
      }
    } catch (e) {
      _showError('Error generating proof: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _verifyProof() async {
    if (_currentProof == null) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final verified = await ZKProofService.verifyProof(_currentProof!);
      if (verified) {
        _showSuccess('Proof verified successfully!');
      } else {
        _showError('Proof verification failed');
      }
    } catch (e) {
      _showError('Error verifying proof: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _shareProof() {
    if (_currentProof == null) return;

    final proofJson = const JsonEncoder.withIndent('  ').convert(_currentProof);
    Clipboard.setData(ClipboardData(text: proofJson));
    _showSuccess('Proof copied to clipboard');
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
