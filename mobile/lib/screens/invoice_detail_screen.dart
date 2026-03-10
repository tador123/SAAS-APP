import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/invoice.dart';

class InvoiceDetailScreen extends StatelessWidget {
  final Invoice invoice;
  const InvoiceDetailScreen({super.key, required this.invoice});

  Color _statusColor(String s) {
    switch (s) {
      case 'paid':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'overdue':
        return Colors.red;
      case 'void':
        return Colors.grey;
      case 'refunded':
        return Colors.purple;
      default:
        return Colors.blueGrey;
    }
  }

  IconData _statusIcon(String s) {
    switch (s) {
      case 'paid':
        return Icons.check_circle;
      case 'pending':
        return Icons.schedule;
      case 'overdue':
        return Icons.warning;
      case 'void':
        return Icons.block;
      case 'refunded':
        return Icons.replay;
      default:
        return Icons.description;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat('MMM dd, yyyy');
    final currencyFormat = NumberFormat.currency(symbol: '\$');
    final inv = invoice;

    return Scaffold(
      appBar: AppBar(
        title: Semantics(header: true, child: Text('Invoice ${inv.invoiceNumber}')),
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
                    backgroundColor: _statusColor(inv.status).withValues(alpha: 0.15),
                    child: Icon(_statusIcon(inv.status), size: 32, color: _statusColor(inv.status)),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    inv.invoiceNumber,
                    style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: _statusColor(inv.status).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      inv.status.toUpperCase(),
                      style: TextStyle(color: _statusColor(inv.status), fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    currencyFormat.format(inv.total),
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Guest info
          if (inv.guest != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Guest', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const Divider(),
                    _infoRow(context, Icons.person_outlined, 'Name', inv.guest!.fullName),
                    if (inv.guest!.email != null)
                      _infoRow(context, Icons.email_outlined, 'Email', inv.guest!.email!),
                    _infoRow(context, Icons.phone_outlined, 'Phone', inv.guest!.phone),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 16),

          // Payment details
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Payment Information', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const Divider(),
                  if (inv.paymentMethod != null)
                    _infoRow(context, Icons.payment_outlined, 'Method', inv.paymentMethod!.replaceAll('_', ' ').toUpperCase()),
                  if (inv.dueDate != null)
                    _infoRow(context, Icons.event_outlined, 'Due Date', dateFormat.format(inv.dueDate!)),
                  if (inv.paidAt != null)
                    _infoRow(context, Icons.check_circle_outline, 'Paid At', dateFormat.format(inv.paidAt!)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Line items
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Line Items (${inv.items.length})', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const Divider(),
                  // Table header
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Expanded(flex: 4, child: Text('Description', style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600))),
                        Expanded(flex: 1, child: Text('Qty', style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600), textAlign: TextAlign.center)),
                        Expanded(flex: 2, child: Text('Price', style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600), textAlign: TextAlign.right)),
                        Expanded(flex: 2, child: Text('Total', style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600), textAlign: TextAlign.right)),
                      ],
                    ),
                  ),
                  const Divider(height: 8),
                  ...inv.items.map((item) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      children: [
                        Expanded(flex: 4, child: Text(item.description, style: theme.textTheme.bodyMedium)),
                        Expanded(flex: 1, child: Text('${item.quantity}', style: theme.textTheme.bodyMedium, textAlign: TextAlign.center)),
                        Expanded(flex: 2, child: Text(currencyFormat.format(item.unitPrice), style: theme.textTheme.bodyMedium, textAlign: TextAlign.right)),
                        Expanded(flex: 2, child: Text(currencyFormat.format(item.total), style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500), textAlign: TextAlign.right)),
                      ],
                    ),
                  )),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Totals summary
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Summary', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const Divider(),
                  _paymentRow(context, 'Subtotal', currencyFormat.format(inv.subtotal)),
                  if (inv.tax > 0)
                    _paymentRow(context, 'Tax', currencyFormat.format(inv.tax)),
                  if (inv.discount > 0)
                    _paymentRow(context, 'Discount', '-${currencyFormat.format(inv.discount)}', color: Colors.green),
                  const Divider(),
                  _paymentRow(context, 'Total', currencyFormat.format(inv.total), bold: true),
                ],
              ),
            ),
          ),

          // Notes
          if (inv.notes != null && inv.notes!.isNotEmpty) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Notes', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const Divider(),
                    Text(inv.notes!, style: theme.textTheme.bodyLarge),
                  ],
                ),
              ),
            ),
          ],
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
