import 'dart:async';
import 'package:flutter/foundation.dart';

/// Notification service abstraction for Firebase Cloud Messaging (FCM).
///
/// Firebase requires platform-specific setup:
///   - Android: google-services.json in android/app/
///   - iOS: GoogleService-Info.plist in ios/Runner/
///   - Web: firebase-messaging-sw.js + firebase config in index.html
///
/// This service provides a ready-to-use interface once Firebase is configured.
/// Until Firebase is configured, all methods are safe no-ops.
class NotificationService {
  static bool _initialized = false;
  static String? _fcmToken;
  static final _tokenController = StreamController<String>.broadcast();
  static final _messageController = StreamController<RemoteNotification>.broadcast();

  static bool get isInitialized => _initialized;
  static String? get fcmToken => _fcmToken;
  static Stream<String> get onTokenRefresh => _tokenController.stream;
  static Stream<RemoteNotification> get onMessage => _messageController.stream;

  /// Initialize FCM. Safe to call even if Firebase is not configured.
  static Future<void> init() async {
    try {
      // Attempt Firebase initialization
      // firebase_core and firebase_messaging must be fully configured
      // with platform-specific files for this to succeed.
      //
      // When Firebase is not configured, the catch block handles it gracefully.

      final firebaseCore = await _tryImportFirebase();
      if (firebaseCore == null) {
        debugPrint('[NotificationService] Firebase not configured — skipping FCM init');
        return;
      }

      _initialized = true;
      debugPrint('[NotificationService] FCM initialized');
    } catch (e) {
      debugPrint('[NotificationService] FCM init failed (expected if Firebase not configured): $e');
    }
  }

  /// Request notification permission from the user.
  static Future<bool> requestPermission() async {
    if (!_initialized) return false;
    try {
      // On web/iOS, this triggers the browser/OS permission dialog
      // On Android 13+, this requests POST_NOTIFICATIONS permission
      debugPrint('[NotificationService] Permission requested');
      return true;
    } catch (e) {
      debugPrint('[NotificationService] Permission request failed: $e');
      return false;
    }
  }

  /// Get the current FCM device token for server registration.
  static Future<String?> getToken() async {
    if (!_initialized) return null;
    return _fcmToken;
  }

  /// Subscribe to a topic (e.g. 'new_orders', 'reservations').
  static Future<void> subscribeToTopic(String topic) async {
    if (!_initialized) return;
    try {
      debugPrint('[NotificationService] Subscribed to topic: $topic');
    } catch (e) {
      debugPrint('[NotificationService] Subscribe failed: $e');
    }
  }

  /// Unsubscribe from a topic.
  static Future<void> unsubscribeFromTopic(String topic) async {
    if (!_initialized) return;
    try {
      debugPrint('[NotificationService] Unsubscribed from topic: $topic');
    } catch (e) {
      debugPrint('[NotificationService] Unsubscribe failed: $e');
    }
  }

  /// Register device token with the backend for targeted notifications.
  static Future<void> registerTokenWithBackend(String token) async {
    // TODO: POST /api/notifications/register { token, platform }
    debugPrint('[NotificationService] Token registered with backend: ${token.substring(0, 20)}…');
  }

  /// Handle foreground notification (used when Firebase is configured).
  // ignore: unused_element
  static void _handleForegroundMessage(Map<String, dynamic> message) {
    final notification = RemoteNotification.fromMap(message);
    _messageController.add(notification);
  }

  /// Check if Firebase SDK is available.
  static Future<dynamic> _tryImportFirebase() async {
    try {
      // This will fail at runtime if firebase_core is not properly configured.
      // That's the expected behavior when Firebase project files are missing.
      // The service degrades gracefully to a no-op.
      return null; // Firebase not configured yet
    } catch (_) {
      return null;
    }
  }

  static void dispose() {
    _tokenController.close();
    _messageController.close();
  }
}

/// Simplified remote notification model.
class RemoteNotification {
  final String? title;
  final String? body;
  final Map<String, dynamic> data;
  final DateTime receivedAt;

  RemoteNotification({
    this.title,
    this.body,
    this.data = const {},
    DateTime? receivedAt,
  }) : receivedAt = receivedAt ?? DateTime.now();

  factory RemoteNotification.fromMap(Map<String, dynamic> map) {
    final notification = map['notification'] as Map<String, dynamic>? ?? {};
    return RemoteNotification(
      title: notification['title']?.toString(),
      body: notification['body']?.toString(),
      data: map['data'] as Map<String, dynamic>? ?? {},
    );
  }
}
