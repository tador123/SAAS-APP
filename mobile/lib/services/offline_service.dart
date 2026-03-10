import 'dart:async';
import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';

/// Tracks network connectivity and exposes online status.
class ConnectivityService {
  static final Connectivity _connectivity = Connectivity();
  static final _controller = StreamController<bool>.broadcast();
  static bool _isOnline = true;

  static bool get isOnline => _isOnline;
  static Stream<bool> get onConnectivityChanged => _controller.stream;

  static Future<void> init() async {
    final result = await _connectivity.checkConnectivity();
    _isOnline = !result.contains(ConnectivityResult.none);

    _connectivity.onConnectivityChanged.listen((results) {
      final nowOnline = !results.contains(ConnectivityResult.none);
      if (_isOnline != nowOnline) {
        _isOnline = nowOnline;
        _controller.add(nowOnline);
        if (nowOnline) {
          SyncService.syncPendingMutations();
        }
      }
    });
  }

  static void dispose() {
    _controller.close();
  }
}

/// Local cache using Hive for offline data access.
class OfflineCache {
  static const _dataBoxName = 'offline_data';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox<String>(_dataBoxName);
  }

  /// Cache a list of entities under [key] (e.g. 'rooms', 'guests').
  static Future<void> cacheList(String key, List<Map<String, dynamic>> data) async {
    final box = Hive.box<String>(_dataBoxName);
    await box.put(key, jsonEncode(data));
  }

  /// Retrieve cached list. Returns null if no cache exists.
  static List<Map<String, dynamic>>? getCachedList(String key) {
    final box = Hive.box<String>(_dataBoxName);
    final raw = box.get(key);
    if (raw == null) return null;
    try {
      final list = jsonDecode(raw) as List;
      return list.cast<Map<String, dynamic>>();
    } catch (_) {
      return null;
    }
  }

  /// Cache a single entity.
  static Future<void> cacheItem(String key, int id, Map<String, dynamic> data) async {
    final box = Hive.box<String>(_dataBoxName);
    await box.put('${key}_$id', jsonEncode(data));
  }

  /// Get cached entity by key and id.
  static Map<String, dynamic>? getCachedItem(String key, int id) {
    final box = Hive.box<String>(_dataBoxName);
    final raw = box.get('${key}_$id');
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Clear all cached data.
  static Future<void> clearAll() async {
    final box = Hive.box<String>(_dataBoxName);
    await box.clear();
  }
}

/// Represents a queued mutation to replay when back online.
class PendingMutation {
  final String id;
  final String entity; // 'rooms', 'guests', etc.
  final String method; // 'POST', 'PUT', 'DELETE'
  final String path;   // full API path
  final Map<String, dynamic>? data;
  final DateTime createdAt;

  PendingMutation({
    required this.id,
    required this.entity,
    required this.method,
    required this.path,
    this.data,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'id': id,
    'entity': entity,
    'method': method,
    'path': path,
    'data': data,
    'createdAt': createdAt.toIso8601String(),
  };

  factory PendingMutation.fromJson(Map<String, dynamic> json) => PendingMutation(
    id: json['id'] as String,
    entity: json['entity'] as String,
    method: json['method'] as String,
    path: json['path'] as String,
    data: json['data'] as Map<String, dynamic>?,
    createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
  );
}

/// Manages offline mutation queue using Hive.
class SyncService {
  static const _queueBoxName = 'sync_queue';
  static bool _isSyncing = false;

  static final _syncController = StreamController<SyncStatus>.broadcast();
  static Stream<SyncStatus> get onSyncStatusChanged => _syncController.stream;

  static Future<void> init() async {
    await Hive.openBox<String>(_queueBoxName);
  }

  /// Queue a mutation for later sync.
  static Future<void> queueMutation(PendingMutation mutation) async {
    final box = Hive.box<String>(_queueBoxName);
    await box.put(mutation.id, jsonEncode(mutation.toJson()));
    debugPrint('[SyncService] Queued ${mutation.method} ${mutation.path}');
  }

  /// Get count of pending mutations.
  static int get pendingCount => Hive.box<String>(_queueBoxName).length;

  /// Get all pending mutations in order.
  static List<PendingMutation> getPendingMutations() {
    final box = Hive.box<String>(_queueBoxName);
    final mutations = <PendingMutation>[];
    for (final key in box.keys) {
      final raw = box.get(key);
      if (raw != null) {
        try {
          mutations.add(PendingMutation.fromJson(jsonDecode(raw)));
        } catch (_) {}
      }
    }
    mutations.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return mutations;
  }

  /// Replay all pending mutations against the API.
  static Future<void> syncPendingMutations() async {
    if (_isSyncing || !ConnectivityService.isOnline) return;
    final pending = getPendingMutations();
    if (pending.isEmpty) return;

    _isSyncing = true;
    _syncController.add(SyncStatus.syncing);
    debugPrint('[SyncService] Syncing ${pending.length} pending mutations…');

    // Use lazy import to avoid circular dep
    final dio = (await _getDio());
    final box = Hive.box<String>(_queueBoxName);
    int succeeded = 0;
    int failed = 0;

    for (final mutation in pending) {
      try {
        switch (mutation.method) {
          case 'POST':
            await dio.post(mutation.path, data: mutation.data);
            break;
          case 'PUT':
            await dio.put(mutation.path, data: mutation.data);
            break;
          case 'DELETE':
            await dio.delete(mutation.path);
            break;
        }
        await box.delete(mutation.id);
        succeeded++;
      } catch (e) {
        debugPrint('[SyncService] Failed to sync ${mutation.id}: $e');
        failed++;
      }
    }

    _isSyncing = false;
    debugPrint('[SyncService] Sync complete: $succeeded ok, $failed failed');
    _syncController.add(failed == 0 ? SyncStatus.complete : SyncStatus.partialFailure);
  }

  /// Import Dio lazily to avoid circular dependency.
  static Future<dynamic> _getDio() async {
    // We use the same Dio from AuthService
    return _dioInstance;
  }

  // Dio instance — set during app init
  static dynamic _dioInstance;
  static void setDio(dynamic dio) => _dioInstance = dio;

  static void dispose() {
    _syncController.close();
  }
}

enum SyncStatus {
  syncing,
  complete,
  partialFailure,
}
