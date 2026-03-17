import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Star, Download, Printer } from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import GuestQRScanner from '../components/GuestQRScanner';
import SortableHeader from '../components/SortableHeader';
import { useSortable } from '../hooks/useSortable';
import Pagination from '../components/Pagination';
import { useConfirm } from '../components/ConfirmDialog';
import { useDebounce, useSubmitting } from '../hooks/useHelpers';
import { useFormValidation, validators, FieldError } from '../hooks/useFormValidation';
import { exportCSV, printTable } from '../utils/exportData';
import toast from 'react-hot-toast';

const guestCSVColumns = [
  { key: (r) => `${r.firstName} ${r.lastName}`, label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'nationality', label: 'Nationality' },
  { key: (r) => r.idType ? `${r.idType}: ${r.idNumber}` : '', label: 'ID' },
  { key: (r) => r.vipStatus ? 'Yes' : 'No', label: 'VIP' },
];

const defaultForm = {
  firstName: '', lastName: '', email: '', phone: '', nationality: '',
  idType: '', idNumber: '', address: '', vipStatus: false, notes: '',
};

export default function Guests() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [submitting, withSubmit] = useSubmitting();
  const confirm = useConfirm();
  const debouncedSearch = useDebounce(search, 300);
  const { sorted: sortedGuests, sortField, sortDir, requestSort } = useSortable(guests, 'firstName', 'asc');

  const validationSchema = useMemo(() => ({
    firstName: [validators.required('First name')],
    lastName: [validators.required('Last name')],
    email: [validators.email()],
    phone: [validators.required('Phone'), validators.phone()],
  }), []);
  const { errors: fieldErrors, validate, validateField, clearErrors } = useFormValidation(validationSchema);

  useEffect(() => { fetchGuests(1, debouncedSearch); }, [debouncedSearch]);

  const fetchGuests = async (page = 1, searchTerm = '') => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (searchTerm) params.search = searchTerm;
      const { data } = await api.get('/guests', { params });
      setGuests(data.guests || data.data || []);
      setPagination({
        page: data.pagination?.page || page,
        totalPages: data.pagination?.totalPages || 1,
        total: data.pagination?.total || (data.guests || data.data || []).length,
      });
    } catch {
      toast.error('Failed to load guests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate(form)) return;
    await withSubmit(async () => {
      try {
        if (editing) {
          await api.put(`/guests/${editing.id}`, form);
          toast.success('Guest updated');
        } else {
          await api.post('/guests', form);
          toast.success('Guest added');
        }
        setShowModal(false);
        setEditing(null);
        setForm(defaultForm);
        fetchGuests(pagination.page, debouncedSearch);
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to save guest');
      }
    });
  };

  const handleEdit = (guest) => {
    setEditing(guest);
    clearErrors();
    setForm({
      firstName: guest.firstName, lastName: guest.lastName, email: guest.email || '',
      phone: guest.phone, nationality: guest.nationality || '', idType: guest.idType || '',
      idNumber: guest.idNumber || '', address: guest.address || '',
      vipStatus: guest.vipStatus, notes: guest.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Guest', message: 'This guest record will be permanently removed. Continue?' });
    if (!ok) return;
    try {
      await api.delete(`/guests/${id}`);
      toast.success('Guest deleted');
      fetchGuests(pagination.page, debouncedSearch);
    } catch {
      toast.error('Failed to delete guest');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guests</h1>
          <p className="text-gray-500 text-sm mt-1">Guest directory and management</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditing(null); setForm(defaultForm); clearErrors(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add Guest
          </button>
          <GuestQRScanner onGuestFound={(guest) => {
            setEditing(guest);
            clearErrors();
            setForm({
              firstName: guest.firstName || '', lastName: guest.lastName || '',
              email: guest.email || '', phone: guest.phone || '',
              nationality: guest.nationality || '', idType: guest.idType || '',
              idNumber: guest.idNumber || '', address: guest.address || '',
              vipStatus: guest.vipStatus || false, notes: guest.notes || '',
            });
            setShowModal(true);
          }} />
        </div>
      </div>

      {/* Search & Export */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative max-w-md w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Search by name, email, or phone..."
            aria-label="Search guests"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportCSV(guests, guestCSVColumns, `guests_${new Date().toISOString().slice(0, 10)}.csv`)}
            className="btn-secondary flex items-center gap-2 text-sm"
            disabled={guests.length === 0}
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => printTable({ title: 'Guest List', data: guests, columns: guestCSVColumns })}
            className="btn-secondary flex items-center gap-2 text-sm"
            disabled={guests.length === 0}
          >
            <Printer size={16} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Guests Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Guests list</caption>
              <thead>
                <tr>
                  <SortableHeader field="firstName" label="Name" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader field="email" label="Email" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader field="phone" label="Phone" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader field="nationality" label="Nationality" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <th className="table-header">ID</th>
                  <SortableHeader field="vipStatus" label="VIP" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guests.length === 0 ? (
                  <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">No guests found</td></tr>
                ) : (
                  sortedGuests.map((guest) => (
                    <tr key={guest.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium text-gray-900">{guest.firstName} {guest.lastName}</td>
                      <td className="table-cell text-gray-600">{guest.email || '—'}</td>
                      <td className="table-cell text-gray-600">{guest.phone}</td>
                      <td className="table-cell text-gray-600">{guest.nationality || '—'}</td>
                      <td className="table-cell text-gray-500 text-xs">{guest.idType ? `${guest.idType}: ${guest.idNumber}` : '—'}</td>
                      <td className="table-cell">{guest.vipStatus && <Star size={16} className="text-yellow-500 fill-yellow-500" />}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(guest)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg" aria-label={`Edit ${guest.firstName} ${guest.lastName}`}><Edit2 size={15} /></button>
                          <button onClick={() => handleDelete(guest.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" aria-label={`Delete ${guest.firstName} ${guest.lastName}`}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={(p) => fetchGuests(p, debouncedSearch)} />
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Guest' : 'Add Guest'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="g-firstName">First Name</label>
              <input id="g-firstName" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} onBlur={() => validateField('firstName', form.firstName)} className={`input-field ${fieldErrors.firstName ? 'border-red-400' : ''}`} required />
              <FieldError error={fieldErrors.firstName} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="g-lastName">Last Name</label>
              <input id="g-lastName" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} onBlur={() => validateField('lastName', form.lastName)} className={`input-field ${fieldErrors.lastName ? 'border-red-400' : ''}`} required />
              <FieldError error={fieldErrors.lastName} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="g-email">Email</label>
              <input id="g-email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} onBlur={() => validateField('email', form.email)} className={`input-field ${fieldErrors.email ? 'border-red-400' : ''}`} />
              <FieldError error={fieldErrors.email} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="g-phone">Phone</label>
              <input id="g-phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} onBlur={() => validateField('phone', form.phone)} className={`input-field ${fieldErrors.phone ? 'border-red-400' : ''}`} required />
              <FieldError error={fieldErrors.phone} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="g-nationality">Nationality</label>
              <input id="g-nationality" value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="g-idType">ID Type</label>
              <select id="g-idType" value={form.idType} onChange={e => setForm({...form, idType: e.target.value})} className="input-field">
                <option value="">Select</option>
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="drivers_license">Driver's License</option>
                <option value="other">Other</option>
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="g-idNumber">ID Number</label>
              <input id="g-idNumber" value={form.idNumber} onChange={e => setForm({...form, idNumber: e.target.value})} className="input-field" /></div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2">
                <input type="checkbox" checked={form.vipStatus} onChange={e => setForm({...form, vipStatus: e.target.checked})} className="rounded" />
                <span className="text-sm font-medium">VIP Guest</span>
              </label>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="g-address">Address</label>
            <textarea id="g-address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input-field" rows="2" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="g-notes">Notes</label>
            <textarea id="g-notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input-field" rows="2" /></div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Add Guest'}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
