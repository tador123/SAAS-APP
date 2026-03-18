import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/guest_auth_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _guest;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      // Try remote first, fall back to local
      final remote = await GuestAuthService.getProfile();
      if (remote != null) {
        setState(() { _guest = remote; _loading = false; });
        return;
      }
    } catch (_) {}

    try {
      final local = await GuestAuthService.getStoredGuest();
      setState(() { _guest = local; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sign Out')),
        ],
      ),
    );

    if (confirmed != true) return;
    await GuestAuthService.logout();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_guest == null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Not signed in'),
              const SizedBox(height: 12),
              FilledButton(onPressed: () => context.go('/login'), child: const Text('Sign In')),
            ],
          ),
        ),
      );
    }

    final firstName = _guest!['firstName']?.toString() ?? '';
    final lastName = _guest!['lastName']?.toString() ?? '';
    final email = _guest!['email']?.toString() ?? '';
    final phone = _guest!['phone']?.toString() ?? '';
    final qrToken = _guest!['qrToken']?.toString() ?? '';
    final emailVerified = _guest!['emailVerified'] == true;
    final initials = '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}'.toUpperCase();

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const SizedBox(height: 12),

              // Avatar
              CircleAvatar(
                radius: 44,
                backgroundColor: theme.colorScheme.primaryContainer,
                child: Text(initials, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
              ),
              const SizedBox(height: 14),
              Text('$firstName $lastName', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(email, style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                  const SizedBox(width: 6),
                  if (emailVerified)
                    Icon(Icons.verified, size: 16, color: Colors.green.shade600)
                  else
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: Colors.orange.shade100, borderRadius: BorderRadius.circular(4)),
                      child: Text('Unverified', style: TextStyle(fontSize: 11, color: Colors.orange.shade800, fontWeight: FontWeight.w600)),
                    ),
                ],
              ),
              const SizedBox(height: 28),

              // QR Code Section
              Text('Your Digital ID', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text('Show this QR code at any partner hotel', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
              const SizedBox(height: 16),

              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 20,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    if (qrToken.isNotEmpty)
                      QrImageView(
                        data: qrToken,
                        version: QrVersions.auto,
                        size: 200,
                        eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: Color(0xFF2563EB)),
                        dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: Color(0xFF1E293B)),
                      )
                    else
                      Container(
                        width: 200, height: 200,
                        color: Colors.grey.shade200,
                        child: const Center(child: Text('No QR Code')),
                      ),
                    const SizedBox(height: 12),
                    Text('$firstName $lastName', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87)),
                    if (phone.isNotEmpty)
                      Text(phone, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Profile details
              _profileTile(theme, Icons.phone_outlined, 'Phone', phone),
              if (_guest!['nationality'] != null)
                _profileTile(theme, Icons.flag_outlined, 'Nationality', _guest!['nationality'].toString()),
              if (_guest!['dateOfBirth'] != null)
                _profileTile(theme, Icons.cake_outlined, 'Date of Birth', _guest!['dateOfBirth'].toString()),
              if (_guest!['address'] != null)
                _profileTile(theme, Icons.home_outlined, 'Address', _guest!['address'].toString()),

              const SizedBox(height: 16),

              // Edit profile
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => context.push('/edit-profile'),
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Edit Profile'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Logout
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: _logout,
                  icon: Icon(Icons.logout, color: theme.colorScheme.error),
                  label: Text('Sign Out', style: TextStyle(color: theme.colorScheme.error)),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _profileTile(ThemeData theme, IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: ListTile(
          leading: Icon(icon, color: theme.colorScheme.primary),
          title: Text(label, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          subtitle: Text(value, style: theme.textTheme.bodyLarge),
        ),
      ),
    );
  }
}
