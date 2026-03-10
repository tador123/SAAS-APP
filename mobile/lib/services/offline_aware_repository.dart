import 'package:flutter/foundation.dart';
import '../models/models.dart';
import 'api_repository.dart';
import 'offline_service.dart';

/// Wraps [ApiRepository] with offline caching and mutation queuing.
///
/// - On fetch: tries API first, caches result. Falls back to cache if offline.
/// - On create/update/delete: if offline, queues mutation for later sync.
class OfflineAwareRepository {
  // ─── Rooms ────────────────────────────────────────────────
  static Future<List<Room>> getRooms() async {
    try {
      final rooms = await ApiRepository.getRooms();
      await OfflineCache.cacheList(
        'rooms',
        rooms.map((r) => r.toJson()..['id'] = r.id).toList(),
      );
      return rooms;
    } catch (e) {
      if (!ConnectivityService.isOnline) {
        final cached = OfflineCache.getCachedList('rooms');
        if (cached != null) return cached.map(Room.fromJson).toList();
      }
      rethrow;
    }
  }

  static Future<Room> createRoom(Map<String, dynamic> data) async {
    if (ConnectivityService.isOnline) {
      final room = await ApiRepository.createRoom(data);
      return room;
    }
    await _queueMutation('rooms', 'POST', '/rooms', data);
    return Room.fromJson({...data, 'id': -DateTime.now().millisecondsSinceEpoch});
  }

  static Future<Room> updateRoom(int id, Map<String, dynamic> data) async {
    if (ConnectivityService.isOnline) {
      return ApiRepository.updateRoom(id, data);
    }
    await _queueMutation('rooms', 'PUT', '/rooms/$id', data);
    return Room.fromJson({...data, 'id': id});
  }

  static Future<void> deleteRoom(int id) async {
    if (ConnectivityService.isOnline) {
      return ApiRepository.deleteRoom(id);
    }
    await _queueMutation('rooms', 'DELETE', '/rooms/$id', null);
  }

  // ─── Guests ───────────────────────────────────────────────
  static Future<List<Guest>> getGuests() async {
    try {
      final guests = await ApiRepository.getGuests();
      await OfflineCache.cacheList(
        'guests',
        guests.map((g) => g.toJson()..['id'] = g.id).toList(),
      );
      return guests;
    } catch (e) {
      if (!ConnectivityService.isOnline) {
        final cached = OfflineCache.getCachedList('guests');
        if (cached != null) return cached.map(Guest.fromJson).toList();
      }
      rethrow;
    }
  }

  static Future<Guest> createGuest(Map<String, dynamic> data) async {
    if (ConnectivityService.isOnline) return ApiRepository.createGuest(data);
    await _queueMutation('guests', 'POST', '/guests', data);
    return Guest.fromJson({...data, 'id': -DateTime.now().millisecondsSinceEpoch});
  }

  static Future<Guest> updateGuest(int id, Map<String, dynamic> data) async {
    if (ConnectivityService.isOnline) return ApiRepository.updateGuest(id, data);
    await _queueMutation('guests', 'PUT', '/guests/$id', data);
    return Guest.fromJson({...data, 'id': id});
  }

  static Future<void> deleteGuest(int id) async {
    if (ConnectivityService.isOnline) return ApiRepository.deleteGuest(id);
    await _queueMutation('guests', 'DELETE', '/guests/$id', null);
  }

  // ─── Reservations ─────────────────────────────────────────
  static Future<List<Reservation>> getReservations() async {
    try {
      final items = await ApiRepository.getReservations();
      await OfflineCache.cacheList(
        'reservations',
        items.map((r) => r.toJson()..['id'] = r.id).toList(),
      );
      return items;
    } catch (e) {
      if (!ConnectivityService.isOnline) {
        final cached = OfflineCache.getCachedList('reservations');
        if (cached != null) return cached.map(Reservation.fromJson).toList();
      }
      rethrow;
    }
  }

  static Future<Reservation> createReservation(Map<String, dynamic> data) async {
    if (ConnectivityService.isOnline) return ApiRepository.createReservation(data);
    await _queueMutation('reservations', 'POST', '/reservations', data);
    return Reservation.fromJson({...data, 'id': -DateTime.now().millisecondsSinceEpoch});
  }

  static Future<Reservation> updateReservation(int id, Map<String, dynamic> data) async {
    if (ConnectivityService.isOnline) return ApiRepository.updateReservation(id, data);
    await _queueMutation('reservations', 'PUT', '/reservations/$id', data);
    return Reservation.fromJson({...data, 'id': id});
  }

  static Future<void> deleteReservation(int id) async {
    if (ConnectivityService.isOnline) return ApiRepository.deleteReservation(id);
    await _queueMutation('reservations', 'DELETE', '/reservations/$id', null);
  }

  // ─── Orders ───────────────────────────────────────────────
  static Future<List<Order>> getOrders() async {
    try {
      final items = await ApiRepository.getOrders();
      await OfflineCache.cacheList(
        'orders',
        items.map((o) => o.toJson()..['id'] = o.id..['orderNumber'] = o.orderNumber).toList(),
      );
      return items;
    } catch (e) {
      if (!ConnectivityService.isOnline) {
        final cached = OfflineCache.getCachedList('orders');
        if (cached != null) return cached.map(Order.fromJson).toList();
      }
      rethrow;
    }
  }

  static Future<Order> createOrder(Map<String, dynamic> data) async {
    if (ConnectivityService.isOnline) return ApiRepository.createOrder(data);
    await _queueMutation('orders', 'POST', '/orders', data);
    return Order.fromJson({
      ...data,
      'id': -DateTime.now().millisecondsSinceEpoch,
      'orderNumber': 'OFFLINE-${DateTime.now().millisecondsSinceEpoch}',
      'subtotal': 0,
      'total': 0,
    });
  }

  static Future<Order> updateOrder(int id, Map<String, dynamic> data) async {
    if (ConnectivityService.isOnline) return ApiRepository.updateOrder(id, data);
    await _queueMutation('orders', 'PUT', '/orders/$id', data);
    return Order.fromJson({...data, 'id': id, 'orderNumber': '', 'subtotal': 0, 'total': 0});
  }

  static Future<void> deleteOrder(int id) async {
    if (ConnectivityService.isOnline) return ApiRepository.deleteOrder(id);
    await _queueMutation('orders', 'DELETE', '/orders/$id', null);
  }

  // ─── Invoices ─────────────────────────────────────────────
  static Future<List<Invoice>> getInvoices() async {
    try {
      final items = await ApiRepository.getInvoices();
      await OfflineCache.cacheList(
        'invoices',
        items.map((i) => i.toJson()..['id'] = i.id..['invoiceNumber'] = i.invoiceNumber).toList(),
      );
      return items;
    } catch (e) {
      if (!ConnectivityService.isOnline) {
        final cached = OfflineCache.getCachedList('invoices');
        if (cached != null) return cached.map(Invoice.fromJson).toList();
      }
      rethrow;
    }
  }

  static Future<Invoice> createInvoice(Map<String, dynamic> data) async {
    if (ConnectivityService.isOnline) return ApiRepository.createInvoice(data);
    await _queueMutation('invoices', 'POST', '/invoices', data);
    return Invoice.fromJson({
      ...data,
      'id': -DateTime.now().millisecondsSinceEpoch,
      'invoiceNumber': 'OFFLINE-${DateTime.now().millisecondsSinceEpoch}',
      'subtotal': 0,
      'total': 0,
    });
  }

  static Future<Invoice> updateInvoice(int id, Map<String, dynamic> data) async {
    if (ConnectivityService.isOnline) return ApiRepository.updateInvoice(id, data);
    await _queueMutation('invoices', 'PUT', '/invoices/$id', data);
    return Invoice.fromJson({...data, 'id': id, 'invoiceNumber': '', 'subtotal': 0, 'total': 0});
  }

  static Future<void> deleteInvoice(int id) async {
    if (ConnectivityService.isOnline) return ApiRepository.deleteInvoice(id);
    await _queueMutation('invoices', 'DELETE', '/invoices/$id', null);
  }

  // ─── Dashboard ────────────────────────────────────────────
  static Future<Map<String, dynamic>> getDashboardStats() async {
    try {
      final stats = await ApiRepository.getDashboardStats();
      await OfflineCache.cacheList('dashboard_stats', [stats]);
      return stats;
    } catch (e) {
      if (!ConnectivityService.isOnline) {
        final cached = OfflineCache.getCachedList('dashboard_stats');
        if (cached != null && cached.isNotEmpty) return cached.first;
      }
      rethrow;
    }
  }

  // ─── Queue Helper ─────────────────────────────────────────
  static Future<void> _queueMutation(
    String entity,
    String method,
    String path,
    Map<String, dynamic>? data,
  ) async {
    final mutation = PendingMutation(
      id: '${entity}_${method}_${DateTime.now().millisecondsSinceEpoch}',
      entity: entity,
      method: method,
      path: path,
      data: data,
    );
    await SyncService.queueMutation(mutation);
    debugPrint('[OfflineRepo] Queued: $method $path');
  }
}
