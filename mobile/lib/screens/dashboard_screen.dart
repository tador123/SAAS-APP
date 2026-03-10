import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/offline_aware_repository.dart';
import '../widgets/common.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic> _stats = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchStats();
  }

  Future<void> _fetchStats() async {
    setState(() { _loading = true; _error = null; });
    try {
      final stats = await OfflineAwareRepository.getDashboardStats();
      if (mounted) setState(() { _stats = stats; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Semantics(header: true, child: const Text('Dashboard')),
        centerTitle: false,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ErrorStateWidget(message: _error!, onRetry: _fetchStats)
              : RefreshIndicator(
                  onRefresh: _fetchStats,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildStatsGrid(),
                      const SizedBox(height: 24),
                      Text('Quick Actions',
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 12),
                      _buildQuickActions(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildStatsGrid() {
    final cards = [
      _StatCard('Total Rooms', '${_stats['totalRooms'] ?? 0}', Icons.bed, Colors.blue),
      _StatCard('Occupied', '${_stats['occupiedRooms'] ?? 0}', Icons.meeting_room, Colors.red),
      _StatCard('Check-ins Today', '${_stats['todayCheckIns'] ?? 0}', Icons.login, Colors.green),
      _StatCard('Active Orders', '${_stats['activeOrders'] ?? 0}', Icons.receipt_long, Colors.orange),
      _StatCard('Occupancy', '${_stats['occupancyRate'] ?? 0}%', Icons.trending_up, Colors.purple),
      _StatCard('Revenue', '\$${_stats['monthlyRevenue'] ?? 0}', Icons.attach_money, Colors.teal),
    ];

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: cards
          .map((card) => Semantics(
                label: '${card.label}: ${card.value}',
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Icon(card.icon, color: card.color, size: 28,
                            semanticLabel: card.label),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(card.value,
                                style: Theme.of(context)
                                    .textTheme
                                    .headlineSmall
                                    ?.copyWith(fontWeight: FontWeight.bold)),
                            Text(card.label,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: Colors.grey)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ))
          .toList(),
    );
  }

  Widget _buildQuickActions() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        ActionChip(
            label: const Text('New Reservation'),
            avatar: const Icon(Icons.add, size: 18),
            onPressed: () => context.go('/reservations')),
        ActionChip(
            label: const Text('New Order'),
            avatar: const Icon(Icons.restaurant_menu, size: 18),
            onPressed: () => context.go('/orders')),
        ActionChip(
            label: const Text('Add Guest'),
            avatar: const Icon(Icons.person_add, size: 18),
            onPressed: () => context.go('/guests')),
        ActionChip(
            label: const Text('Invoices'),
            avatar: const Icon(Icons.receipt, size: 18),
            onPressed: () => context.go('/invoices')),
      ],
    );
  }
}

class _StatCard {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  _StatCard(this.label, this.value, this.icon, this.color);
}
