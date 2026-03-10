import 'package:flutter/material.dart';
import '../models/guest.dart';

class GuestDetailScreen extends StatelessWidget {
  final Guest guest;
  const GuestDetailScreen({super.key, required this.guest});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Semantics(header: true, child: Text(guest.fullName)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Profile card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 40,
                    backgroundColor: guest.vipStatus
                        ? Colors.amber.withValues(alpha: 0.2)
                        : theme.colorScheme.primaryContainer,
                    child: Text(
                      guest.initials,
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: guest.vipStatus ? Colors.amber.shade800 : theme.colorScheme.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    guest.fullName,
                    style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  if (guest.vipStatus) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.amber.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.star, size: 16, color: Colors.amber.shade700),
                          const SizedBox(width: 4),
                          Text(
                            'VIP Guest',
                            style: TextStyle(color: Colors.amber.shade700, fontWeight: FontWeight.w600),
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

          // Contact info
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Contact Information', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const Divider(),
                  if (guest.email != null)
                    _infoRow(context, Icons.email_outlined, 'Email', guest.email!),
                  _infoRow(context, Icons.phone_outlined, 'Phone', guest.phone),
                  if (guest.address != null && guest.address!.isNotEmpty)
                    _infoRow(context, Icons.location_on_outlined, 'Address', guest.address!),
                  if (guest.nationality != null && guest.nationality!.isNotEmpty)
                    _infoRow(context, Icons.flag_outlined, 'Nationality', guest.nationality!),
                  if (guest.dateOfBirth != null && guest.dateOfBirth!.isNotEmpty)
                    _infoRow(context, Icons.cake_outlined, 'Date of Birth', guest.dateOfBirth!),
                ],
              ),
            ),
          ),

          // ID info
          if (guest.idType != null || guest.idNumber != null) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Identification', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const Divider(),
                    if (guest.idType != null)
                      _infoRow(context, Icons.badge_outlined, 'ID Type', guest.idType!.replaceAll('_', ' ').toUpperCase()),
                    if (guest.idNumber != null)
                      _infoRow(context, Icons.numbers_outlined, 'ID Number', guest.idNumber!),
                  ],
                ),
              ),
            ),
          ],

          // Notes
          if (guest.notes != null && guest.notes!.isNotEmpty) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Notes', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const Divider(),
                    Text(guest.notes!, style: theme.textTheme.bodyLarge),
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
}
