import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Building2,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';

export default function SystemAdmin() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filter, setFilter] = useState(''); // '', 'pending', 'approved', 'rejected'
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/system-admin/stats');
      setStats(data);
    } catch { /* ignore */ }
  }, []);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filter) params.status = filter;
      if (search) params.search = search;
      const { data } = await api.get('/system-admin/properties', { params });
      setProperties(data.properties);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const handleApprove = async (id) => {
    try {
      await api.post(`/system-admin/properties/${id}/approve`);
      toast.success('Property approved');
      fetchProperties();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await api.post(`/system-admin/properties/${rejectModal}/reject`, { reason: rejectReason });
      toast.success('Property rejected');
      setRejectModal(null);
      setRejectReason('');
      fetchProperties();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject');
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.put(`/system-admin/properties/${id}/toggle`);
      toast.success('Property status toggled');
      fetchProperties();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to toggle');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete property "${name}"? This action is reversible (soft-delete).`)) return;
    try {
      await api.delete(`/system-admin/properties/${id}`);
      toast.success('Property deleted');
      fetchProperties();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const statCards = stats ? [
    { label: 'Total Properties', value: stats.totalProperties, icon: Building2, color: 'bg-blue-500' },
    { label: 'Pending Approval', value: stats.pendingProperties, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Active Properties', value: stats.activeProperties, icon: CheckCircle2, color: 'bg-green-500' },
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-purple-500' },
  ] : [];

  const statusBadge = (status) => {
    const map = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Shield className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Administration</h1>
          <p className="text-sm text-gray-500">Manage all client properties and approvals</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${s.color}`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search properties..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                filter === f ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No properties found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {properties.map((p) => {
                  const admin = p.users?.find(u => u.role === 'admin');
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {admin ? `${admin.firstName} ${admin.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm capitalize text-gray-700">{p.subscriptionPlan}</span>
                      </td>
                      <td className="px-4 py-3">{statusBadge(p.approvalStatus)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {p.isActive ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {p.approvalStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(p.id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Approve"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                              <button
                                onClick={() => setRejectModal(p.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Reject"
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                          {p.approvalStatus === 'approved' && (
                            <button
                              onClick={() => handleToggle(p.id)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                              title={p.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {p.isActive ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} className="text-gray-400" />}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-gray-300 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Property</h3>
            <p className="text-sm text-gray-500 mb-3">Optionally provide a reason for rejection:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input-field w-full h-24 resize-none"
              placeholder="Reason for rejection (optional)"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
