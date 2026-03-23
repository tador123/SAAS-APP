import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/property_service.dart';

class PropertyDetailScreen extends StatefulWidget {
  final int propertyId;
  const PropertyDetailScreen({super.key, required this.propertyId});

  @override
  State<PropertyDetailScreen> createState() => _PropertyDetailScreenState();
}

class _PropertyDetailScreenState extends State<PropertyDetailScreen> with SingleTickerProviderStateMixin {
  Map<String, dynamic>? _property;
  List<dynamic> _rooms = [];
  List<dynamic> _tables = [];
  List<dynamic> _menuCategories = [];
  bool _loading = true;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      // Load property detail first — required for the page
      final detail = await PropertyService.getPropertyDetail(widget.propertyId);

      // Load rooms, menu, and tables independently — one failure shouldn't block others
      final extras = await Future.wait([
        PropertyService.getPropertyRooms(widget.propertyId).catchError((_) => <dynamic>[]),
        PropertyService.getPropertyMenu(widget.propertyId).catchError((_) => <dynamic>[]),
        PropertyService.getPropertyTables(widget.propertyId).catchError((_) => <dynamic>[]),
      ]);

      setState(() {
        _property = detail;
        _rooms = extras[0] as List<dynamic>;
        _menuCategories = extras[1] as List<dynamic>;
        _tables = extras[2] as List<dynamic>;
        _loading = false;
      });
    } catch (e) {
      debugPrint('[PropertyDetail] Load failed: $e');
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_loading) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_property == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('Property not found')),
      );
    }

    final images = _property!['images'] as List<dynamic>? ?? [];
    final amenities = _property!['amenities'] as List<dynamic>? ?? [];
    final stars = _property!['stars'] as int?;

    return Scaffold(
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          SliverAppBar(
            expandedHeight: 240,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: images.isNotEmpty
                  ? Image.network(images[0].toString(), fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: theme.colorScheme.surfaceContainerHighest,
                        child: Icon(Icons.hotel, size: 80, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.3)),
                      ))
                  : Container(
                      color: theme.colorScheme.surfaceContainerHighest,
                      child: Icon(Icons.hotel, size: 80, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.3)),
                    ),
            ),
          ),
        ],
        body: Column(
          children: [
            // Property info
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          _property!['name']?.toString() ?? '',
                          style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ),
                      if (stars != null)
                        Row(children: List.generate(stars, (_) => Icon(Icons.star, size: 18, color: Colors.amber.shade700))),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(Icons.location_on, size: 16, color: theme.colorScheme.primary),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          [_property!['address'], _property!['city'], _property!['country']].where((e) => e != null && e.toString().isNotEmpty).join(', '),
                          style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                        ),
                      ),
                    ],
                  ),
                  if (_property!['description'] != null && _property!['description'].toString().isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(_property!['description'].toString(), style: theme.textTheme.bodyMedium, maxLines: 3, overflow: TextOverflow.ellipsis),
                  ],
                  if (amenities.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: amenities.map((a) => Chip(
                        avatar: Icon(_amenityIcon(a.toString()), size: 16),
                        label: Text(a.toString(), style: const TextStyle(fontSize: 12)),
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        visualDensity: VisualDensity.compact,
                      )).toList(),
                    ),
                  ],
                ],
              ),
            ),

            // Tabs
            TabBar(
              controller: _tabController,
              tabs: [
                Tab(text: 'Rooms (${_rooms.length})'),
                Tab(text: 'Tables (${_tables.length})'),
                Tab(text: 'Menu (${_menuCategories.length})'),
                const Tab(text: 'Info'),
              ],
            ),

            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildRoomsList(theme),
                  _buildTablesList(theme),
                  _buildMenuList(theme),
                  _buildInfoTab(theme),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoomsList(ThemeData theme) {
    if (_rooms.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.bed_outlined, size: 48, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.4)),
            const SizedBox(height: 8),
            Text('No rooms available', style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _rooms.length,
      itemBuilder: (context, index) {
        final room = _rooms[index] as Map<String, dynamic>;
        final roomImages = room['images'] as List<dynamic>? ?? [];
        final currency = _property!['currency'] ?? 'USD';

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () => context.push('/booking', extra: {
              'room': room,
              'property': _property,
            }),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  // Room image
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      width: 90,
                      height: 80,
                      color: theme.colorScheme.surfaceContainerHighest,
                      child: roomImages.isNotEmpty
                          ? Image.network(roomImages[0].toString(), fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Icon(Icons.bed, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.3)))
                          : Icon(Icons.bed, size: 36, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.3)),
                    ),
                  ),
                  const SizedBox(width: 14),

                  // Room details
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _roomTypeLabel(room['type']?.toString()),
                          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text('Room ${room['roomNumber']} • Floor ${room['floor']}',
                            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                        const SizedBox(height: 2),
                        Text('Up to ${room['maxOccupancy']} guests',
                            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                      ],
                    ),
                  ),

                  // Price + action
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('$currency ${room['price']}',
                          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
                      Text('/night', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                      const SizedBox(height: 6),
                      Icon(Icons.arrow_forward_ios, size: 14, color: theme.colorScheme.onSurfaceVariant),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildTablesList(ThemeData theme) {
    if (_tables.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.table_restaurant_outlined, size: 48, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.4)),
            const SizedBox(height: 8),
            Text('No tables available', style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _tables.length,
      itemBuilder: (context, index) {
        final table = _tables[index] as Map<String, dynamic>;
        final status = table['status']?.toString() ?? 'available';
        final isAvailable = status == 'available';

        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: isAvailable ? Colors.green.shade50 : Colors.orange.shade50,
              child: Icon(Icons.table_restaurant, color: isAvailable ? Colors.green : Colors.orange),
            ),
            title: Text('Table ${table['tableNumber']}', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
            subtitle: Text('${table['capacity']} seats • ${table['location'] ?? 'Indoor'}',
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: isAvailable ? Colors.green.shade50 : Colors.orange.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(isAvailable ? 'Available' : status[0].toUpperCase() + status.substring(1),
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isAvailable ? Colors.green.shade700 : Colors.orange.shade700)),
            ),
          ),
        );
      },
    );
  }

  Widget _buildMenuList(ThemeData theme) {
    if (_menuCategories.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.restaurant_menu_outlined, size: 48, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.4)),
            const SizedBox(height: 8),
            Text('No menu items', style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _menuCategories.length,
      itemBuilder: (context, catIndex) {
        final cat = _menuCategories[catIndex] as Map<String, dynamic>;
        final items = cat['items'] as List<dynamic>? ?? [];
        final currency = _property!['currency'] ?? 'USD';

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(cat['name']?.toString() ?? '', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            ),
            ...items.map((item) {
              final m = item as Map<String, dynamic>;
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: m['image'] != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(m['image'].toString(), width: 56, height: 56, fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(width: 56, height: 56, color: theme.colorScheme.surfaceContainerHighest,
                                child: const Icon(Icons.fastfood, size: 24))),
                      )
                    : Container(
                        width: 56, height: 56,
                        decoration: BoxDecoration(color: theme.colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(8)),
                        child: const Icon(Icons.fastfood, size: 24),
                      ),
                title: Row(
                  children: [
                    if (m['isVegetarian'] == true)
                      Container(
                        margin: const EdgeInsets.only(right: 6),
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(border: Border.all(color: Colors.green), borderRadius: BorderRadius.circular(3)),
                        child: const Icon(Icons.circle, size: 8, color: Colors.green),
                      ),
                    Expanded(child: Text(m['name']?.toString() ?? '')),
                  ],
                ),
                subtitle: m['description'] != null ? Text(m['description'].toString(), maxLines: 1, overflow: TextOverflow.ellipsis) : null,
                trailing: Text('$currency ${m['price']}', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              );
            }),
            if (catIndex < _menuCategories.length - 1) const Divider(height: 24),
          ],
        );
      },
    );
  }

  Widget _buildInfoTab(ThemeData theme) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        if (_property!['phone'] != null) _infoTile(theme, Icons.phone, 'Phone', _property!['phone'].toString()),
        if (_property!['email'] != null) _infoTile(theme, Icons.email, 'Email', _property!['email'].toString()),
        if (_property!['website'] != null) _infoTile(theme, Icons.language, 'Website', _property!['website'].toString()),
        if (_property!['address'] != null) _infoTile(theme, Icons.location_on, 'Address', _property!['address'].toString()),
        _infoTile(theme, Icons.access_time, 'Timezone', _property!['timezone']?.toString() ?? 'UTC'),
        _infoTile(theme, Icons.monetization_on, 'Currency', _property!['currency']?.toString() ?? 'USD'),
      ],
    );
  }

  Widget _infoTile(ThemeData theme, IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: theme.colorScheme.primary),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
              Text(value, style: theme.textTheme.bodyMedium),
            ],
          ),
        ],
      ),
    );
  }

  IconData _amenityIcon(String amenity) {
    final lower = amenity.toLowerCase();
    if (lower.contains('wifi') || lower.contains('internet')) return Icons.wifi;
    if (lower.contains('pool')) return Icons.pool;
    if (lower.contains('parking')) return Icons.local_parking;
    if (lower.contains('gym') || lower.contains('fitness')) return Icons.fitness_center;
    if (lower.contains('spa')) return Icons.spa;
    if (lower.contains('restaurant') || lower.contains('dining')) return Icons.restaurant;
    if (lower.contains('bar')) return Icons.local_bar;
    if (lower.contains('ac') || lower.contains('air')) return Icons.ac_unit;
    return Icons.check_circle_outline;
  }

  String _roomTypeLabel(String? type) {
    switch (type) {
      case 'single': return 'Single Room';
      case 'double': return 'Double Room';
      case 'twin': return 'Twin Room';
      case 'suite': return 'Suite';
      case 'deluxe': return 'Deluxe Room';
      case 'penthouse': return 'Penthouse';
      default: return 'Room';
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}
