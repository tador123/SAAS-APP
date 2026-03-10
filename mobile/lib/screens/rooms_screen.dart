import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/room.dart';
import '../providers/providers.dart';
import '../widgets/common.dart';

class RoomsScreen extends ConsumerStatefulWidget {
  const RoomsScreen({super.key});
  @override
  ConsumerState<RoomsScreen> createState() => _RoomsScreenState();
}

class _RoomsScreenState extends ConsumerState<RoomsScreen> {
  String _searchQuery = '';
  String? _statusFilter;

  List<Room> _filteredRooms(List<Room> rooms) {
    var list = rooms;
    if (_statusFilter != null) {
      list = list.where((r) => r.status == _statusFilter).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list
          .where((r) =>
              r.roomNumber.toLowerCase().contains(q) ||
              r.type.toLowerCase().contains(q) ||
              r.status.toLowerCase().contains(q))
          .toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(roomsProvider);
    final filtered = _filteredRooms(state.items);

    return Scaffold(
      appBar: AppBar(
        title: Semantics(header: true, child: const Text('Rooms')),
        actions: [
          PopupMenuButton<String?>(
            icon: const Icon(Icons.filter_list),
            tooltip: 'Filter by status',
            onSelected: (v) => setState(() => _statusFilter = v),
            itemBuilder: (_) => [
              const PopupMenuItem(value: null, child: Text('All')),
              ...Room.statuses.map(
                  (s) => PopupMenuItem(value: s, child: Text(s))),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showRoomForm(context, ref),
        tooltip: 'Add room',
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search rooms...',
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
                            ref.read(roomsProvider.notifier).fetch(),
                      )
                    : filtered.isEmpty
                        ? EmptyStateWidget(
                            message: 'No rooms found',
                            icon: Icons.bed_outlined,
                            actionLabel: 'Add Room',
                            onAction: () => _showRoomForm(context, ref),
                          )
                        : RefreshIndicator(
                            onRefresh: () =>
                                ref.read(roomsProvider.notifier).fetch(),
                            child: GridView.builder(
                              padding: const EdgeInsets.all(12),
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                mainAxisSpacing: 8,
                                crossAxisSpacing: 8,
                                childAspectRatio: 1.2,
                              ),
                              itemCount: filtered.length,
                              itemBuilder: (context, index) {
                                final room = filtered[index];
                                return _RoomCard(
                                  room: room,
                                  onEdit: () => _showRoomForm(context,
                                      ref, room: room),
                                  onDelete: () =>
                                      _deleteRoom(context, ref, room),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Future<void> _showRoomForm(BuildContext context, WidgetRef ref,
      {Room? room}) async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _RoomFormSheet(room: room),
    );
    if (result == null) return;
    try {
      if (room != null) {
        await ref.read(roomsProvider.notifier).update(room.id, result);
        if (context.mounted) showSuccessSnackBar(context, 'Room updated');
      } else {
        await ref.read(roomsProvider.notifier).create(result);
        if (context.mounted) showSuccessSnackBar(context, 'Room created');
      }
    } catch (e) {
      if (context.mounted) showErrorSnackBar(context, e.toString());
    }
  }

  Future<void> _deleteRoom(BuildContext context, WidgetRef ref, Room room) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Delete Room',
      message: 'Delete room ${room.roomNumber}?',
    );
    if (!confirmed) return;
    try {
      await ref.read(roomsProvider.notifier).delete(room.id);
      if (context.mounted) showSuccessSnackBar(context, 'Room deleted');
    } catch (e) {
      if (context.mounted) showErrorSnackBar(context, e.toString());
    }
  }
}

class _RoomCard extends StatelessWidget {
  final Room room;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _RoomCard({required this.room, required this.onEdit, required this.onDelete});

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

  Color _statusColor(String status) {
    switch (status) {
      case 'available': return Colors.green;
      case 'occupied': return Colors.red;
      case 'reserved': return Colors.orange;
      case 'maintenance': return Colors.grey;
      default: return Colors.blue;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Room ${room.roomNumber}, ${room.type}, ${room.status}, \$${room.price} per night',
      child: Card(
        child: InkWell(
          onTap: () => context.push('/rooms/detail', extra: room),
          onLongPress: () => _showActions(context),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text('Room ${room.roomNumber}',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: _statusColor(room.status).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(room.status,
                          style: TextStyle(
                              fontSize: 10,
                              color: _statusColor(room.status),
                              fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(room.type.toUpperCase(),
                        style:
                            const TextStyle(fontSize: 12, color: Colors.grey)),
                    Text('\$${room.price}/night',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                            color: Color(0xFF2563EB))),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RoomFormSheet extends StatefulWidget {
  final Room? room;
  const _RoomFormSheet({this.room});

  @override
  State<_RoomFormSheet> createState() => _RoomFormSheetState();
}

class _RoomFormSheetState extends State<_RoomFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _numberCtrl;
  late final TextEditingController _floorCtrl;
  late final TextEditingController _priceCtrl;
  late final TextEditingController _descCtrl;
  late String _type;
  late String _status;

  @override
  void initState() {
    super.initState();
    _numberCtrl = TextEditingController(text: widget.room?.roomNumber ?? '');
    _floorCtrl = TextEditingController(text: widget.room?.floor.toString() ?? '1');
    _priceCtrl = TextEditingController(text: widget.room?.price.toString() ?? '');
    _descCtrl = TextEditingController(text: widget.room?.description ?? '');
    _type = widget.room?.type ?? Room.types.first;
    _status = widget.room?.status ?? Room.statuses.first;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16, right: 16, top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(widget.room != null ? 'Edit Room' : 'New Room',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              TextFormField(
                controller: _numberCtrl,
                decoration: const InputDecoration(labelText: 'Room Number', border: OutlineInputBorder()),
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _type,
                decoration: const InputDecoration(labelText: 'Type', border: OutlineInputBorder()),
                items: Room.types.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                onChanged: (v) => setState(() => _type = v!),
              ),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: TextFormField(
                    controller: _floorCtrl,
                    decoration: const InputDecoration(labelText: 'Floor', border: OutlineInputBorder()),
                    keyboardType: TextInputType.number,
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _priceCtrl,
                    decoration: const InputDecoration(labelText: 'Price/Night', border: OutlineInputBorder(), prefixText: '\$ '),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _status,
                decoration: const InputDecoration(labelText: 'Status', border: OutlineInputBorder()),
                items: Room.statuses.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                onChanged: (v) => setState(() => _status = v!),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _descCtrl,
                decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  if (!_formKey.currentState!.validate()) return;
                  Navigator.pop(context, {
                    'roomNumber': _numberCtrl.text.trim(),
                    'type': _type,
                    'floor': int.tryParse(_floorCtrl.text) ?? 1,
                    'price': double.tryParse(_priceCtrl.text) ?? 0,
                    'status': _status,
                    'description': _descCtrl.text.trim(),
                  });
                },
                child: Text(widget.room != null ? 'Update' : 'Create'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _numberCtrl.dispose();
    _floorCtrl.dispose();
    _priceCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }
}
