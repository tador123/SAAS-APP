import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/reservation.dart';

class ReservationDetailScreen extends StatelessWidget {
  final Reservation reservation;
  const ReservationDetailScreen({super.key, required this.reservation});

  Color _statusColor(String s) {
    switch (s) {
      case 'confirmed':
        return Colors.green;
      case 'checked_in':
        return Colors.blue;
      case 'checked_out':
        return Colors.grey;
      case 'cancelled':
        return Colors.red;
      case 'no_show':
        return Colors.deepOrange;
      default:
        return Colors.orange;
    }
  }

  IconData _statusIcon(String s) {
    switch (s) {
      case 'confirmed':
        return Icons.check_circle;
      case 'checked_in':
        return Icons.login;
      case 'checked_out':
        return Icons.logout;
      case 'cancelled':
        return Icons.cancel;
      case 'no_show':
        return Icons.person_off;
      default:
        return Icons.schedule;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat('MMM dd, yyyy');
    final currencyFormat = NumberFormat.currency(symbol: '\$');
    final r = reservation;

    return Scaffold(
      appBar: AppBar(
        title: Semantics(header: true, child: Text('Reservation #${r.id}')),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Status hero
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: _statusColor(r.status).withValues(alpha: 0.15),
                    child: Icon(_statusIcon(r.status), size: 32, color: _statusColor(r.status)),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: _statusColor(r.status).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      r.status.replaceAll('_', ' ').toUpperCase(),
                      style: TextStyle(
                        color: _statusColor(r.status),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Dates
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      children: [
                        Icon(Icons.login, color: theme.colorScheme.primary),
                        const SizedBox(height: 4),
                        Text('Check-in', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
                        const SizedBox(height: 2),
                        Text(
                          r.checkIn != null ? dateFormat.format(r.checkIn!) : '—',
                          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 50, color: theme.dividerColor),
                  Expanded(
                    child: Column(
                      children: [
                        Icon(Icons.logout, color: theme.colorScheme.primary),
                        const SizedBox(height: 4),
                        Text('Check-out', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
                        const SizedBox(height: 2),
                        Text(
                          r.checkOut != null ? dateFormat.format(r.checkOut!) : '—',
                          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                  if (r.checkIn != null && r.checkOut != null) ...[
                    Container(width: 1, height: 50, color: theme.dividerColor),
                    Expanded(
                      child: Column(
                        children: [
                          Icon(Icons.nights_stay, color: theme.colorScheme.primary),
                          const SizedBox(height: 4),
                          Text('Nights', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey)),
                          const SizedBox(height: 2),
                          Text(
                            '${r.checkOut!.difference(r.checkIn!).inDays}',
                            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Guest info
          if (r.guest != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Guest Information', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const Divider(),
                    _infoRow(context, Icons.person_outlined, 'Name', r.guest!.fullName),
                    if (r.guest!.email != null)
                      _infoRow(context, Icons.email_outlined, 'Email', r.guest!.email!),
                    _infoRow(context, Icons.phone_outlined, 'Phone', r.guest!.phone),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 16),

          // Room info
          if (r.room != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Room Information', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const Divider(),
                    _infoRow(context, Icons.bed_outlined, 'Room', r.room!.roomNumber),
                    _infoRow(context, Icons.category_outlined, 'Type', r.room!.type.toUpperCase()),
                    _infoRow(context, Icons.layers_outlined, 'Floor', r.room!.floor.toString()),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 16),

          // Booking details
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Booking Details', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const Divider(),
                  _infoRow(context, Icons.people_outlined, 'Guests', '${r.adults} adults, ${r.children} children'),
                  if (r.source != null)
                    _infoRow(context, Icons.source_outlined, 'Source', r.source!.replaceAll('_', ' ')),
                  if (r.specialRequests != null && r.specialRequests!.isNotEmpty)
                    _infoRow(context, Icons.note_outlined, 'Requests', r.specialRequests!),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Payment
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Payment', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const Divider(),
                  _paymentRow(context, 'Total', currencyFormat.format(r.totalAmount), bold: true),
                  _paymentRow(context, 'Paid', currencyFormat.format(r.paidAmount)),
                  _paymentRow(
                    context,
                    'Balance',
                    currencyFormat.format(r.totalAmount - r.paidAmount),
                    color: (r.totalAmount - r.paidAmount) > 0 ? Colors.red : Colors.green,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(BuildContext context, IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
                const SizedBox(height: 2),
                Text(value, style: Theme.of(context).textTheme.bodyLarge),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _paymentRow(BuildContext context, String label, String value, {bool bold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyLarge),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              fontWeight: bold ? FontWeight.bold : null,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
