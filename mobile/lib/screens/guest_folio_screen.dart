import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import '../providers/providers.dart';
import '../services/api_repository.dart';

class GuestFolioScreen extends ConsumerStatefulWidget {
  const GuestFolioScreen({super.key});
  @override
  ConsumerState<GuestFolioScreen> createState() => _GuestFolioScreenState();
}

class _GuestFolioScreenState extends ConsumerState<GuestFolioScreen> {
  int? _selectedGuestId;
  Map<String, dynamic>? _folio;
  bool _loadingFolio = false;
  String _search = '';

  Future<void> _loadFolio(int guestId) async {
    setState(() { _selectedGuestId = guestId; _loadingFolio = true; });
    try {
      final folio = await ApiRepository.getGuestFolio(guestId);
      if (mounted) setState(() { _folio = folio; _loadingFolio = false; });
    } catch (e) {
      if (mounted) {
        setState(() { _loadingFolio = false; });
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final guestsState = ref.watch(guestsProvider);
    final filtered = guestsState.items.where((g) {
      if (_search.isEmpty) return true;
      final q = _search.toLowerCase();
      return '${g.firstName} ${g.lastName}'.toLowerCase().contains(q) ||
             (g.email?.toLowerCase().contains(q) ?? false);
    }).toList();

    return Scaffold(
      appBar: AppBar(title: Text(l10n.guestFolio)),
      body: _selectedGuestId == null
          ? _buildGuestList(l10n, guestsState.isLoading, filtered)
          : _buildFolioDetail(l10n),
    );
  }

  Widget _buildGuestList(AppLocalizations l10n, bool loading, List guests) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            decoration: InputDecoration(
              hintText: l10n.search,
              prefixIcon: const Icon(Icons.search),
              border: const OutlineInputBorder(),
              isDense: true,
            ),
            onChanged: (v) => setState(() => _search = v),
          ),
        ),
        Expanded(
          child: loading
              ? const Center(child: CircularProgressIndicator())
              : guests.isEmpty
                  ? Center(child: Text(l10n.noGuests))
                  : ListView.builder(
                      itemCount: guests.length,
                      itemBuilder: (context, i) {
                        final g = guests[i];
                        return ListTile(
                          leading: CircleAvatar(child: Text(g.initials)),
                          title: Text(g.fullName),
                          subtitle: Text(g.email ?? ''),
                          onTap: () => _loadFolio(g.id),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  Widget _buildFolioDetail(AppLocalizations l10n) {
    if (_loadingFolio) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_folio == null) return Center(child: Text(l10n.error));

    final summary = _folio!['summary'] as Map<String, dynamic>? ?? {};
    final reservations = (_folio!['reservations'] as List?) ?? [];
    final orders = (_folio!['orders'] as List?) ?? [];
    final guest = _folio!['guest'] as Map<String, dynamic>? ?? {};
    final folioNumber = _folio!['folioNumber'] ?? '';

    return Column(
      children: [
        // Back bar
        Container(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() { _selectedGuestId = null; _folio = null; }),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${guest['firstName']} ${guest['lastName']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text(folioNumber.toString(), style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => _loadFolio(_selectedGuestId!),
            child: ListView(
              padding: const EdgeInsets.all(12),
              children: [
                // Summary cards
                Row(
                  children: [
                    _summaryCard(l10n.roomCharges, summary['roomCharges'] ?? 0, Colors.blue),
                    const SizedBox(width: 8),
                    _summaryCard(l10n.restaurantCharges, summary['restaurantCharges'] ?? 0, Colors.orange),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _summaryCard(l10n.totalPaid, summary['totalPaid'] ?? 0, Colors.green),
                    const SizedBox(width: 8),
                    _summaryCard(l10n.balance, summary['balance'] ?? 0,
                        (summary['balance'] ?? 0) > 0 ? Colors.red : Colors.green),
                  ],
                ),
                const SizedBox(height: 16),
                // Room charges
                if (reservations.isNotEmpty) ...[
                  Text(l10n.roomCharges, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  ...reservations.map<Widget>((r) => Card(
                    child: ListTile(
                      leading: const Icon(Icons.bed),
                      title: Text('${l10n.room} ${r['room']}'),
                      subtitle: Text('${r['checkIn']} → ${r['checkOut']} • ${r['nights']} ${l10n.nights(r['nights'] as int)}'),
                      trailing: Text('\$${(r['total'] as num).toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  )),
                  const SizedBox(height: 16),
                ],
                // Restaurant charges
                if (orders.isNotEmpty) ...[
                  Text(l10n.restaurantCharges, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  ...orders.map<Widget>((o) => Card(
                    child: ListTile(
                      leading: const Icon(Icons.restaurant),
                      title: Text(o['orderNumber']?.toString() ?? ''),
                      subtitle: Text('${(o['items'] as List?)?.length ?? 0} ${l10n.items}'),
                      trailing: Text('\$${(o['total'] as num).toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  )),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _summaryCard(String label, num value, Color color) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              const SizedBox(height: 4),
              Text('\$${value.toStringAsFixed(2)}',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
            ],
          ),
        ),
      ),
    );
  }
}
