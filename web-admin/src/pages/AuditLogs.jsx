import { useState, useEffect } from 'react';
import { FileText, Search, Download, Filter } from 'lucide-react';
import api from '../api/axios';
import Pagination from '../components/Pagination';
import { useDebounce } from '../hooks/useHelpers';
import { exportCSV } from '../utils/exportData';
import toast from 'react-hot-toast';

const ACTIONS = ['', 'create', 'update', 'delete', 'login', 'logout', 'status_change'];
const ENTITY_TYPES = ['', 'Room', 'Guest', 'Reservation', 'Order', 'Invoice', 'User', 'MenuItem', 'MenuCategory', 'RestaurantTable'];

const auditCSVColumns = [
  { key: (r) => new Date(r.createdAt).toLocaleString(), label: 'Timestamp' },
  { key: (r) => r.user ? `${r.user.firstName} ${r.user.lastName}` : `User #${r.userId}`, label: 'User' },
  { key: 'action', label: 'Action' },
  { key: 'entityType', label: 'Entity' },
  { key: 'entityId', label: 'Entity ID' },
  { key: (r) => r.ipAddress || '', label: 'IP Address' },
  { key: (r) => r.changes ? JSON.stringify(r.changes) : '', label: 'Changes' },
];

const actionColors = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  login: 'bg-purple-100 text-purple-700',
  logout: 'bg-gray-100 text-gray-700',
  status_change: 'bg-yellow-100 text-yellow-700',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  useEffect(() => { fetchLogs(1); }, [filterAction, filterEntity]);

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 30 };
      if (filterAction) params.action = filterAction;
      if (filterEntity) params.entityType = filterEntity;
      const { data } = await api.get('/audit-logs', { params });
      setLogs(data.data || []);
      setPagination({
        page: data.pagination?.page || page,
        totalPages: data.pagination?.totalPages || 1,
        total: data.pagination?.total || 0,
      });
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 text-sm mt-1">Track all system activities and changes</p>
        </div>
        <button
          onClick={() => exportCSV(logs, auditCSVColumns, `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`)}
          className="btn-secondary flex items-center gap-2 text-sm"
          disabled={logs.length === 0}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="input-field text-sm py-1.5 w-40" aria-label="Filter by action">
            <option value="">All Actions</option>
            {ACTIONS.filter(Boolean).map(a => <option key={a} value={a} className="capitalize">{a.replace('_', ' ')}</option>)}
          </select>
        </div>
        <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} className="input-field text-sm py-1.5 w-44" aria-label="Filter by entity type">
          <option value="">All Entities</option>
          {ENTITY_TYPES.filter(Boolean).map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        {(filterAction || filterEntity) && (
          <button onClick={() => { setFilterAction(''); setFilterEntity(''); }} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Clear filters
          </button>
        )}
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Audit logs</caption>
              <thead>
                <tr>
                  <th className="table-header">Timestamp</th>
                  <th className="table-header">User</th>
                  <th className="table-header">Action</th>
                  <th className="table-header">Entity</th>
                  <th className="table-header">Entity ID</th>
                  <th className="table-header">IP Address</th>
                  <th className="table-header">Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-8">No audit logs found</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="table-cell text-gray-500 text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="table-cell font-medium text-gray-900 text-sm">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : `User #${log.userId}`}
                        {log.user?.role && <span className="block text-xs text-gray-400 capitalize">{log.user.role}</span>}
                      </td>
                      <td className="table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                          {log.action?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="table-cell text-gray-600 text-sm">{log.entityType}</td>
                      <td className="table-cell text-gray-500 text-sm">{log.entityId}</td>
                      <td className="table-cell text-gray-500 text-xs">{log.ipAddress || '—'}</td>
                      <td className="table-cell text-xs text-gray-500 max-w-xs truncate">
                        {log.changes ? (
                          <details className="cursor-pointer">
                            <summary className="text-primary-600 hover:text-primary-700">View changes</summary>
                            <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto max-w-sm">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </details>
                        ) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={(p) => fetchLogs(p)} />
        </div>
      )}
    </div>
  );
}
