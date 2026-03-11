import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../services/api_repository.dart';
import '../widgets/common.dart';
import '../providers/currency_provider.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});
  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  String _searchQuery = '';
  String? _statusFilter;

  Color _statusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'preparing':
        return Colors.blue;
      case 'ready':
        return Colors.green;
      case 'served':
        return Colors.teal;
      case 'completed':
        return Colors.grey;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  List<Order> get _filteredOrders {
    final state = ref.read(ordersProvider);
    var list = state.items;
    if (_statusFilter != null) {
      list = list.where((o) => o.status == _statusFilter).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list
          .where((o) =>
              (o.orderNumber.toLowerCase().contains(q)) ||
              (o.table?.tableNumber.toString().contains(q) ?? false) ||
              (o.guest?.fullName.toLowerCase().contains(q) ?? false))
          .toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ordersProvider);

    return Scaffold(
      appBar: AppBar(
        title: Semantics(header: true, child: const Text('Orders')),
        actions: [
          PopupMenuButton<String?>(
            icon: const Icon(Icons.filter_list),
            tooltip: 'Filter by status',
            onSelected: (v) => setState(() => _statusFilter = v),
            itemBuilder: (_) => [
              const PopupMenuItem(value: null, child: Text('All')),
              ...Order.statuses
                  .map((s) => PopupMenuItem(value: s, child: Text(s))),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showOrderForm(context, ref),
        tooltip: 'New order',
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search orders...',
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
                            ref.read(ordersProvider.notifier).fetch(),
                      )
                    : _filteredOrders.isEmpty
                        ? EmptyStateWidget(
                            message: 'No orders found',
                            icon: Icons.receipt_long_outlined,
                            actionLabel: 'New Order',
                            onAction: () => _showOrderForm(context, ref),
                          )
                        : RefreshIndicator(
                            onRefresh: () =>
                                ref.read(ordersProvider.notifier).fetch(),
                            child: ListView.builder(
                              padding: const EdgeInsets.all(12),
                              itemCount: _filteredOrders.length,
                              itemBuilder: (context, index) {
                                final o = _filteredOrders[index];
                                return _OrderTile(
                                  order: o,
                                  statusColor: _statusColor(o.status),
                                  onEdit: () =>
                                      _showOrderForm(context, ref, order: o),
                                  onDelete: () =>
                                      _deleteOrder(context, ref, o),
                                  onStatusChange: (s) =>
                                      _changeStatus(context, ref, o, s),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Future<void> _showOrderForm(BuildContext context, WidgetRef ref,
      {Order? order}) async {
    final result = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _OrderFormPage(order: order),
      ),
    );
    if (result == null) return;
    try {
      if (order != null) {
        await ref.read(ordersProvider.notifier).update(order.id, result);
        if (context.mounted) showSuccessSnackBar(context, 'Order updated');
      } else {
        await ref.read(ordersProvider.notifier).create(result);
        if (context.mounted) showSuccessSnackBar(context, 'Order created');
      }
    } catch (e) {
      if (context.mounted) showErrorSnackBar(context, e.toString());
    }
  }

  Future<void> _changeStatus(
      BuildContext context, WidgetRef ref, Order o, String status) async {
    try {
      await ref
          .read(ordersProvider.notifier)
          .update(o.id, {'status': status});
      if (context.mounted) showSuccessSnackBar(context, 'Status → $status');
    } catch (e) {
      if (context.mounted) showErrorSnackBar(context, e.toString());
    }
  }

  Future<void> _deleteOrder(
      BuildContext context, WidgetRef ref, Order o) async {
    final ok = await showConfirmDialog(context,
        title: 'Delete Order',
        message: 'Delete order #${o.orderNumber}?');
    if (!ok) return;
    try {
      await ref.read(ordersProvider.notifier).delete(o.id);
      if (context.mounted) showSuccessSnackBar(context, 'Order deleted');
    } catch (e) {
      if (context.mounted) showErrorSnackBar(context, e.toString());
    }
  }
}

// ─── Order Tile ──────────────────────────────────────────────
class _OrderTile extends ConsumerWidget {
  final Order order;
  final Color statusColor;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final void Function(String) onStatusChange;

  const _OrderTile({
    required this.order,
    required this.statusColor,
    required this.onEdit,
    required this.onDelete,
    required this.onStatusChange,
  });

  void _showOrderActions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text('Change Status',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
            ...Order.statuses.map((s) => ListTile(
                  leading: Icon(Icons.circle,
                      size: 12,
                      color: s == order.status ? Colors.blue : Colors.grey),
                  title: Text(s),
                  selected: s == order.status,
                  onTap: () {
                    Navigator.pop(context);
                    if (s != order.status) onStatusChange(s);
                  },
                )),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.edit),
              title: const Text('Edit'),
              onTap: () {
                Navigator.pop(context);
                onEdit();
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete, color: Colors.red),
              title:
                  const Text('Delete', style: TextStyle(color: Colors.red)),
              onTap: () {
                Navigator.pop(context);
                onDelete();
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currency = ref.watch(currencyProvider).currency;
    return Semantics(
      label:
          'Order ${order.orderNumber}, ${order.items.length} items, ${formatCurrency(order.total, currency)}, ${order.status}',
      child: Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: statusColor,
            child: const Icon(Icons.receipt_long, color: Colors.white),
          ),
          title: Text('Order #${order.orderNumber}'),
          subtitle: Text(
              'Table ${order.table?.tableNumber ?? order.tableId ?? "?"} · ${order.items.length} items'),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(formatCurrency(order.total, currency),
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 2),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(order.status,
                    style: TextStyle(
                        fontSize: 10,
                        color: statusColor,
                        fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          onTap: () => context.push('/orders/detail', extra: order),
          onLongPress: () => _showOrderActions(context),
        ),
      ),
    );
  }
}

// ─── Cart Item (local state for the form) ───────────────────
class _CartItem {
  final MenuItem menuItem;
  int quantity;
  String? notes;

  _CartItem({required this.menuItem, this.quantity = 1, this.notes});

  double get lineTotal => menuItem.price * quantity;

  Map<String, dynamic> toJson() => {
        'menuItemId': menuItem.id,
        'name': menuItem.name,
        'price': menuItem.price,
        'quantity': quantity,
        'notes': notes,
      };
}

// ─── Full-Screen Order Form ─────────────────────────────────
class _OrderFormPage extends ConsumerStatefulWidget {
  final Order? order;
  const _OrderFormPage({this.order});
  @override
  ConsumerState<_OrderFormPage> createState() => _OrderFormPageState();
}

class _OrderFormPageState extends ConsumerState<_OrderFormPage> {
  final _formKey = GlobalKey<FormState>();
  late String _orderType;
  late String _status;
  late final TextEditingController _notesCtrl;

  // Data loaded from API
  List<MenuItem> _menuItems = [];
  List<MenuCategory> _categories = [];
  List<RestaurantTable> _tables = [];
  List<Guest> _guests = [];
  bool _loadingData = true;

  // Selected values
  int? _selectedTableId;
  int? _selectedGuestId;
  final List<_CartItem> _cart = [];

  // Menu filter
  String _menuSearch = '';
  int? _selectedCategoryId;

  static const double _taxRate = 0.10; // 10% tax

  @override
  void initState() {
    super.initState();
    final o = widget.order;
    _orderType = o?.orderType ?? Order.orderTypes.first;
    _status = o?.status ?? Order.statuses.first;
    _notesCtrl = TextEditingController(text: o?.notes ?? '');
    _selectedTableId = o?.tableId;
    _selectedGuestId = o?.guestId;
    _loadFormData();
  }

  Future<void> _loadFormData() async {
    try {
      final results = await Future.wait([
        ApiRepository.getMenuItems(),
        ApiRepository.getCategories(),
        ApiRepository.getTables(),
        ApiRepository.getGuests(),
      ]);
      setState(() {
        _menuItems = results[0] as List<MenuItem>;
        _categories = results[1] as List<MenuCategory>;
        _tables = results[2] as List<RestaurantTable>;
        _guests = results[3] as List<Guest>;
        _loadingData = false;
      });

      // Pre-populate cart from existing order items
      if (widget.order != null) {
        for (final item in widget.order!.items) {
          final match = _menuItems
              .where((m) => m.id == item.menuItemId)
              .toList();
          if (match.isNotEmpty) {
            _cart.add(_CartItem(
              menuItem: match.first,
              quantity: item.quantity,
              notes: item.notes,
            ));
          }
        }
        setState(() {});
      }
    } catch (e) {
      setState(() => _loadingData = false);
      if (mounted) showErrorSnackBar(context, 'Failed to load data: $e');
    }
  }

  double get _subtotal =>
      _cart.fold(0.0, (sum, item) => sum + item.lineTotal);
  double get _tax => _subtotal * _taxRate;
  double get _total => _subtotal + _tax;

  void _addToCart(MenuItem item) {
    final existing = _cart.where((c) => c.menuItem.id == item.id).toList();
    setState(() {
      if (existing.isNotEmpty) {
        existing.first.quantity++;
      } else {
        _cart.add(_CartItem(menuItem: item));
      }
    });
  }

  void _removeFromCart(int index) {
    setState(() => _cart.removeAt(index));
  }

  void _updateQuantity(int index, int delta) {
    setState(() {
      _cart[index].quantity += delta;
      if (_cart[index].quantity <= 0) _cart.removeAt(index);
    });
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    if (_cart.isEmpty) {
      showErrorSnackBar(context, 'Please add at least one item');
      return;
    }
    final data = <String, dynamic>{
      'orderType': _orderType,
      'status': _status,
      'notes': _notesCtrl.text.trim(),
      'items': _cart.map((c) => c.toJson()).toList(),
    };
    if (_selectedTableId != null) data['tableId'] = _selectedTableId;
    if (_selectedGuestId != null) data['guestId'] = _selectedGuestId;
    Navigator.pop(context, data);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.order != null ? 'Edit Order' : 'New Order'),
        actions: [
          TextButton.icon(
            onPressed: _cart.isEmpty ? null : _submit,
            icon: const Icon(Icons.check),
            label: Text(widget.order != null ? 'Update' : 'Create'),
          ),
        ],
      ),
      body: _loadingData
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: Column(
                children: [
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(12),
                      children: [
                        // ── Order Details Section ──
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Order Details',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(
                                            fontWeight: FontWeight.bold)),
                                const SizedBox(height: 12),
                                Row(children: [
                                  Expanded(
                                    child:
                                        DropdownButtonFormField<int?>(
                                      value: _selectedTableId,
                                      decoration: const InputDecoration(
                                          labelText: 'Table',
                                          border: OutlineInputBorder(),
                                          isDense: true),
                                      items: [
                                        const DropdownMenuItem<int?>(
                                            value: null,
                                            child: Text('No table')),
                                        ..._tables.map((t) =>
                                            DropdownMenuItem<int?>(
                                                value: t.id,
                                                child: Text(
                                                    'T${t.tableNumber} (${t.capacity}p)'))),
                                      ],
                                      onChanged: (v) => setState(
                                          () => _selectedTableId = v),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child:
                                        DropdownButtonFormField<int?>(
                                      value: _selectedGuestId,
                                      decoration: const InputDecoration(
                                          labelText: 'Guest',
                                          border: OutlineInputBorder(),
                                          isDense: true),
                                      items: [
                                        const DropdownMenuItem<int?>(
                                            value: null,
                                            child: Text('No guest')),
                                        ..._guests.map((g) =>
                                            DropdownMenuItem<int?>(
                                                value: g.id,
                                                child: Text(g.fullName))),
                                      ],
                                      onChanged: (v) => setState(
                                          () => _selectedGuestId = v),
                                    ),
                                  ),
                                ]),
                                const SizedBox(height: 12),
                                Row(children: [
                                  Expanded(
                                    child:
                                        DropdownButtonFormField<String>(
                                      value: _orderType,
                                      decoration: const InputDecoration(
                                          labelText: 'Type',
                                          border: OutlineInputBorder(),
                                          isDense: true),
                                      items: Order.orderTypes
                                          .map((t) => DropdownMenuItem(
                                              value: t, child: Text(t)))
                                          .toList(),
                                      onChanged: (v) => setState(
                                          () => _orderType = v!),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child:
                                        DropdownButtonFormField<String>(
                                      value: _status,
                                      decoration: const InputDecoration(
                                          labelText: 'Status',
                                          border: OutlineInputBorder(),
                                          isDense: true),
                                      items: Order.statuses
                                          .map((s) => DropdownMenuItem(
                                              value: s, child: Text(s)))
                                          .toList(),
                                      onChanged: (v) =>
                                          setState(() => _status = v!),
                                    ),
                                  ),
                                ]),
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: _notesCtrl,
                                  decoration: const InputDecoration(
                                      labelText: 'Notes',
                                      border: OutlineInputBorder(),
                                      isDense: true),
                                  maxLines: 2,
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // ── Cart Section ──
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('Order Items (${_cart.length})',
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(
                                                fontWeight:
                                                    FontWeight.bold)),
                                    TextButton.icon(
                                      onPressed: _showMenuPicker,
                                      icon: const Icon(Icons.add, size: 18),
                                      label: const Text('Add Item'),
                                    ),
                                  ],
                                ),
                                if (_cart.isEmpty)
                                  const Padding(
                                    padding:
                                        EdgeInsets.symmetric(vertical: 24),
                                    child: Center(
                                      child: Text(
                                          'Tap "Add Item" to select from menu',
                                          style: TextStyle(
                                              color: Colors.grey)),
                                    ),
                                  )
                                else
                                  ..._cart.asMap().entries.map((e) {
                                    final idx = e.key;
                                    final item = e.value;
                                    return Padding(
                                      padding: const EdgeInsets.only(
                                          bottom: 8),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment
                                                      .start,
                                              children: [
                                                Text(item.menuItem.name,
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight
                                                                .w500)),
                                                Text(
                                                    '${formatCurrency(item.menuItem.price, ref.watch(currencyProvider).currency)} each',
                                                    style: const TextStyle(
                                                        fontSize: 12,
                                                        color:
                                                            Colors.grey)),
                                              ],
                                            ),
                                          ),
                                          // Quantity controls
                                          IconButton(
                                            icon: const Icon(Icons.remove_circle_outline, size: 20),
                                            onPressed: () =>
                                                _updateQuantity(
                                                    idx, -1),
                                            padding: EdgeInsets.zero,
                                            constraints:
                                                const BoxConstraints(),
                                          ),
                                          Padding(
                                            padding:
                                                const EdgeInsets.symmetric(
                                                    horizontal: 8),
                                            child: Text(
                                                '${item.quantity}',
                                                style: const TextStyle(
                                                    fontWeight:
                                                        FontWeight.bold,
                                                    fontSize: 16)),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.add_circle_outline, size: 20),
                                            onPressed: () =>
                                                _updateQuantity(
                                                    idx, 1),
                                            padding: EdgeInsets.zero,
                                            constraints:
                                                const BoxConstraints(),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                              formatCurrency(item.lineTotal, ref.watch(currencyProvider).currency),
                                              style: const TextStyle(
                                                  fontWeight:
                                                      FontWeight.bold)),
                                          IconButton(
                                            icon: const Icon(Icons.close,
                                                size: 18,
                                                color: Colors.red),
                                            onPressed: () =>
                                                _removeFromCart(idx),
                                            padding: EdgeInsets.zero,
                                            constraints:
                                                const BoxConstraints(),
                                          ),
                                        ],
                                      ),
                                    );
                                  }),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // ── Summary Footer ──
                  if (_cart.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 8,
                            offset: const Offset(0, -2),
                          ),
                        ],
                      ),
                      child: SafeArea(
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment:
                                  MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Subtotal'),
                                Text(
                                    formatCurrency(_subtotal, ref.watch(currencyProvider).currency)),
                              ],
                            ),
                            Row(
                              mainAxisAlignment:
                                  MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Tax (10%)'),
                                Text(formatCurrency(_tax, ref.watch(currencyProvider).currency)),
                              ],
                            ),
                            const Divider(),
                            Row(
                              mainAxisAlignment:
                                  MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Total',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(
                                            fontWeight: FontWeight.bold)),
                                Text(
                                    formatCurrency(_total, ref.watch(currencyProvider).currency),
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color: Theme.of(context)
                                                .colorScheme
                                                .primary)),
                              ],
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton.icon(
                                onPressed: _submit,
                                icon: const Icon(Icons.check),
                                label: Text(widget.order != null
                                    ? 'Update Order'
                                    : 'Create Order'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  // ── Menu Item Picker Bottom Sheet ──
  void _showMenuPicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) {
          return StatefulBuilder(
            builder: (ctx, setSheetState) {
              var items = _menuItems.where((m) => m.isAvailable).toList();
              if (_selectedCategoryId != null) {
                items = items
                    .where((m) => m.categoryId == _selectedCategoryId)
                    .toList();
              }
              if (_menuSearch.isNotEmpty) {
                final q = _menuSearch.toLowerCase();
                items = items
                    .where((m) => m.name.toLowerCase().contains(q))
                    .toList();
              }

              return Column(
                children: [
                  // Header
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text('Select Menu Items',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(
                                      fontWeight: FontWeight.bold)),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                  ),
                  // Search
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12),
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'Search menu...',
                        prefixIcon: const Icon(Icons.search),
                        border: OutlineInputBorder(
                            borderRadius:
                                BorderRadius.circular(10)),
                        isDense: true,
                        contentPadding:
                            const EdgeInsets.symmetric(vertical: 10),
                      ),
                      onChanged: (v) {
                        setSheetState(() => _menuSearch = v);
                      },
                    ),
                  ),
                  // Category chips
                  if (_categories.isNotEmpty)
                    SizedBox(
                      height: 44,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        children: [
                          Padding(
                            padding:
                                const EdgeInsets.only(right: 6),
                            child: FilterChip(
                              label: const Text('All'),
                              selected:
                                  _selectedCategoryId == null,
                              onSelected: (_) => setSheetState(
                                  () => _selectedCategoryId =
                                      null),
                            ),
                          ),
                          ..._categories.map((c) => Padding(
                                padding: const EdgeInsets.only(
                                    right: 6),
                                child: FilterChip(
                                  label: Text(c.name),
                                  selected:
                                      _selectedCategoryId == c.id,
                                  onSelected: (_) =>
                                      setSheetState(() =>
                                          _selectedCategoryId =
                                              c.id),
                                ),
                              )),
                        ],
                      ),
                    ),
                  // Items list
                  Expanded(
                    child: items.isEmpty
                        ? const Center(
                            child: Text('No items found',
                                style:
                                    TextStyle(color: Colors.grey)))
                        : ListView.builder(
                            controller: scrollController,
                            padding: const EdgeInsets.all(12),
                            itemCount: items.length,
                            itemBuilder: (context, i) {
                              final item = items[i];
                              final inCart = _cart.any(
                                  (c) => c.menuItem.id == item.id);
                              return ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: inCart
                                      ? Colors.green.shade50
                                      : Colors.grey.shade100,
                                  child: Icon(
                                    Icons.restaurant_menu,
                                    color: inCart
                                        ? Colors.green
                                        : Colors.grey,
                                  ),
                                ),
                                title: Text(item.name),
                                subtitle: Text(
                                    item.category?.name ?? ''),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                        formatCurrency(item.price, ref.watch(currencyProvider).currency),
                                        style: const TextStyle(
                                            fontWeight:
                                                FontWeight.bold)),
                                    const SizedBox(width: 8),
                                    IconButton(
                                      icon: Icon(
                                        inCart
                                            ? Icons.check_circle
                                            : Icons.add_circle,
                                        color: inCart
                                            ? Colors.green
                                            : Theme.of(context)
                                                .colorScheme
                                                .primary,
                                      ),
                                      onPressed: () {
                                        _addToCart(item);
                                        setSheetState(() {});
                                        setState(() {});
                                      },
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }
}
