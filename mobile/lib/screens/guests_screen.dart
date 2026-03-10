import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/guest.dart';
import '../providers/providers.dart';
import '../widgets/common.dart';

class GuestsScreen extends ConsumerStatefulWidget {
  const GuestsScreen({super.key});
  @override
  ConsumerState<GuestsScreen> createState() => _GuestsScreenState();
}

class _GuestsScreenState extends ConsumerState<GuestsScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(guestsProvider);
    final filtered = _search.isEmpty
        ? state.items
        : state.items.where((g) {
            final q = _search.toLowerCase();
            return g.fullName.toLowerCase().contains(q) ||
                (g.email?.toLowerCase().contains(q) ?? false);
          }).toList();

    return Scaffold(
      appBar: AppBar(
        title: Semantics(header: true, child: const Text('Guests')),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showGuestForm(context),
        tooltip: 'Add guest',
        child: const Icon(Icons.person_add),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? ErrorStateWidget(
                  message: state.error!,
                  onRetry: () => ref.read(guestsProvider.notifier).fetch(),
                )
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Semantics(
                        label: 'Search guests',
                        child: TextField(
                          decoration: InputDecoration(
                            hintText: 'Search guests...',
                            prefixIcon: const Icon(Icons.search),
                            border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12)),
                            filled: true,
                          ),
                          onChanged: (v) => setState(() => _search = v),
                        ),
                      ),
                    ),
                    Expanded(
                      child: filtered.isEmpty
                          ? EmptyStateWidget(
                              message: _search.isEmpty
                                  ? 'No guests found'
                                  : 'No guests match "$_search"',
                              icon: Icons.people_outline,
                              actionLabel: _search.isEmpty ? 'Add Guest' : null,
                              onAction: _search.isEmpty
                                  ? () => _showGuestForm(context)
                                  : null,
                            )
                          : RefreshIndicator(
                              onRefresh: () =>
                                  ref.read(guestsProvider.notifier).fetch(),
                              child: ListView.builder(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 12),
                                itemCount: filtered.length,
                                itemBuilder: (context, i) {
                                  final g = filtered[i];
                                  return Semantics(
                                    label:
                                        '${g.fullName}, ${g.vipStatus ? "VIP" : "Regular"} guest',
                                    child: Card(
                                      child: ListTile(
                                        leading: CircleAvatar(
                                            child: Text(g.initials)),
                                        title: Text(g.fullName),
                                        subtitle: Text(
                                            g.email ?? g.phone),
                                        trailing: Chip(
                                          label: Text(
                                              g.vipStatus ? 'VIP' : 'Regular',
                                              style: const TextStyle(
                                                  fontSize: 10)),
                                        ),
                                        onTap: () =>
                                            context.push('/guests/detail', extra: g),
                                        onLongPress: () => _showGuestActions(context, g),
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                    ),
                  ],
                ),
    );
  }

  Future<void> _showGuestForm(BuildContext context, {Guest? guest}) async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _GuestFormSheet(guest: guest),
    );
    if (result == null) return;
    try {
      if (guest != null) {
        await ref.read(guestsProvider.notifier).update(guest.id, result);
        if (mounted) showSuccessSnackBar(context, 'Guest updated');
      } else {
        await ref.read(guestsProvider.notifier).create(result);
        if (mounted) showSuccessSnackBar(context, 'Guest created');
      }
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e.toString());
    }
  }

  void _showGuestActions(BuildContext context, Guest g) {
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.edit),
              title: const Text('Edit'),
              onTap: () { Navigator.pop(context); _showGuestForm(context, guest: g); },
            ),
            ListTile(
              leading: const Icon(Icons.delete, color: Colors.red),
              title: const Text('Delete', style: TextStyle(color: Colors.red)),
              onTap: () { Navigator.pop(context); _deleteGuest(context, g); },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _deleteGuest(BuildContext context, Guest g) async {
    final confirmed = await showConfirmDialog(context,
        title: 'Delete Guest', message: 'Delete ${g.fullName}?');
    if (!confirmed) return;
    try {
      await ref.read(guestsProvider.notifier).delete(g.id);
      if (mounted) showSuccessSnackBar(context, 'Guest deleted');
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e.toString());
    }
  }
}

class _GuestFormSheet extends StatefulWidget {
  final Guest? guest;
  const _GuestFormSheet({this.guest});
  @override
  State<_GuestFormSheet> createState() => _GuestFormSheetState();
}

class _GuestFormSheetState extends State<_GuestFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _firstCtrl;
  late final TextEditingController _lastCtrl;
  late final TextEditingController _emailCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _nationalityCtrl;
  late bool _vip;

  @override
  void initState() {
    super.initState();
    _firstCtrl = TextEditingController(text: widget.guest?.firstName ?? '');
    _lastCtrl = TextEditingController(text: widget.guest?.lastName ?? '');
    _emailCtrl = TextEditingController(text: widget.guest?.email ?? '');
    _phoneCtrl = TextEditingController(text: widget.guest?.phone ?? '');
    _nationalityCtrl =
        TextEditingController(text: widget.guest?.nationality ?? '');
    _vip = widget.guest?.vipStatus ?? false;
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
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(widget.guest != null ? 'Edit Guest' : 'New Guest',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(
                  child: TextFormField(
                    controller: _firstCtrl,
                    decoration: const InputDecoration(
                        labelText: 'First Name', border: OutlineInputBorder()),
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Required' : null,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _lastCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Last Name', border: OutlineInputBorder()),
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Required' : null,
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailCtrl,
                decoration: const InputDecoration(
                    labelText: 'Email', border: OutlineInputBorder()),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phoneCtrl,
                decoration: const InputDecoration(
                    labelText: 'Phone', border: OutlineInputBorder()),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _nationalityCtrl,
                decoration: const InputDecoration(
                    labelText: 'Nationality', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                title: const Text('VIP Guest'),
                value: _vip,
                onChanged: (v) => setState(() => _vip = v),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () {
                  if (!_formKey.currentState!.validate()) return;
                  Navigator.pop(context, {
                    'firstName': _firstCtrl.text.trim(),
                    'lastName': _lastCtrl.text.trim(),
                    'email': _emailCtrl.text.trim(),
                    'phone': _phoneCtrl.text.trim(),
                    'nationality': _nationalityCtrl.text.trim(),
                    'vipStatus': _vip,
                  });
                },
                child: Text(widget.guest != null ? 'Update' : 'Create'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _firstCtrl.dispose();
    _lastCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _nationalityCtrl.dispose();
    super.dispose();
  }
}
