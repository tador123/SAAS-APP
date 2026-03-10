// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'HotelSaaS';

  @override
  String get dashboard => 'Dashboard';

  @override
  String get rooms => 'Rooms';

  @override
  String get guests => 'Guests';

  @override
  String get reservations => 'Reservations';

  @override
  String get restaurant => 'Restaurant';

  @override
  String get orders => 'Orders';

  @override
  String get invoices => 'Invoices';

  @override
  String get settings => 'Settings';

  @override
  String get login => 'Login';

  @override
  String get logout => 'Logout';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get signIn => 'Sign In';

  @override
  String get signInToContinue => 'Sign in to continue';

  @override
  String get pleaseEnterEmail => 'Please enter your email';

  @override
  String get pleaseEnterPassword => 'Please enter your password';

  @override
  String get loginFailed => 'Login failed. Check your credentials.';

  @override
  String get add => 'Add';

  @override
  String get edit => 'Edit';

  @override
  String get delete => 'Delete';

  @override
  String get save => 'Save';

  @override
  String get cancel => 'Cancel';

  @override
  String get confirm => 'Confirm';

  @override
  String get retry => 'Retry';

  @override
  String get search => 'Search';

  @override
  String get noResults => 'No results found';

  @override
  String get loading => 'Loading…';

  @override
  String get error => 'Error';

  @override
  String get success => 'Success';

  @override
  String get room => 'Room';

  @override
  String get roomNumber => 'Room Number';

  @override
  String get roomType => 'Room Type';

  @override
  String get floor => 'Floor';

  @override
  String get price => 'Price';

  @override
  String get status => 'Status';

  @override
  String get amenities => 'Amenities';

  @override
  String get description => 'Description';

  @override
  String get maxOccupancy => 'Max Occupancy';

  @override
  String get guest => 'Guest';

  @override
  String get firstName => 'First Name';

  @override
  String get lastName => 'Last Name';

  @override
  String get phone => 'Phone';

  @override
  String get nationality => 'Nationality';

  @override
  String get vipGuest => 'VIP Guest';

  @override
  String get idType => 'ID Type';

  @override
  String get idNumber => 'ID Number';

  @override
  String get checkIn => 'Check-in';

  @override
  String get checkOut => 'Check-out';

  @override
  String get adults => 'Adults';

  @override
  String get children => 'Children';

  @override
  String get totalAmount => 'Total Amount';

  @override
  String get paidAmount => 'Paid Amount';

  @override
  String get specialRequests => 'Special Requests';

  @override
  String get source => 'Source';

  @override
  String get orderNumber => 'Order Number';

  @override
  String get orderType => 'Order Type';

  @override
  String get subtotal => 'Subtotal';

  @override
  String get tax => 'Tax';

  @override
  String get discount => 'Discount';

  @override
  String get total => 'Total';

  @override
  String get notes => 'Notes';

  @override
  String get items => 'Items';

  @override
  String get invoiceNumber => 'Invoice Number';

  @override
  String get paymentMethod => 'Payment Method';

  @override
  String get dueDate => 'Due Date';

  @override
  String get paidAt => 'Paid At';

  @override
  String get menu => 'Menu';

  @override
  String get categories => 'Categories';

  @override
  String get tables => 'Tables';

  @override
  String get category => 'Category';

  @override
  String get preparationTime => 'Preparation Time';

  @override
  String get vegetarian => 'Vegetarian';

  @override
  String get available => 'Available';

  @override
  String get capacity => 'Capacity';

  @override
  String get location => 'Location';

  @override
  String get tableNumber => 'Table Number';

  @override
  String get darkMode => 'Dark Mode';

  @override
  String get notifications => 'Notifications';

  @override
  String get profile => 'Profile';

  @override
  String get role => 'Role';

  @override
  String get deleteConfirmTitle => 'Confirm Delete';

  @override
  String get deleteConfirmMessage =>
      'Are you sure you want to delete this item?';

  @override
  String get created => 'Created';

  @override
  String get updated => 'Updated';

  @override
  String get deleted => 'Deleted';

  @override
  String get offline => 'You are offline';

  @override
  String get offlineChangesQueued =>
      'Changes saved offline and will sync when back online';

  @override
  String get syncing => 'Syncing…';

  @override
  String get syncComplete => 'All changes synced';

  @override
  String get noRooms => 'No rooms found';

  @override
  String get noGuests => 'No guests found';

  @override
  String get noReservations => 'No reservations found';

  @override
  String get noOrders => 'No orders found';

  @override
  String get noInvoices => 'No invoices found';

  @override
  String get roomDetails => 'Room Details';

  @override
  String get guestDetails => 'Guest Details';

  @override
  String get reservationDetails => 'Reservation Details';

  @override
  String get orderDetails => 'Order Details';

  @override
  String get invoiceDetails => 'Invoice Details';

  @override
  String get contactInfo => 'Contact Information';

  @override
  String get identificationInfo => 'Identification';

  @override
  String get bookingInfo => 'Booking Information';

  @override
  String get paymentInfo => 'Payment Information';

  @override
  String get guestInfo => 'Guest Information';

  @override
  String get roomInfo => 'Room Information';

  @override
  String get language => 'Language';

  @override
  String get english => 'English';

  @override
  String get spanish => 'Spanish';

  @override
  String get french => 'French';

  @override
  String get perNight => 'per night';

  @override
  String nights(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count nights',
      one: '1 night',
    );
    return '$_temp0';
  }

  @override
  String nItems(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count items',
      one: '1 item',
    );
    return '$_temp0';
  }
}
