import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Shield, ShieldCheck, ShieldX, Download, Printer } from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import SortableHeader from '../components/SortableHeader';
import { useSortable } from '../hooks/useSortable';
import Pagination from '../components/Pagination';
import { useConfirm } from '../components/ConfirmDialog';
import { useDebounce, useSubmitting } from '../hooks/useHelpers';
import { exportCSV, printTable } from '../utils/exportData';
import toast from 'react-hot-toast';

const ROLES = ['admin', 'manager', 'receptionist', 'waiter', 'chef', 'staff'];

const userCSVColumns = [
  { key: (r) => `${r.firstName} ${r.lastName}`, label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: (r) => r.isActive ? 'Active' : 'Inactive', label: 'Status' },
  { key: (r) => r.lastLogin ? new Date(r.lastLogin).toLocaleDateString() : 'Never', label: 'Last Login' },
];

const defaultForm = {
  username: '', email: '', firstName: '', lastName: '', phone: '', role: 'staff', password: '',
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [submitting, withSubmit] = useSubmitting();
  const confirm = useConfirm();
  const debouncedSearch = useDebounce(search, 300);
  const { sorted: sortedUsers, sortField, sortDir, requestSort } = useSortable(users, 'firstName', 'asc');

  useEffect(() => { fetchUsers(1, debouncedSearch); }, [debouncedSearch]);

  const fetchUsers = async (page = 1, searchTerm = '') => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (searchTerm) params.search = searchTerm;
      const { data } = await api.get('/users', { params });
      setUsers(data.users || []);
      setPagination({
        page: data.pagination?.page || page,
        totalPages: data.pagination?.totalPages || 1,
        total: data.pagination?.total || 0,
      });
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await withSubmit(async () => {
      try {
        if (editing) {
          await api.put(`/users/${editing.id}`, {
            firstName: form.firstName,
            lastName: form.lastName,
            role: form.role,
            phone: form.phone,
          });
          toast.success('User updated');
        } else {
          await api.post('/auth/register', form);
          toast.success('User created');
        }
        setShowModal(false);
        setEditing(null);
        setForm(defaultForm);
        fetchUsers(pagination.page, debouncedSearch);
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to save user');
      }
    });
  };

  const handleEdit = (user) => {
    setEditing(user);
    setForm({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      role: user.role,
      password: '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete User',
      message: 'This user account will be deactivated. Continue?',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      fetchUsers(pagination.page, debouncedSearch);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      toast.success(user.isActive ? 'User deactivated' : 'User activated');
      fetchUsers(pagination.page, debouncedSearch);
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const roleBadge = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-700',
      manager: 'bg-purple-100 text-purple-700',
      receptionist: 'bg-blue-100 text-blue-700',
      waiter: 'bg-green-100 text-green-700',
      chef: 'bg-orange-100 text-orange-700',
      staff: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[role] || colors.staff}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage staff accounts</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(defaultForm); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add User
        </button>
      </div>

      {/* Search & Export */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative max-w-md w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Search by name or email..."
            aria-label="Search users"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(users, userCSVColumns, `users_${new Date().toISOString().slice(0, 10)}.csv`)} className="btn-secondary flex items-center gap-2 text-sm" disabled={users.length === 0}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => printTable({ title: 'Users Report', data: users, columns: userCSVColumns })} className="btn-secondary flex items-center gap-2 text-sm" disabled={users.length === 0}>
            <Printer size={16} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Users list</caption>
              <thead>
                <tr>
                  <SortableHeader field="firstName" label="Name" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader field="email" label="Email" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader field="role" label="Role" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader field="isActive" label="Status" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableHeader field="lastLogin" label="Last Login" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-8">No users found</td></tr>
                ) : (
                  sortedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium text-gray-900">{u.firstName} {u.lastName}</td>
                      <td className="table-cell text-gray-600">{u.email}</td>
                      <td className="table-cell">{roleBadge(u.role)}</td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                          aria-label={`${u.isActive ? 'Deactivate' : 'Activate'} ${u.firstName} ${u.lastName}`}
                        >
                          {u.isActive ? <ShieldCheck size={12} /> : <ShieldX size={12} />}
                          {u.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="table-cell text-gray-500 text-sm">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(u)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg" aria-label={`Edit ${u.firstName} ${u.lastName}`}><Edit2 size={15} /></button>
                          <button onClick={() => handleDelete(u.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" aria-label={`Delete ${u.firstName} ${u.lastName}`}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={(p) => fetchUsers(p, debouncedSearch)} />
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit User' : 'Create User'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="u-firstName">First Name</label>
              <input id="u-firstName" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="u-lastName">Last Name</label>
              <input id="u-lastName" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="input-field" required />
            </div>
          </div>

          {!editing && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="u-username">Username</label>
                <input id="u-username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="input-field" required minLength={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="u-email">Email</label>
                <input id="u-email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="u-password">Password</label>
                <input id="u-password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field" required minLength={8}
                  placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special" />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="u-phone">Phone</label>
            <input id="u-phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="u-role">Role</label>
            <select id="u-role" value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input-field">
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create User'}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
