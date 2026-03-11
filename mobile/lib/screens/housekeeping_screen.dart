import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import '../models/housekeeping_task.dart';
import '../providers/providers.dart';
import '../services/api_repository.dart';

class HousekeepingScreen extends ConsumerStatefulWidget {
  const HousekeepingScreen({super.key});
  @override
  ConsumerState<HousekeepingScreen> createState() => _HousekeepingScreenState();
}

class _HousekeepingScreenState extends ConsumerState<HousekeepingScreen> {
  String? _statusFilter;

  List<HousekeepingTask> _filtered(List<HousekeepingTask> tasks) {
    if (_statusFilter == null) return tasks;
    return tasks.where((t) => t.status == _statusFilter).toList();
  }

  Color _priorityColor(String p) {
    switch (p) {
      case 'urgent': return Colors.red;
      case 'high': return Colors.orange;
      case 'medium': return Colors.blue;
      default: return Colors.grey;
    }
  }

  IconData _statusIcon(String s) {
    switch (s) {
      case 'in_progress': return Icons.play_circle;
      case 'completed': return Icons.check_circle;
      case 'inspected': return Icons.verified;
      default: return Icons.pending;
    }
  }

  String? _nextStatus(String current) {
    switch (current) {
      case 'pending': return 'in_progress';
      case 'in_progress': return 'completed';
      case 'completed': return 'inspected';
      default: return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final state = ref.watch(housekeepingProvider);
    final tasks = _filtered(state.items);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.housekeeping),
        actions: [
          PopupMenuButton<String?>(
            icon: const Icon(Icons.filter_list),
            tooltip: 'Filter by status',
            onSelected: (v) => setState(() => _statusFilter = v),
            itemBuilder: (_) => [
              const PopupMenuItem(value: null, child: Text('All')),
              ...HousekeepingTask.statuses.map(
                (s) => PopupMenuItem(value: s, child: Text(s.replaceAll('_', ' '))),
              ),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showTaskForm(context),
        child: const Icon(Icons.add),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? Center(child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(state.error!, style: const TextStyle(color: Colors.red)),
                    const SizedBox(height: 8),
                    FilledButton(onPressed: () => ref.read(housekeepingProvider.notifier).fetch(), child: Text(l10n.retry)),
                  ],
                ))
              : tasks.isEmpty
                  ? Center(child: Text(l10n.noHousekeepingTasks))
                  : RefreshIndicator(
                      onRefresh: () => ref.read(housekeepingProvider.notifier).fetch(),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: tasks.length,
                        itemBuilder: (context, index) {
                          final task = tasks[index];
                          final next = _nextStatus(task.status);
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: _priorityColor(task.priority).withValues(alpha: 0.15),
                                child: Icon(_statusIcon(task.status), color: _priorityColor(task.priority)),
                              ),
                              title: Text('${l10n.room} ${task.roomNumber ?? task.roomId}'),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${task.type.replaceAll('_', ' ')} • ${task.priority}',
                                    style: Theme.of(context).textTheme.bodySmall),
                                  if (task.assigneeName != null)
                                    Text(task.assigneeName!, style: Theme.of(context).textTheme.bodySmall),
                                ],
                              ),
                              trailing: next != null
                                  ? IconButton(
                                      icon: const Icon(Icons.arrow_forward),
                                      tooltip: next.replaceAll('_', ' '),
                                      onPressed: () async {
                                        try {
                                          await ref.read(housekeepingProvider.notifier).update(task.id, {'status': next});
                                        } catch (e) {
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                                          }
                                        }
                                      },
                                    )
                                  : const Icon(Icons.check, color: Colors.green),
                              onLongPress: () => _confirmDelete(context, task),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }

  void _showTaskForm(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    String type = 'daily_clean';
    String priority = 'medium';
    int? roomId;
    String notes = '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.of(ctx).viewInsets.bottom + 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l10n.addHousekeepingTask, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: type,
                decoration: InputDecoration(labelText: l10n.taskType, border: const OutlineInputBorder()),
                items: HousekeepingTask.types.map((t) => DropdownMenuItem(value: t, child: Text(t.replaceAll('_', ' ')))).toList(),
                onChanged: (v) => setModalState(() => type = v!),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: priority,
                decoration: InputDecoration(labelText: l10n.priority, border: const OutlineInputBorder()),
                items: HousekeepingTask.priorities.map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                onChanged: (v) => setModalState(() => priority = v!),
              ),
              const SizedBox(height: 12),
              // Room selection from rooms provider
              Consumer(builder: (context, ref, _) {
                final rooms = ref.watch(roomsProvider).items;
                return DropdownButtonFormField<int>(
                  value: roomId,
                  decoration: InputDecoration(labelText: l10n.room, border: const OutlineInputBorder()),
                  items: rooms.map((r) => DropdownMenuItem(value: r.id, child: Text('${l10n.room} ${r.roomNumber}'))).toList(),
                  onChanged: (v) => setModalState(() => roomId = v),
                );
              }),
              const SizedBox(height: 12),
              TextFormField(
                decoration: InputDecoration(labelText: l10n.notes, border: const OutlineInputBorder()),
                maxLines: 2,
                onChanged: (v) => notes = v,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: roomId == null ? null : () async {
                  Navigator.of(ctx).pop();
                  try {
                    await ref.read(housekeepingProvider.notifier).create({
                      'roomId': roomId,
                      'type': type,
                      'priority': priority,
                      'notes': notes.isNotEmpty ? notes : null,
                    });
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                    }
                  }
                },
                child: Text(l10n.save),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context, HousekeepingTask task) {
    final l10n = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.deleteConfirmTitle),
        content: Text(l10n.deleteConfirmMessage),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l10n.cancel)),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ref.read(housekeepingProvider.notifier).delete(task.id);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                }
              }
            },
            child: Text(l10n.delete),
          ),
        ],
      ),
    );
  }
}
