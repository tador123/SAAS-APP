import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'l10n/app_localizations.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/rooms_screen.dart';
import 'screens/room_detail_screen.dart';
import 'screens/reservations_screen.dart';
import 'screens/reservation_detail_screen.dart';
import 'screens/restaurant_screen.dart';
import 'screens/orders_screen.dart';
import 'screens/order_detail_screen.dart';
import 'screens/guests_screen.dart';
import 'screens/guest_detail_screen.dart';
import 'screens/invoices_screen.dart';
import 'screens/invoice_detail_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/users_screen.dart';
import 'screens/housekeeping_screen.dart';
import 'screens/kitchen_display_screen.dart';
import 'screens/guest_folio_screen.dart';
import 'screens/qr_ordering_screen.dart';
import 'screens/guest_self_registration_screen.dart';
import 'screens/guest_qr_code_screen.dart';
import 'services/auth_service.dart';
import 'services/offline_service.dart';
import 'services/notification_service.dart';
import 'widgets/offline_banner.dart';
import 'models/models.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize offline services (wrapped in try-catch for web resilience)
  try {
    await OfflineCache.init();
  } catch (e) {
    debugPrint('[Init] OfflineCache.init failed: $e');
  }

  try {
    await SyncService.init();
    SyncService.setDio(AuthService.dio);
  } catch (e) {
    debugPrint('[Init] SyncService.init failed: $e');
  }

  try {
    await ConnectivityService.init();
  } catch (e) {
    debugPrint('[Init] ConnectivityService.init failed: $e');
  }

  // Initialize push notifications (no-op if Firebase not configured)
  try {
    await NotificationService.init();
  } catch (e) {
    debugPrint('[Init] NotificationService.init failed: $e');
  }

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
      final loggedIn = await AuthService.isAuthenticated();
      final isLoginPage = state.matchedLocation == '/login';
      final isForgotPage = state.matchedLocation == '/forgot-password';
      final isGuestRegister = state.matchedLocation == '/guest-register';
      final isGuestQR = state.matchedLocation == '/guest-qr';
      // Allow public guest registration routes without auth
      if (isGuestRegister || isGuestQR) return null;
      if (!loggedIn && !isLoginPage && !isForgotPage) return '/login';
      if (loggedIn && isLoginPage) return '/';
    } catch (e) {
      debugPrint('[Router] Auth check failed: $e');
      if (state.matchedLocation != '/login') return '/login';
    }
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(path: '/forgot-password', builder: (context, state) => const ForgotPasswordScreen()),
    GoRoute(
      path: '/guest-register',
      builder: (context, state) {
        return const GuestSelfRegistrationScreen();
      },
    ),
    GoRoute(
      path: '/guest-qr',
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>? ?? {};
        return GuestQRCodeScreen(
          qrToken: extra['qrToken']?.toString() ?? '',
          firstName: extra['firstName']?.toString() ?? '',
          lastName: extra['lastName']?.toString() ?? '',
        );
      },
    ),
    ShellRoute(
      builder: (context, state, child) => MainShell(child: child),
      routes: [
        GoRoute(path: '/', builder: (context, state) => const DashboardScreen()),
        GoRoute(
          path: '/rooms',
          builder: (context, state) => const RoomsScreen(),
          routes: [
            GoRoute(
              path: 'detail',
              builder: (context, state) {
                final room = state.extra as Room;
                return RoomDetailScreen(room: room);
              },
            ),
          ],
        ),
        GoRoute(
          path: '/reservations',
          builder: (context, state) => const ReservationsScreen(),
          routes: [
            GoRoute(
              path: 'detail',
              builder: (context, state) {
                final reservation = state.extra as Reservation;
                return ReservationDetailScreen(reservation: reservation);
              },
            ),
          ],
        ),
        GoRoute(path: '/restaurant', builder: (context, state) => const RestaurantScreen()),
        GoRoute(
          path: '/orders',
          builder: (context, state) => const OrdersScreen(),
          routes: [
            GoRoute(
              path: 'detail',
              builder: (context, state) {
                final order = state.extra as Order;
                return OrderDetailScreen(order: order);
              },
            ),
          ],
        ),
        GoRoute(
          path: '/guests',
          builder: (context, state) => const GuestsScreen(),
          routes: [
            GoRoute(
              path: 'detail',
              builder: (context, state) {
                final guest = state.extra as Guest;
                return GuestDetailScreen(guest: guest);
              },
            ),
          ],
        ),
        GoRoute(
          path: '/invoices',
          builder: (context, state) => const InvoicesScreen(),
          routes: [
            GoRoute(
              path: 'detail',
              builder: (context, state) {
                final invoice = state.extra as Invoice;
                return InvoiceDetailScreen(invoice: invoice);
              },
            ),
          ],
        ),
        GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
        GoRoute(path: '/users', builder: (context, state) => const UsersScreen()),
        GoRoute(path: '/housekeeping', builder: (context, state) => const HousekeepingScreen()),
        GoRoute(path: '/kitchen', builder: (context, state) => const KitchenDisplayScreen()),
        GoRoute(path: '/folio', builder: (context, state) => const GuestFolioScreen()),
        GoRoute(path: '/qr-ordering', builder: (context, state) => const QROrderingScreen()),
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

class MainShell extends StatefulWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  final _destinations = const [
    NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Dashboard'),
    NavigationDestination(icon: Icon(Icons.bed_outlined), selectedIcon: Icon(Icons.bed), label: 'Rooms'),
    NavigationDestination(icon: Icon(Icons.calendar_today_outlined), selectedIcon: Icon(Icons.calendar_today), label: 'Bookings'),
    NavigationDestination(icon: Icon(Icons.restaurant_outlined), selectedIcon: Icon(Icons.restaurant), label: 'Restaurant'),
    NavigationDestination(icon: Icon(Icons.more_horiz_outlined), selectedIcon: Icon(Icons.more_horiz), label: 'More'),
  ];

  final _routes = ['/', '/rooms', '/reservations', '/restaurant', ''];

  int _getIndexForLocation(String location) {
    // New feature routes map to "More" tab (index 4)
    for (final r in ['/housekeeping', '/kitchen', '/folio', '/qr-ordering', '/settings', '/users']) {
      if (location == r || location.startsWith('$r/')) return 4;
    }
    for (int i = 0; i < _routes.length - 1; i++) {
      if (location == _routes[i] || location.startsWith('${_routes[i]}/')) return i;
    }
    return 0;
  }

  void _showMoreMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(leading: const Icon(Icons.cleaning_services), title: const Text('Housekeeping'),
              onTap: () { Navigator.pop(ctx); context.go('/housekeeping'); }),
            ListTile(leading: const Icon(Icons.soup_kitchen), title: const Text('Kitchen Display'),
              onTap: () { Navigator.pop(ctx); context.go('/kitchen'); }),
            ListTile(leading: const Icon(Icons.receipt_long), title: const Text('Guest Folio'),
              onTap: () { Navigator.pop(ctx); context.go('/folio'); }),
            ListTile(leading: const Icon(Icons.qr_code), title: const Text('QR Ordering'),
              onTap: () { Navigator.pop(ctx); context.go('/qr-ordering'); }),
            const Divider(),
            ListTile(leading: const Icon(Icons.settings), title: const Text('Settings'),
              onTap: () { Navigator.pop(ctx); context.go('/settings'); }),
            ListTile(leading: const Icon(Icons.people), title: const Text('Users'),
              onTap: () { Navigator.pop(ctx); context.go('/users'); }),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    final currentIndex = _getIndexForLocation(location);

    return Scaffold(
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(child: widget.child),
        ],
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SyncStatusIndicator(),
          NavigationBar(
            selectedIndex: currentIndex,
            onDestinationSelected: (index) {
              if (index == 4) {
                _showMoreMenu(context);
              } else {
                context.go(_routes[index]);
              }
            },
            destinations: _destinations,
          ),
        ],
      ),
    );
  }
}
