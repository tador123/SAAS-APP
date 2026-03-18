import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../services/booking_service.dart';

class RoomBookingScreen extends StatefulWidget {
  final Map<String, dynamic> room;
  final Map<String, dynamic> property;
  const RoomBookingScreen({super.key, required this.room, required this.property});

  @override
  State<RoomBookingScreen> createState() => _RoomBookingScreenState();
}

class _RoomBookingScreenState extends State<RoomBookingScreen> {
  DateTime _checkIn = DateTime.now().add(const Duration(days: 1));
  DateTime _checkOut = DateTime.now().add(const Duration(days: 2));
  int _adults = 1;
  int _children = 0;
  final _requestsController = TextEditingController();
  bool _loading = false;

  int get _nights => _checkOut.difference(_checkIn).inDays;
  double get _totalAmount => (double.tryParse(widget.room['price'].toString()) ?? 0) * _nights;

  Future<void> _pickDate(bool isCheckIn) async {
    final initial = isCheckIn ? _checkIn : _checkOut;
    final firstDate = isCheckIn ? DateTime.now() : _checkIn.add(const Duration(days: 1));

    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(firstDate) ? firstDate : initial,
      firstDate: firstDate,
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (picked != null) {
      setState(() {
        if (isCheckIn) {
          _checkIn = picked;
          if (_checkOut.isBefore(_checkIn.add(const Duration(days: 1))) || _checkOut.isAtSameMomentAs(_checkIn)) {
            _checkOut = _checkIn.add(const Duration(days: 1));
          }
        } else {
          _checkOut = picked;
        }
      });
    }
  }

  Future<void> _book() async {
    setState(() => _loading = true);
    try {
      await BookingService.createBooking(
        roomId: widget.room['id'] as int,
        checkIn: _checkIn.toIso8601String().split('T')[0],
        checkOut: _checkOut.toIso8601String().split('T')[0],
        adults: _adults,
        children: _children,
        specialRequests: _requestsController.text.isNotEmpty ? _requestsController.text : null,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Booking confirmed!'),
            backgroundColor: Colors.green.shade700,
          ),
        );
        context.go('/bookings');
      }
    } on DioException catch (e) {
      if (mounted) {
        final msg = e.response?.data?['error']?.toString() ?? 'Booking failed. Please try again.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: Theme.of(context).colorScheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final currency = widget.property['currency'] ?? 'USD';
    final maxOccupancy = widget.room['maxOccupancy'] as int? ?? 4;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Book Room'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Room summary card
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      width: 70,
                      height: 70,
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(Icons.bed, size: 32, color: theme.colorScheme.primary),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(widget.property['name']?.toString() ?? '', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                          Text(_roomTypeLabel(widget.room['type']?.toString()),
                              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                          Text('Room ${widget.room['roomNumber']}', style: theme.textTheme.bodySmall),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('$currency ${widget.room['price']}', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
                        Text('/night', style: theme.textTheme.bodySmall),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Dates
            Text('Select Dates', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _DateTile(
                    label: 'Check-in',
                    date: _checkIn,
                    onTap: () => _pickDate(true),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Icon(Icons.arrow_forward, color: theme.colorScheme.onSurfaceVariant),
                ),
                Expanded(
                  child: _DateTile(
                    label: 'Check-out',
                    date: _checkOut,
                    onTap: () => _pickDate(false),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Center(
              child: Text('$_nights night${_nights != 1 ? 's' : ''}',
                  style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.primary, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 24),

            // Guests
            Text('Guests', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _CounterTile(
                    label: 'Adults',
                    value: _adults,
                    min: 1,
                    max: maxOccupancy,
                    onChanged: (v) => setState(() => _adults = v),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _CounterTile(
                    label: 'Children',
                    value: _children,
                    min: 0,
                    max: maxOccupancy - _adults,
                    onChanged: (v) => setState(() => _children = v),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Special requests
            Text('Special Requests', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            TextField(
              controller: _requestsController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Any special requirements? (optional)',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
              ),
            ),
            const SizedBox(height: 32),

            // Price summary
            Card(
              color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _priceRow('Room rate', '$currency ${widget.room['price']} x $_nights night${_nights != 1 ? 's' : ''}'),
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Total', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                        Text('$currency ${_totalAmount.toStringAsFixed(2)}',
                            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Book button
            SizedBox(
              width: double.infinity,
              height: 56,
              child: FilledButton(
                onPressed: _loading ? null : _book,
                style: FilledButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: _loading
                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Confirm Booking', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _priceRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: Theme.of(context).textTheme.bodyMedium),
        Text(value, style: Theme.of(context).textTheme.bodyMedium),
      ],
    );
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
    _requestsController.dispose();
    super.dispose();
  }
}

class _DateTile extends StatelessWidget {
  final String label;
  final DateTime date;
  final VoidCallback onTap;

  const _DateTile({required this.label, required this.date, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.3)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
            const SizedBox(height: 4),
            Text(
              '${date.day}/${date.month}/${date.year}',
              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

class _CounterTile extends StatelessWidget {
  final String label;
  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  const _CounterTile({required this.label, required this.value, required this.min, required this.max, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: theme.textTheme.bodyMedium),
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.remove_circle_outline, size: 22),
                onPressed: value > min ? () => onChanged(value - 1) : null,
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
              ),
              SizedBox(width: 28, child: Text('$value', textAlign: TextAlign.center, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold))),
              IconButton(
                icon: const Icon(Icons.add_circle_outline, size: 22),
                onPressed: value < max ? () => onChanged(value + 1) : null,
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
