import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Printer, Filter } from 'lucide-react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import SortableHeader from '../components/SortableHeader';
import { useSortable } from '../hooks/useSortable';
import Pagination from '../components/Pagination';
import { useDebounce } from '../hooks/useHelpers';
import { useCurrency } from '../context/CurrencyContext';
import { exportCSV, printTable } from '../utils/exportData';
import GuestQRScanner from '../components/GuestQRScanner';
import { useWebSocket } from '../hooks/useWebSocket';
import toast from 'react-hot-toast';

const csvColumns = [
  { key: (r) => r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : '', label: 'Guest' },
  { key: (r) => r.table?.tableNumber || '', label: 'Table' },
  { key: 'reservationDate', label: 'Date' },
  { key: (r) => r.reservationTime?.slice(0, 5) || '', label: 'Time' },
  { key: 'partySize', label: 'Party Size' },
  { key: (r) => r.table?.location || '', label: 'Location' },
  { key: (r) => Number(r.preOrderTotal || 0).toFixed(2), label: 'Pre-order Total' },
  { key: 'status', label: 'Status' },
];

const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['seated', 'cancelled', 'no_show'],
  seated: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export default function TableReservations() {
  const { formatCurrency } = useCurrency();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const debouncedSearch = useDebounce(search, 300);
  const { sorted, sortField, sortDir, requestSort } = useSortable(reservations, 'reservationDate', 'desc');
  const [expandedId, setExpandedId] = useState(null);

  const fetchData = useCallback(async (page = 1, { silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const params = { page, limit: 15 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      const res = await api.get('/table-reservations', { params });
      setReservations(res.data.data || []);
      setPagination({
        page: res.data.pagination?.page || page,
        totalPages: res.data.pagination?.totalPages || 1,
        total: res.data.pagination?.total || 0,
      });
    } catch {
      if (!silent) toast.error('Failed to load table reservations');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [debouncedSearch, statusFilter, dateFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time WS: silently stream live data without disturbing the admin
  const handleTableReservationRefresh = useCallback(() => { fetchData(pagination.page, { silent: true }); }, [fetchData, pagination.page]);
  useWebSocket(['reservations', 'notifications'], {
    'table-reservation:new': handleTableReservationRefresh,
    'dashboard:refresh': handleTableReservationRefresh,
  });

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/table-reservations/${id}`, { status: newStatus });
      toast.success('Status updated');
      fetchData(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Table Reservations</h1>
        <p className="text-gray-500 text-sm mt-1">Manage restaurant table bookings</p>
      </div>

      {/* Search, Filters & Export */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative max-w-xs w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder="Search by guest..." aria-label="Search table reservations" />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field pl-9 pr-8 text-sm">
              <option value="">All statuses</option>
              {['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input-field text-sm" aria-label="Filter by date" />
        </div>
        <div className="flex gap-2">
          <GuestQRScanner mode="table-checkin" onGuestFound={() => fetchData(pagination.page)} />
          <button onClick={() => exportCSV(reservations, csvColumns, `table_reservations_${new Date().toISOString().slice(0, 10)}.csv`)} className="btn-secondary flex items-center gap-2 text-sm" disabled={reservations.length === 0}>
            <Download size={16} /> CSV
          </button>
          <button onClick={() => printTable({ title: 'Table Reservations', data: reservations, columns: csvColumns })} className="btn-secondary flex items-center gap-2 text-sm" disabled={reservations.length === 0}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Table reservations list</caption>
            <thead>
              <tr>
                <SortableHeader field="guestId" label="Guest" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <th className="table-header">Table</th>
                <SortableHeader field="reservationDate" label="Date" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader field="reservationTime" label="Time" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader field="partySize" label="Party" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <th className="table-header">Location</th>
                <th className="table-header">Pre-order</th>
                <SortableHeader field="status" label="Status" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reservations.length === 0 ? (
                <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-8">No table reservations found</td></tr>
              ) : (
                sorted.map((r) => {
                  const nextStatuses = STATUS_TRANSITIONS[r.status] || [];
                  const preOrderItems = r.preOrderItems || [];
                  const isExpanded = expandedId === r.id;

                  return (
                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                      <td className="table-cell font-medium text-gray-900">{r.guest?.firstName} {r.guest?.lastName}</td>
                      <td className="table-cell text-gray-600">#{r.table?.tableNumber} <span className="text-xs text-gray-400">({r.table?.capacity} seats)</span></td>
                      <td className="table-cell text-gray-600">{r.reservationDate}</td>
                      <td className="table-cell text-gray-600">{r.reservationTime?.slice(0, 5)}</td>
                      <td className="table-cell text-gray-600">{r.partySize}</td>
                      <td className="table-cell text-gray-600 capitalize">{r.table?.location}</td>
                      <td className="table-cell">
                        {preOrderItems.length > 0 ? (
                          <span className="text-sm">
                            {preOrderItems.length} items • {formatCurrency(Number(r.preOrderTotal || 0))}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">None</span>
                        )}
                      </td>
                      <td className="table-cell"><StatusBadge status={r.status} /></td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {nextStatuses.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(r.id, s)}
                              className={`text-xs px-2 py-1 rounded-lg font-medium ${
                                s === 'cancelled' || s === 'no_show'
                                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                  : s === 'seated'
                                    ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                    : s === 'completed'
                                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                      : 'btn-primary py-1 px-2'
                              }`}
                              aria-label={`${s === 'completed' ? 'done' : s.replace(/_/g, ' ')} reservation for ${r.guest?.firstName}`}
                            >
                              {s === 'completed' ? 'Done' : s.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded row showing pre-order details and special requests */}
        {expandedId && (() => {
          const r = reservations.find(x => x.id === expandedId);
          if (!r) return null;
          const items = r.preOrderItems || [];
          return (
            <div className="border-t bg-gray-50 px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {r.specialRequests && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Special Requests</h4>
                    <p className="text-sm text-gray-600">{r.specialRequests}</p>
                  </div>
                )}
                {items.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Pre-ordered Items</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {items.map((item, i) => (
                        <li key={i}>{item.quantity}x {item.name} — {formatCurrency(item.price * item.quantity)}</li>
                      ))}
                    </ul>
                    <p className="text-sm font-medium mt-2">Total: {formatCurrency(Number(r.preOrderTotal || 0))}</p>
                  </div>
                )}
                {!r.specialRequests && items.length === 0 && (
                  <p className="text-sm text-gray-400">No additional details</p>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Contact</h4>
                  <p className="text-sm text-gray-600">{r.guest?.email}</p>
                  <p className="text-sm text-gray-600">{r.guest?.phone}</p>
                </div>
              </div>
            </div>
          );
        })()}

        <Pagination pagination={pagination} onPageChange={(p) => fetchData(p)} />
      </div>
    </div>
  );
}
