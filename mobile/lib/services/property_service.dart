import 'dart:convert';
import '../services/guest_auth_service.dart';

class PropertyService {
  static final _dio = GuestAuthService.dio;

  static Map<String, dynamic> _parseJson(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is String) return jsonDecode(data) as Map<String, dynamic>;
    return <String, dynamic>{};
  }

  /// List properties with optional filters
  static Future<Map<String, dynamic>> getProperties({
    String? search,
    String? type,
    String? city,
    String? country,
    int? stars,
    int page = 1,
    int limit = 20,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (search != null && search.isNotEmpty) params['search'] = search;
    if (type != null) params['type'] = type;
    if (city != null) params['city'] = city;
    if (country != null) params['country'] = country;
    if (stars != null) params['stars'] = stars;

    final response = await _dio.get('/public/properties', queryParameters: params);
    return _parseJson(response.data);
  }

  /// Get property detail
  static Future<Map<String, dynamic>> getPropertyDetail(int id) async {
    final response = await _dio.get('/public/properties/$id');
    final data = _parseJson(response.data);
    return data['property'] as Map<String, dynamic>;
  }

  /// Get available rooms for a property
  static Future<List<dynamic>> getPropertyRooms(int propertyId, {String? checkIn, String? checkOut}) async {
    final params = <String, dynamic>{};
    if (checkIn != null) params['checkIn'] = checkIn;
    if (checkOut != null) params['checkOut'] = checkOut;

    final response = await _dio.get('/public/properties/$propertyId/rooms', queryParameters: params);
    final data = _parseJson(response.data);
    return data['rooms'] as List<dynamic>;
  }

  /// Get menu for a property
  static Future<List<dynamic>> getPropertyMenu(int propertyId) async {
    final response = await _dio.get('/public/properties/$propertyId/menu');
    final data = _parseJson(response.data);
    return data['categories'] as List<dynamic>;
  }
}
