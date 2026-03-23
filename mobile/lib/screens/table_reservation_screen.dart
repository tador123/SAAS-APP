import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../services/table_reservation_service.dart';

class TableReservationScreen extends StatefulWidget {
  final Map<String, dynamic> table;
  final Map<String, dynamic> property;
  final List<dynamic> menuCategories;
  const TableReservationScreen({
    super.key,
    required this.table,
    required this.property,
    required this.menuCategories,
  });

  @override
  State<TableReservationScreen> createState() => _TableReservationScreenState();
}

class _TableReservationScreenState extends State<TableReservationScreen> {
  DateTime _date = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _time = const TimeOfDay(hour: 19, minute: 0);
  int _partySize = 2;
  final _requestsController = TextEditingController();
  bool _loading = false;
  bool _showMenu = false;

  // Pre-order: menuItemId -> quantity
  final Map<int, int> _preOrderQuantities = {};

  int get _maxParty => widget.table['capacity'] as int? ?? 4;

  String get _currency => widget.property['currency']?.toString() ?? 'USD';

  double get _preOrderTotal {
    double total = 0;
    for (final cat in widget.menuCategories) {
      final items = cat['items'] as List<dynamic>? ?? [];
      for (final item in items) {
        final id = item['id'] as int;
        final qty = _preOrderQuantities[id] ?? 0;
        if (qty > 0) {
          total += (double.tryParse(item['price'].toString()) ?? 0) * qty;
        }
      }
    }
    return total;
  }

  List<Map<String, dynamic>> get _preOrderItems {
    final items = <Map<String, dynamic>>[];
    for (final cat in widget.menuCategories) {
      for (final item in (cat['items'] as List<dynamic>? ?? [])) {
        final id = item['id'] as int;
        final qty = _preOrderQuantities[id] ?? 0;
        if (qty > 0) {
          items.add({'menuItemId': id, 'quantity': qty});
        }
      }
    }
    return items;
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _time,
    );
    if (picked != null) setState(() => _time = picked);
  }

  Future<void> _reserve() async {
    setState(() => _loading = true);
    try {
      await TableReservationService.createReservation(
        tableId: widget.table['id'] as int,
        propertyId: widget.property['id'] as int,
        reservationDate: _date.toIso8601String().split('T')[0],
        reservationTime: '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}',
        partySize: _partySize,
        specialRequests: _requestsController.text.isNotEmpty ? _requestsController.text : null,
        preOrderItems: _preOrderItems.isNotEmpty ? _preOrderItems : null,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Table reserved successfully!'), backgroundColor: Colors.green),
        );
        context.pop(true);
      }
    } on DioException catch (e) {
      final msg = e.response?.data is Map ? (e.response!.data as Map)['error'] ?? 'Reservation failed' : 'Reservation failed';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg.toString()), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _requestsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final table = widget.table;

    return Scaffold(
      appBar: AppBar(title: Text('Reserve Table ${table['tableNumber']}')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Table info card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: theme.colorScheme.primaryContainer,
                    child: Icon(Icons.table_restaurant, size: 28, color: theme.colorScheme.onPrimaryContainer),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Table ${table['tableNumber']}', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text('${table['capacity']} seats  •  ${table['location'] ?? 'Indoor'}',
                            style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Date & Time
          Text('Date & Time', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _DateTimeTile(
                  icon: Icons.calendar_today,
                  label: 'Date',
                  value: '${_date.day}/${_date.month}/${_date.year}',
                  onTap: _pickDate,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _DateTimeTile(
                  icon: Icons.access_time,
                  label: 'Time',
                  value: _time.format(context),
                  onTap: _pickTime,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Party size
          Text('Party Size', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Row(
            children: [
              IconButton.filled(
                onPressed: _partySize > 1 ? () => setState(() => _partySize--) : null,
                icon: const Icon(Icons.remove),
                iconSize: 20,
                constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text('$_partySize', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
              ),
              IconButton.filled(
                onPressed: _partySize < _maxParty ? () => setState(() => _partySize++) : null,
                icon: const Icon(Icons.add),
                iconSize: 20,
                constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
              ),
              const SizedBox(width: 12),
              Text('of $_maxParty max', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
            ],
          ),
          const SizedBox(height: 20),

          // Special requests
          Text('Special Requests', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          TextField(
            controller: _requestsController,
            maxLines: 2,
            decoration: const InputDecoration(
              hintText: 'Birthday celebration, high chair needed, etc.',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),

          // Pre-order toggle
          Card(
            child: ListTile(
              leading: Icon(Icons.restaurant_menu, color: theme.colorScheme.primary),
              title: const Text('Pre-order from Menu'),
              subtitle: Text(_showMenu
                  ? '${_preOrderItems.length} items  •  $_currency ${_preOrderTotal.toStringAsFixed(2)}'
                  : 'Optional — order food in advance'),
              trailing: Switch(
                value: _showMenu,
                onChanged: (v) => setState(() => _showMenu = v),
              ),
            ),
          ),

          // Menu pre-order section
          if (_showMenu) ...[
            const SizedBox(height: 12),
            ...widget.menuCategories.map((cat) => _buildMenuCategory(theme, cat as Map<String, dynamic>)),
          ],

          const SizedBox(height: 24),

          // Summary & reserve button
          if (_preOrderTotal > 0)
            Card(
              color: theme.colorScheme.primaryContainer,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Pre-order Total', style: theme.textTheme.titleSmall),
                    Text('$_currency ${_preOrderTotal.toStringAsFixed(2)}',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 16),

          FilledButton.icon(
            onPressed: _loading ? null : _reserve,
            icon: _loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.check),
            label: Text(_loading ? 'Reserving...' : 'Reserve Table'),
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuCategory(ThemeData theme, Map<String, dynamic> cat) {
    final items = cat['items'] as List<dynamic>? ?? [];
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Text(cat['name']?.toString() ?? '', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
        ),
        ...items.map((item) {
          final m = item as Map<String, dynamic>;
          final id = m['id'] as int;
          final qty = _preOrderQuantities[id] ?? 0;
          final price = double.tryParse(m['price'].toString()) ?? 0;

          return Card(
            margin: const EdgeInsets.only(bottom: 6),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  // Veg indicator
                  if (m['isVegetarian'] == true)
                    Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(border: Border.all(color: Colors.green), borderRadius: BorderRadius.circular(3)),
                      child: const Icon(Icons.circle, size: 8, color: Colors.green),
                    ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(m['name']?.toString() ?? '', style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500)),
                        Text('$_currency ${price.toStringAsFixed(2)}',
                            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.primary)),
                      ],
                    ),
                  ),
                  // Quantity controls
                  if (qty > 0)
                    IconButton(
                      onPressed: () => setState(() {
                        if (qty <= 1) {
                          _preOrderQuantities.remove(id);
                        } else {
                          _preOrderQuantities[id] = qty - 1;
                        }
                      }),
                      icon: const Icon(Icons.remove_circle_outline),
                      iconSize: 22,
                      constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                    ),
                  if (qty > 0)
                    Text('$qty', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                  IconButton(
                    onPressed: () => setState(() => _preOrderQuantities[id] = qty + 1),
                    icon: Icon(qty > 0 ? Icons.add_circle_outline : Icons.add_circle, color: theme.colorScheme.primary),
                    iconSize: 22,
                    constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                  ),
                ],
              ),
            ),
          );
        }),
        const SizedBox(height: 8),
      ],
    );
  }
}

class _DateTimeTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;
  const _DateTimeTile({required this.icon, required this.label, required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.3)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: theme.colorScheme.primary),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                Text(value, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
