import 'package:flutter/material.dart';
import '../services/offline_service.dart';

/// Banner that shows at the top of the screen when offline.
class OfflineBanner extends StatefulWidget {
  const OfflineBanner({super.key});

  @override
  State<OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends State<OfflineBanner> {
  bool _isOnline = ConnectivityService.isOnline;

  @override
  void initState() {
    super.initState();
    ConnectivityService.onConnectivityChanged.listen((online) {
      if (mounted) setState(() => _isOnline = online);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isOnline) return const SizedBox.shrink();

    return MaterialBanner(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      content: const Row(
        children: [
          Icon(Icons.cloud_off, size: 18, color: Colors.white),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'You are offline. Changes will sync when back online.',
              style: TextStyle(color: Colors.white, fontSize: 13),
            ),
          ),
        ],
      ),
      backgroundColor: Colors.grey.shade800,
      actions: [
        TextButton(
          onPressed: () {
            final pending = SyncService.pendingCount;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('$pending pending change(s) queued')),
            );
          },
          child: Text(
            '${SyncService.pendingCount} pending',
            style: const TextStyle(color: Colors.amber),
          ),
        ),
      ],
    );
  }
}

/// Sync status indicator for the app bar.
class SyncStatusIndicator extends StatefulWidget {
  const SyncStatusIndicator({super.key});

  @override
  State<SyncStatusIndicator> createState() => _SyncStatusIndicatorState();
}

class _SyncStatusIndicatorState extends State<SyncStatusIndicator> {
  SyncStatus? _status;

  @override
  void initState() {
    super.initState();
    SyncService.onSyncStatusChanged.listen((status) {
      if (mounted) setState(() => _status = status);
      // Auto-clear after 3 seconds
      if (status == SyncStatus.complete) {
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) setState(() => _status = null);
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_status == null) return const SizedBox.shrink();

    switch (_status!) {
      case SyncStatus.syncing:
        return const Padding(
          padding: EdgeInsets.symmetric(horizontal: 12),
          child: SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        );
      case SyncStatus.complete:
        return const Padding(
          padding: EdgeInsets.symmetric(horizontal: 12),
          child: Icon(Icons.cloud_done, size: 20, color: Colors.green),
        );
      case SyncStatus.partialFailure:
        return const Padding(
          padding: EdgeInsets.symmetric(horizontal: 12),
          child: Icon(Icons.cloud_off, size: 20, color: Colors.orange),
        );
    }
  }
}
