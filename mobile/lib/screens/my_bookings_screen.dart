import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/booking_service.dart';
import '../services/table_reservation_service.dart';

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> _upcoming = [];
  List<dynamic> _past = [];
  List<dynamic> _tableReservations = [];
  bool _loading = true;

  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadBookings();
  }

  Future<void> _loadBookings() async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        BookingService.getBookings(),
        TableReservationService.getReservations(),
      ]);

      final bookings = (results[0] as Map<String, dynamic>)['bookings'] as List<dynamic>? ?? [];

      _upcoming = bookings.where((b) {
        final status = b['status']?.toString();
        return status == 'pending' || status == 'confirmed' || status == 'checked_in';
      }).toList();

      _past = bookings.where((b) {
        final status = b['status']?.toString();
        return status == 'checked_out' || status == 'cancelled' || status == 'no_show';
      }).toList();

      final tableData = results[1] as Map<String, dynamic>;
      _tableReservations = tableData['data'] as List<dynamic>? ?? [];

      setState(() => _loading = false);
    } catch (e) {
      debugPrint('[Bookings] Load failed: $e');
      setState(() { _error = 'Could not load bookings'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Text('My Bookings', style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 12),
            TabBar(
              controller: _tabController,
              tabs: [
                Tab(text: 'Upcoming (${_upcoming.length})'),
                Tab(text: 'Past (${_past.length})'),
                Tab(text: 'Dining (${_tableReservations.length})'),
              ],
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
                              const SizedBox(height: 8),
                              Text(_error!, style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
                              const SizedBox(height: 12),
                              FilledButton.tonal(onPressed: _loadBookings, child: const Text('Retry')),
                            ],
                          ),
                        )
                      : TabBarView(
                          controller: _tabController,
                          children: [
                            _buildBookingList(_upcoming, isEmpty: 'No upcoming bookings'),
                            _buildBookingList(_past, isEmpty: 'No past bookings'),
                            _buildTableReservationList(),
                          ],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBookingList(List<dynamic> bookings, {required String isEmpty}) {
    final theme = Theme.of(context);
    if (bookings.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.calendar_today_outlined, size: 56, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.4)),
            const SizedBox(height: 12),
            Text(isEmpty, style: theme.textTheme.titleMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: () => context.go('/'),
              child: const Text('Browse Properties'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadBookings,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: bookings.length,
        itemBuilder: (context, index) {
          final b = bookings[index] as Map<String, dynamic>;
          return _BookingCard(booking: b);
        },
      ),
    );
  }

  Widget _buildTableReservationList() {
    final theme = Theme.of(context);
    if (_tableReservations.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.table_restaurant_outlined, size: 56, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.4)),
            const SizedBox(height: 12),
            Text('No table reservations', style: theme.textTheme.titleMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: () => context.go('/'),
              child: const Text('Browse Restaurants'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadBookings,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _tableReservations.length,
        itemBuilder: (context, index) {
          final r = _tableReservations[index] as Map<String, dynamic>;
          return _TableReservationCard(reservation: r);
        },
      ),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}

class _BookingCard extends StatelessWidget {
  final Map<String, dynamic> booking;
  const _BookingCard({required this.booking});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final property = booking['property'] as Map<String, dynamic>? ?? {};
    final room = booking['room'] as Map<String, dynamic>? ?? {};
    final status = booking['status']?.toString() ?? 'pending';
    final currency = property['currency']?.toString() ?? 'USD';

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/bookings/${booking['id']}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Property + status
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.hotel, color: theme.colorScheme.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(property['name']?.toString() ?? 'Hotel',
                            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                        Text('${room['type'] ?? ''} • Room ${room['roomNumber'] ?? ''}',
                            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  _StatusBadge(status: status),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 12),

              // Dates and amount
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Check-in', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                        Text(booking['checkIn']?.toString() ?? '', style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                  Icon(Icons.arrow_forward, size: 16, color: theme.colorScheme.onSurfaceVariant),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Check-out', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                        Text(booking['checkOut']?.toString() ?? '', style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('Total', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                      Text('$currency ${booking['totalAmount']}',
                          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    switch (status) {
      case 'confirmed':
        bg = Colors.green.shade100;
        fg = Colors.green.shade800;
        break;
      case 'pending':
        bg = Colors.orange.shade100;
        fg = Colors.orange.shade800;
        break;
      case 'checked_in':
      case 'seated':
        bg = Colors.blue.shade100;
        fg = Colors.blue.shade800;
        break;
      case 'cancelled':
        bg = Colors.red.shade100;
        fg = Colors.red.shade800;
        break;
      case 'checked_out':
      case 'completed':
        bg = Colors.grey.shade200;
        fg = Colors.grey.shade700;
        break;
      case 'no_show':
        bg = Colors.red.shade50;
        fg = Colors.red.shade600;
        break;
      default:
        bg = Colors.grey.shade200;
        fg = Colors.grey.shade700;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(
        status.replaceAll('_', ' ').toUpperCase(),
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg),
      ),
    );
  }
}

class _TableReservationCard extends StatelessWidget {
  final Map<String, dynamic> reservation;
  const _TableReservationCard({required this.reservation});

  void _showQR(BuildContext context) {
    final qrToken = reservation['qrToken']?.toString() ?? '';
    final theme = Theme.of(context);
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Table Reservation QR', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('Show this to restaurant staff', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
              const SizedBox(height: 16),
              if (qrToken.isNotEmpty)
                QrImageView(
                  data: qrToken,
                  version: QrVersions.auto,
                  size: 220,
                  backgroundColor: Colors.white,
                  eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: Color(0xFF2563EB)),
                  dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: Color(0xFF1E293B)),
                )
              else
                const Text('QR code unavailable'),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () => Navigator.of(ctx).pop(),
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(44)),
                child: const Text('Close'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final table = reservation['table'] as Map<String, dynamic>? ?? {};
    final property = reservation['property'] as Map<String, dynamic>? ?? {};
    final status = reservation['status']?.toString() ?? 'pending';
    final canShowQR = status == 'pending' || status == 'confirmed';

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Property + table + status
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(color: theme.colorScheme.primaryContainer, borderRadius: BorderRadius.circular(10)),
                  child: Icon(Icons.table_restaurant, color: theme.colorScheme.primary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(property['name']?.toString() ?? 'Restaurant', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                      Text('Table #${table['tableNumber'] ?? ''} • ${table['capacity'] ?? ''} seats',
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                    ],
                  ),
                ),
                _StatusBadge(status: status),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 12),

            // Date, time, party size
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Date', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                      Text(reservation['reservationDate']?.toString() ?? '', style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Time', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                      Text(reservation['reservationTime']?.toString().substring(0, 5) ?? '', style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('Party', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                    Text('${reservation['partySize'] ?? ''}', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
                  ],
                ),
              ],
            ),

            // QR button for active reservations
            if (canShowQR) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _showQR(context),
                  icon: const Icon(Icons.qr_code_2, size: 20),
                  label: const Text('Show QR Code'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
