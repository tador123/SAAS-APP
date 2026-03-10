import 'guest.dart';
import 'room.dart';

class Reservation {
  final int id;
  final int guestId;
  final int roomId;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final String status;
  final int adults;
  final int children;
  final double totalAmount;
  final double paidAmount;
  final String? specialRequests;
  final String? source;
  final Guest? guest;
  final Room? room;

  const Reservation({
    required this.id,
    required this.guestId,
    required this.roomId,
    this.checkIn,
    this.checkOut,
    required this.status,
    this.adults = 1,
    this.children = 0,
    required this.totalAmount,
    this.paidAmount = 0,
    this.specialRequests,
    this.source,
    this.guest,
    this.room,
  });

  factory Reservation.fromJson(Map<String, dynamic> json) => Reservation(
        id: _toInt(json['id']) ?? 0,
        guestId: _toInt(json['guestId']) ?? 0,
        roomId: _toInt(json['roomId']) ?? 0,
        checkIn: json['checkIn'] != null ? DateTime.tryParse(json['checkIn'].toString()) : null,
        checkOut: json['checkOut'] != null ? DateTime.tryParse(json['checkOut'].toString()) : null,
        status: json['status']?.toString() ?? 'pending',
        adults: _toInt(json['adults']) ?? 1,
        children: _toInt(json['children']) ?? 0,
        totalAmount: _toDouble(json['totalAmount']) ?? 0,
        paidAmount: _toDouble(json['paidAmount']) ?? 0,
        specialRequests: json['specialRequests']?.toString(),
        source: json['source']?.toString(),
        guest: json['guest'] != null ? Guest.fromJson(json['guest']) : null,
        room: json['room'] != null ? Room.fromJson(json['room']) : null,
      );

  static int? _toInt(dynamic v) => v is int ? v : v is num ? v.toInt() : v is String ? int.tryParse(v) : null;
  static double? _toDouble(dynamic v) => v is double ? v : v is num ? v.toDouble() : v is String ? double.tryParse(v) : null;

  Map<String, dynamic> toJson() => {
        'guestId': guestId,
        'roomId': roomId,
        'checkIn': checkIn?.toIso8601String(),
        'checkOut': checkOut?.toIso8601String(),
        'status': status,
        'adults': adults,
        'children': children,
        'totalAmount': totalAmount,
        'paidAmount': paidAmount,
        'specialRequests': specialRequests,
        'source': source,
      };

  static const statuses = [
    'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'
  ];
  static const sources = [
    'walk_in', 'phone', 'website', 'booking_com', 'airbnb', 'other'
  ];
}
