import { useState, useEffect, useCallback } from 'react';
import { Plus, ChefHat, Search, Download, Printer, ArrowUpDown } from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { useSubmitting, useDebounce } from '../hooks/useHelpers';
import { useSortable } from '../hooks/useSortable';
import { useWebSocket } from '../hooks/useWebSocket';
import { exportCSV, printTable } from '../utils/exportData';
import toast from 'react-hot-toast';

const orderCSVColumns = [
  { key: 'orderNumber', label: 'Order #' },
  { key: (r) => r.orderType?.replace('_', ' '), label: 'Type' },
  { key: (r) => r.table?.tableNumber || '', label: 'Table' },
  { key: (r) => (r.items || []).length, label: 'Items' },
  { key: (r) => Number(r.total).toFixed(2), label: 'Total' },
  { key: 'status', label: 'Status' },
  { key: (r) => new Date(r.createdAt).toLocaleDateString(), label: 'Date' },
];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [form, setForm] = useState({ tableId: '', orderType: 'dine_in', notes: '' });
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [submitting, withSubmit] = useSubmitting();
  const debouncedSearch = useDebounce(search, 300);
  const { sorted: sortedOrders, sortField, sortDir, requestSort } = useSortable(orders, 'createdAt', 'desc');

  useEffect(() => { fetchData(); }, [filterStatus, debouncedSearch]);

  const fetchData = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 15, ...(filterStatus ? { status: filterStatus } : {}) };
      if (debouncedSearch) params.search = debouncedSearch;
      const [ordersRes, menuRes, tableRes] = await Promise.all([
        api.get('/orders', { params }),
        api.get('/restaurant/menu-items'),
        api.get('/restaurant/tables'),
      ]);
      const ordData = ordersRes.data;
      setOrders(ordData.orders || ordData.data || []);
      setPagination({
        page: ordData.pagination?.page || page,
        totalPages: ordData.pagination?.totalPages || 1,
        total: ordData.pagination?.total || (ordData.orders || ordData.data || []).length,
      });
      setMenuItems(menuRes.data.data || menuRes.data);
      setTables(tableRes.data.data || tableRes.data);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, debouncedSearch]);

  // Real-time WS: auto-refresh when orders change
  const handleOrdersRefresh = useCallback(() => { fetchData(pagination.page); }, [fetchData, pagination.page]);
  useWebSocket(['kitchen', 'orders'], { 'order:updated': handleOrdersRefresh, 'dashboard:refresh': handleOrdersRefresh });

  const addItem = (menuItem) => {
    const existing = orderItems.find((i) => i.menuItemId === menuItem.id);
    if (existing) {
      setOrderItems(orderItems.map((i) => i.menuItemId === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setOrderItems([...orderItems, { menuItemId: menuItem.id, name: menuItem.name, price: Number(menuItem.price), quantity: 1, notes: '' }]);
    }
  };

  const removeItem = (menuItemId) => {
    setOrderItems(orderItems.filter((i) => i.menuItemId !== menuItemId));
  };

  const updateQuantity = (menuItemId, qty) => {
    if (qty <= 0) return removeItem(menuItemId);
    setOrderItems(orderItems.map((i) => i.menuItemId === menuItemId ? { ...i, quantity: qty } : i));
  };

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (orderItems.length === 0) { toast.error('Add at least one item'); return; }
    withSubmit(async () => {
      await api.post('/orders', {
        ...form,
        tableId: form.tableId ? parseInt(form.tableId) : null,
        items: orderItems,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
      });
      toast.success('Order created');
      setShowModal(false);
      setOrderItems([]);
      setForm({ tableId: '', orderType: 'dine_in', notes: '' });
      fetchData(pagination.page);
    });
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      toast.success('Order status updated');
      fetchData(pagination.page);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const statusFlow = {
    pending: 'confirmed',
    confirmed: 'preparing',
    preparing: 'ready',
    ready: 'served',
    served: 'completed',
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">Manage restaurant orders</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> New Order</button>
      </div>

      {/* Search & Export */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder="Search orders..." aria-label="Search orders" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(orders, orderCSVColumns, `orders_${new Date().toISOString().slice(0, 10)}.csv`)} className="btn-secondary flex items-center gap-2 text-sm" disabled={orders.length === 0}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => printTable({ title: 'Orders Report', data: orders, columns: orderCSVColumns })} className="btn-secondary flex items-center gap-2 text-sm" disabled={orders.length === 0}>
            <Printer size={16} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {['', 'pending', 'confirmed', 'preparing', 'ready', 'served', 'completed'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filterStatus === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {s || 'All'}
          </button>
        ))}
        <span className="ml-auto" />
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <ArrowUpDown size={14} />
          <select value={sortField || ''} onChange={(e) => requestSort(e.target.value)} className="input-field py-1 text-sm w-36">
            <option value="createdAt">Date</option>
            <option value="orderNumber">Order #</option>
            <option value="total">Total</option>
            <option value="status">Status</option>
            <option value="orderType">Type</option>
          </select>
        </label>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">No orders found</div>
        ) : (
          sortedOrders.map((order) => (
            <div key={order.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{order.orderNumber}</h3>
                  <p className="text-xs text-gray-400 capitalize">{order.orderType?.replace('_', ' ')} {order.table && `• ${order.table.tableNumber}`}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="space-y-1 mb-3">
                {(order.items || []).slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.quantity}x {item.name}</span>
                    <span className="text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                {(order.items || []).length > 3 && <p className="text-xs text-gray-400">+{order.items.length - 3} more items</p>}
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="text-lg font-bold text-gray-900">${Number(order.total).toFixed(2)}</span>
                <div className="flex gap-2">
                  {statusFlow[order.status] && (
                    <button onClick={() => updateOrderStatus(order.id, statusFlow[order.status])}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                      aria-label={`Advance order ${order.orderNumber} to ${statusFlow[order.status]?.replace('_', ' ')}`}>
                      <ChefHat size={14} /> {statusFlow[order.status]?.replace('_', ' ')}
                    </button>
                  )}
                  {!['completed', 'cancelled'].includes(order.status) && (
                    <button onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      className="text-xs text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg"
                      aria-label={`Cancel order ${order.orderNumber}`}>Cancel</button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination pagination={pagination} onPageChange={(p) => fetchData(p)} />

      {/* New Order Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Order" size="xl">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="order-type" className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
              <select id="order-type" value={form.orderType} onChange={e => setForm({...form, orderType: e.target.value})} className="input-field">
                <option value="dine_in">Dine In</option>
                <option value="room_service">Room Service</option>
                <option value="takeaway">Takeaway</option>
              </select>
            </div>
            <div>
              <label htmlFor="order-table" className="block text-sm font-medium text-gray-700 mb-1">Table</label>
              <select id="order-table" value={form.tableId} onChange={e => setForm({...form, tableId: e.target.value})} className="input-field">
                <option value="">No table</option>
                {tables.filter(t => t.status === 'available').map(t => <option key={t.id} value={t.id}>{t.tableNumber} ({t.capacity} seats)</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="order-notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input id="order-notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input-field" placeholder="Special instructions" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Menu items to add */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Menu Items</h4>
              <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-2">
                {menuItems.filter(m => m.isAvailable).map((item) => (
                  <button type="button" key={item.id} onClick={() => addItem(item)}
                    className="w-full flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg text-left text-sm">
                    <span>{item.name}</span>
                    <span className="font-medium text-primary-600">${Number(item.price).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Current order */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Order Items ({orderItems.length})</h4>
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                {orderItems.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Click menu items to add</p>
                ) : (
                  orderItems.map((item) => (
                    <div key={item.menuItemId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">${item.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)} className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-sm" aria-label={`Decrease quantity of ${item.name}`}>-</button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)} className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-sm" aria-label={`Increase quantity of ${item.name}`}>+</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {orderItems.length > 0 && (
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Tax (10%)</span><span>${tax.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t"><span>Total</span><span>${total.toFixed(2)}</span></div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 mt-4 border-t">
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>{submitting ? 'Creating...' : 'Create Order'}</button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
