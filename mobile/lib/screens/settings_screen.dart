import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/providers.dart';
import '../services/auth_service.dart';
import '../main.dart' show localeNotifier, themeModeNotifier;

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _darkMode = false;
  bool _notifications = true;
  Map<String, dynamic>? _subscriptionInfo;
  bool _loadingSubscription = false;
  bool _changingPlan = false;

  static const _planOrder = ['free', 'basic', 'premium', 'enterprise'];
  static const _planPrices = {'free': 0, 'basic': 29, 'premium': 79, 'enterprise': 199};

  @override
  void initState() {
    super.initState();
    _loadPrefs();
    _loadSubscription();
  }

  Future<void> _loadSubscription() async {
    setState(() => _loadingSubscription = true);
    try {
      final info = await AuthService.getSubscriptionInfo();
      if (mounted) setState(() => _subscriptionInfo = info);
    } catch (_) {
      // Subscription info not available
    } finally {
      if (mounted) setState(() => _loadingSubscription = false);
    }
  }

  Future<void> _loadPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _darkMode = prefs.getBool('darkMode') ?? false;
      _notifications = prefs.getBool('notifications') ?? true;
    });
  }

  Future<void> _setDarkMode(bool value) async {
    await themeModeNotifier.toggle(value);
    setState(() => _darkMode = value);
  }

  Future<void> _setNotifications(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notifications', value);
    setState(() => _notifications = value);
  }

  void _showEditProfile() {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _EditProfileSheet(
        user: user,
        onSaved: () {
          // Update provider state with the new user
          ref.read(authProvider.notifier).refreshUser();
        },
      ),
    );
  }

  void _showChangePassword() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _ChangePasswordSheet(),
    );
  }

  Future<void> _showChangePlan(String newPlan) async {
    final user = ref.read(authProvider).user;
    final currentPlan = user?.subscriptionPlan ?? 'free';
    if (newPlan == currentPlan) return;

    final isUpgrade = _planOrder.indexOf(newPlan) > _planOrder.indexOf(currentPlan);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isUpgrade ? 'Upgrade Plan' : 'Downgrade Plan'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Change from ${currentPlan[0].toUpperCase()}${currentPlan.substring(1)} '
              'to ${newPlan[0].toUpperCase()}${newPlan.substring(1)}?',
            ),
            if (!isUpgrade) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange.shade200),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.warning_amber, color: Colors.orange, size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Downgrading may limit your current resources.',
                        style: TextStyle(fontSize: 13, color: Colors.orange),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 8),
            Text(
              'New price: \$${_planPrices[newPlan]}/month',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _changingPlan = true);
    try {
      final updatedUser = await AuthService.changePlan(newPlan);
      ref.read(authProvider.notifier).refreshUser();
      await _loadSubscription();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${isUpgrade ? "Upgraded" : "Changed"} to ${newPlan[0].toUpperCase()}${newPlan.substring(1)} plan!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to change plan: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _changingPlan = false);
    }
  }

  void _showPlanPicker() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) {
        final currentPlan = ref.read(authProvider).user?.subscriptionPlan ?? 'free';
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Change Plan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ),
              ..._planOrder.map((planKey) {
                final isCurrent = planKey == currentPlan;
                final price = _planPrices[planKey] ?? 0;
                return ListTile(
                  leading: Icon(isCurrent ? Icons.check_circle : Icons.circle_outlined,
                      color: isCurrent ? Colors.green : null),
                  title: Text('${planKey[0].toUpperCase()}${planKey.substring(1)}'),
                  subtitle: Text(price == 0 ? 'Free' : '\$$price/month'),
                  onTap: isCurrent
                      ? null
                      : () {
                          Navigator.pop(ctx);
                          _showChangePlan(planKey);
                        },
                );
              }),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: Semantics(header: true, child: const Text('Settings')),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const _SectionHeader('Account'),
          Card(
            child: Column(children: [
              ListTile(
                leading: CircleAvatar(
                  child: Text(user != null
                      ? '${user.firstName.isNotEmpty ? user.firstName[0] : ''}${user.lastName.isNotEmpty ? user.lastName[0] : ''}'
                      : '?'),
                ),
                title: Text(user?.fullName ?? 'Unknown'),
                subtitle: Text(user?.email ?? ''),
                trailing: IconButton(
                  icon: const Icon(Icons.edit),
                  tooltip: 'Edit profile',
                  onPressed: _showEditProfile,
                ),
              ),
              ListTile(
                leading: const Icon(Icons.badge),
                title: const Text('Role'),
                trailing: Chip(
                  label: Text(user?.role ?? '—',
                      style: const TextStyle(fontSize: 12)),
                ),
              ),
              if (user?.subscriptionPlan != null)
                ListTile(
                  leading: const Icon(Icons.card_membership),
                  title: const Text('Subscription Plan'),
                  subtitle: _subscriptionInfo != null
                      ? Text('${_subscriptionInfo!['usage']?['rooms'] ?? 0} rooms, '
                          '${_subscriptionInfo!['usage']?['tables'] ?? 0} tables, '
                          '${_subscriptionInfo!['usage']?['staff'] ?? 0} staff')
                      : null,
                  trailing: Chip(
                    label: Text(
                      '${(user!.subscriptionPlan ?? 'free')[0].toUpperCase()}${(user.subscriptionPlan ?? 'free').substring(1)}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  ),
                  onTap: user.role == 'admin' ? () => _showPlanPicker() : null,
                ),
            ]),
          ),
          const SizedBox(height: 16),

          // Subscription Plans section (admin only)
          if (user?.role == 'admin') ...[
            const _SectionHeader('Subscription Plans'),
            Card(
              child: _changingPlan
                  ? const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  : Column(
                      children: _planOrder.map((planKey) {
                        final isCurrent = (user?.subscriptionPlan ?? 'free') == planKey;
                        final price = _planPrices[planKey] ?? 0;
                        final isUpgrade = _planOrder.indexOf(planKey) > _planOrder.indexOf(user?.subscriptionPlan ?? 'free');
                        return ListTile(
                          leading: Icon(
                            isCurrent ? Icons.check_circle : (isUpgrade ? Icons.arrow_upward : Icons.arrow_downward),
                            color: isCurrent ? Colors.green : (isUpgrade ? Theme.of(context).colorScheme.primary : Colors.grey),
                          ),
                          title: Text(
                            '${planKey[0].toUpperCase()}${planKey.substring(1)}',
                            style: TextStyle(
                              fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                              color: isCurrent ? Theme.of(context).colorScheme.primary : null,
                            ),
                          ),
                          subtitle: Text(price == 0 ? 'Free' : '\$$price/month'),
                          trailing: isCurrent
                              ? const Chip(label: Text('Current', style: TextStyle(fontSize: 11)))
                              : TextButton(
                                  onPressed: () => _showChangePlan(planKey),
                                  child: Text(isUpgrade ? 'Upgrade' : 'Switch'),
                                ),
                        );
                      }).toList(),
                    ),
            ),
            const SizedBox(height: 16),
          ],

          const _SectionHeader('Security'),
          Card(
            child: ListTile(
              leading: const Icon(Icons.lock),
              title: const Text('Change Password'),
              trailing: const Icon(Icons.chevron_right),
              onTap: _showChangePassword,
            ),
          ),
          const SizedBox(height: 16),

          // Admin/Manager: link to user management
          if (user?.role == 'admin' || user?.role == 'manager') ...[
            const _SectionHeader('Administration'),
            Card(
              child: ListTile(
                leading: const Icon(Icons.people),
                title: const Text('Manage Users'),
                subtitle: const Text('Create and manage staff accounts'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/users'),
              ),
            ),
            const SizedBox(height: 16),
          ],

          const _SectionHeader('Preferences'),
          Card(
            child: Column(children: [
              Semantics(
                toggled: _notifications,
                label: 'Push notifications',
                child: SwitchListTile(
                  secondary: const Icon(Icons.notifications),
                  title: const Text('Push Notifications'),
                  value: _notifications,
                  onChanged: _setNotifications,
                ),
              ),
              Semantics(
                toggled: _darkMode,
                label: 'Dark mode',
                child: SwitchListTile(
                  secondary: const Icon(Icons.dark_mode),
                  title: const Text('Dark Mode'),
                  value: _darkMode,
                  onChanged: _setDarkMode,
                ),
              ),
            ]),
          ),
          const SizedBox(height: 16),
          const _SectionHeader('Language'),
          const Card(
            child: Column(
              children: [
                _LanguageTile(
                  locale: Locale('en'),
                  label: 'English',
                  flag: '🇺🇸',
                ),
                _LanguageTile(
                  locale: Locale('es'),
                  label: 'Español',
                  flag: '🇪🇸',
                ),
                _LanguageTile(
                  locale: Locale('fr'),
                  label: 'Français',
                  flag: '🇫🇷',
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const _SectionHeader('About'),
          const Card(
            child: Column(children: [
              ListTile(
                leading: Icon(Icons.info),
                title: Text('App Version'),
                trailing: Text('1.0.0'),
              ),
              ListTile(
                leading: Icon(Icons.code),
                title: Text('Platform'),
                trailing: Text('Hotel & Restaurant SaaS'),
              ),
            ]),
          ),
          const SizedBox(height: 24),
          Semantics(
            button: true,
            label: 'Logout',
            child: FilledButton.icon(
              icon: const Icon(Icons.logout),
              label: const Text('Logout'),
              style: FilledButton.styleFrom(backgroundColor: Colors.red),
              onPressed: () async {
                await ref.read(authProvider.notifier).logout();
                if (mounted) context.go('/login');
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Edit Profile Sheet ──────────────────────────────────────
class _EditProfileSheet extends StatefulWidget {
  final dynamic user;
  final VoidCallback onSaved;
  const _EditProfileSheet({required this.user, required this.onSaved});
  @override
  State<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<_EditProfileSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _firstNameCtrl;
  late final TextEditingController _lastNameCtrl;
  late final TextEditingController _phoneCtrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _firstNameCtrl =
        TextEditingController(text: widget.user.firstName ?? '');
    _lastNameCtrl =
        TextEditingController(text: widget.user.lastName ?? '');
    _phoneCtrl = TextEditingController(text: widget.user.phone ?? '');
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await AuthService.updateProfile({
        'firstName': _firstNameCtrl.text.trim(),
        'lastName': _lastNameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
      });
      widget.onSaved();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile updated')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Edit Profile',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            TextFormField(
              controller: _firstNameCtrl,
              decoration: const InputDecoration(
                  labelText: 'First Name', border: OutlineInputBorder()),
              validator: (v) =>
                  v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _lastNameCtrl,
              decoration: const InputDecoration(
                  labelText: 'Last Name', border: OutlineInputBorder()),
              validator: (v) =>
                  v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phoneCtrl,
              decoration: const InputDecoration(
                  labelText: 'Phone', border: OutlineInputBorder()),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Save Changes'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }
}

// ── Change Password Sheet ───────────────────────────────────
class _ChangePasswordSheet extends StatefulWidget {
  const _ChangePasswordSheet();
  @override
  State<_ChangePasswordSheet> createState() => _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends State<_ChangePasswordSheet> {
  final _formKey = GlobalKey<FormState>();
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _saving = false;
  bool _showCurrent = false;
  bool _showNew = false;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await AuthService.changePassword(
          _currentCtrl.text, _newCtrl.text);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Password changed successfully')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Change Password',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            TextFormField(
              controller: _currentCtrl,
              obscureText: !_showCurrent,
              decoration: InputDecoration(
                labelText: 'Current Password',
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  icon: Icon(_showCurrent
                      ? Icons.visibility_off
                      : Icons.visibility),
                  onPressed: () =>
                      setState(() => _showCurrent = !_showCurrent),
                ),
              ),
              validator: (v) =>
                  v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _newCtrl,
              obscureText: !_showNew,
              decoration: InputDecoration(
                labelText: 'New Password',
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  icon: Icon(_showNew
                      ? Icons.visibility_off
                      : Icons.visibility),
                  onPressed: () =>
                      setState(() => _showNew = !_showNew),
                ),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Required';
                if (v.length < 8) return 'Min 8 characters';
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _confirmCtrl,
              obscureText: !_showNew,
              decoration: const InputDecoration(
                labelText: 'Confirm New Password',
                border: OutlineInputBorder(),
              ),
              validator: (v) {
                if (v != _newCtrl.text) return 'Passwords do not match';
                return null;
              },
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Change Password'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(title,
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.bold)),
    );
  }
}

class _LanguageTile extends StatelessWidget {
  final Locale locale;
  final String label;
  final String flag;

  const _LanguageTile({
    required this.locale,
    required this.label,
    required this.flag,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = localeNotifier.locale == locale;
    return ListTile(
      leading: Text(flag, style: const TextStyle(fontSize: 24)),
      title: Text(label),
      trailing: isSelected
          ? const Icon(Icons.check_circle, color: Colors.green)
          : null,
      selected: isSelected,
      onTap: () {
        localeNotifier.setLocale(locale);
      },
    );
  }
}
