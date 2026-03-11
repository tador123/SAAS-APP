import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/restaurant.dart';
import '../services/api_repository.dart';
import '../providers/currency_provider.dart';
import '../widgets/common.dart';

class RestaurantScreen extends ConsumerStatefulWidget {
  const RestaurantScreen({super.key});
  @override
  ConsumerState<RestaurantScreen> createState() => _RestaurantScreenState();
}

class _RestaurantScreenState extends ConsumerState<RestaurantScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  List<MenuCategory> _categories = [];
  List<MenuItem> _menuItems = [];
  List<RestaurantTable> _tables = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        ApiRepository.getCategories(),
        ApiRepository.getMenuItems(),
        ApiRepository.getTables(),
      ]);
      setState(() {
        _categories = results[0] as List<MenuCategory>;
        _menuItems = results[1] as List<MenuItem>;
        _tables = results[2] as List<RestaurantTable>;
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Semantics(header: true, child: const Text('Restaurant')),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Menu'),
            Tab(text: 'Categories'),
            Tab(text: 'Tables'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _onFabPressed,
        tooltip: 'Add item',
        child: const Icon(Icons.add),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ErrorStateWidget(message: _error!, onRetry: _fetch)
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _menuTab(),
                    _categoriesTab(),
                    _tablesTab(),
                  ],
                ),
    );
  }

  void _onFabPressed() {
    switch (_tabController.index) {
      case 0: _showMenuItemForm(); break;
      case 1: _showCategoryForm(); break;
      case 2: _showTableForm(); break;
    }
  }

  // ── Menu Items ──────────────────────────────────────────────────
  Widget _menuTab() {
    if (_menuItems.isEmpty) {
      return EmptyStateWidget(
          message: 'No menu items', icon: Icons.restaurant_menu,
          actionLabel: 'Add Item', onAction: _showMenuItemForm);
    }
    return RefreshIndicator(
      onRefresh: _fetch,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _menuItems.length,
        itemBuilder: (context, i) {
          final item = _menuItems[i];
          return Semantics(
            label: '${item.name}, ${formatCurrency(item.price, ref.watch(currencyProvider).currency)}',
            child: Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: item.isAvailable
                      ? Colors.green.shade50
                      : Colors.grey.shade200,
                  child: Icon(Icons.restaurant_menu,
                      color: item.isAvailable ? Colors.green : Colors.grey),
                ),
                title: Text(item.name),
                subtitle: Text(item.category?.name ?? 'Uncategorized'),
                trailing: Text(formatCurrency(item.price, ref.watch(currencyProvider).currency),
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 16)),
                onTap: () => _showMenuItemForm(item: item),
                onLongPress: () => _deleteMenuItem(item),
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _showMenuItemForm({MenuItem? item}) async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _MenuItemFormSheet(item: item, categories: _categories),
    );
    if (result == null) return;
    try {
      if (item != null) {
        await ApiRepository.updateMenuItem(item.id, result);
      } else {
        await ApiRepository.createMenuItem(result);
      }
      await _fetch();
      if (mounted) showSuccessSnackBar(context, item != null ? 'Item updated' : 'Item created');
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e.toString());
    }
  }

  Future<void> _deleteMenuItem(MenuItem item) async {
    final ok = await showConfirmDialog(context,
        title: 'Delete Item', message: 'Delete ${item.name}?');
    if (!ok) return;
    try {
      await ApiRepository.deleteMenuItem(item.id);
      await _fetch();
      if (mounted) showSuccessSnackBar(context, 'Item deleted');
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e.toString());
    }
  }

  // ── Categories ──────────────────────────────────────────────────
  Widget _categoriesTab() {
    if (_categories.isEmpty) {
      return EmptyStateWidget(
          message: 'No categories', icon: Icons.category,
          actionLabel: 'Add Category', onAction: _showCategoryForm);
    }
    return RefreshIndicator(
      onRefresh: _fetch,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _categories.length,
        itemBuilder: (context, i) {
          final cat = _categories[i];
          return Card(
            child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.category)),
              title: Text(cat.name),
              subtitle: Text(cat.description ?? ''),
              onTap: () => _showCategoryForm(cat: cat),
              onLongPress: () => _deleteCategory(cat),
            ),
          );
        },
      ),
    );
  }

  Future<void> _showCategoryForm({MenuCategory? cat}) async {
    final nameCtrl = TextEditingController(text: cat?.name ?? '');
    final descCtrl = TextEditingController(text: cat?.description ?? '');
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(cat != null ? 'Edit Category' : 'New Category'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
                controller: nameCtrl,
                decoration:
                    const InputDecoration(labelText: 'Name', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(
                controller: descCtrl,
                decoration:
                    const InputDecoration(labelText: 'Description', border: OutlineInputBorder())),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, {
                    'name': nameCtrl.text.trim(),
                    'description': descCtrl.text.trim(),
                  }),
              child: Text(cat != null ? 'Update' : 'Create')),
        ],
      ),
    );
    if (result == null) return;
    try {
      if (cat != null) {
        await ApiRepository.updateCategory(cat.id, result);
      } else {
        await ApiRepository.createCategory(result);
      }
      await _fetch();
      if (mounted) showSuccessSnackBar(context, cat != null ? 'Category updated' : 'Category created');
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e.toString());
    }
  }

  Future<void> _deleteCategory(MenuCategory cat) async {
    final ok = await showConfirmDialog(context,
        title: 'Delete Category', message: 'Delete ${cat.name}?');
    if (!ok) return;
    try {
      await ApiRepository.deleteCategory(cat.id);
      await _fetch();
      if (mounted) showSuccessSnackBar(context, 'Category deleted');
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e.toString());
    }
  }

  // ── Tables ──────────────────────────────────────────────────────
  Widget _tablesTab() {
    if (_tables.isEmpty) {
      return EmptyStateWidget(
          message: 'No tables', icon: Icons.table_restaurant,
          actionLabel: 'Add Table', onAction: _showTableForm);
    }
    return RefreshIndicator(
      onRefresh: _fetch,
      child: GridView.builder(
        padding: const EdgeInsets.all(12),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            childAspectRatio: 1,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8),
        itemCount: _tables.length,
        itemBuilder: (context, i) {
          final t = _tables[i];
          final available = t.status == 'available';
          return Semantics(
            label: 'Table ${t.tableNumber}, ${t.capacity} seats, ${t.status}',
            child: InkWell(
              onTap: () => _showTableForm(table: t),
              onLongPress: () => _deleteTable(t),
              borderRadius: BorderRadius.circular(12),
              child: Card(
                color: available ? Colors.green.shade50 : Colors.red.shade50,
                child: Center(
                  child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.table_restaurant,
                            size: 32,
                            color: available ? Colors.green : Colors.red),
                        const SizedBox(height: 4),
                        Text('Table ${t.tableNumber}',
                            style: const TextStyle(fontWeight: FontWeight.bold)),
                        Text('${t.capacity} seats',
                            style: const TextStyle(fontSize: 12)),
                      ]),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _showTableForm({RestaurantTable? table}) async {
    final numCtrl = TextEditingController(text: table?.tableNumber.toString() ?? '');
    final capCtrl = TextEditingController(text: table?.capacity.toString() ?? '4');
    String status = table?.status ?? 'available';
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: Text(table != null ? 'Edit Table' : 'New Table'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(
                controller: numCtrl,
                decoration: const InputDecoration(
                    labelText: 'Table Number', border: OutlineInputBorder()),
                keyboardType: TextInputType.number),
            const SizedBox(height: 12),
            TextField(
                controller: capCtrl,
                decoration: const InputDecoration(
                    labelText: 'Capacity', border: OutlineInputBorder()),
                keyboardType: TextInputType.number),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: status,
              decoration: const InputDecoration(
                  labelText: 'Status', border: OutlineInputBorder()),
              items: ['available', 'occupied', 'reserved']
                  .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                  .toList(),
              onChanged: (v) => setD(() => status = v!),
            ),
          ]),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
                onPressed: () => Navigator.pop(ctx, {
                      'tableNumber': int.tryParse(numCtrl.text) ?? 0,
                      'capacity': int.tryParse(capCtrl.text) ?? 4,
                      'status': status,
                    }),
                child: Text(table != null ? 'Update' : 'Create')),
          ],
        ),
      ),
    );
    if (result == null) return;
    try {
      if (table != null) {
        await ApiRepository.updateTable(table.id, result);
      } else {
        await ApiRepository.createTable(result);
      }
      await _fetch();
      if (mounted) showSuccessSnackBar(context, table != null ? 'Table updated' : 'Table created');
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e.toString());
    }
  }

  Future<void> _deleteTable(RestaurantTable t) async {
    final ok = await showConfirmDialog(context,
        title: 'Delete Table', message: 'Delete Table ${t.tableNumber}?');
    if (!ok) return;
    try {
      await ApiRepository.deleteTable(t.id);
      await _fetch();
      if (mounted) showSuccessSnackBar(context, 'Table deleted');
    } catch (e) {
      if (mounted) showErrorSnackBar(context, e.toString());
    }
  }
}

// ── Menu Item Form Sheet ───────────────────────────────────────────
class _MenuItemFormSheet extends ConsumerStatefulWidget {
  final MenuItem? item;
  final List<MenuCategory> categories;
  const _MenuItemFormSheet({this.item, required this.categories});
  @override
  ConsumerState<_MenuItemFormSheet> createState() => _MenuItemFormSheetState();
}

class _MenuItemFormSheetState extends ConsumerState<_MenuItemFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameCtrl;
  late final TextEditingController _descCtrl;
  late final TextEditingController _priceCtrl;
  late final TextEditingController _prepCtrl;
  late int? _categoryId;
  late bool _available;
  late bool _vegetarian;

  @override
  void initState() {
    super.initState();
    final it = widget.item;
    _nameCtrl = TextEditingController(text: it?.name ?? '');
    _descCtrl = TextEditingController(text: it?.description ?? '');
    _priceCtrl = TextEditingController(text: it?.price.toString() ?? '');
    _prepCtrl = TextEditingController(text: (it?.preparationTime ?? 15).toString());
    _categoryId = it?.categoryId;
    _available = it?.isAvailable ?? true;
    _vegetarian = it?.isVegetarian ?? false;
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
              Text(widget.item != null ? 'Edit Menu Item' : 'New Menu Item',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(
                    labelText: 'Name', border: OutlineInputBorder()),
                validator: (v) =>
                    v == null || v.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<int?>(
                value: _categoryId,
                decoration: const InputDecoration(
                    labelText: 'Category', border: OutlineInputBorder()),
                items: [
                  const DropdownMenuItem<int?>(value: null, child: Text('No category')),
                  ...widget.categories.map((c) =>
                      DropdownMenuItem<int?>(value: c.id, child: Text(c.name))),
                ],
                onChanged: (v) => setState(() => _categoryId = v),
              ),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: TextFormField(
                    controller: _priceCtrl,
                    decoration: InputDecoration(
                        labelText: 'Price',
                        border: const OutlineInputBorder(),
                        prefixText: '${ref.watch(currencyProvider).currency} '),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Required' : null,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _prepCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Prep (min)', border: OutlineInputBorder()),
                    keyboardType: TextInputType.number,
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              TextFormField(
                controller: _descCtrl,
                decoration: const InputDecoration(
                    labelText: 'Description', border: OutlineInputBorder()),
                maxLines: 2,
              ),
              Row(children: [
                Expanded(
                  child: SwitchListTile(
                      title: const Text('Available'),
                      value: _available,
                      onChanged: (v) => setState(() => _available = v)),
                ),
                Expanded(
                  child: SwitchListTile(
                      title: const Text('Veg'),
                      value: _vegetarian,
                      onChanged: (v) => setState(() => _vegetarian = v)),
                ),
              ]),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: () {
                  if (!_formKey.currentState!.validate()) return;
                  Navigator.pop(context, {
                    'name': _nameCtrl.text.trim(),
                    'description': _descCtrl.text.trim(),
                    'price': double.tryParse(_priceCtrl.text) ?? 0,
                    'categoryId': _categoryId,
                    'preparationTime': int.tryParse(_prepCtrl.text) ?? 15,
                    'isAvailable': _available,
                    'isVegetarian': _vegetarian,
                  });
                },
                child: Text(widget.item != null ? 'Update' : 'Create'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    _prepCtrl.dispose();
    super.dispose();
  }
}
