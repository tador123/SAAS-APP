import 'dart:convert';
import '../services/guest_auth_service.dart';

class BookingService {
  static final _dio = GuestAuthService.dio;

  static Map<String, dynamic> _parseJson(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is String) return jsonDecode(data) as Map<String, dynamic>;
    return <String, dynamic>{};
  }

  /// Create a new booking
  static Future<Map<String, dynamic>> createBooking({
    required int roomId,
    required String checkIn,
    required String checkOut,
    int adults = 1,
    int children = 0,
    String? specialRequests,
  }) async {
    final response = await _dio.post('/guest/bookings', data: {
      'roomId': roomId,
      'checkIn': checkIn,
      'checkOut': checkOut,
      'adults': adults,
      'children': children,
      if (specialRequests != null) 'specialRequests': specialRequests,
    });
    final data = _parseJson(response.data);
    return data['reservation'] as Map<String, dynamic>;
  }

  /// Get my bookings
  static Future<Map<String, dynamic>> getBookings({String? status, int page = 1}) async {
    final params = <String, dynamic>{'page': page};
    if (status != null) params['status'] = status;

    final response = await _dio.get('/guest/bookings', queryParameters: params);
    return _parseJson(response.data);
  }

  /// Get booking detail
  static Future<Map<String, dynamic>> getBookingDetail(int id) async {
    final response = await _dio.get('/guest/bookings/$id');
    final data = _parseJson(response.data);
    return data['reservation'] as Map<String, dynamic>;
  }

  /// Cancel a booking
  static Future<void> cancelBooking(int id) async {
    await _dio.put('/guest/bookings/$id/cancel');
  }
}
