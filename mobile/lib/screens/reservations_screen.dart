import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../models/reservation.dart';
import '../providers/providers.dart';
import '../widgets/common.dart';

class ReservationsScreen extends ConsumerStatefulWidget {
  const ReservationsScreen({super.key});
  @override
  ConsumerState<ReservationsScreen> createState() =>
      _ReservationsScreenState();
}

class _ReservationsScreenState extends ConsumerState<ReservationsScreen> {
  String _searchQuery = '';
  String? _statusFilter;

  List<Reservation> _filtered(List<Reservation> all) {
    var list = all;
    if (_statusFilter != null) {
      list = list.where((r) => r.status == _statusFilter).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list
          .where((r) =>
              (r.guest?.fullName.toLowerCase().contains(q) ?? false) ||
              (r.room?.roomNumber.toLowerCase().contains(q) ?? false) ||
              r.status.toLowerCase().contains(q) ||
              r.id.toString().contains(q))
          .toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(reservationsProvider);
    final filtered = _filtered(state.items);

    return Scaffold(
      appBar: AppBar(
        title: Semantics(header: true, child: const Text('Reservations')),
        actions: [
          PopupMenuButton<String?>(
            icon: const Icon(Icons.filter_list),
            tooltip: 'Filter by status',
            onSelected: (v) => setState(() => _statusFilter = v),
            itemBuilder: (_) => [
              const PopupMenuItem(value: null, child: Text('All')),
              ...Reservation.statuses.map(
                  (s) => PopupMenuItem(value: s, child: Text(s))),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showForm(context, ref),
        tooltip: 'Add reservation',
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search reservations...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10)),
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
              onChanged: (v) => setState(() => _searchQuery = v),
            ),
          ),
          if (_statusFilter != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Chip(
                label: Text('Status: $_statusFilter'),
                onDeleted: () => setState(() => _statusFilter = null),
              ),
            ),
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : state.error != null
                    ? ErrorStateWidget(
                        message: state.error!,
                        onRetry: () =>
                            ref.read(reservationsProvider.notifier).fetch(),
                      )
                    : filtered.isEmpty
                        ? EmptyStateWidget(
                            message: 'No reservations found',
                            icon: Icons.calendar_today_outlined,
                            actionLabel: 'Add Reservation',
                            onAction: () => _showForm(context, ref),
                          )
                        : RefreshIndicator(
                            onRefresh: () =>
                                ref.read(reservationsProvider.notifier).fetch(),
                            child: ListView.builder(
                              padding: const EdgeInsets.all(12),
                              itemCount: filtered.length,
                              itemBuilder: (context, index) {
                                final r = filtered[index];
                                return _ReservationTile(
                                  reservation: r,
                                  onEdit: () =>
                                      _showForm(context, ref, res: r),
                                  onDelete: () =>
                                      _delete(context, ref, r),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Future<void> _showForm(BuildContext context, WidgetRef ref,
      {Reservation? res}) async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ReservationFormSheet(reservation: res),
    );
    if (result == null) return;
    try {
      if (res != null) {
        await ref.read(reservationsProvider.notifier).update(res.id, result);
        if (context.mounted) showSuccessSnackBar(context, 'Reservation updated');
      } else {
        await ref.read(reservationsProvider.notifier).create(result);
        if (context.mounted) showSuccessSnackBar(context, 'Reservation created');
      }
    } catch (e) {
      if (context.mounted) showErrorSnackBar(context, e.toString());
    }
  }

  Future<void> _delete(
      BuildContext context, WidgetRef ref, Reservation r) async {
    final ok = await showConfirmDialog(context,
        title: 'Delete Reservation',
        message: 'Delete reservation #${r.id}?');
    if (!ok) return;
    try {
      await ref.read(reservationsProvider.notifier).delete(r.id);
      if (context.mounted) showSuccessSnackBar(context, 'Reservation deleted');
    } catch (e) {
      if (context.mounted) showErrorSnackBar(context, e.toString());
    }
  }
}

class _ReservationTile extends StatelessWidget {
  final Reservation reservation;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  const _ReservationTile(
      {required this.reservation, required this.onEdit, required this.onDelete});

  void _showActions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.edit),
              title: const Text('Edit'),
              onTap: () { Navigator.pop(context); onEdit(); },
            ),
            ListTile(
              leading: const Icon(Icons.delete, color: Colors.red),
              title: const Text('Delete', style: TextStyle(color: Colors.red)),
              onTap: () { Navigator.pop(context); onDelete(); },
            ),
          ],
        ),
      ),
    );
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'confirmed':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'checked_in':
        return Colors.blue;
      case 'checked_out':
        return Colors.grey;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _fmtDate(DateTime? d) =>
      d == null ? '—' : DateFormat('MMM dd').format(d);

  @override
  Widget build(BuildContext context) {
    final guestName = reservation.guest != null
        ? reservation.guest!.fullName
        : 'Guest #${reservation.guestId}';
    final roomLabel = reservation.room != null
        ? 'Room ${reservation.room!.roomNumber}'
        : 'Room #${reservation.roomId}';
    return Semantics(
      label: '$guestName, $roomLabel, ${reservation.status}',
      child: Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: _statusColor(reservation.status).withValues(alpha: 0.15),
            child: Icon(Icons.calendar_today,
                color: _statusColor(reservation.status)),
          ),
          title: Text(guestName),
          subtitle: Text(
              '$roomLabel  |  ${_fmtDate(reservation.checkIn)} → ${_fmtDate(reservation.checkOut)}'),
          trailing: Chip(
            label: Text(reservation.status.replaceAll('_', ' '),
                style: const TextStyle(fontSize: 10)),
          ),
          onTap: () => context.push('/reservations/detail', extra: reservation),
          onLongPress: () => _showActions(context),
        ),
      ),
    );
  }
}

class _ReservationFormSheet extends StatefulWidget {
  final Reservation? reservation;
  const _ReservationFormSheet({this.reservation});
  @override
  State<_ReservationFormSheet> createState() => _ReservationFormSheetState();
}

class _ReservationFormSheetState extends State<_ReservationFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _guestIdCtrl;
  late final TextEditingController _roomIdCtrl;
  late final TextEditingController _adultsCtrl;
  late final TextEditingController _childrenCtrl;
  late final TextEditingController _notesCtrl;
  late String _status;
  DateTime _checkIn = DateTime.now();
  DateTime _checkOut = DateTime.now().add(const Duration(days: 1));

  @override
  void initState() {
    super.initState();
    final r = widget.reservation;
    _guestIdCtrl = TextEditingController(text: r?.guestId.toString() ?? '');
    _roomIdCtrl = TextEditingController(text: r?.roomId.toString() ?? '');
    _adultsCtrl = TextEditingController(text: (r?.adults ?? 1).toString());
    _childrenCtrl = TextEditingController(text: (r?.children ?? 0).toString());
    _notesCtrl = TextEditingController(text: r?.specialRequests ?? '');
    _status = r?.status ?? Reservation.statuses.first;
    if (r?.checkIn != null) _checkIn = r!.checkIn!;
    if (r?.checkOut != null) _checkOut = r!.checkOut!;
  }

  Future<void> _pickDate(bool isCheckIn) async {
    final d = await showDatePicker(
      context: context,
      initialDate: isCheckIn ? _checkIn : _checkOut,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (d != null) setState(() => isCheckIn ? _checkIn = d : _checkOut = d);
  }

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('yyyy-MM-dd');
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
              Text(
                  widget.reservation != null
                      ? 'Edit Reservation'
                      : 'New Reservation',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(
                  child: TextFormField(
                    controller: _guestIdCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Guest ID', border: OutlineInputBorder()),
                    keyboardType: TextInputType.number,
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Required' : null,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _roomIdCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Room ID', border: OutlineInputBorder()),
                    keyboardType: TextInputType.number,
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Required' : null,
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.calendar_today, size: 16),
                    label: Text('In: ${fmt.format(_checkIn)}'),
                    onPressed: () => _pickDate(true),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.calendar_today, size: 16),
                    label: Text('Out: ${fmt.format(_checkOut)}'),
                    onPressed: () => _pickDate(false),
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: TextFormField(
                    controller: _adultsCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Adults', border: OutlineInputBorder()),
                    keyboardType: TextInputType.number,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _childrenCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Children', border: OutlineInputBorder()),
                    keyboardType: TextInputType.number,
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _status,
                decoration: const InputDecoration(
                    labelText: 'Status', border: OutlineInputBorder()),
                items: Reservation.statuses
                    .map(
                        (s) => DropdownMenuItem(value: s, child: Text(s)))
                    .toList(),
                onChanged: (v) => setState(() => _status = v!),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _notesCtrl,
                decoration: const InputDecoration(
                    labelText: 'Special Requests',
                    border: OutlineInputBorder()),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  if (!_formKey.currentState!.validate()) return;
                  Navigator.pop(context, {
                    'guestId': int.tryParse(_guestIdCtrl.text) ?? 0,
                    'roomId': int.tryParse(_roomIdCtrl.text) ?? 0,
                    'checkIn': fmt.format(_checkIn),
                    'checkOut': fmt.format(_checkOut),
                    'adults': int.tryParse(_adultsCtrl.text) ?? 1,
                    'children': int.tryParse(_childrenCtrl.text) ?? 0,
                    'status': _status,
                    'specialRequests': _notesCtrl.text.trim(),
                  });
                },
                child: Text(
                    widget.reservation != null ? 'Update' : 'Create'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _guestIdCtrl.dispose();
    _roomIdCtrl.dispose();
    _adultsCtrl.dispose();
    _childrenCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }
}
