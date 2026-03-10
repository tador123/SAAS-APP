import 'guest.dart';
import 'restaurant.dart';

class OrderItem {
  final int? menuItemId;
  final String name;
  final int quantity;
  final double price;
  final String? notes;

  const OrderItem({
    this.menuItemId,
    required this.name,
    required this.quantity,
    required this.price,
    this.notes,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        menuItemId: _toInt(json['menuItemId']),
        name: json['name']?.toString() ?? '',
        quantity: _toInt(json['quantity']) ?? 1,
        price: _toDouble(json['price']) ?? 0,
        notes: json['notes']?.toString(),
      );

  static int? _toInt(dynamic v) => v is int ? v : v is num ? v.toInt() : v is String ? int.tryParse(v) : null;
  static double? _toDouble(dynamic v) => v is double ? v : v is num ? v.toDouble() : v is String ? double.tryParse(v) : null;

  Map<String, dynamic> toJson() => {
        'menuItemId': menuItemId,
        'name': name,
        'quantity': quantity,
        'price': price,
        'notes': notes,
      };
}

class Order {
  final int id;
  final String orderNumber;
  final int? tableId;
  final int? guestId;
  final int? reservationId;
  final List<OrderItem> items;
  final String orderType;
  final String status;
  final double subtotal;
  final double tax;
  final double discount;
  final double total;
  final String? notes;
  final RestaurantTable? table;
  final Guest? guest;

  const Order({
    required this.id,
    required this.orderNumber,
    this.tableId,
    this.guestId,
    this.reservationId,
    required this.items,
    required this.orderType,
    required this.status,
    required this.subtotal,
    this.tax = 0,
    this.discount = 0,
    required this.total,
    this.notes,
    this.table,
    this.guest,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: _toInt(json['id']) ?? 0,
        orderNumber: json['orderNumber']?.toString() ?? '',
        tableId: _toInt(json['tableId']),
        guestId: _toInt(json['guestId']),
        reservationId: _toInt(json['reservationId']),
        items: (json['items'] as List?)
                ?.map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        orderType: json['orderType']?.toString() ?? 'dine_in',
        status: json['status']?.toString() ?? 'pending',
        subtotal: _toDouble(json['subtotal']) ?? 0,
        tax: _toDouble(json['tax']) ?? 0,
        discount: _toDouble(json['discount']) ?? 0,
        total: _toDouble(json['total']) ?? 0,
        notes: json['notes']?.toString(),
        table: json['table'] != null
            ? RestaurantTable.fromJson(json['table'])
            : null,
        guest: json['guest'] != null ? Guest.fromJson(json['guest']) : null,
      );

  static int? _toInt(dynamic v) => v is int ? v : v is num ? v.toInt() : v is String ? int.tryParse(v) : null;
  static double? _toDouble(dynamic v) => v is double ? v : v is num ? v.toDouble() : v is String ? double.tryParse(v) : null;

  Map<String, dynamic> toJson() => {
        'tableId': tableId,
        'guestId': guestId,
        'reservationId': reservationId,
        'items': items.map((e) => e.toJson()).toList(),
        'orderType': orderType,
        'status': status,
        'notes': notes,
      };

  static const orderTypes = ['dine_in', 'room_service', 'takeaway'];
  static const statuses = [
    'pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'
  ];
}
