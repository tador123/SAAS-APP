import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../services/auth_service.dart';
import '../services/api_repository.dart';

/// Holds the currency code for the current property.
class CurrencyState {
  final String currency;

  const CurrencyState({this.currency = 'USD'});
}

class CurrencyNotifier extends StateNotifier<CurrencyState> {
  CurrencyNotifier() : super(const CurrencyState()) {
    _init();
  }

  Future<void> _init() async {
    // Try from stored user first
    final user = await AuthService.getStoredUser();
    if (user?.currency != null && user!.currency!.isNotEmpty) {
      state = CurrencyState(currency: user.currency!);
      return;
    }
    // Fallback: fetch from API
    try {
      final data = await ApiRepository.getPropertyCurrent();
      final c = data['currency']?.toString() ?? 'USD';
      state = CurrencyState(currency: c);
    } catch (_) {
      // keep default USD
    }
  }

  void setCurrency(String currency) {
    state = CurrencyState(currency: currency);
  }
}

final currencyProvider =
    StateNotifierProvider<CurrencyNotifier, CurrencyState>(
  (ref) => CurrencyNotifier(),
);

/// Format a number as currency using the property's currency code.
String formatCurrency(num value, String currencyCode) {
  try {
    final format = NumberFormat.simpleCurrency(name: currencyCode);
    return format.format(value);
  } catch (_) {
    return '$currencyCode ${value.toStringAsFixed(2)}';
  }
}
