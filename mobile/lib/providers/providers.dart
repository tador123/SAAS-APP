import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../services/auth_service.dart';
import '../services/api_repository.dart';
import '../services/offline_aware_repository.dart';
import '../services/offline_service.dart';

// ─── Auth State ────────────────────────────────────────────
class AuthState {
  final User? user;
  final bool isLoading;
  final bool isAuthenticated;
  final String? error;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.isAuthenticated = false,
    this.error,
  });

  AuthState copyWith({
    User? user,
    bool? isLoading,
    bool? isAuthenticated,
    String? error,
  }) =>
      AuthState(
        user: user ?? this.user,
        isLoading: isLoading ?? this.isLoading,
        isAuthenticated: isAuthenticated ?? this.isAuthenticated,
        error: error,
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _init();
  }

  Future<void> _init() async {
    state = state.copyWith(isLoading: true);
    final isAuth = await AuthService.isAuthenticated();
    if (isAuth) {
      final user = await AuthService.getStoredUser();
      state = AuthState(user: user, isAuthenticated: true, isLoading: false);
    } else {
      state = const AuthState(isLoading: false);
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = await AuthService.login(email, password);
      state = AuthState(user: user, isAuthenticated: true, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: _formatError(e),
      );
      rethrow;
    }
  }

  Future<void> logout() async {
    await AuthService.logout();
    state = const AuthState();
  }

  /// Re-read user from secure storage (after profile update)
  Future<void> refreshUser() async {
    final user = await AuthService.getStoredUser();
    if (user != null) {
      state = state.copyWith(user: user);
    }
  }
}

// ─── Generic async list state ──────────────────────────────
class AsyncListState<T> {
  final List<T> items;
  final bool isLoading;
  final String? error;

  const AsyncListState({
    this.items = const [],
    this.isLoading = false,
    this.error,
  });

  AsyncListState<T> copyWith({
    List<T>? items,
    bool? isLoading,
    String? error,
  }) =>
      AsyncListState<T>(
        items: items ?? this.items,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

// ─── Rooms ─────────────────────────────────────────────────
class RoomsNotifier extends StateNotifier<AsyncListState<Room>> {
  RoomsNotifier() : super(const AsyncListState(isLoading: true)) {
    fetch();
  }

  Future<void> fetch() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final rooms = await OfflineAwareRepository.getRooms();
      state = AsyncListState(items: rooms);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _formatError(e));
    }
  }

  Future<void> create(Map<String, dynamic> data) async {
    final room = await OfflineAwareRepository.createRoom(data);
    state = AsyncListState(items: [...state.items, room]);
  }

  Future<void> update(int id, Map<String, dynamic> data) async {
    final updated = await OfflineAwareRepository.updateRoom(id, data);
    state = AsyncListState(
      items: state.items.map((r) => r.id == id ? updated : r).toList(),
    );
  }

  Future<void> delete(int id) async {
    await OfflineAwareRepository.deleteRoom(id);
    state = AsyncListState(
      items: state.items.where((r) => r.id != id).toList(),
    );
  }
}

// ─── Guests ────────────────────────────────────────────────
class GuestsNotifier extends StateNotifier<AsyncListState<Guest>> {
  GuestsNotifier() : super(const AsyncListState(isLoading: true)) {
    fetch();
  }

  Future<void> fetch() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final guests = await OfflineAwareRepository.getGuests();
      state = AsyncListState(items: guests);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _formatError(e));
    }
  }

  Future<void> create(Map<String, dynamic> data) async {
    final guest = await OfflineAwareRepository.createGuest(data);
    state = AsyncListState(items: [...state.items, guest]);
  }

  Future<void> update(int id, Map<String, dynamic> data) async {
    final updated = await OfflineAwareRepository.updateGuest(id, data);
    state = AsyncListState(
      items: state.items.map((g) => g.id == id ? updated : g).toList(),
    );
  }

  Future<void> delete(int id) async {
    await OfflineAwareRepository.deleteGuest(id);
    state = AsyncListState(
      items: state.items.where((g) => g.id != id).toList(),
    );
  }
}

// ─── Reservations ──────────────────────────────────────────
class ReservationsNotifier extends StateNotifier<AsyncListState<Reservation>> {
  ReservationsNotifier() : super(const AsyncListState(isLoading: true)) {
    fetch();
  }

  Future<void> fetch() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final items = await OfflineAwareRepository.getReservations();
      state = AsyncListState(items: items);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _formatError(e));
    }
  }

  Future<void> create(Map<String, dynamic> data) async {
    final item = await OfflineAwareRepository.createReservation(data);
    state = AsyncListState(items: [...state.items, item]);
  }

  Future<void> update(int id, Map<String, dynamic> data) async {
    final updated = await OfflineAwareRepository.updateReservation(id, data);
    state = AsyncListState(
      items: state.items.map((r) => r.id == id ? updated : r).toList(),
    );
  }

  Future<void> delete(int id) async {
    await OfflineAwareRepository.deleteReservation(id);
    state = AsyncListState(
      items: state.items.where((r) => r.id != id).toList(),
    );
  }
}

// ─── Orders ────────────────────────────────────────────────
class OrdersNotifier extends StateNotifier<AsyncListState<Order>> {
  OrdersNotifier() : super(const AsyncListState(isLoading: true)) {
    fetch();
  }

  Future<void> fetch() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final items = await OfflineAwareRepository.getOrders();
      state = AsyncListState(items: items);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _formatError(e));
    }
  }

  Future<void> create(Map<String, dynamic> data) async {
    final item = await OfflineAwareRepository.createOrder(data);
    state = AsyncListState(items: [...state.items, item]);
  }

  Future<void> update(int id, Map<String, dynamic> data) async {
    final updated = await OfflineAwareRepository.updateOrder(id, data);
    state = AsyncListState(
      items: state.items.map((o) => o.id == id ? updated : o).toList(),
    );
  }

  Future<void> delete(int id) async {
    await OfflineAwareRepository.deleteOrder(id);
    state = AsyncListState(
      items: state.items.where((o) => o.id != id).toList(),
    );
  }
}

// ─── Invoices ──────────────────────────────────────────────
class InvoicesNotifier extends StateNotifier<AsyncListState<Invoice>> {
  InvoicesNotifier() : super(const AsyncListState(isLoading: true)) {
    fetch();
  }

  Future<void> fetch() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final items = await OfflineAwareRepository.getInvoices();
      state = AsyncListState(items: items);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _formatError(e));
    }
  }

  Future<void> create(Map<String, dynamic> data) async {
    final item = await OfflineAwareRepository.createInvoice(data);
    state = AsyncListState(items: [...state.items, item]);
  }

  Future<void> update(int id, Map<String, dynamic> data) async {
    final updated = await OfflineAwareRepository.updateInvoice(id, data);
    state = AsyncListState(
      items: state.items.map((i) => i.id == id ? updated : i).toList(),
    );
  }

  Future<void> delete(int id) async {
    await OfflineAwareRepository.deleteInvoice(id);
    state = AsyncListState(
      items: state.items.where((i) => i.id != id).toList(),
    );
  }
}

// ─── Provider Definitions ──────────────────────────────────
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(),
);

final roomsProvider =
    StateNotifierProvider<RoomsNotifier, AsyncListState<Room>>(
  (ref) => RoomsNotifier(),
);

final guestsProvider =
    StateNotifierProvider<GuestsNotifier, AsyncListState<Guest>>(
  (ref) => GuestsNotifier(),
);

final reservationsProvider =
    StateNotifierProvider<ReservationsNotifier, AsyncListState<Reservation>>(
  (ref) => ReservationsNotifier(),
);

final ordersProvider =
    StateNotifierProvider<OrdersNotifier, AsyncListState<Order>>(
  (ref) => OrdersNotifier(),
);

final invoicesProvider =
    StateNotifierProvider<InvoicesNotifier, AsyncListState<Invoice>>(
  (ref) => InvoicesNotifier(),
);

// ─── Users (admin only) ────────────────────────────────────
class UsersNotifier extends StateNotifier<AsyncListState<User>> {
  UsersNotifier() : super(const AsyncListState(isLoading: true)) {
    fetch();
  }

  Future<void> fetch() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final items = await ApiRepository.getUsers();
      state = AsyncListState(items: items);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _formatError(e));
    }
  }

  Future<void> create(Map<String, dynamic> data) async {
    final item = await ApiRepository.createUser(data);
    state = AsyncListState(items: [...state.items, item]);
  }

  Future<void> update(int id, Map<String, dynamic> data) async {
    final updated = await ApiRepository.updateUser(id, data);
    state = AsyncListState(
      items: state.items.map((u) => u.id == id ? updated : u).toList(),
    );
  }

  Future<void> delete(int id) async {
    await ApiRepository.deleteUser(id);
    state = AsyncListState(
      items: state.items.where((u) => u.id != id).toList(),
    );
  }

  Future<void> toggleActive(int id, bool isActive) async {
    final updated = await ApiRepository.toggleUserActive(id, isActive);
    state = AsyncListState(
      items: state.items.map((u) => u.id == id ? updated : u).toList(),
    );
  }
}

final usersProvider =
    StateNotifierProvider<UsersNotifier, AsyncListState<User>>(
  (ref) => UsersNotifier(),
);

// ─── Helpers ───────────────────────────────────────────────
String _formatError(dynamic e) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null) return data['message'].toString();
    if (e.type == DioExceptionType.connectionTimeout) return 'Connection timed out';
    if (e.type == DioExceptionType.connectionError) {
      if (!ConnectivityService.isOnline) return 'You are offline';
      return 'Cannot connect to server';
    }
    return e.message ?? 'Network error';
  }
  return e.toString();
}

// ─── Connectivity Provider ─────────────────────────────────
final connectivityProvider = StreamProvider<bool>((ref) {
  return ConnectivityService.onConnectivityChanged;
});
