import 'dart:async';
import 'package:flutter/material.dart';
import '../l10n/app_localizations.dart';
import '../models/order.dart';
import '../services/api_repository.dart';

class KitchenDisplayScreen extends StatefulWidget {
  const KitchenDisplayScreen({super.key});
  @override
  State<KitchenDisplayScreen> createState() => _KitchenDisplayScreenState();
}

class _KitchenDisplayScreenState extends State<KitchenDisplayScreen> {
  List<Order> _orders = [];
  Map<String, dynamic> _stats = {};
  bool _loading = true;
  String? _error;
  Timer? _refreshTimer;
  Timer? _elapsedTimer;

  @override
  void initState() {
    super.initState();
    _fetchData();
    // Auto-refresh every 15 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 15), (_) => _fetchData());
    // Update elapsed time display every second
    _elapsedTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _elapsedTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchData() async {
    try {
      final orders = await ApiRepository.getKitchenOrders();
      final stats = await ApiRepository.getKitchenStats();
      if (mounted) {
        setState(() { _orders = orders; _stats = stats; _loading = false; _error = null; });
      }
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  String _elapsed(DateTime? created) {
    if (created == null) return '—';
    final diff = DateTime.now().difference(created);
    if (diff.inHours > 0) return '${diff.inHours}h ${diff.inMinutes % 60}m';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m';
    return '${diff.inSeconds}s';
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'confirmed': return Colors.blue;
      case 'preparing': return Colors.deepPurple;
      case 'ready': return Colors.green;
      default: return Colors.grey;
    }
  }

  Future<void> _advanceOrder(Order order) async {
    String? next;
    switch (order.status) {
      case 'confirmed': next = 'preparing'; break;
      case 'preparing': next = 'ready'; break;
    }
    if (next == null) return;
    try {
      await ApiRepository.updateOrder(order.id, {'status': next});
      await _fetchData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final columns = {
      'New': _orders.where((o) => o.status == 'confirmed').toList(),
      'Preparing': _orders.where((o) => o.status == 'preparing').toList(),
      'Ready': _orders.where((o) => o.status == 'ready').toList(),
    };

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.kitchenDisplay),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchData),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                    const SizedBox(height: 8),
                    FilledButton(onPressed: _fetchData, child: Text(l10n.retry)),
                  ],
                ))
              : Column(
                  children: [
                    // Stats bar
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      color: Theme.of(context).colorScheme.surfaceContainerHighest,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _statBadge('New', columns['New']!.length, Colors.orange),
                          _statBadge('Prep', columns['Preparing']!.length, Colors.deepPurple),
                          _statBadge('Ready', columns['Ready']!.length, Colors.green),
                          _statBadge('Total', _orders.length, Colors.blueGrey),
                        ],
                      ),
                    ),
                    // Orders
                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: _fetchData,
                        child: _orders.isEmpty
                            ? Center(child: Text(l10n.noKitchenOrders))
                            : ListView(
                                padding: const EdgeInsets.all(12),
                                children: columns.entries.expand((entry) {
                                  if (entry.value.isEmpty) return <Widget>[];
                                  return [
                                    Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      child: Text(entry.key, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                                    ),
                                    ...entry.value.map((order) => _orderCard(order)),
                                  ];
                                }).toList(),
                              ),
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _statBadge(String label, int count, Color color) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
          child: Text('$count', style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 18)),
        ),
        const SizedBox(height: 2),
        Text(label, style: TextStyle(fontSize: 11, color: color)),
      ],
    );
  }

  Widget _orderCard(Order order) {
    final color = _statusColor(order.status);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: color.withValues(alpha: 0.3)),
      ),
      child: InkWell(
        onTap: () => _advanceOrder(order),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(order.orderNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                    child: Text(_elapsed(order.createdAt), style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              if (order.items.isNotEmpty) ...[
                ...order.items.take(5).map((item) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 1),
                  child: Text('${item.quantity}x ${item.name}', style: Theme.of(context).textTheme.bodySmall),
                )),
                if (order.items.length > 5)
                  Text('+${order.items.length - 5} more', style: Theme.of(context).textTheme.bodySmall?.copyWith(fontStyle: FontStyle.italic)),
              ],
              if (order.notes != null && order.notes!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(order.notes!, style: TextStyle(fontSize: 12, color: Colors.red.shade700, fontStyle: FontStyle.italic)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
