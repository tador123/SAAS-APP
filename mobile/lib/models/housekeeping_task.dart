/// Model for a housekeeping task.
class HousekeepingTask {
  final int id;
  final int roomId;
  final int? assignedTo;
  final String status;
  final String priority;
  final String type;
  final String? notes;
  final DateTime? completedAt;
  final int? inspectedBy;
  final DateTime? inspectedAt;
  final int propertyId;
  final DateTime createdAt;
  final DateTime updatedAt;
  // Nested
  final String? roomNumber;
  final String? assigneeName;
  final String? inspectorName;

  static const statuses = ['pending', 'in_progress', 'completed', 'inspected'];
  static const priorities = ['low', 'medium', 'high', 'urgent'];
  static const types = ['checkout_clean', 'daily_clean', 'deep_clean', 'maintenance', 'inspection'];

  const HousekeepingTask({
    required this.id,
    required this.roomId,
    this.assignedTo,
    required this.status,
    required this.priority,
    required this.type,
    this.notes,
    this.completedAt,
    this.inspectedBy,
    this.inspectedAt,
    required this.propertyId,
    required this.createdAt,
    required this.updatedAt,
    this.roomNumber,
    this.assigneeName,
    this.inspectorName,
  });

  factory HousekeepingTask.fromJson(Map<String, dynamic> json) {
    return HousekeepingTask(
      id: json['id'] as int,
      roomId: json['roomId'] as int,
      assignedTo: json['assignedTo'] as int?,
      status: json['status'] as String? ?? 'pending',
      priority: json['priority'] as String? ?? 'medium',
      type: json['type'] as String? ?? 'daily_clean',
      notes: json['notes'] as String?,
      completedAt: json['completedAt'] != null ? DateTime.parse(json['completedAt']) : null,
      inspectedBy: json['inspectedBy'] as int?,
      inspectedAt: json['inspectedAt'] != null ? DateTime.parse(json['inspectedAt']) : null,
      propertyId: json['propertyId'] as int,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      roomNumber: json['room']?['roomNumber']?.toString(),
      assigneeName: _extractName(json['assignee']),
      inspectorName: _extractName(json['inspector']),
    );
  }

  static String? _extractName(dynamic user) {
    if (user == null) return null;
    final first = user['firstName'] ?? '';
    final last = user['lastName'] ?? '';
    final name = '$first $last'.trim();
    return name.isNotEmpty ? name : user['email']?.toString();
  }

  Map<String, dynamic> toJson() => {
    'roomId': roomId,
    'assignedTo': assignedTo,
    'status': status,
    'priority': priority,
    'type': type,
    'notes': notes,
  };

  HousekeepingTask copyWith({
    int? id,
    int? roomId,
    int? assignedTo,
    String? status,
    String? priority,
    String? type,
    String? notes,
    DateTime? completedAt,
    int? inspectedBy,
    DateTime? inspectedAt,
    int? propertyId,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? roomNumber,
    String? assigneeName,
    String? inspectorName,
  }) {
    return HousekeepingTask(
      id: id ?? this.id,
      roomId: roomId ?? this.roomId,
      assignedTo: assignedTo ?? this.assignedTo,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      type: type ?? this.type,
      notes: notes ?? this.notes,
      completedAt: completedAt ?? this.completedAt,
      inspectedBy: inspectedBy ?? this.inspectedBy,
      inspectedAt: inspectedAt ?? this.inspectedAt,
      propertyId: propertyId ?? this.propertyId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      roomNumber: roomNumber ?? this.roomNumber,
      assigneeName: assigneeName ?? this.assigneeName,
      inspectorName: inspectorName ?? this.inspectorName,
    );
  }
}
