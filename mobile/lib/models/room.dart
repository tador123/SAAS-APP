class Room {
  final int id;
  final String roomNumber;
  final String type;
  final int floor;
  final double price;
  final String status;
  final List<String> amenities;
  final String? description;
  final int maxOccupancy;

  const Room({
    required this.id,
    required this.roomNumber,
    required this.type,
    required this.floor,
    required this.price,
    required this.status,
    this.amenities = const [],
    this.description,
    this.maxOccupancy = 2,
  });

  factory Room.fromJson(Map<String, dynamic> json) => Room(
        id: _toInt(json['id']) ?? 0,
        roomNumber: json['roomNumber']?.toString() ?? '',
        type: json['type']?.toString() ?? 'single',
        floor: _toInt(json['floor']) ?? 0,
        price: _toDouble(json['price']) ?? 0,
        status: json['status']?.toString() ?? 'available',
        amenities: (json['amenities'] as List?)?.cast<String>() ?? [],
        description: json['description']?.toString(),
        maxOccupancy: _toInt(json['maxOccupancy']) ?? 2,
      );

  static int? _toInt(dynamic v) => v is int ? v : v is num ? v.toInt() : v is String ? int.tryParse(v) : null;
  static double? _toDouble(dynamic v) => v is double ? v : v is num ? v.toDouble() : v is String ? double.tryParse(v) : null;

  Map<String, dynamic> toJson() => {
        'roomNumber': roomNumber,
        'type': type,
        'floor': floor,
        'price': price,
        'status': status,
        'amenities': amenities,
        'description': description,
        'maxOccupancy': maxOccupancy,
      };

  Room copyWith({
    String? roomNumber,
    String? type,
    int? floor,
    double? price,
    String? status,
    List<String>? amenities,
    String? description,
    int? maxOccupancy,
  }) =>
      Room(
        id: id,
        roomNumber: roomNumber ?? this.roomNumber,
        type: type ?? this.type,
        floor: floor ?? this.floor,
        price: price ?? this.price,
        status: status ?? this.status,
        amenities: amenities ?? this.amenities,
        description: description ?? this.description,
        maxOccupancy: maxOccupancy ?? this.maxOccupancy,
      );

  static const types = ['single', 'double', 'twin', 'suite', 'deluxe', 'penthouse'];
  static const statuses = ['available', 'occupied', 'reserved', 'maintenance', 'cleaning'];
}
