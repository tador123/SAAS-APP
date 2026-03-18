import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/property_service.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  final _searchController = TextEditingController();
  List<dynamic> _properties = [];
  bool _loading = true;
  String? _error;
  String? _selectedType;

  final _types = [
    {'value': null, 'label': 'All', 'icon': Icons.select_all},
    {'value': 'hotel', 'label': 'Hotels', 'icon': Icons.hotel},
    {'value': 'restaurant', 'label': 'Restaurants', 'icon': Icons.restaurant},
    {'value': 'resort', 'label': 'Resorts', 'icon': Icons.pool},
    {'value': 'boutique_hotel', 'label': 'Boutique', 'icon': Icons.villa},
    {'value': 'hostel', 'label': 'Hostels', 'icon': Icons.night_shelter},
  ];

  @override
  void initState() {
    super.initState();
    _loadProperties();
  }

  Future<void> _loadProperties() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await PropertyService.getProperties(
        search: _searchController.text.isNotEmpty ? _searchController.text : null,
        type: _selectedType,
      );
      setState(() {
        _properties = data['properties'] as List<dynamic>;
        _loading = false;
      });
    } catch (e) {
      debugPrint('[Explore] Load failed: $e');
      setState(() { _error = 'Could not load properties. Pull down to retry.'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Explore', style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('Find your perfect stay', style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Search bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search by name, city...',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                  filled: true,
                  fillColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () { _searchController.clear(); _loadProperties(); },
                        )
                      : null,
                ),
                onSubmitted: (_) => _loadProperties(),
              ),
            ),
            const SizedBox(height: 14),

            // Type chips
            SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _types.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final t = _types[index];
                  final selected = (_selectedType == t['value']);
                  return FilterChip(
                    selected: selected,
                    avatar: Icon(t['icon'] as IconData, size: 18),
                    label: Text(t['label'] as String),
                    onSelected: (_) {
                      setState(() => _selectedType = t['value'] as String?);
                      _loadProperties();
                    },
                  );
                },
              ),
            ),
            const SizedBox(height: 8),

            // Property list
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
                              const SizedBox(height: 8),
                              Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
                              const SizedBox(height: 12),
                              FilledButton.tonal(onPressed: _loadProperties, child: const Text('Retry')),
                            ],
                          ),
                        )
                      : _properties.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.search_off, size: 64, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5)),
                                  const SizedBox(height: 12),
                                  Text('No properties found', style: theme.textTheme.titleMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                                ],
                              ),
                            )
                          : RefreshIndicator(
                              onRefresh: _loadProperties,
                              child: ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                                itemCount: _properties.length,
                                itemBuilder: (context, index) => _PropertyCard(
                                  property: _properties[index] as Map<String, dynamic>,
                                  onTap: () => context.push('/property/${_properties[index]['id']}'),
                                ),
                              ),
                            ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }
}

class _PropertyCard extends StatelessWidget {
  final Map<String, dynamic> property;
  final VoidCallback onTap;

  const _PropertyCard({required this.property, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final images = property['images'] as List<dynamic>? ?? [];
    final stars = property['stars'] as int?;
    final startingPrice = property['startingPrice'];
    final currency = property['currency'] ?? 'USD';
    final amenities = property['amenities'] as List<dynamic>? ?? [];

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 1,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Container(
              height: 180,
              width: double.infinity,
              color: theme.colorScheme.surfaceContainerHighest,
              child: images.isNotEmpty
                  ? Image.network(
                      images[0].toString(),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _placeholderImage(theme),
                    )
                  : _placeholderImage(theme),
            ),

            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type badge + stars
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _typeLabel(property['type']?.toString()),
                          style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onPrimaryContainer, fontWeight: FontWeight.w600),
                        ),
                      ),
                      if (stars != null) ...[
                        const SizedBox(width: 8),
                        Row(
                          children: List.generate(stars, (_) => Icon(Icons.star, size: 14, color: Colors.amber.shade700)),
                        ),
                      ],
                      const Spacer(),
                      if (startingPrice != null)
                        Text(
                          'From $currency ${_formatPrice(startingPrice)}',
                          style: theme.textTheme.titleSmall?.copyWith(
                            color: theme.colorScheme.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Name
                  Text(
                    property['name']?.toString() ?? '',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),

                  // Location
                  Row(
                    children: [
                      Icon(Icons.location_on_outlined, size: 14, color: theme.colorScheme.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          [property['city'], property['country']].where((e) => e != null && e.toString().isNotEmpty).join(', '),
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),

                  // Amenities preview
                  if (amenities.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: amenities.take(4).map((a) => Chip(
                        label: Text(a.toString(), style: const TextStyle(fontSize: 11)),
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        visualDensity: VisualDensity.compact,
                        padding: EdgeInsets.zero,
                      )).toList(),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholderImage(ThemeData theme) {
    return Center(
      child: Icon(Icons.hotel_rounded, size: 64, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.3)),
    );
  }

  String _typeLabel(String? type) {
    switch (type) {
      case 'hotel': return 'Hotel';
      case 'restaurant': return 'Restaurant';
      case 'resort': return 'Resort';
      case 'boutique_hotel': return 'Boutique';
      case 'hostel': return 'Hostel';
      default: return 'Hotel';
    }
  }

  String _formatPrice(dynamic price) {
    final p = double.tryParse(price.toString()) ?? 0;
    return p.toStringAsFixed(p.truncateToDouble() == p ? 0 : 2);
  }
}
