class User {
  final int id;
  final String username;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String? phone;
  final bool isActive;
  final String? subscriptionPlan;

  const User({
    required this.id,
    required this.username,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.phone,
    this.isActive = true,
    this.subscriptionPlan,
  });

  String get fullName => '$firstName $lastName';

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: _toInt(json['id']) ?? 0,
        username: json['username']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
        firstName: json['firstName']?.toString() ?? '',
        lastName: json['lastName']?.toString() ?? '',
        role: json['role']?.toString() ?? 'staff',
        phone: json['phone']?.toString(),
        isActive: json['isActive'] != false,
        subscriptionPlan: json['subscriptionPlan']?.toString(),
      );

  static int? _toInt(dynamic v) => v is int ? v : v is num ? v.toInt() : v is String ? int.tryParse(v) : null;

  Map<String, dynamic> toJson() => {
        'username': username,
        'email': email,
        'firstName': firstName,
        'lastName': lastName,
        'role': role,
        'phone': phone,
        'isActive': isActive,
      };
}
