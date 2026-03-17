class Guest {
  final int id;
  final String firstName;
  final String lastName;
  final String? email;
  final String phone;
  final String? idType;
  final String? idNumber;
  final String? nationality;
  final String? address;
  final String? dateOfBirth;
  final bool vipStatus;
  final String? notes;
  final String? qrToken;

  const Guest({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.email,
    required this.phone,
    this.idType,
    this.idNumber,
    this.nationality,
    this.address,
    this.dateOfBirth,
    this.vipStatus = false,
    this.notes,
    this.qrToken,
  });

  String get fullName => '$firstName $lastName';
  String get initials =>
      '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}';

  factory Guest.fromJson(Map<String, dynamic> json) => Guest(
        id: _toInt(json['id']) ?? 0,
        firstName: json['firstName']?.toString() ?? '',
        lastName: json['lastName']?.toString() ?? '',
        email: json['email']?.toString(),
        phone: json['phone']?.toString() ?? '',
        idType: json['idType']?.toString(),
        idNumber: json['idNumber']?.toString(),
        nationality: json['nationality']?.toString(),
        address: json['address']?.toString(),
        dateOfBirth: json['dateOfBirth']?.toString(),
        vipStatus: json['vipStatus'] == true,
        notes: json['notes']?.toString(),
        qrToken: json['qrToken']?.toString(),
      );

  static int? _toInt(dynamic v) => v is int ? v : v is num ? v.toInt() : v is String ? int.tryParse(v) : null;

  Map<String, dynamic> toJson() => {
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'phone': phone,
        'idType': idType,
        'idNumber': idNumber,
        'nationality': nationality,
        'address': address,
        'dateOfBirth': dateOfBirth,
        'vipStatus': vipStatus,
        'notes': notes,
        'qrToken': qrToken,
      };

  Guest copyWith({
    String? firstName,
    String? lastName,
    String? email,
    String? phone,
    String? idType,
    String? idNumber,
    String? nationality,
    String? address,
    String? dateOfBirth,
    bool? vipStatus,
    String? notes,
    String? qrToken,
  }) =>
      Guest(
        id: id,
        firstName: firstName ?? this.firstName,
        lastName: lastName ?? this.lastName,
        email: email ?? this.email,
        phone: phone ?? this.phone,
        idType: idType ?? this.idType,
        idNumber: idNumber ?? this.idNumber,
        nationality: nationality ?? this.nationality,
        address: address ?? this.address,
        dateOfBirth: dateOfBirth ?? this.dateOfBirth,
        vipStatus: vipStatus ?? this.vipStatus,
        notes: notes ?? this.notes,
        qrToken: qrToken ?? this.qrToken,
      );

  static const idTypes = ['passport', 'national_id', 'drivers_license', 'other'];
}
