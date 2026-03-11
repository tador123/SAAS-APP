import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, BedDouble, Search, Download, Printer, ArrowUpDown, Upload, X } from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { useConfirm } from '../components/ConfirmDialog';
import { useSubmitting, useDebounce } from '../hooks/useHelpers';
import { useSortable } from '../hooks/useSortable';
import { exportCSV, printTable } from '../utils/exportData';
import toast from 'react-hot-toast';

const roomTypes = ['single', 'double', 'twin', 'suite', 'deluxe', 'penthouse'];
const roomStatuses = ['available', 'occupied', 'reserved', 'maintenance', 'cleaning'];

const roomCSVColumns = [
  { key: 'roomNumber', label: 'Room #' },
  { key: 'type', label: 'Type' },
  { key: 'floor', label: 'Floor' },
  { key: (r) => Number(r.price).toFixed(2), label: 'Price/Night' },
  { key: 'maxOccupancy', label: 'Capacity' },
  { key: 'status', label: 'Status' },
];

const defaultForm = {
  roomNumber: '', type: 'double', floor: 1, price: '', status: 'available',
  maxOccupancy: 2, description: '', amenities: [], images: [],
};

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [submitting, withSubmit] = useSubmitting();
  const [uploading, setUploading] = useState(false);
  const confirm = useConfirm();
  const debouncedSearch = useDebounce(search, 300);
  const { sorted: sortedRooms, sortField, sortDir, requestSort } = useSortable(rooms, 'roomNumber', 'asc');

  useEffect(() => { fetchRooms(1); }, [filterStatus, debouncedSearch]);

  const fetchRooms = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 12 };
      if (filterStatus) params.status = filterStatus;
      if (debouncedSearch) params.search = debouncedSearch;
      const { data } = await api.get('/rooms', { params });
      setRooms(data.rooms || data.data || []);
      setPagination({
        page: data.pagination?.page || page,
        totalPages: data.pagination?.totalPages || 1,
        total: data.pagination?.total || (data.rooms || data.data || []).length,
      });
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await withSubmit(async () => {
      try {
        if (editing) {
          await api.put(`/rooms/${editing.id}`, form);
          toast.success('Room updated');
        } else {
          await api.post('/rooms', form);
          toast.success('Room created');
        }
        setShowModal(false);
        setEditing(null);
        setForm(defaultForm);
        fetchRooms(pagination.page);
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to save room');
      }
    });
  };

  const handleEdit = (room) => {
    setEditing(room);
    setForm({
      roomNumber: room.roomNumber,
      type: room.type,
      floor: room.floor,
      price: room.price,
      status: room.status,
      maxOccupancy: room.maxOccupancy,
      description: room.description || '',
      amenities: room.amenities || [],
      images: room.images || [],
    });
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', 'room');
    setUploading(true);
    try {
      const { data } = await api.post('/uploads/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(prev => ({ ...prev, images: [...(prev.images || []), data.url] }));
    } catch { toast.error('Image upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const removeImage = (idx) => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Room', message: 'Are you sure you want to delete this room?' });
    if (!ok) return;
    try {
      await api.delete(`/rooms/${id}`);
      toast.success('Room deleted');
      fetchRooms(pagination.page);
    } catch {
      toast.error('Failed to delete room');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rooms</h1>
          <p className="text-gray-500 text-sm mt-1">Manage hotel rooms and availability</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(defaultForm); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Room
        </button>
      </div>

      {/* Search & Export */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder="Search rooms..." aria-label="Search rooms" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(rooms, roomCSVColumns, `rooms_${new Date().toISOString().slice(0, 10)}.csv`)} className="btn-secondary flex items-center gap-2 text-sm" disabled={rooms.length === 0}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => printTable({ title: 'Rooms Report', data: rooms, columns: roomCSVColumns })} className="btn-secondary flex items-center gap-2 text-sm" disabled={rooms.length === 0}>
            <Printer size={16} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <button onClick={() => setFilterStatus('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!filterStatus ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
          All ({rooms.length})
        </button>
        {roomStatuses.map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filterStatus === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {s}
          </button>
        ))}
        <span className="ml-auto" />
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <ArrowUpDown size={14} />
          <select value={sortField || ''} onChange={(e) => requestSort(e.target.value)} className="input-field py-1 text-sm w-36">
            <option value="roomNumber">Room #</option>
            <option value="type">Type</option>
            <option value="floor">Floor</option>
            <option value="price">Price</option>
            <option value="maxOccupancy">Capacity</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedRooms.map((room) => (
            <div key={room.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <BedDouble size={18} className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Room {room.roomNumber}</h3>
                    <p className="text-xs text-gray-500 capitalize">Floor {room.floor} &bull; {room.type}</p>
                  </div>
                </div>
                <StatusBadge status={room.status} />
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Price/night</span>
                  <span className="font-semibold text-gray-900">${Number(room.price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Max occupancy</span>
                  <span className="text-gray-700">{room.maxOccupancy} guests</span>
                </div>
              </div>
              {room.amenities?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {room.amenities.slice(0, 3).map((a) => (
                    <span key={a} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{a}</span>
                  ))}
                  {room.amenities.length > 3 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">+{room.amenities.length - 3}</span>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => handleEdit(room)} className="flex-1 btn-secondary text-sm py-1.5 flex items-center justify-center gap-1" aria-label={`Edit room ${room.roomNumber}`}>
                  <Edit2 size={14} /> Edit
                </button>
                <button onClick={() => handleDelete(room.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" aria-label={`Delete room ${room.roomNumber}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && <Pagination pagination={pagination} onPageChange={(p) => fetchRooms(p)} />}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Room' : 'Add New Room'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="room-number" className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
              <input id="room-number" value={form.roomNumber} onChange={e => setForm({...form, roomNumber: e.target.value})} className="input-field" required />
            </div>
            <div>
              <label htmlFor="room-type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select id="room-type" value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="input-field">
                {roomTypes.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="room-floor" className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
              <input id="room-floor" type="number" value={form.floor} onChange={e => setForm({...form, floor: parseInt(e.target.value)})} className="input-field" min="0" required />
            </div>
            <div>
              <label htmlFor="room-price" className="block text-sm font-medium text-gray-700 mb-1">Price/Night ($)</label>
              <input id="room-price" type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="input-field" min="0" required />
            </div>
            <div>
              <label htmlFor="room-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select id="room-status" value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input-field">
                {roomStatuses.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="room-occupancy" className="block text-sm font-medium text-gray-700 mb-1">Max Occupancy</label>
              <input id="room-occupancy" type="number" value={form.maxOccupancy} onChange={e => setForm({...form, maxOccupancy: parseInt(e.target.value)})} className="input-field" min="1" required />
            </div>
          </div>
          <div>
            <label htmlFor="room-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="room-desc" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field" rows="2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Images</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(form.images || []).map((img, idx) => (
                <div key={idx} className="relative group w-20 h-20">
                  <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg border" />
                  <button type="button" onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 btn-secondary text-sm cursor-pointer w-fit">
              <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Image'}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Room'}</button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
