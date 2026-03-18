import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../services/guest_auth_service.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _nationalityController = TextEditingController();
  final _addressController = TextEditingController();
  bool _loading = false;
  bool _initialLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final guest = await GuestAuthService.getStoredGuest();
    if (guest != null) {
      _firstNameController.text = guest['firstName']?.toString() ?? '';
      _lastNameController.text = guest['lastName']?.toString() ?? '';
      _phoneController.text = guest['phone']?.toString() ?? '';
      _nationalityController.text = guest['nationality']?.toString() ?? '';
      _addressController.text = guest['address']?.toString() ?? '';
    }
    setState(() => _initialLoading = false);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await GuestAuthService.updateProfile({
        'firstName': _firstNameController.text.trim(),
        'lastName': _lastNameController.text.trim(),
        'phone': _phoneController.text.trim(),
        'nationality': _nationalityController.text.trim(),
        'address': _addressController.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated'), backgroundColor: Colors.green),
        );
        context.pop();
      }
    } on DioException catch (e) {
      if (mounted) {
        final msg = e.response?.data?['error']?.toString() ?? 'Failed to update profile';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: Theme.of(context).colorScheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    final theme = Theme.of(context);
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      filled: true,
      fillColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_initialLoading) {
      return Scaffold(appBar: AppBar(title: const Text('Edit Profile')), body: const Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Edit Profile'), centerTitle: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _firstNameController,
                      decoration: _inputDecoration('First Name', Icons.person_outlined),
                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _lastNameController,
                      decoration: _inputDecoration('Last Name', Icons.person_outlined),
                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneController,
                decoration: _inputDecoration('Phone', Icons.phone_outlined),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _nationalityController,
                decoration: _inputDecoration('Nationality', Icons.flag_outlined),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _addressController,
                decoration: _inputDecoration('Address', Icons.home_outlined),
                maxLines: 2,
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  onPressed: _loading ? null : _save,
                  style: FilledButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _loading
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Save Changes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _nationalityController.dispose();
    _addressController.dispose();
    super.dispose();
  }
}
