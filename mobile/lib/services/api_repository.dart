import 'package:dio/dio.dart';
import '../models/models.dart';
import 'auth_service.dart';

/// Generic paginated response wrapper.
class PaginatedResponse<T> {
  final List<T> data;
  final int total;
  final int page;
  final int totalPages;

  const PaginatedResponse({
    required this.data,
    required this.total,
    required this.page,
    required this.totalPages,
  });
}

/// Centralized API repository for all CRUD operations.
class ApiRepository {
  static Dio get _dio => AuthService.dio;

  // ─── Helpers ──────────────────────────────────────────────
  static List<T> _parseList<T>(
    dynamic data,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    final list = data is List ? data : (data['data'] as List? ?? []);
    return list
        .cast<Map<String, dynamic>>()
        .map(fromJson)
        .toList();
  }

  static PaginatedResponse<T> _parsePaginated<T>(
    dynamic data,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    if (data is List) {
      return PaginatedResponse(
        data: data.cast<Map<String, dynamic>>().map(fromJson).toList(),
        total: data.length,
        page: 1,
        totalPages: 1,
      );
    }
    final map = data as Map<String, dynamic>;
    final items = (map['data'] as List? ?? [])
        .cast<Map<String, dynamic>>()
        .map(fromJson)
        .toList();
    final pag = map['pagination'] as Map<String, dynamic>?;
    return PaginatedResponse(
      data: items,
      total: (pag?['total'] as num?)?.toInt() ?? items.length,
      page: (pag?['page'] as num?)?.toInt() ?? 1,
      totalPages: (pag?['totalPages'] as num?)?.toInt() ?? 1,
    );
  }

  // ─── Dashboard ────────────────────────────────────────────
  static Future<Map<String, dynamic>> getDashboardStats() async {
    final res = await _dio.get('/dashboard/stats');
    return res.data as Map<String, dynamic>;
  }

  // ─── Rooms ────────────────────────────────────────────────
  static Future<List<Room>> getRooms() async {
    final res = await _dio.get('/rooms');
    return _parsePaginated(res.data, Room.fromJson).data;
  }

  static Future<Room> createRoom(Map<String, dynamic> data) async {
    final res = await _dio.post('/rooms', data: data);
    return Room.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<Room> updateRoom(int id, Map<String, dynamic> data) async {
    final res = await _dio.put('/rooms/$id', data: data);
    return Room.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<void> deleteRoom(int id) async {
    await _dio.delete('/rooms/$id');
  }

  // ─── Guests ───────────────────────────────────────────────
  static Future<List<Guest>> getGuests() async {
    final res = await _dio.get('/guests');
    return _parsePaginated(res.data, Guest.fromJson).data;
  }

  static Future<Guest> createGuest(Map<String, dynamic> data) async {
    final res = await _dio.post('/guests', data: data);
    return Guest.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<Guest> updateGuest(int id, Map<String, dynamic> data) async {
    final res = await _dio.put('/guests/$id', data: data);
    return Guest.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<void> deleteGuest(int id) async {
    await _dio.delete('/guests/$id');
  }

  // ─── Reservations ─────────────────────────────────────────
  static Future<List<Reservation>> getReservations() async {
    final res = await _dio.get('/reservations');
    return _parsePaginated(res.data, Reservation.fromJson).data;
  }

  static Future<Reservation> createReservation(Map<String, dynamic> data) async {
    final res = await _dio.post('/reservations', data: data);
    return Reservation.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<Reservation> updateReservation(int id, Map<String, dynamic> data) async {
    final res = await _dio.put('/reservations/$id', data: data);
    return Reservation.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<void> deleteReservation(int id) async {
    await _dio.delete('/reservations/$id');
  }

  // ─── Orders ───────────────────────────────────────────────
  static Future<List<Order>> getOrders() async {
    final res = await _dio.get('/orders');
    return _parsePaginated(res.data, Order.fromJson).data;
  }

  static Future<Order> createOrder(Map<String, dynamic> data) async {
    final res = await _dio.post('/orders', data: data);
    return Order.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<Order> updateOrder(int id, Map<String, dynamic> data) async {
    final res = await _dio.put('/orders/$id', data: data);
    return Order.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<void> deleteOrder(int id) async {
    await _dio.delete('/orders/$id');
  }

  // ─── Invoices ─────────────────────────────────────────────
  static Future<List<Invoice>> getInvoices() async {
    final res = await _dio.get('/invoices');
    return _parsePaginated(res.data, Invoice.fromJson).data;
  }

  static Future<Invoice> createInvoice(Map<String, dynamic> data) async {
    final res = await _dio.post('/invoices', data: data);
    return Invoice.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<Invoice> updateInvoice(int id, Map<String, dynamic> data) async {
    final res = await _dio.put('/invoices/$id', data: data);
    return Invoice.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<void> deleteInvoice(int id) async {
    await _dio.delete('/invoices/$id');
  }

  // ─── Restaurant ───────────────────────────────────────────
  static Future<List<MenuCategory>> getCategories() async {
    final res = await _dio.get('/restaurant/categories');
    return _parseList(res.data, MenuCategory.fromJson);
  }

  static Future<List<MenuItem>> getMenuItems() async {
    final res = await _dio.get('/restaurant/menu-items');
    return _parseList(res.data, MenuItem.fromJson);
  }

  static Future<List<RestaurantTable>> getTables() async {
    final res = await _dio.get('/restaurant/tables');
    return _parseList(res.data, RestaurantTable.fromJson);
  }

  static Future<MenuCategory> createCategory(Map<String, dynamic> data) async {
    final res = await _dio.post('/restaurant/categories', data: data);
    return MenuCategory.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<MenuItem> createMenuItem(Map<String, dynamic> data) async {
    final res = await _dio.post('/restaurant/menu-items', data: data);
    return MenuItem.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<RestaurantTable> createTable(Map<String, dynamic> data) async {
    final res = await _dio.post('/restaurant/tables', data: data);
    return RestaurantTable.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<RestaurantTable> updateTable(int id, Map<String, dynamic> data) async {
    final res = await _dio.put('/restaurant/tables/$id', data: data);
    return RestaurantTable.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<MenuItem> updateMenuItem(int id, Map<String, dynamic> data) async {
    final res = await _dio.put('/restaurant/menu-items/$id', data: data);
    return MenuItem.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<void> deleteMenuItem(int id) async {
    await _dio.delete('/restaurant/menu-items/$id');
  }

  static Future<MenuCategory> updateCategory(int id, Map<String, dynamic> data) async {
    final res = await _dio.put('/restaurant/categories/$id', data: data);
    return MenuCategory.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<void> deleteCategory(int id) async {
    await _dio.delete('/restaurant/categories/$id');
  }

  static Future<void> deleteTable(int id) async {
    await _dio.delete('/restaurant/tables/$id');
  }

  // ─── Users (admin only) ───────────────────────────────────
  static Future<List<User>> getUsers() async {
    final res = await _dio.get('/users');
    return _parsePaginated(res.data, User.fromJson).data;
  }

  static Future<User> createUser(Map<String, dynamic> data) async {
    final res = await _dio.post('/users', data: data);
    return User.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<User> updateUser(int id, Map<String, dynamic> data) async {
    final res = await _dio.put('/users/$id', data: data);
    return User.fromJson(res.data as Map<String, dynamic>);
  }

  static Future<void> deleteUser(int id) async {
    await _dio.delete('/users/$id');
  }

  static Future<User> toggleUserActive(int id, bool isActive) async {
    final res = await _dio.patch('/users/$id/toggle-active', data: {'isActive': isActive});
    return User.fromJson(res.data as Map<String, dynamic>);
  }
}
