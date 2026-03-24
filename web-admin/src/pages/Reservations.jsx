import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit2, Search, Download, Printer } from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import GuestQRScanner from '../components/GuestQRScanner';
import StatusBadge from '../components/StatusBadge';
import SortableHeader from '../components/SortableHeader';
import { useSortable } from '../hooks/useSortable';
import Pagination from '../components/Pagination';
import { useSubmitting, useDebounce } from '../hooks/useHelpers';
import { useFormValidation, validators, FieldError } from '../hooks/useFormValidation';
import { useCurrency } from '../context/CurrencyContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { exportCSV, printTable } from '../utils/exportData';
import toast from 'react-hot-toast';

const reservationCSVColumns = [
  { key: (r) => r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : '', label: 'Guest' },
  { key: (r) => r.room?.roomNumber || '', label: 'Room' },
  { key: 'checkIn', label: 'Check In' },
  { key: 'checkOut', label: 'Check Out' },
  { key: (r) => `${r.adults}A ${r.children > 0 ? r.children + 'C' : ''}`, label: 'Guests' },
  { key: (r) => Number(r.totalAmount).toFixed(2), label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
];

const defaultForm = {
  guestId: '', roomId: '', checkIn: '', checkOut: '', status: 'pending',
  adults: 1, children: 0, totalAmount: '', specialRequests: '', source: 'walk_in',
};

export default function Reservations() {
  const { formatCurrency } = useCurrency();
  const [reservations, setReservations] = useState([]);
  const [guests, setGuests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [submitting, withSubmit] = useSubmitting();
  const debouncedSearch = useDebounce(search, 300);
  const { sorted: sortedReservations, sortField, sortDir, requestSort } = useSortable(reservations, 'checkIn', 'desc');

  // Memoize the schema so it doesn't trigger re-renders but note:
  // dateAfter uses a callback to read the latest form.checkIn at validation time
  const validationSchema = useMemo(() => ({
    guestId: [validators.required('Guest')],
    roomId: [validators.required('Room')],
    checkIn: [validators.required('Check-in date')],
    checkOut: [validators.required('Check-out date'), validators.dateAfter(() => form.checkIn, 'Check-out')],
    totalAmount: [validators.required('Total amount'), validators.positiveNumber('Total amount')],
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const { errors: fieldErrors, validate, validateField, clearErrors } = useFormValidation(validationSchema);

  useEffect(() => { fetchData(); }, [debouncedSearch]);

  const fetchData = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (debouncedSearch) params.search = debouncedSearch;
      const [resRes, guestRes, roomRes] = await Promise.all([
        api.get('/reservations', { params }),
        api.get('/guests', { params: { limit: 100 } }),
        api.get('/rooms', { params: { limit: 100 } }),
      ]);
      const resData = resRes.data;
      setReservations(resData.reservations || resData.data || []);
      setPagination({
        page: resData.pagination?.page || page,
        totalPages: resData.pagination?.totalPages || 1,
        total: resData.pagination?.total || (resData.reservations || resData.data || []).length,
      });
      setGuests(guestRes.data.guests || guestRes.data.data || guestRes.data || []);
      setRooms(roomRes.data.rooms || roomRes.data.data || roomRes.data || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  // Real-time WS: auto-refresh when reservations change
  const handleReservationsRefresh = useCallback(() => { fetchData(pagination.page); }, [fetchData, pagination.page]);
  useWebSocket(['reservations', 'notifications'], {
    'reservation:new': handleReservationsRefresh,
    'reservation:status': handleReservationsRefresh,
    'dashboard:refresh': handleReservationsRefresh,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate(form)) return;
    withSubmit(async () => {
      const payload = { ...form, guestId: parseInt(form.guestId), roomId: parseInt(form.roomId), totalAmount: parseFloat(form.totalAmount) };
      if (editing) {
        await api.put(`/reservations/${editing.id}`, payload);
        toast.success('Reservation updated');
      } else {
        await api.post('/reservations', payload);
        toast.success('Reservation created');
      }
      setShowModal(false);
      setEditing(null);
      setForm(defaultForm);
      fetchData(pagination.page);
    });
  };

  const handleEdit = (res) => {
    setEditing(res);
    clearErrors();
    setForm({
      guestId: res.guestId, roomId: res.roomId, checkIn: res.checkIn, checkOut: res.checkOut,
      status: res.status, adults: res.adults, children: res.children,
      totalAmount: res.totalAmount, specialRequests: res.specialRequests || '', source: res.source,
    });
    setShowModal(true);
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/reservations/${id}`, { status });
      toast.success('Status updated');
      fetchData(pagination.page);
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Handle QR check-in result
  const handleQRCheckIn = ({ guest, reservation, checkedIn }) => {
    if (checkedIn) {
      // Auto-checked in — just refresh the table
      fetchData(pagination.page);
    } else {
      // Guest found but no reservation — open new reservation form with guest pre-selected
      setEditing(null);
      clearErrors();
      setForm({ ...defaultForm, guestId: guest.id });
      setShowModal(true);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-gray-500 text-sm mt-1">Manage bookings and check-ins</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditing(null); setForm(defaultForm); clearErrors(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> New Reservation
          </button>
          <GuestQRScanner mode="checkin" onGuestFound={handleQRCheckIn} />
        </div>
      </div>

      {/* Search & Export */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder="Search reservations..." aria-label="Search reservations" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(reservations, reservationCSVColumns, `reservations_${new Date().toISOString().slice(0, 10)}.csv`)} className="btn-secondary flex items-center gap-2 text-sm" disabled={reservations.length === 0}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => printTable({ title: 'Reservations Report', data: reservations, columns: reservationCSVColumns })} className="btn-secondary flex items-center gap-2 text-sm" disabled={reservations.length === 0}>
            <Printer size={16} /> Print / PDF
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Reservations list</caption>
              <thead>
              <tr>
                <SortableHeader field="guestId" label="Guest" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <th className="table-header">Room</th>
                <SortableHeader field="checkIn" label="Check In" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader field="checkOut" label="Check Out" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader field="adults" label="Guests" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader field="totalAmount" label="Amount" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader field="status" label="Status" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reservations.length === 0 ? (
                <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-8">No reservations found</td></tr>
              ) : (
                sortedReservations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-900">{r.guest?.firstName} {r.guest?.lastName}</td>
                    <td className="table-cell text-gray-600">{r.room?.roomNumber} ({r.room?.type})</td>
                    <td className="table-cell text-gray-600">{r.checkIn}</td>
                    <td className="table-cell text-gray-600">{r.checkOut}</td>
                    <td className="table-cell text-gray-600">{r.adults}A {r.children > 0 ? `${r.children}C` : ''}</td>
                    <td className="table-cell font-medium text-gray-900">{formatCurrency(Number(r.totalAmount))}</td>
                    <td className="table-cell"><StatusBadge status={r.status} /></td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(r)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg" aria-label={`Edit reservation for ${r.guest?.firstName} ${r.guest?.lastName}`}>
                          <Edit2 size={15} />
                        </button>
                        {r.status === 'confirmed' && (
                          <button onClick={() => handleStatusChange(r.id, 'checked_in')} className="text-xs btn-primary py-1 px-2" aria-label={`Check in ${r.guest?.firstName} ${r.guest?.lastName}`}>Check In</button>
                        )}
                        {r.status === 'checked_in' && (
                          <button onClick={() => handleStatusChange(r.id, 'checked_out')} className="text-xs bg-orange-500 text-white px-2 py-1 rounded-lg hover:bg-orange-600" aria-label={`Check out ${r.guest?.firstName} ${r.guest?.lastName}`}>Check Out</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagination={pagination} onPageChange={(p) => fetchData(p)} />
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Reservation' : 'New Reservation'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="res-guest" className="block text-sm font-medium text-gray-700 mb-1">Guest</label>
              <select id="res-guest" value={form.guestId} onChange={e => setForm({...form, guestId: e.target.value})} className="input-field" required>
                <option value="">Select guest</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="res-room" className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <select id="res-room" value={form.roomId} onChange={e => setForm({...form, roomId: e.target.value})} className="input-field" required>
                <option value="">Select room</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber} - {r.type} ({formatCurrency(r.price)}/n)</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="res-checkin" className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
              <input id="res-checkin" type="date" value={form.checkIn} onChange={e => setForm({...form, checkIn: e.target.value})} onBlur={() => validateField('checkIn', form.checkIn)} className={`input-field ${fieldErrors.checkIn ? 'border-red-400' : ''}`} required />
              <FieldError error={fieldErrors.checkIn} />
            </div>
            <div>
              <label htmlFor="res-checkout" className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
              <input id="res-checkout" type="date" value={form.checkOut} onChange={e => setForm({...form, checkOut: e.target.value})} onBlur={() => validateField('checkOut', form.checkOut)} className={`input-field ${fieldErrors.checkOut ? 'border-red-400' : ''}`} required />
              <FieldError error={fieldErrors.checkOut} />
            </div>
            <div>
              <label htmlFor="res-adults" className="block text-sm font-medium text-gray-700 mb-1">Adults</label>
              <input id="res-adults" type="number" value={form.adults} onChange={e => setForm({...form, adults: parseInt(e.target.value)})} className="input-field" min="1" required />
            </div>
            <div>
              <label htmlFor="res-children" className="block text-sm font-medium text-gray-700 mb-1">Children</label>
              <input id="res-children" type="number" value={form.children} onChange={e => setForm({...form, children: parseInt(e.target.value)})} className="input-field" min="0" />
            </div>
            <div>
              <label htmlFor="res-amount" className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
              <input id="res-amount" type="number" step="0.01" value={form.totalAmount} onChange={e => setForm({...form, totalAmount: e.target.value})} onBlur={() => validateField('totalAmount', form.totalAmount)} className={`input-field ${fieldErrors.totalAmount ? 'border-red-400' : ''}`} required />
              <FieldError error={fieldErrors.totalAmount} />
            </div>
            <div>
              <label htmlFor="res-source" className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select id="res-source" value={form.source} onChange={e => setForm({...form, source: e.target.value})} className="input-field">
                <option value="walk_in">Walk In</option>
                <option value="phone">Phone</option>
                <option value="website">Website</option>
                <option value="booking_com">Booking.com</option>
                <option value="airbnb">Airbnb</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          {editing && (
            <div>
              <label htmlFor="res-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select id="res-status" value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input-field">
                {['pending','confirmed','checked_in','checked_out','cancelled','no_show'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="res-requests" className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
            <textarea id="res-requests" value={form.specialRequests} onChange={e => setForm({...form, specialRequests: e.target.value})} className="input-field" rows="2" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>{submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Reservation'}</button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
