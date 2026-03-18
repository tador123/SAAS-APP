import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb, kReleaseMode, debugPrint;
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/material.dart';

/// Global navigator key for programmatic navigation.
final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

class GuestAuthService {
  static const _storage = FlutterSecureStorage(
    webOptions: WebOptions.defaultOptions,
  );
  static const _tokenKey = 'guest_auth_token';
  static const _refreshTokenKey = 'guest_refresh_token';
  static const _guestKey = 'guest_data';

  static bool _isRefreshing = false;

  static String get baseUrl {
    const envUrl = String.fromEnvironment('API_BASE_URL');
    if (envUrl.isNotEmpty) return envUrl;
    if (kIsWeb) return 'http://localhost:3001/api';
    if (kReleaseMode) return 'https://app.hotelware.in/api';
    return 'http://10.0.2.2:3001/api';
  }

  static final Dio _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
    headers: {'Content-Type': 'application/json'},
  ))
    ..interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401 &&
            !_isRefreshing &&
            error.requestOptions.path != '/guest-auth/login' &&
            error.requestOptions.path != '/guest-auth/refresh-token') {
          final refreshed = await _tryRefreshToken();
          if (refreshed) {
            final token = await getToken();
            error.requestOptions.headers['Authorization'] = 'Bearer $token';
            try {
              final response = await _dio.fetch(error.requestOptions);
              return handler.resolve(response);
            } catch (e) {
              return handler.next(error);
            }
          } else {
            await _clearStorage();
          }
        }
        handler.next(error);
      },
    ));

  static Dio get dio => _dio;

  static Future<bool> _tryRefreshToken() async {
    _isRefreshing = true;
    try {
      final refreshToken = await _storage.read(key: _refreshTokenKey);
      if (refreshToken == null) {
        _isRefreshing = false;
        return false;
      }

      final response = await Dio(BaseOptions(
        baseUrl: baseUrl,
        headers: {'Content-Type': 'application/json'},
      )).post('/guest-auth/refresh-token', data: {
        'refreshToken': refreshToken,
      });

      final data = response.data as Map<String, dynamic>;
      await _storage.write(key: _tokenKey, value: data['token'] as String);
      if (data['refreshToken'] != null) {
        await _storage.write(key: _refreshTokenKey, value: data['refreshToken'] as String);
      }
      _isRefreshing = false;
      return true;
    } catch (e) {
      debugPrint('Guest token refresh failed: $e');
      _isRefreshing = false;
      return false;
    }
  }

  static Future<Map<String, dynamic>> register({
    required String firstName,
    required String lastName,
    required String email,
    required String phone,
    required String password,
  }) async {
    final response = await _dio.post('/guest-auth/register', data: {
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'phone': phone,
      'password': password,
    });

    final data = response.data as Map<String, dynamic>;
    await _storage.write(key: _tokenKey, value: data['token'] as String);
    if (data['refreshToken'] != null) {
      await _storage.write(key: _refreshTokenKey, value: data['refreshToken'] as String);
    }
    await _storage.write(key: _guestKey, value: jsonEncode(data['guest']));
    return data['guest'] as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post('/guest-auth/login', data: {
      'email': email,
      'password': password,
    });

    final data = response.data as Map<String, dynamic>;
    await _storage.write(key: _tokenKey, value: data['token'] as String);
    if (data['refreshToken'] != null) {
      await _storage.write(key: _refreshTokenKey, value: data['refreshToken'] as String);
    }
    await _storage.write(key: _guestKey, value: jsonEncode(data['guest']));
    return data['guest'] as Map<String, dynamic>;
  }

  static Future<void> verifyCode(String code) async {
    await _dio.post('/guest-auth/verify-code', data: {'code': code});
    // Update local guest data
    final profile = await getProfile();
    if (profile != null) {
      await _storage.write(key: _guestKey, value: jsonEncode(profile));
    }
  }

  static Future<Map<String, dynamic>?> getProfile() async {
    try {
      final response = await _dio.get('/guest-auth/profile');
      final data = response.data as Map<String, dynamic>;
      return data['guest'] as Map<String, dynamic>?;
    } catch (e) {
      return null;
    }
  }

  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> updates) async {
    final response = await _dio.put('/guest-auth/profile', data: updates);
    final data = response.data as Map<String, dynamic>;
    final guest = data['guest'] as Map<String, dynamic>;
    await _storage.write(key: _guestKey, value: jsonEncode(guest));
    return guest;
  }

  static Future<void> logout() async {
    try {
      final refreshToken = await _storage.read(key: _refreshTokenKey);
      if (refreshToken != null) {
        await _dio.post('/guest-auth/logout', data: {'refreshToken': refreshToken});
      }
    } catch (_) {}
    await _clearStorage();
  }

  static Future<void> _clearStorage() async {
    try {
      await _storage.delete(key: _tokenKey);
      await _storage.delete(key: _refreshTokenKey);
      await _storage.delete(key: _guestKey);
    } catch (e) {
      debugPrint('[GuestAuthService] clearStorage failed: $e');
    }
  }

  static Future<String?> getToken() async {
    try {
      return await _storage.read(key: _tokenKey);
    } catch (e) {
      return null;
    }
  }

  static Future<Map<String, dynamic>?> getStoredGuest() async {
    try {
      final raw = await _storage.read(key: _guestKey);
      if (raw == null) return null;
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (e) {
      return null;
    }
  }

  static Future<bool> isAuthenticated() async {
    try {
      final token = await getToken();
      return token != null && token.isNotEmpty;
    } catch (e) {
      return false;
    }
  }
}
