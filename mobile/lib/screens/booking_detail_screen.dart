import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/booking_service.dart';
import '../services/guest_auth_service.dart';

class BookingDetailScreen extends StatefulWidget {
  final int bookingId;
  const BookingDetailScreen({super.key, required this.bookingId});

  @override
  State<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends State<BookingDetailScreen> {
  Map<String, dynamic>? _booking;
  bool _loading = true;
  bool _cancelling = false;
  String? _qrToken;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        BookingService.getBookingDetail(widget.bookingId),
        GuestAuthService.getStoredGuest(),
      ]);
      final data = results[0] as Map<String, dynamic>;
      final guest = results[1] as Map<String, dynamic>?;
      setState(() {
        _booking = data;
        _qrToken = guest?['qrToken']?.toString();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _cancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Booking'),
        content: const Text('Are you sure you want to cancel this booking?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yes, Cancel')),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _cancelling = true);
    try {
      await BookingService.cancelBooking(widget.bookingId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Booking cancelled'), backgroundColor: Colors.orange),
        );
        context.go('/bookings');
      }
    } on DioException catch (e) {
      if (mounted) {
        final msg = e.response?.data?['error']?.toString() ?? 'Failed to cancel';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Something went wrong')));
      }
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_loading) {
      return Scaffold(appBar: AppBar(title: const Text('Booking Detail')), body: const Center(child: CircularProgressIndicator()));
    }
    if (_booking == null) {
      return Scaffold(appBar: AppBar(title: const Text('Booking Detail')), body: const Center(child: Text('Booking not found')));
    }

    final property = _booking!['property'] as Map<String, dynamic>? ?? {};
    final room = _booking!['room'] as Map<String, dynamic>? ?? {};
    final status = _booking!['status']?.toString() ?? 'pending';
    final currency = property['currency']?.toString() ?? 'USD';
    final canCancel = status == 'pending' || status == 'confirmed';

    return Scaffold(
      appBar: AppBar(title: const Text('Booking Detail'), centerTitle: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Property info
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(color: theme.colorScheme.primaryContainer, borderRadius: BorderRadius.circular(12)),
                      child: Icon(Icons.hotel, color: theme.colorScheme.primary, size: 28),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(property['name']?.toString() ?? '', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                          if (property['address'] != null)
                            Text(property['address'].toString(), style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant), maxLines: 2),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Status
            _section('Status'),
            _StatusBadgeLarge(status: status),
            const SizedBox(height: 24),

            // Room
            _section('Room'),
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: ListTile(
                leading: Icon(Icons.bed, color: theme.colorScheme.primary),
                title: Text('${_roomTypeLabel(room['type']?.toString())} - Room ${room['roomNumber'] ?? ''}'),
                subtitle: Text('Floor ${room['floor'] ?? '-'} • Max ${room['maxOccupancy'] ?? '-'} guests'),
                trailing: Text('$currency ${room['price']}/night', style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.w600)),
              ),
            ),
            const SizedBox(height: 24),

            // Dates
            _section('Stay Details'),
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _detailRow(theme, 'Check-in', _booking!['checkIn']?.toString() ?? '-'),
                    _detailRow(theme, 'Check-out', _booking!['checkOut']?.toString() ?? '-'),
                    _detailRow(theme, 'Adults', '${_booking!['adults'] ?? 1}'),
                    _detailRow(theme, 'Children', '${_booking!['children'] ?? 0}'),
                    const Divider(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Total Amount', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                        Text('$currency ${_booking!['totalAmount']}',
                            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // QR Code for check-in
            if (_qrToken != null && (status == 'pending' || status == 'confirmed')) ...[
              const SizedBox(height: 24),
              _section('Check-in QR Code'),
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: QrImageView(
                          data: _qrToken!,
                          version: QrVersions.auto,
                          size: 200,
                          backgroundColor: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text('Show this QR code at the front desk for check-in',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                    ],
                  ),
                ),
              ),
            ],

            if (_booking!['specialRequests'] != null && _booking!['specialRequests'].toString().isNotEmpty) ...[
              const SizedBox(height: 24),
              _section('Special Requests'),
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(_booking!['specialRequests'].toString()),
                ),
              ),
            ],

            if (property['phone'] != null) ...[
              const SizedBox(height: 24),
              _section('Contact Hotel'),
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  leading: Icon(Icons.phone, color: theme.colorScheme.primary),
                  title: Text(property['phone'].toString()),
                ),
              ),
            ],

            if (canCancel) ...[
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton(
                  onPressed: _cancelling ? null : _cancel,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: theme.colorScheme.error,
                    side: BorderSide(color: theme.colorScheme.error),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _cancelling
                      ? SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: theme.colorScheme.error))
                      : const Text('Cancel Booking', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _section(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurfaceVariant)),
    );
  }

  Widget _detailRow(ThemeData theme, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          Text(value, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  String _roomTypeLabel(String? type) {
    switch (type) {
      case 'single': return 'Single';
      case 'double': return 'Double';
      case 'twin': return 'Twin';
      case 'suite': return 'Suite';
      case 'deluxe': return 'Deluxe';
      case 'penthouse': return 'Penthouse';
      default: return 'Room';
    }
  }
}

class _StatusBadgeLarge extends StatelessWidget {
  final String status;
  const _StatusBadgeLarge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    IconData icon;
    switch (status) {
      case 'confirmed':
        bg = Colors.green.shade100; fg = Colors.green.shade800; icon = Icons.check_circle;
        break;
      case 'pending':
        bg = Colors.orange.shade100; fg = Colors.orange.shade800; icon = Icons.schedule;
        break;
      case 'checked_in':
        bg = Colors.blue.shade100; fg = Colors.blue.shade800; icon = Icons.login;
        break;
      case 'cancelled':
        bg = Colors.red.shade100; fg = Colors.red.shade800; icon = Icons.cancel;
        break;
      case 'checked_out':
        bg = Colors.grey.shade200; fg = Colors.grey.shade700; icon = Icons.logout;
        break;
      default:
        bg = Colors.grey.shade200; fg = Colors.grey.shade700; icon = Icons.info;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 20, color: fg),
          const SizedBox(width: 8),
          Text(status.replaceAll('_', ' ').toUpperCase(), style: TextStyle(fontWeight: FontWeight.w600, color: fg)),
        ],
      ),
    );
  }
}
