import { useState, useEffect } from 'react';
import { Plus, FileText, CreditCard, Download, Printer } from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import SortableHeader from '../components/SortableHeader';
import { useSortable } from '../hooks/useSortable';
import Pagination from '../components/Pagination';
import { useConfirm } from '../components/ConfirmDialog';
import { useSubmitting } from '../hooks/useHelpers';
import { exportCSV, printTable, printInvoice } from '../utils/exportData';
import toast from 'react-hot-toast';

export default function Invoices() {
  const invoiceCSVColumns = [
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: (r) => r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : '', label: 'Guest' },
    { key: (r) => (r.items || []).length, label: 'Items' },
    { key: (r) => Number(r.total).toFixed(2), label: 'Total' },
    { key: 'status', label: 'Status' },
    { key: (r) => new Date(r.createdAt).toLocaleDateString(), label: 'Date' },
  ];

  const [invoices, setInvoices] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [invoiceItems, setInvoiceItems] = useState([{ description: '', quantity: 1, unitPrice: '' }]);
  const [form, setForm] = useState({ guestId: '', dueDate: '', notes: '' });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [submitting, withSubmit] = useSubmitting();
  const confirm = useConfirm();
  const { sorted: sortedInvoices, sortField, sortDir, requestSort } = useSortable(invoices, 'createdAt', 'desc');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async (page = 1) => {
    try {
      setLoading(true);
      const [invRes, guestRes] = await Promise.all([
        api.get('/invoices', { params: { page, limit: 15 } }),
        api.get('/guests', { params: { limit: 100 } }),
      ]);
      const invData = invRes.data;
      setInvoices(invData.invoices || invData.data || []);
      setPagination({
        page: invData.pagination?.page || page,
        totalPages: invData.pagination?.totalPages || 1,
        total: invData.pagination?.total || (invData.invoices || invData.data || []).length,
      });
      setGuests(guestRes.data.guests || guestRes.data.data || guestRes.data || []);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    setInvoiceItems([...invoiceItems, { description: '', quantity: 1, unitPrice: '' }]);
  };

  const updateLine = (index, field, value) => {
    const updated = [...invoiceItems];
    updated[index][field] = value;
    setInvoiceItems(updated);
  };

  const removeLine = (index) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const itemsTotal = invoiceItems.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const tax = itemsTotal * 0.1;
  const total = itemsTotal + tax;

  const handleSubmit = (e) => {
    e.preventDefault();
    withSubmit(async () => {
      const items = invoiceItems.map(i => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        total: Number(i.quantity) * Number(i.unitPrice),
      }));
      await api.post('/invoices', {
        guestId: form.guestId ? parseInt(form.guestId) : null,
        dueDate: form.dueDate || null,
        notes: form.notes,
        items,
        subtotal: itemsTotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
      });
      toast.success('Invoice created');
      setShowModal(false);
      setInvoiceItems([{ description: '', quantity: 1, unitPrice: '' }]);
      setForm({ guestId: '', dueDate: '', notes: '' });
      fetchData(pagination.page);
    });
  };

  const handlePay = async () => {
    try {
      await api.patch(`/invoices/${selectedInvoice.id}/pay`, { paymentMethod });
      toast.success('Invoice marked as paid');
      setShowPayModal(false);
      fetchData(pagination.page);
    } catch {
      toast.error('Failed to process payment');
    }
  };

  const handleVoid = async (id) => {
    const ok = await confirm({ title: 'Void Invoice', message: 'Are you sure you want to void this invoice?', variant: 'danger' });
    if (!ok) return;
    try {
      await api.patch(`/invoices/${id}/void`);
      toast.success('Invoice voided');
      fetchData(pagination.page);
    } catch {
      toast.error('Failed to void invoice');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">Manage billing and payments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> New Invoice</button>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => exportCSV(invoices, invoiceCSVColumns, `invoices_${new Date().toISOString().slice(0, 10)}.csv`)}
          className="btn-secondary flex items-center gap-2 text-sm"
          disabled={invoices.length === 0}
        >
          <Download size={16} /> Export CSV
        </button>
        <button
          onClick={() => printTable({ title: 'Invoices Report', data: invoices, columns: invoiceCSVColumns })}
          className="btn-secondary flex items-center gap-2 text-sm"
          disabled={invoices.length === 0}
        >
          <Printer size={16} /> Print / PDF
        </button>
      </div>

      {/* Invoice Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Invoices</p>
          <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-2xl font-bold text-green-600">{invoices.filter(i => i.status === 'paid').length}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{invoices.filter(i => i.status === 'pending').length}</p>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Invoices list</caption>
            <thead>
              <tr>
                <SortableHeader field="invoiceNumber" label="Invoice #" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <th className="table-header">Guest</th>
                <th className="table-header">Items</th>
                <SortableHeader field="total" label="Total" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader field="status" label="Status" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <SortableHeader field="createdAt" label="Date" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.length === 0 ? (
                <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">No invoices yet</td></tr>
              ) : (
                sortedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-900 flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" /> {inv.invoiceNumber}
                    </td>
                    <td className="table-cell text-gray-600">{inv.guest ? `${inv.guest.firstName} ${inv.guest.lastName}` : '—'}</td>
                    <td className="table-cell text-gray-600">{(inv.items || []).length} items</td>
                    <td className="table-cell font-bold text-gray-900">${Number(inv.total).toFixed(2)}</td>
                    <td className="table-cell"><StatusBadge status={inv.status} /></td>
                    <td className="table-cell text-gray-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => printInvoice(inv)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                          aria-label={`Print invoice ${inv.invoiceNumber}`}><Printer size={14} /></button>
                        {inv.status === 'pending' && (
                          <>
                            <button onClick={() => { setSelectedInvoice(inv); setShowPayModal(true); }}
                              className="btn-primary text-xs py-1 px-2 flex items-center gap-1"
                              aria-label={`Record payment for invoice ${inv.invoiceNumber}`}><CreditCard size={12} /> Pay</button>
                            <button onClick={() => handleVoid(inv.id)} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg"
                              aria-label={`Void invoice ${inv.invoiceNumber}`}>Void</button>
                          </>
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

      {/* New Invoice Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Invoice" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="inv-guest" className="block text-sm font-medium text-gray-700 mb-1">Guest (optional)</label>
              <select id="inv-guest" value={form.guestId} onChange={e => setForm({...form, guestId: e.target.value})} className="input-field">
                <option value="">Select guest</option>
                {guests.map(g => <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="inv-duedate" className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input id="inv-duedate" type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="input-field" />
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Line Items</span>
            <div className="space-y-2">
              {invoiceItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input aria-label={`Line item ${idx + 1} description`} placeholder="Description" value={item.description} onChange={e => updateLine(idx, 'description', e.target.value)} className="input-field flex-1" required />
                  <input aria-label={`Line item ${idx + 1} quantity`} type="number" placeholder="Qty" value={item.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} className="input-field w-20" min="1" required />
                  <input aria-label={`Line item ${idx + 1} unit price`} type="number" step="0.01" placeholder="Price" value={item.unitPrice} onChange={e => updateLine(idx, 'unitPrice', e.target.value)} className="input-field w-28" min="0" required />
                  <span className="w-24 text-right text-sm font-medium">${((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toFixed(2)}</span>
                  {invoiceItems.length > 1 && <button type="button" onClick={() => removeLine(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded" aria-label={`Remove line item ${idx + 1}`}>×</button>}
                </div>
              ))}
            </div>
            <button type="button" onClick={addLine} className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium">+ Add line item</button>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>${itemsTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax (10%)</span><span>${tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>{submitting ? 'Creating...' : 'Create Invoice'}</button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Pay Modal */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Record Payment" size="sm">
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">Invoice {selectedInvoice?.invoiceNumber}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">${Number(selectedInvoice?.total || 0).toFixed(2)}</p>
          </div>
          <div>
            <label htmlFor="inv-paymethod" className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select id="inv-paymethod" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input-field">
              <option value="cash">Cash</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={handlePay} className="btn-primary flex-1">Confirm Payment</button>
            <button onClick={() => setShowPayModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
