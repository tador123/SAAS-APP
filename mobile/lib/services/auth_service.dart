import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/material.dart';
import '../models/user.dart';

/// Global navigator key for programmatic navigation (e.g. 401 redirect).
final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

class AuthService {
  static const _storage = FlutterSecureStorage(
    webOptions: WebOptions.defaultOptions,
  );
  static const _tokenKey = 'auth_token';
  static const _refreshTokenKey = 'auth_refresh_token';
  static const _userKey = 'auth_user';

  static bool _isRefreshing = false;

  /// Base URL configurable via compile-time define:
  ///   flutter run --dart-define=API_BASE_URL=https://api.example.com/api
  static String get baseUrl {
    const envUrl = String.fromEnvironment('API_BASE_URL');
    if (envUrl.isNotEmpty) return envUrl;
    if (kIsWeb) return 'http://localhost:3001/api';
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
            error.requestOptions.path != '/auth/login' &&
            error.requestOptions.path != '/auth/refresh-token') {
          // Try to refresh the token
          final refreshed = await _tryRefreshToken();
          if (refreshed) {
            // Retry the original request with the new token
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
      )).post('/auth/refresh-token', data: {
        'refreshToken': refreshToken,
      });

      final data = response.data as Map<String, dynamic>;
      await _storage.write(key: _tokenKey, value: data['token'] as String);
      if (data['refreshToken'] != null) {
        await _storage.write(
            key: _refreshTokenKey, value: data['refreshToken'] as String);
      }
      _isRefreshing = false;
      return true;
    } catch (e) {
      debugPrint('Token refresh failed: $e');
      _isRefreshing = false;
      return false;
    }
  }

  static Future<User> login(String email, String password) async {
    final response = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });

    final data = response.data as Map<String, dynamic>;
    await _storage.write(key: _tokenKey, value: data['token'] as String);
    if (data['refreshToken'] != null) {
      await _storage.write(
          key: _refreshTokenKey, value: data['refreshToken'] as String);
    }
    await _storage.write(key: _userKey, value: jsonEncode(data['user']));

    return User.fromJson(data['user'] as Map<String, dynamic>);
  }

  /// Self-registration: creates a new property + admin account
  static Future<User> signup({
    required String propertyName,
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? phone,
    String? country,
    String? currency,
  }) async {
    final response = await _dio.post('/auth/signup', data: {
      'propertyName': propertyName,
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'password': password,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      if (country != null && country.isNotEmpty) 'country': country,
      if (currency != null && currency.isNotEmpty) 'currency': currency,
    });

    final data = response.data as Map<String, dynamic>;
    await _storage.write(key: _tokenKey, value: data['token'] as String);
    if (data['refreshToken'] != null) {
      await _storage.write(
          key: _refreshTokenKey, value: data['refreshToken'] as String);
    }
    await _storage.write(key: _userKey, value: jsonEncode(data['user']));

    return User.fromJson(data['user'] as Map<String, dynamic>);
  }

  /// Server-side logout + clear local storage
  static Future<void> logout() async {
    try {
      final refreshToken = await _storage.read(key: _refreshTokenKey);
      if (refreshToken != null) {
        await _dio.post('/auth/logout', data: {
          'refreshToken': refreshToken,
        });
      }
    } catch (_) {
      // Server logout is best-effort
    }
    await _clearStorage();
  }

  static Future<void> _clearStorage() async {
    try {
      await _storage.delete(key: _tokenKey);
      await _storage.delete(key: _refreshTokenKey);
      await _storage.delete(key: _userKey);
    } catch (e) {
      debugPrint('[AuthService] clearStorage failed: $e');
    }
  }

  static Future<String?> getToken() async {
    try {
      return await _storage.read(key: _tokenKey);
    } catch (e) {
      debugPrint('[AuthService] getToken failed: $e');
      return null;
    }
  }

  static Future<User?> getStoredUser() async {
    try {
      final raw = await _storage.read(key: _userKey);
      if (raw == null) return null;
      return User.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (e) {
      debugPrint('[AuthService] getStoredUser failed: $e');
      return null;
    }
  }

  static Future<bool> isAuthenticated() async {
    try {
      final token = await getToken();
      return token != null && token.isNotEmpty;
    } catch (e) {
      debugPrint('[AuthService] isAuthenticated failed: $e');
      return false;
    }
  }

  /// Update the user's profile (firstName, lastName, phone)
  static Future<User> updateProfile(Map<String, dynamic> data) async {
    final response = await _dio.put('/auth/profile', data: data);
    final user =
        User.fromJson(response.data['user'] as Map<String, dynamic>);
    await _storage.write(key: _userKey, value: jsonEncode(response.data['user']));
    return user;
  }

  /// Change password
  static Future<void> changePassword(
      String currentPassword, String newPassword) async {
    await _dio.put('/auth/change-password', data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }

  /// Forgot password — request reset email
  static Future<void> forgotPassword(String email) async {
    await _dio.post('/auth/forgot-password', data: {'email': email});
  }

  /// Reset password with token
  static Future<void> resetPassword(String token, String newPassword) async {
    await _dio.post('/auth/reset-password', data: {
      'token': token,
      'newPassword': newPassword,
    });
  }

  /// Get subscription plan info (current plan, limits, usage)
  static Future<Map<String, dynamic>> getSubscriptionInfo() async {
    final response = await _dio.get('/auth/subscription');
    return response.data as Map<String, dynamic>;
  }

  /// Change subscription plan (admin only) — updates the property's plan
  static Future<void> changePlan(String plan) async {
    await _dio.put('/auth/subscription', data: {'plan': plan});
  }
}
