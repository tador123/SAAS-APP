import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import '../services/auth_service.dart';

/// Public guest self-registration screen.
/// No authentication required — guests fill in their details and receive a QR code.
/// The QR code is a universal guest identity — works at any property.
class GuestSelfRegistrationScreen extends StatefulWidget {
  const GuestSelfRegistrationScreen({super.key});

  @override
  State<GuestSelfRegistrationScreen> createState() =>
      _GuestSelfRegistrationScreenState();
}

class _GuestSelfRegistrationScreenState
    extends State<GuestSelfRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _dio = Dio(BaseOptions(
    baseUrl: AuthService.baseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
    headers: {'Content-Type': 'application/json'},
  ));

  bool _loading = false;
  String? _error;

  // Form fields
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _idNumberCtrl = TextEditingController();
  final _nationalityCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  String? _idType;
  DateTime? _dateOfBirth;

  static const _idTypes = [
    ('passport', 'Passport'),
    ('national_id', 'National ID'),
    ('drivers_license', "Driver's License"),
    ('other', 'Other'),
  ];

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _idNumberCtrl.dispose();
    _nationalityCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = <String, dynamic>{
        'firstName': _firstNameCtrl.text.trim(),
        'lastName': _lastNameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
      };
      if (_emailCtrl.text.trim().isNotEmpty) {
        data['email'] = _emailCtrl.text.trim();
      }
      if (_idType != null) data['idType'] = _idType;
      if (_idNumberCtrl.text.trim().isNotEmpty) {
        data['idNumber'] = _idNumberCtrl.text.trim();
      }
      if (_nationalityCtrl.text.trim().isNotEmpty) {
        data['nationality'] = _nationalityCtrl.text.trim();
      }
      if (_addressCtrl.text.trim().isNotEmpty) {
        data['address'] = _addressCtrl.text.trim();
      }
      if (_dateOfBirth != null) {
        data['dateOfBirth'] =
            _dateOfBirth!.toIso8601String().split('T').first;
      }

      final response = await _dio.post(
        '/guest-register',
        data: data,
      );

      final result = response.data as Map<String, dynamic>;
      final guest = result['guest'] as Map<String, dynamic>;
      final qrToken = guest['qrToken'] as String;

      if (!mounted) return;

      // Navigate to QR code display screen
      context.go('/guest-qr', extra: {
        'qrToken': qrToken,
        'firstName': guest['firstName'],
        'lastName': guest['lastName'],
      });
    } on DioException catch (e) {
      final msg = e.response?.data is Map
          ? (e.response!.data as Map)['error']?.toString() ?? 'Registration failed'
          : 'Registration failed. Please try again.';
      setState(() => _error = msg);
    } catch (e) {
      setState(() => _error = 'An unexpected error occurred');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickDateOfBirth() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _dateOfBirth ?? DateTime(now.year - 30),
      firstDate: DateTime(1920),
      lastDate: now,
    );
    if (picked != null) {
      setState(() => _dateOfBirth = picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Guest Registration'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Icon(Icons.how_to_reg, size: 56, color: theme.colorScheme.primary),
                const SizedBox(height: 12),
                Text(
                  'Welcome! Register your details',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Fill in your information to get a personal QR code. Show it at any hotel or restaurant for instant check-in — no paperwork needed!',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 24),

                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.errorContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _error!,
                      style: TextStyle(color: theme.colorScheme.onErrorContainer),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Name row
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _firstNameCtrl,
                        decoration: const InputDecoration(
                          labelText: 'First Name *',
                          prefixIcon: Icon(Icons.person),
                        ),
                        textCapitalization: TextCapitalization.words,
                        validator: (v) =>
                            (v == null || v.trim().isEmpty) ? 'Required' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _lastNameCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Last Name *',
                        ),
                        textCapitalization: TextCapitalization.words,
                        validator: (v) =>
                            (v == null || v.trim().isEmpty) ? 'Required' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Phone
                TextFormField(
                  controller: _phoneCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Phone Number *',
                    prefixIcon: Icon(Icons.phone),
                  ),
                  keyboardType: TextInputType.phone,
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 16),

                // Email
                TextFormField(
                  controller: _emailCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Email (optional)',
                    prefixIcon: Icon(Icons.email),
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),

                // ID Type
                DropdownButtonFormField<String>(
                  value: _idType,
                  decoration: const InputDecoration(
                    labelText: 'ID Type (optional)',
                    prefixIcon: Icon(Icons.badge),
                  ),
                  items: _idTypes
                      .map((t) => DropdownMenuItem(value: t.$1, child: Text(t.$2)))
                      .toList(),
                  onChanged: (v) => setState(() => _idType = v),
                ),
                const SizedBox(height: 16),

                // ID Number
                TextFormField(
                  controller: _idNumberCtrl,
                  decoration: const InputDecoration(
                    labelText: 'ID Number (optional)',
                    prefixIcon: Icon(Icons.numbers),
                  ),
                ),
                const SizedBox(height: 16),

                // Nationality
                TextFormField(
                  controller: _nationalityCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Nationality (optional)',
                    prefixIcon: Icon(Icons.flag),
                  ),
                  textCapitalization: TextCapitalization.words,
                ),
                const SizedBox(height: 16),

                // Address
                TextFormField(
                  controller: _addressCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Address (optional)',
                    prefixIcon: Icon(Icons.home),
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 16),

                // Date of Birth
                InkWell(
                  onTap: _pickDateOfBirth,
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Date of Birth (optional)',
                      prefixIcon: Icon(Icons.cake),
                    ),
                    child: Text(
                      _dateOfBirth != null
                          ? '${_dateOfBirth!.year}-${_dateOfBirth!.month.toString().padLeft(2, '0')}-${_dateOfBirth!.day.toString().padLeft(2, '0')}'
                          : 'Tap to select',
                      style: TextStyle(
                        color: _dateOfBirth != null
                            ? null
                            : theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 28),

                // Submit button
                FilledButton.icon(
                  onPressed: _loading ? null : _submit,
                  icon: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.qr_code),
                  label: Text(_loading ? 'Registering...' : 'Register & Get QR Code'),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    textStyle: const TextStyle(fontSize: 16),
                  ),
                ),
                const SizedBox(height: 16),

                // Already have a QR code link
                TextButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('Already a staff member? Log in'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
