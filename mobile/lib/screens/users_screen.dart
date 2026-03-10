import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../widgets/common.dart';

class UsersScreen extends ConsumerStatefulWidget {
  const UsersScreen({super.key});
  @override
  ConsumerState<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends ConsumerState<UsersScreen> {
  String _searchQuery = '';
  String? _roleFilter;

  static const _roles = ['admin', 'manager', 'staff'];

  List<User> _filtered(List<User> items) {
    var list = items;
    if (_roleFilter != null) {
      list = list.where((u) => u.role == _roleFilter).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((u) {
        return u.fullName.toLowerCase().contains(q) ||
            u.email.toLowerCase().contains(q) ||
            u.username.toLowerCase().contains(q) ||
            u.role.toLowerCase().contains(q);
      }).toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(usersProvider);
    final filtered = _filtered(state.items);

    return Scaffold(
      appBar: AppBar(
        title: Semantics(header: true, child: const Text('Users')),
        actions: [
          PopupMenuButton<String?>(
            icon: Icon(
              Icons.filter_list,
              color: _roleFilter != null
                  ? Theme.of(context).colorScheme.primary
                  : null,
            ),
            tooltip: 'Filter by role',
            onSelected: (v) => setState(() => _roleFilter = v),
            itemBuilder: (_) => [
              const PopupMenuItem(value: null, child: Text('All Roles')),
              ..._roles.map((r) => PopupMenuItem(
                    value: r,
                    child: Text(r[0].toUpperCase() + r.substring(1)),
                  )),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showForm(context),
        tooltip: 'Add user',
        child: const Icon(Icons.person_add),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? ErrorStateWidget(
                  message: state.error!,
                  onRetry: () => ref.read(usersProvider.notifier).fetch(),
                )
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'Search users…',
                          prefixIcon: const Icon(Icons.search),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear),
                                  onPressed: () =>
                                      setState(() => _searchQuery = ''),
                                )
                              : null,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          isDense: true,
                        ),
                        onChanged: (v) => setState(() => _searchQuery = v),
                      ),
                    ),
                    if (_roleFilter != null)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                        child: Chip(
                          label: Text(
                              'Role: ${_roleFilter![0].toUpperCase()}${_roleFilter!.substring(1)}'),
                          onDeleted: () =>
                              setState(() => _roleFilter = null),
                        ),
                      ),
                    Expanded(
                      child: filtered.isEmpty
                          ? EmptyStateWidget(
                              message: 'No users found',
                              icon: Icons.people_outline,
                              actionLabel: 'Add User',
                              onAction: () => _showForm(context),
                            )
                          : RefreshIndicator(
                              onRefresh: () =>
                                  ref.read(usersProvider.notifier).fetch(),
                              child: ListView.builder(
                                padding: const EdgeInsets.all(12),
                                itemCount: filtered.length,
                                itemBuilder: (context, index) {
                                  final user = filtered[index];
                                  return _UserTile(
                                    user: user,
                                    onEdit: () =>
                                        _showForm(context, user: user),
                                    onDelete: () =>
                                        _deleteUser(context, user),
                                    onToggleActive: () =>
                                        _toggleActive(context, user),
                                  );
                                },
                              ),
                            ),
                    ),
                  ],
                ),
    );
  }

  Future<void> _showForm(BuildContext context, {User? user}) async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _UserFormSheet(user: user),
    );
    if (result == null) return;
    try {
      if (user != null) {
        await ref.read(usersProvider.notifier).update(user.id, result);
        if (mounted) showSuccessSnackBar(context, 'User updated');
      } else {
        await ref.read(usersProvider.notifier).create(result);
        if (mounted) showSuccessSnackBar(context, 'User created');
      }
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e.toString());
    }
  }

  Future<void> _deleteUser(BuildContext context, User user) async {
    final confirmed = await showConfirmDialog(context,
        title: 'Delete User', message: 'Delete ${user.fullName}?');
    if (!confirmed) return;
    try {
      await ref.read(usersProvider.notifier).delete(user.id);
      if (mounted) showSuccessSnackBar(context, 'User deleted');
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e.toString());
    }
  }

  Future<void> _toggleActive(BuildContext context, User user) async {
    try {
      await ref
          .read(usersProvider.notifier)
          .toggleActive(user.id, !user.isActive);
      if (mounted) {
        showSuccessSnackBar(context,
            '${user.fullName} ${!user.isActive ? "activated" : "deactivated"}');
      }
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e.toString());
    }
  }
}

class _UserTile extends StatelessWidget {
  final User user;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onToggleActive;

  const _UserTile({
    required this.user,
    required this.onEdit,
    required this.onDelete,
    required this.onToggleActive,
  });

  Color _roleColor(String role) {
    switch (role) {
      case 'admin':
        return Colors.purple;
      case 'manager':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor:
              user.isActive ? _roleColor(user.role).withValues(alpha: 0.2) : Colors.grey.shade200,
          child: Icon(
            user.role == 'admin'
                ? Icons.admin_panel_settings
                : user.role == 'manager'
                    ? Icons.supervisor_account
                    : Icons.person,
            color: user.isActive ? _roleColor(user.role) : Colors.grey,
          ),
        ),
        title: Text(
          user.fullName,
          style: TextStyle(
            decoration: user.isActive ? null : TextDecoration.lineThrough,
            color: user.isActive ? null : Colors.grey,
          ),
        ),
        subtitle: Text('${user.email} • ${user.role}'),
        trailing: PopupMenuButton<String>(
          onSelected: (v) {
            switch (v) {
              case 'edit':
                onEdit();
              case 'toggle':
                onToggleActive();
              case 'delete':
                onDelete();
            }
          },
          itemBuilder: (_) => [
            const PopupMenuItem(value: 'edit', child: Text('Edit')),
            PopupMenuItem(
              value: 'toggle',
              child:
                  Text(user.isActive ? 'Deactivate' : 'Activate'),
            ),
            const PopupMenuItem(
              value: 'delete',
              child: Text('Delete', style: TextStyle(color: Colors.red)),
            ),
          ],
        ),
      ),
    );
  }
}

class _UserFormSheet extends StatefulWidget {
  final User? user;
  const _UserFormSheet({this.user});
  @override
  State<_UserFormSheet> createState() => _UserFormSheetState();
}

class _UserFormSheetState extends State<_UserFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _usernameCtrl;
  late final TextEditingController _emailCtrl;
  late final TextEditingController _firstCtrl;
  late final TextEditingController _lastCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _passwordCtrl;
  late String _role;

  @override
  void initState() {
    super.initState();
    _usernameCtrl =
        TextEditingController(text: widget.user?.username ?? '');
    _emailCtrl = TextEditingController(text: widget.user?.email ?? '');
    _firstCtrl =
        TextEditingController(text: widget.user?.firstName ?? '');
    _lastCtrl =
        TextEditingController(text: widget.user?.lastName ?? '');
    _phoneCtrl = TextEditingController(text: widget.user?.phone ?? '');
    _passwordCtrl = TextEditingController();
    _role = widget.user?.role ?? 'staff';
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.user != null;
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(isEdit ? 'Edit User' : 'New User',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(
                  child: TextFormField(
                    controller: _firstCtrl,
                    decoration: const InputDecoration(
                        labelText: 'First Name',
                        border: OutlineInputBorder()),
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Required' : null,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _lastCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Last Name',
                        border: OutlineInputBorder()),
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Required' : null,
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              TextFormField(
                controller: _usernameCtrl,
                decoration: const InputDecoration(
                    labelText: 'Username', border: OutlineInputBorder()),
                validator: (v) =>
                    v == null || v.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailCtrl,
                decoration: const InputDecoration(
                    labelText: 'Email', border: OutlineInputBorder()),
                keyboardType: TextInputType.emailAddress,
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Required';
                  if (!v.contains('@')) return 'Invalid email';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phoneCtrl,
                decoration: const InputDecoration(
                    labelText: 'Phone', border: OutlineInputBorder()),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _role,
                decoration: const InputDecoration(
                    labelText: 'Role', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'admin', child: Text('Admin')),
                  DropdownMenuItem(
                      value: 'manager', child: Text('Manager')),
                  DropdownMenuItem(value: 'staff', child: Text('Staff')),
                ],
                onChanged: (v) {
                  if (v != null) setState(() => _role = v);
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passwordCtrl,
                decoration: InputDecoration(
                  labelText: isEdit
                      ? 'New Password (leave empty to keep)'
                      : 'Password',
                  border: const OutlineInputBorder(),
                ),
                obscureText: true,
                validator: (v) {
                  if (!isEdit && (v == null || v.isEmpty)) {
                    return 'Required for new users';
                  }
                  if (v != null && v.isNotEmpty && v.length < 8) {
                    return 'Min 8 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  if (!_formKey.currentState!.validate()) return;
                  final data = <String, dynamic>{
                    'username': _usernameCtrl.text.trim(),
                    'email': _emailCtrl.text.trim(),
                    'firstName': _firstCtrl.text.trim(),
                    'lastName': _lastCtrl.text.trim(),
                    'role': _role,
                  };
                  if (_phoneCtrl.text.trim().isNotEmpty) {
                    data['phone'] = _phoneCtrl.text.trim();
                  }
                  if (_passwordCtrl.text.isNotEmpty) {
                    data['password'] = _passwordCtrl.text;
                  }
                  Navigator.pop(context, data);
                },
                child: Text(isEdit ? 'Update' : 'Create'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _emailCtrl.dispose();
    _firstCtrl.dispose();
    _lastCtrl.dispose();
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }
}
