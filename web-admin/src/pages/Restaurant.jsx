import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UtensilsCrossed, Upload, X } from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { useConfirm } from '../components/ConfirmDialog';
import { useSubmitting } from '../hooks/useHelpers';
import toast from 'react-hot-toast';
import { useCurrency } from '../context/CurrencyContext';

export default function Restaurant() {
  const { formatCurrency, currency } = useCurrency();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('menu');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, withSubmit] = useSubmitting();
  const [uploading, setUploading] = useState(false);
  const confirm = useConfirm();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [catRes, menuRes, tableRes] = await Promise.all([
        api.get('/restaurant/categories'),
        api.get('/restaurant/menu-items'),
        api.get('/restaurant/tables'),
      ]);
      setCategories(catRes.data);
      setMenuItems(menuRes.data);
      setTables(tableRes.data);
    } catch (error) {
      toast.error('Failed to load restaurant data');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditing(item);
    if (type === 'category') {
      setForm(item ? { name: item.name, description: item.description || '' } : { name: '', description: '' });
    } else if (type === 'menuItem') {
      setForm(item ? {
        name: item.name, categoryId: item.categoryId, price: item.price,
        description: item.description || '', preparationTime: item.preparationTime || '',
        isAvailable: item.isAvailable, isVegetarian: item.isVegetarian, isVegan: item.isVegan,
        image: item.image || '',
      } : {
        name: '', categoryId: categories[0]?.id || '', price: '', description: '',
        preparationTime: '', isAvailable: true, isVegetarian: false, isVegan: false,
        image: '',
      });
    } else {
      setForm(item ? {
        tableNumber: item.tableNumber, capacity: item.capacity, location: item.location, status: item.status,
      } : { tableNumber: '', capacity: 4, location: 'indoor', status: 'available' });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    withSubmit(async () => {
      const endpoints = {
        category: editing ? `/restaurant/categories/${editing.id}` : '/restaurant/categories',
        menuItem: editing ? `/restaurant/menu-items/${editing.id}` : '/restaurant/menu-items',
        table: editing ? `/restaurant/tables/${editing.id}` : '/restaurant/tables',
      };
      const method = editing ? 'put' : 'post';
      await api[method](endpoints[modalType], form);
      toast.success(`${modalType === 'menuItem' ? 'Menu item' : modalType} ${editing ? 'updated' : 'created'}`);
      setShowModal(false);
      fetchData();
    });
  };

  const handleMenuImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', 'menu');
    setUploading(true);
    try {
      const { data } = await api.post('/uploads/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(prev => ({ ...prev, image: data.url }));
    } catch { toast.error('Image upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleDelete = async (type, id) => {
    const ok = await confirm({ title: 'Delete Item', message: 'Are you sure you want to delete this item?', variant: 'danger' });
    if (!ok) return;
    try {
      const endpoints = { category: `/restaurant/categories/${id}`, menuItem: `/restaurant/menu-items/${id}` };
      await api.delete(endpoints[type]);
      toast.success('Deleted successfully');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurant</h1>
          <p className="text-gray-500 text-sm mt-1">Manage menu, categories, and tables</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {['menu', 'categories', 'tables'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Menu Items Tab */}
      {activeTab === 'menu' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => openModal('menuItem')} className="btn-primary flex items-center gap-2"><Plus size={18} /> Add Item</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => (
              <div key={item.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-50 rounded-lg"><UtensilsCrossed size={16} className="text-orange-500" /></div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-xs text-gray-400">{item.category?.name}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-primary-600">{formatCurrency(item.price)}</span>
                </div>
                {item.description && <p className="text-sm text-gray-500 mb-2">{item.description}</p>}
                <div className="flex items-center gap-2 mb-3">
                  {item.isVegetarian && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Vegetarian</span>}
                  {item.isVegan && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Vegan</span>}
                  {item.preparationTime && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{item.preparationTime} min</span>}
                  <span className={`px-2 py-0.5 text-xs rounded ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => openModal('menuItem', item)} className="flex-1 btn-secondary text-sm py-1.5 flex items-center justify-center gap-1" aria-label={`Edit menu item ${item.name}`}><Edit2 size={14} /> Edit</button>
                  <button onClick={() => handleDelete('menuItem', item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" aria-label={`Delete menu item ${item.name}`}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => openModal('category')} className="btn-primary flex items-center gap-2"><Plus size={18} /> Add Category</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="card">
                <h3 className="font-semibold text-gray-900 mb-1">{cat.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{cat.description || 'No description'}</p>
                <p className="text-sm text-gray-400 mb-3">{cat.items?.length || 0} items</p>
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => openModal('category', cat)} className="flex-1 btn-secondary text-sm py-1.5" aria-label={`Edit category ${cat.name}`}>Edit</button>
                  <button onClick={() => handleDelete('category', cat.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" aria-label={`Delete category ${cat.name}`}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tables Tab */}
      {activeTab === 'tables' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => openModal('table')} className="btn-primary flex items-center gap-2"><Plus size={18} /> Add Table</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {tables.map((table) => (
              <div key={table.id} onClick={() => openModal('table', table)}
                className={`card text-center cursor-pointer hover:shadow-md transition-all ${table.status === 'occupied' ? 'border-red-200 bg-red-50' : table.status === 'reserved' ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
                <h3 className="text-lg font-bold text-gray-900">{table.tableNumber}</h3>
                <p className="text-sm text-gray-500">{table.capacity} seats</p>
                <p className="text-xs text-gray-400 capitalize mt-1">{table.location}</p>
                <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${table.status === 'available' ? 'bg-green-200 text-green-800' : table.status === 'occupied' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                  {table.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editing ? 'Edit' : 'Add'} ${modalType === 'menuItem' ? 'Menu Item' : modalType}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {modalType === 'category' && (
            <>
              <div><label htmlFor="cat-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input id="cat-name" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="input-field" required /></div>
              <div><label htmlFor="cat-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea id="cat-desc" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="input-field" rows="2" /></div>
            </>
          )}
          {modalType === 'menuItem' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="mi-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input id="mi-name" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="input-field" required /></div>
                <div><label htmlFor="mi-category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select id="mi-category" value={form.categoryId || ''} onChange={e => setForm({...form, categoryId: parseInt(e.target.value)})} className="input-field" required>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <div><label htmlFor="mi-price" className="block text-sm font-medium text-gray-700 mb-1">Price ({currency})</label>
                  <input id="mi-price" type="number" step="0.01" value={form.price || ''} onChange={e => setForm({...form, price: e.target.value})} className="input-field" required /></div>
                <div><label htmlFor="mi-preptime" className="block text-sm font-medium text-gray-700 mb-1">Prep Time (min)</label>
                  <input id="mi-preptime" type="number" value={form.preparationTime || ''} onChange={e => setForm({...form, preparationTime: parseInt(e.target.value)})} className="input-field" /></div>
              </div>
              <div><label htmlFor="mi-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea id="mi-desc" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="input-field" rows="2" /></div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isAvailable} onChange={e => setForm({...form, isAvailable: e.target.checked})} className="rounded" /><span className="text-sm">Available</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isVegetarian} onChange={e => setForm({...form, isVegetarian: e.target.checked})} className="rounded" /><span className="text-sm">Vegetarian</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isVegan} onChange={e => setForm({...form, isVegan: e.target.checked})} className="rounded" /><span className="text-sm">Vegan</span></label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Image</label>
                {form.image ? (
                  <div className="relative group w-24 h-24 mb-2">
                    <img src={form.image} alt="" className="w-24 h-24 object-cover rounded-lg border" />
                    <button type="button" onClick={() => setForm({...form, image: ''})} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                  </div>
                ) : null}
                <label className="flex items-center gap-2 btn-secondary text-sm cursor-pointer w-fit">
                  <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Image'}
                  <input type="file" accept="image/*" onChange={handleMenuImageUpload} className="hidden" disabled={uploading} />
                </label>
              </div>
            </>
          )}
          {modalType === 'table' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="tbl-number" className="block text-sm font-medium text-gray-700 mb-1">Table Number</label>
                <input id="tbl-number" value={form.tableNumber || ''} onChange={e => setForm({...form, tableNumber: e.target.value})} className="input-field" required /></div>
              <div><label htmlFor="tbl-capacity" className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input id="tbl-capacity" type="number" value={form.capacity || ''} onChange={e => setForm({...form, capacity: parseInt(e.target.value)})} className="input-field" min="1" required /></div>
              <div><label htmlFor="tbl-location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select id="tbl-location" value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} className="input-field">
                  {['indoor','outdoor','terrace','private'].map(l => <option key={l} value={l} className="capitalize">{l}</option>)}
                </select></div>
              <div><label htmlFor="tbl-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="tbl-status" value={form.status || ''} onChange={e => setForm({...form, status: e.target.value})} className="input-field">
                  {['available','occupied','reserved','maintenance'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select></div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>{submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create'}</button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
