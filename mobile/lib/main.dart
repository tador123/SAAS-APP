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
      final isLoginPage = state.matchedLocation == '/login';
      final isSignupPage = state.matchedLocation == '/signup';

      if (!loggedIn && !isLoginPage && !isSignupPage) return '/login';
      if (loggedIn && (isLoginPage || isSignupPage)) return '/';
    } catch (e) {
      debugPrint('[Router] Auth check failed: $e');
      if (state.matchedLocation != '/login') return '/login';
    }
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (context, state) => const GuestLoginScreen()),
    GoRoute(path: '/signup', builder: (context, state) => const GuestSignupScreen()),
    ShellRoute(
      builder: (context, state, child) => ConsumerShell(child: child),
      routes: [
        GoRoute(path: '/', builder: (context, state) => const ExploreScreen()),
        GoRoute(path: '/bookings', builder: (context, state) => const MyBookingsScreen()),
        GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
      ],
    ),
    GoRoute(
      path: '/property/:id',
      builder: (context, state) {
        final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
        return PropertyDetailScreen(propertyId: id);
      },
    ),
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
    GoRoute(
      path: '/bookings/:id',
      builder: (context, state) {
        final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
        return BookingDetailScreen(bookingId: id);
      },
    ),
    GoRoute(path: '/edit-profile', builder: (context, state) => const EditProfileScreen()),
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

/// Consumer app shell with bottom navigation: Explore, Bookings, Profile
class ConsumerShell extends StatelessWidget {
  final Widget child;
  const ConsumerShell({super.key, required this.child});

  int _getIndex(String location) {
    if (location.startsWith('/bookings')) return 1;
    if (location.startsWith('/profile')) return 2;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    final currentIndex = _getIndex(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (index) {
          switch (index) {
            case 0: context.go('/');
            case 1: context.go('/bookings');
            case 2: context.go('/profile');
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            selectedIcon: Icon(Icons.explore),
            label: 'Explore',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_today_outlined),
            selectedIcon: Icon(Icons.calendar_today),
            label: 'Bookings',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outlined),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
