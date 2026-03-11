import 'package:flutter/material.dart';
import '../l10n/app_localizations.dart';
import '../models/restaurant.dart';
import '../services/api_repository.dart';

class QROrderingScreen extends StatefulWidget {
  const QROrderingScreen({super.key});
  @override
  State<QROrderingScreen> createState() => _QROrderingScreenState();
}

class _QROrderingScreenState extends State<QROrderingScreen> {
  List<RestaurantTable> _tables = [];
  bool _loading = true;
  int? _generating;

  @override
  void initState() {
    super.initState();
    _loadTables();
  }

  Future<void> _loadTables() async {
    setState(() => _loading = true);
    try {
      final tables = await ApiRepository.getQRTables();
      if (mounted) setState(() { _tables = tables; _loading = false; });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _generateQR(int tableId) async {
    setState(() => _generating = tableId);
    try {
      await ApiRepository.generateQRToken(tableId);
      await _loadTables();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _generating = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.qrOrdering),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadTables),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _tables.isEmpty
              ? Center(child: Text(l10n.noResults))
              : RefreshIndicator(
                  onRefresh: _loadTables,
                  child: GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.8,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: _tables.length,
                    itemBuilder: (context, i) {
                      final table = _tables[i];
                      final hasQR = table.qrToken != null && table.qrToken!.isNotEmpty;

                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('${l10n.tableNumber} ${table.tableNumber}',
                                      style: const TextStyle(fontWeight: FontWeight.bold)),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: hasQR ? Colors.green.shade50 : Colors.grey.shade100,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      hasQR ? l10n.qrActive : l10n.qrNone,
                                      style: TextStyle(fontSize: 10, color: hasQR ? Colors.green.shade700 : Colors.grey),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Expanded(
                                child: hasQR
                                    ? Image.network(
                                        'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${Uri.encodeComponent(table.qrToken!)}',
                                        fit: BoxFit.contain,
                                        errorBuilder: (_, __, ___) => const Icon(Icons.qr_code_2, size: 80, color: Colors.grey),
                                      )
                                    : const Icon(Icons.qr_code_2, size: 80, color: Colors.grey),
                              ),
                              const SizedBox(height: 8),
                              SizedBox(
                                width: double.infinity,
                                child: hasQR
                                    ? OutlinedButton.icon(
                                        onPressed: _generating == table.id ? null : () => _generateQR(table.id),
                                        icon: _generating == table.id
                                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                                            : const Icon(Icons.refresh, size: 16),
                                        label: Text(l10n.qrRegenerate, style: const TextStyle(fontSize: 12)),
                                      )
                                    : FilledButton.icon(
                                        onPressed: _generating == table.id ? null : () => _generateQR(table.id),
                                        icon: _generating == table.id
                                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                            : const Icon(Icons.qr_code, size: 16),
                                        label: Text(l10n.qrGenerate, style: const TextStyle(fontSize: 12)),
                                      ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
