import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../providers/currency_provider.dart';
import '../services/api_repository.dart';
import '../widgets/common.dart';

class InvoicesScreen extends ConsumerStatefulWidget {
  const InvoicesScreen({super.key});

  @override
  ConsumerState<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends ConsumerState<InvoicesScreen> {
  String _searchQuery = '';
  String? _statusFilter;

  Color _statusColor(String status) {
    switch (status) {
      case 'paid':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'overdue':
        return Colors.red;
      case 'cancelled':
        return Colors.grey;
      case 'refunded':
        return Colors.purple;
      default:
        return Colors.blue;
    }
  }

  List<Invoice> _filtered(List<Invoice> items) {
    var list = items;
    if (_statusFilter != null) {
      list = list.where((i) => i.status == _statusFilter).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((i) {
        final guestName = i.guest?.fullName.toLowerCase() ?? '';
        final invNumber = i.invoiceNumber.toLowerCase();
        final id = i.id.toString();
        return guestName.contains(q) ||
            invNumber.contains(q) ||
            id.contains(q) ||
            i.status.toLowerCase().contains(q);
      }).toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(invoicesProvider);
    final filtered = _filtered(state.items);

    return Scaffold(
      appBar: AppBar(
        title: Semantics(header: true, child: const Text('Invoices')),
        actions: [
          PopupMenuButton<String?>(
            icon: Icon(
              Icons.filter_list,
              color: _statusFilter != null
                  ? Theme.of(context).colorScheme.primary
                  : null,
            ),
            tooltip: 'Filter by status',
            onSelected: (v) => setState(() => _statusFilter = v),
            itemBuilder: (_) => [
              const PopupMenuItem(value: null, child: Text('All')),
              ...Invoice.statuses.map((s) => PopupMenuItem(
                    value: s,
                    child: Text(s[0].toUpperCase() + s.substring(1)),
                  )),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showForm(context, ref),
        tooltip: 'New invoice',
        child: const Icon(Icons.add),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? ErrorStateWidget(
                  message: state.error!,
                  onRetry: () =>
                      ref.read(invoicesProvider.notifier).fetch(),
                )
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'Search invoices…',
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
                    if (_statusFilter != null)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                        child: Chip(
                          label: Text(
                              'Status: ${_statusFilter![0].toUpperCase()}${_statusFilter!.substring(1)}'),
                          onDeleted: () =>
                              setState(() => _statusFilter = null),
                        ),
                      ),
                    Expanded(
                      child: filtered.isEmpty
                          ? EmptyStateWidget(
                              message: 'No invoices found',
                              icon: Icons.receipt_outlined,
                              actionLabel: 'New Invoice',
                              onAction: () => _showForm(context, ref),
                            )
                          : RefreshIndicator(
                              onRefresh: () =>
                                  ref.read(invoicesProvider.notifier).fetch(),
                              child: ListView.builder(
                                padding: const EdgeInsets.all(12),
                                itemCount: filtered.length,
                                itemBuilder: (context, index) {
                                  final inv = filtered[index];
                                  return _InvoiceTile(
                                    invoice: inv,
                                    statusColor: _statusColor(inv.status),
                                    onTap: () =>
                                        _showDetail(context, ref, inv),
                                    onDelete: () =>
                                        _delete(context, ref, inv),
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
      {Invoice? inv}) async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _InvoiceFormSheet(invoice: inv),
    );
    if (result == null) return;
    try {
      if (inv != null) {
        await ref.read(invoicesProvider.notifier).update(inv.id, result);
        if (context.mounted) showSuccessSnackBar(context, 'Invoice updated');
      } else {
        await ref.read(invoicesProvider.notifier).create(result);
        if (context.mounted) showSuccessSnackBar(context, 'Invoice created');
      }
    } catch (e) {
      if (context.mounted) showErrorSnackBar(context, e.toString());
    }
  }

  void _showDetail(BuildContext context, WidgetRef ref, Invoice inv) {
    context.push('/invoices/detail', extra: inv);
  }

  Future<void> _delete(
      BuildContext context, WidgetRef ref, Invoice inv) async {
    final ok = await showConfirmDialog(context,
        title: 'Delete Invoice',
        message: 'Delete invoice ${inv.invoiceNumber}?');
    if (!ok) return;
    try {
      await ref.read(invoicesProvider.notifier).delete(inv.id);
      if (context.mounted) showSuccessSnackBar(context, 'Invoice deleted');
    } catch (e) {
      if (context.mounted) showErrorSnackBar(context, e.toString());
    }
  }
}

// ── Tile ──────────────────────────────────────────────────────────
class _InvoiceTile extends ConsumerWidget {
  final Invoice invoice;
  final Color statusColor;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _InvoiceTile({
    required this.invoice,
    required this.statusColor,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currency = ref.watch(currencyProvider).currency;
    final guestName =
        invoice.guest != null ? invoice.guest!.fullName : 'Guest #${invoice.guestId}';
    return Semantics(
      label:
          'Invoice ${invoice.invoiceNumber}, $guestName, ${formatCurrency(invoice.total, currency)}, ${invoice.status}',
      child: Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: statusColor.withValues(alpha: 0.15),
            child: Icon(Icons.receipt, color: statusColor),
          ),
          title: Text(invoice.invoiceNumber),
          subtitle: Text(guestName),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(formatCurrency(invoice.total, currency),
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(height: 2),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(invoice.status,
                    style: TextStyle(
                        fontSize: 10,
                        color: statusColor,
                        fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          onTap: onTap,
          onLongPress: onDelete,
        ),
      ),
    );
  }
}

// ── Form Sheet ────────────────────────────────────────────────────
class _InvoiceLineItem {
  final TextEditingController descCtrl;
  final TextEditingController qtyCtrl;
  final TextEditingController priceCtrl;

  _InvoiceLineItem({String desc = '', int qty = 1, double price = 0})
      : descCtrl = TextEditingController(text: desc),
        qtyCtrl = TextEditingController(text: qty.toString()),
        priceCtrl = TextEditingController(text: price > 0 ? price.toString() : '');

  double get total =>
      (int.tryParse(qtyCtrl.text) ?? 0) *
      (double.tryParse(priceCtrl.text) ?? 0);

  Map<String, dynamic> toJson() => {
        'description': descCtrl.text.trim(),
        'quantity': int.tryParse(qtyCtrl.text) ?? 1,
        'unitPrice': double.tryParse(priceCtrl.text) ?? 0,
        'total': total,
      };

  void dispose() {
    descCtrl.dispose();
    qtyCtrl.dispose();
    priceCtrl.dispose();
  }
}

class _InvoiceFormSheet extends ConsumerStatefulWidget {
  final Invoice? invoice;
  const _InvoiceFormSheet({this.invoice});
  @override
  ConsumerState<_InvoiceFormSheet> createState() => _InvoiceFormSheetState();
}

class _InvoiceFormSheetState extends ConsumerState<_InvoiceFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _notesCtrl;
  late String _status;
  late String? _paymentMethod;
  DateTime? _dueDate;

  // Guest/Reservation dropdowns
  List<Guest> _guests = [];
  List<Reservation> _reservations = [];
  int? _selectedGuestId;
  int? _selectedReservationId;
  bool _loadingData = true;

  // Line items
  final List<_InvoiceLineItem> _items = [];

  static const double _taxRate = 0.10;

  @override
  void initState() {
    super.initState();
    final inv = widget.invoice;
    _notesCtrl = TextEditingController(text: inv?.notes ?? '');
    _status = inv?.status ?? Invoice.statuses.first;
    _paymentMethod = inv?.paymentMethod;
    _dueDate = inv?.dueDate;
    _selectedGuestId = inv?.guestId;
    _selectedReservationId = inv?.reservationId;

    // Pre-populate line items from existing invoice
    if (inv != null && inv.items.isNotEmpty) {
      for (final item in inv.items) {
        _items.add(_InvoiceLineItem(
          desc: item.description,
          qty: item.quantity,
          price: item.unitPrice,
        ));
      }
    }

    _loadFormData();
  }

  Future<void> _loadFormData() async {
    try {
      final results = await Future.wait([
        ApiRepository.getGuests(),
        ApiRepository.getReservations(),
      ]);
      setState(() {
        _guests = results[0] as List<Guest>;
        _reservations = results[1] as List<Reservation>;
        _loadingData = false;
      });
    } catch (_) {
      setState(() => _loadingData = false);
    }
  }

  double get _subtotal => _items.fold(0.0, (sum, item) => sum + item.total);
  double get _tax => _subtotal * _taxRate;
  double get _total => _subtotal + _tax;

  void _addLineItem() {
    setState(() => _items.add(_InvoiceLineItem()));
  }

  void _removeLineItem(int index) {
    _items[index].dispose();
    setState(() => _items.removeAt(index));
  }

  Future<void> _pickDueDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date != null) setState(() => _dueDate = date);
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
              Text(
                  widget.invoice != null ? 'Edit Invoice' : 'New Invoice',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),

              // Guest & Reservation dropdowns
              if (_loadingData)
                const Center(child: LinearProgressIndicator())
              else ...[
                DropdownButtonFormField<int?>(
                  value: _selectedGuestId,
                  decoration: const InputDecoration(
                      labelText: 'Guest', border: OutlineInputBorder(), isDense: true),
                  items: [
                    const DropdownMenuItem<int?>(value: null, child: Text('Select guest')),
                    ..._guests.map((g) => DropdownMenuItem<int?>(
                        value: g.id, child: Text(g.fullName))),
                  ],
                  validator: (v) => v == null ? 'Required' : null,
                  onChanged: (v) => setState(() => _selectedGuestId = v),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<int?>(
                  value: _selectedReservationId,
                  decoration: const InputDecoration(
                      labelText: 'Reservation (optional)',
                      border: OutlineInputBorder(), isDense: true),
                  items: [
                    const DropdownMenuItem<int?>(value: null, child: Text('None')),
                    ..._reservations.map((r) => DropdownMenuItem<int?>(
                        value: r.id,
                        child: Text('${r.guest?.fullName ?? "Res"} #${r.id}'))),
                  ],
                  onChanged: (v) => setState(() => _selectedReservationId = v),
                ),
              ],
              const SizedBox(height: 12),

              // Status & Payment
              Row(children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _status,
                    decoration: const InputDecoration(
                        labelText: 'Status', border: OutlineInputBorder(), isDense: true),
                    items: Invoice.statuses
                        .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                        .toList(),
                    onChanged: (v) => setState(() => _status = v!),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String?>(
                    value: _paymentMethod,
                    decoration: const InputDecoration(
                        labelText: 'Payment', border: OutlineInputBorder(), isDense: true),
                    items: [
                      const DropdownMenuItem<String?>(
                          value: null, child: Text('None')),
                      ...Invoice.paymentMethods.map((m) =>
                          DropdownMenuItem<String?>(value: m, child: Text(m))),
                    ],
                    onChanged: (v) => setState(() => _paymentMethod = v),
                  ),
                ),
              ]),
              const SizedBox(height: 12),

              // Due date
              InkWell(
                onTap: _pickDueDate,
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Due Date',
                    border: OutlineInputBorder(),
                    isDense: true,
                    suffixIcon: Icon(Icons.calendar_today),
                  ),
                  child: Text(_dueDate != null
                      ? DateFormat('MMM dd, yyyy').format(_dueDate!)
                      : 'Tap to select'),
                ),
              ),
              const SizedBox(height: 16),

              // ── Line Items ──
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Line Items',
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(fontWeight: FontWeight.bold)),
                  TextButton.icon(
                    onPressed: _addLineItem,
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Add Item'),
                  ),
                ],
              ),
              if (_items.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Center(
                      child: Text('No items. Tap "Add Item" to add.',
                          style: TextStyle(color: Colors.grey))),
                )
              else
                ..._items.asMap().entries.map((e) {
                  final idx = e.key;
                  final item = e.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: TextFormField(
                            controller: item.descCtrl,
                            decoration: const InputDecoration(
                                hintText: 'Description',
                                border: OutlineInputBorder(),
                                isDense: true),
                            validator: (v) =>
                                v == null || v.isEmpty ? '' : null,
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                        const SizedBox(width: 6),
                        SizedBox(
                          width: 50,
                          child: TextFormField(
                            controller: item.qtyCtrl,
                            decoration: const InputDecoration(
                                hintText: 'Qty',
                                border: OutlineInputBorder(),
                                isDense: true),
                            keyboardType: TextInputType.number,
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                        const SizedBox(width: 6),
                        SizedBox(
                          width: 70,
                          child: TextFormField(
                            controller: item.priceCtrl,
                            decoration: InputDecoration(
                                hintText: 'Price',
                                border: const OutlineInputBorder(),
                                isDense: true,
                                prefixText: '${ref.watch(currencyProvider).currency} '),
                            keyboardType:
                                const TextInputType.numberWithOptions(
                                    decimal: true),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(formatCurrency(item.total, ref.watch(currencyProvider).currency),
                            style: const TextStyle(
                                fontWeight: FontWeight.w500, fontSize: 12)),
                        IconButton(
                          icon: const Icon(Icons.close,
                              size: 18, color: Colors.red),
                          onPressed: () => _removeLineItem(idx),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                  );
                }),

              // Summary
              if (_items.isNotEmpty) ...[
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Subtotal'),
                    Text(formatCurrency(_subtotal, ref.watch(currencyProvider).currency)),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Tax (10%)'),
                    Text(formatCurrency(_tax, ref.watch(currencyProvider).currency)),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Total',
                        style: Theme.of(context)
                            .textTheme
                            .titleSmall
                            ?.copyWith(fontWeight: FontWeight.bold)),
                    Text(formatCurrency(_total, ref.watch(currencyProvider).currency),
                        style: Theme.of(context)
                            .textTheme
                            .titleSmall
                            ?.copyWith(fontWeight: FontWeight.bold)),
                  ],
                ),
              ],

              const SizedBox(height: 12),
              TextFormField(
                controller: _notesCtrl,
                decoration: const InputDecoration(
                    labelText: 'Notes', border: OutlineInputBorder(), isDense: true),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  if (!_formKey.currentState!.validate()) return;
                  if (_items.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                        content: Text('Add at least one line item')));
                    return;
                  }
                  final data = <String, dynamic>{
                    'guestId': _selectedGuestId,
                    'status': _status,
                    'notes': _notesCtrl.text.trim(),
                    'items': _items.map((i) => i.toJson()).toList(),
                  };
                  if (_selectedReservationId != null) {
                    data['reservationId'] = _selectedReservationId;
                  }
                  if (_paymentMethod != null) {
                    data['paymentMethod'] = _paymentMethod;
                  }
                  if (_dueDate != null) {
                    data['dueDate'] = _dueDate!.toIso8601String();
                  }
                  Navigator.pop(context, data);
                },
                child: Text(
                    widget.invoice != null ? 'Update' : 'Create'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    for (final item in _items) {
      item.dispose();
    }
    super.dispose();
  }
}
