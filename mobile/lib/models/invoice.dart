import 'guest.dart';
import 'reservation.dart';

class InvoiceItem {
  final String description;
  final int quantity;
  final double unitPrice;
  final double total;

  const InvoiceItem({
    required this.description,
    required this.quantity,
    required this.unitPrice,
    required this.total,
  });

  factory InvoiceItem.fromJson(Map<String, dynamic> json) => InvoiceItem(
        description: json['description']?.toString() ?? '',
        quantity: _toInt(json['quantity']) ?? 1,
        unitPrice: _toDouble(json['unitPrice']) ?? 0,
        total: _toDouble(json['total']) ?? 0,
      );

  static int? _toInt(dynamic v) => v is int ? v : v is num ? v.toInt() : v is String ? int.tryParse(v) : null;
  static double? _toDouble(dynamic v) => v is double ? v : v is num ? v.toDouble() : v is String ? double.tryParse(v) : null;

  Map<String, dynamic> toJson() => {
        'description': description,
        'quantity': quantity,
        'unitPrice': unitPrice,
        'total': total,
      };
}

class Invoice {
  final int id;
  final String invoiceNumber;
  final int? guestId;
  final int? reservationId;
  final List<InvoiceItem> items;
  final double subtotal;
  final double tax;
  final double discount;
  final double total;
  final String status;
  final String? paymentMethod;
  final DateTime? paidAt;
  final DateTime? dueDate;
  final String? notes;
  final Guest? guest;
  final Reservation? reservation;

  const Invoice({
    required this.id,
    required this.invoiceNumber,
    this.guestId,
    this.reservationId,
    required this.items,
    required this.subtotal,
    this.tax = 0,
    this.discount = 0,
    required this.total,
    required this.status,
    this.paymentMethod,
    this.paidAt,
    this.dueDate,
    this.notes,
    this.guest,
    this.reservation,
  });

  factory Invoice.fromJson(Map<String, dynamic> json) => Invoice(
        id: _toInt(json['id']) ?? 0,
        invoiceNumber: json['invoiceNumber']?.toString() ?? '',
        guestId: _toInt(json['guestId']),
        reservationId: _toInt(json['reservationId']),
        items: (json['items'] as List?)
                ?.map((e) => InvoiceItem.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        subtotal: _toDouble(json['subtotal']) ?? 0,
        tax: _toDouble(json['tax']) ?? 0,
        discount: _toDouble(json['discount']) ?? 0,
        total: _toDouble(json['total']) ?? 0,
        status: json['status']?.toString() ?? 'draft',
        paymentMethod: json['paymentMethod']?.toString(),
        paidAt: json['paidAt'] != null ? DateTime.tryParse(json['paidAt'].toString()) : null,
        dueDate: json['dueDate'] != null ? DateTime.tryParse(json['dueDate'].toString()) : null,
        notes: json['notes']?.toString(),
        guest: json['guest'] != null ? Guest.fromJson(json['guest']) : null,
        reservation: json['reservation'] != null
            ? Reservation.fromJson(json['reservation'])
            : null,
      );

  static int? _toInt(dynamic v) => v is int ? v : v is num ? v.toInt() : v is String ? int.tryParse(v) : null;
  static double? _toDouble(dynamic v) => v is double ? v : v is num ? v.toDouble() : v is String ? double.tryParse(v) : null;

  Map<String, dynamic> toJson() => {
        'guestId': guestId,
        'reservationId': reservationId,
        'items': items.map((e) => e.toJson()).toList(),
        'status': status,
        'paymentMethod': paymentMethod,
        'dueDate': dueDate?.toIso8601String(),
        'notes': notes,
      };

  static const statuses = [
    'draft', 'pending', 'paid', 'overdue', 'void', 'refunded'
  ];
  static const paymentMethods = [
    'cash', 'credit_card', 'debit_card', 'bank_transfer', 'online', 'other'
  ];
}
