class MenuCategory {
  final int id;
  final String name;
  final String? description;
  final int sortOrder;
  final bool isActive;

  const MenuCategory({
    required this.id,
    required this.name,
    this.description,
    this.sortOrder = 0,
    this.isActive = true,
  });

  factory MenuCategory.fromJson(Map<String, dynamic> json) => MenuCategory(
        id: _toInt(json['id']) ?? 0,
        name: json['name']?.toString() ?? '',
        description: json['description']?.toString(),
        sortOrder: _toInt(json['sortOrder']) ?? 0,
        isActive: json['isActive'] != false,
      );

  static int? _toInt(dynamic v) => v is int ? v : v is num ? v.toInt() : v is String ? int.tryParse(v) : null;

  Map<String, dynamic> toJson() => {
        'name': name,
        'description': description,
        'sortOrder': sortOrder,
        'isActive': isActive,
      };
}

class MenuItem {
  final int id;
  final int categoryId;
  final String name;
  final String? description;
  final double price;
  final String? image;
  final bool isAvailable;
  final int? preparationTime;
  final bool isVegetarian;
  final bool isVegan;
  final MenuCategory? category;

  const MenuItem({
    required this.id,
    required this.categoryId,
    required this.name,
    this.description,
    required this.price,
    this.image,
    this.isAvailable = true,
    this.preparationTime,
    this.isVegetarian = false,
    this.isVegan = false,
    this.category,
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) => MenuItem(
        id: _toInt(json['id']) ?? 0,
        categoryId: _toInt(json['categoryId']) ?? 0,
        name: json['name']?.toString() ?? '',
        description: json['description']?.toString(),
        price: _toDouble(json['price']) ?? 0,
        image: json['image']?.toString(),
        isAvailable: json['isAvailable'] != false,
        preparationTime: _toInt(json['preparationTime']),
        isVegetarian: json['isVegetarian'] == true,
        isVegan: json['isVegan'] == true,
        category: json['category'] != null
            ? MenuCategory.fromJson(json['category'])
            : null,
      );

  static int? _toInt(dynamic v) => v is int ? v : v is num ? v.toInt() : v is String ? int.tryParse(v) : null;
  static double? _toDouble(dynamic v) => v is double ? v : v is num ? v.toDouble() : v is String ? double.tryParse(v) : null;

  Map<String, dynamic> toJson() => {
        'categoryId': categoryId,
        'name': name,
        'description': description,
        'price': price,
        'image': image,
        'isAvailable': isAvailable,
        'preparationTime': preparationTime,
        'isVegetarian': isVegetarian,
        'isVegan': isVegan,
      };
}

class RestaurantTable {
  final int id;
  final String tableNumber;
  final int capacity;
  final String status;
  final String? location;
  final String? qrToken;

  const RestaurantTable({
    required this.id,
    required this.tableNumber,
    this.capacity = 4,
    required this.status,
    this.location,
    this.qrToken,
  });

  factory RestaurantTable.fromJson(Map<String, dynamic> json) =>
      RestaurantTable(
        id: _toInt(json['id']) ?? 0,
        tableNumber: json['tableNumber']?.toString() ?? '',
        capacity: _toInt(json['capacity']) ?? 4,
        status: json['status']?.toString() ?? 'available',
        location: json['location']?.toString(),
        qrToken: json['qrToken']?.toString(),
      );

  static int? _toInt(dynamic v) => v is int ? v : v is num ? v.toInt() : v is String ? int.tryParse(v) : null;

  Map<String, dynamic> toJson() => {
        'tableNumber': tableNumber,
        'capacity': capacity,
        'status': status,
        'location': location,
      };

  static const statuses = ['available', 'occupied', 'reserved', 'maintenance'];
  static const locations = ['indoor', 'outdoor', 'terrace', 'private'];
}
