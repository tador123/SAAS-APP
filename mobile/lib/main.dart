import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'l10n/app_localizations.dart';
import 'screens/guest_login_screen.dart';
import 'screens/guest_signup_screen.dart';
import 'screens/explore_screen.dart';
import 'screens/property_detail_screen.dart';
import 'screens/room_booking_screen.dart';
import 'screens/my_bookings_screen.dart';
import 'screens/booking_detail_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/edit_profile_screen.dart';
import 'services/guest_auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize theme from saved preference
  try {
    await themeModeNotifier.init();
  } catch (e) {
    debugPrint('[Init] ThemeMode.init failed: $e');
  }

  runApp(const ProviderScope(child: HotelSaaSApp()));
}

final GoRouter _router = GoRouter(
  navigatorKey: rootNavigatorKey,
  initialLocation: '/login',
  redirect: (context, state) async {
    try {
      final loggedIn = await GuestAuthService.isAuthenticated();
      final isAuthPage = state.matchedLocation == '/login' || state.matchedLocation == '/signup';
      if (!loggedIn && !isAuthPage) return '/login';
      if (loggedIn && isAuthPage) return '/';
    } catch (e) {
      debugPrint('[Router] Auth check failed: $e');
      if (state.matchedLocation != '/login' && state.matchedLocation != '/signup') return '/login';
    }
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (context, state) => const GuestLoginScreen()),
    GoRoute(path: '/signup', builder: (context, state) => const GuestSignupScreen()),
    // Property detail (outside shell so no bottom nav)
    GoRoute(
      path: '/property/:id',
      builder: (context, state) {
        final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
        return PropertyDetailScreen(propertyId: id);
      },
    ),
    // Booking flow (outside shell)
    GoRoute(
      path: '/booking',
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>? ?? {};
        return RoomBookingScreen(
          room: extra['room'] as Map<String, dynamic>? ?? {},
          property: extra['property'] as Map<String, dynamic>? ?? {},
        );
      },
    ),
    // Booking detail (outside shell)
    GoRoute(
      path: '/bookings/:id',
      builder: (context, state) {
        final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
        return BookingDetailScreen(bookingId: id);
      },
    ),
    // Edit profile
    GoRoute(path: '/edit-profile', builder: (context, state) => const EditProfileScreen()),
    // Main app shell with bottom navigation
    ShellRoute(
      builder: (context, state, child) => ConsumerShell(child: child),
      routes: [
        GoRoute(path: '/', builder: (context, state) => const ExploreScreen()),
        GoRoute(path: '/bookings', builder: (context, state) => const MyBookingsScreen()),
        GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
      ],
    ),
  ],
);

/// Locale notifier for dynamic language switching.
class LocaleNotifier extends ChangeNotifier {
  Locale _locale = const Locale('en');
  Locale get locale => _locale;

  void setLocale(Locale locale) {
    if (!AppLocalizations.supportedLocales.contains(locale)) return;
    _locale = locale;
    notifyListeners();
  }
}

final localeNotifier = LocaleNotifier();

/// Theme mode notifier for dynamic light/dark switching.
class ThemeModeNotifier extends ChangeNotifier {
  ThemeMode _mode = ThemeMode.system;
  ThemeMode get mode => _mode;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final dark = prefs.getBool('darkMode') ?? false;
    _mode = dark ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
  }

  Future<void> toggle(bool dark) async {
    _mode = dark ? ThemeMode.dark : ThemeMode.light;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('darkMode', dark);
    notifyListeners();
  }
}

final themeModeNotifier = ThemeModeNotifier();

class HotelSaaSApp extends StatelessWidget {
  const HotelSaaSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([localeNotifier, themeModeNotifier]),
      builder: (context, _) {
        return MaterialApp.router(
          title: 'HotelSaaS',
          debugShowCheckedModeBanner: false,
          // Localization
          locale: localeNotifier.locale,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: AppLocalizations.supportedLocales,
          theme: ThemeData(
            colorSchemeSeed: const Color(0xFF2563EB),
            useMaterial3: true,
            fontFamily: 'Inter',
          ),
          darkTheme: ThemeData(
            brightness: Brightness.dark,
            colorSchemeSeed: const Color(0xFF2563EB),
            useMaterial3: true,
          ),
          themeMode: themeModeNotifier.mode,
          routerConfig: _router,
        );
      },
    );
  }
}

class ConsumerShell extends StatelessWidget {
  final Widget child;
  const ConsumerShell({super.key, required this.child});

  static const _routes = ['/', '/bookings', '/profile'];

  int _indexForLocation(String location) {
    for (int i = _routes.length - 1; i >= 0; i--) {
      if (location == _routes[i] || location.startsWith('${_routes[i]}/')) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    final currentIndex = _indexForLocation(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (i) => context.go(_routes[i]),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            selectedIcon: Icon(Icons.explore),
            label: 'Explore',
          ),
          NavigationDestination(
            icon: Icon(Icons.luggage_outlined),
            selectedIcon: Icon(Icons.luggage),
            label: 'My Bookings',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
