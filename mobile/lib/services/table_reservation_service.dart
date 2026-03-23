import 'dart:convert';
import '../services/guest_auth_service.dart';

class TableReservationService {
  static final _dio = GuestAuthService.dio;

  static Map<String, dynamic> _parseJson(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is String) return jsonDecode(data) as Map<String, dynamic>;
    return <String, dynamic>{};
  }

  /// Create a table reservation with optional pre-order
  static Future<Map<String, dynamic>> createReservation({
    required int tableId,
    required int propertyId,
    required String reservationDate,
    required String reservationTime,
    required int partySize,
    String? specialRequests,
    List<Map<String, dynamic>>? preOrderItems,
  }) async {
    final response = await _dio.post('/guest/table-reservations', data: {
      'tableId': tableId,
      'propertyId': propertyId,
      'reservationDate': reservationDate,
      'reservationTime': reservationTime,
      'partySize': partySize,
      if (specialRequests != null) 'specialRequests': specialRequests,
      if (preOrderItems != null && preOrderItems.isNotEmpty) 'preOrderItems': preOrderItems,
    });
    final data = _parseJson(response.data);
    return data['reservation'] as Map<String, dynamic>;
  }

  /// Get my table reservations
  static Future<Map<String, dynamic>> getReservations({String? status, int page = 1}) async {
    final params = <String, dynamic>{'page': page};
    if (status != null) params['status'] = status;

    final response = await _dio.get('/guest/table-reservations', queryParameters: params);
    return _parseJson(response.data);
  }

  /// Cancel a table reservation
  static Future<void> cancelReservation(int id) async {
    await _dio.delete('/guest/table-reservations/$id');
  }
}
