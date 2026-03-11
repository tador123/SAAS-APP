import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Sparkles, CheckCircle, Eye, Trash2 } from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { useConfirm } from '../components/ConfirmDialog';
import { useSubmitting } from '../hooks/useHelpers';
import { useWebSocket } from '../hooks/useWebSocket';
import toast from 'react-hot-toast';

const defaultForm = {
  roomId: '',
  type: 'daily_clean',
  priority: 'medium',
  assignedTo: '',
  notes: '',
};

const taskTypes = ['checkout_clean', 'daily_clean', 'deep_clean', 'maintenance', 'inspection'];
const priorities = ['low', 'medium', 'high', 'urgent'];

const priorityColors = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function Housekeeping() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [filterStatus, setFilterStatus] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [submitting, withSubmit] = useSubmitting();
  const confirm = useConfirm();

  const fetchTasks = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (filterStatus) params.status = filterStatus;
      const { data } = await api.get('/housekeeping', { params });
      setTasks(data.data || []);
      setPagination({ page: parseInt(data.pagination?.page || 1), totalPages: data.pagination?.totalPages || 1, total: data.pagination?.total || 0 });
    } catch { toast.error(t('common.loading')); }
    finally { setLoading(false); }
  }, [filterStatus, t]);

  useEffect(() => {
    fetchTasks(1);
    Promise.all([
      api.get('/rooms', { params: { limit: 100 } }),
      api.get('/users', { params: { limit: 100 } }),
    ]).then(([roomsRes, staffRes]) => {
      setRooms(roomsRes.data.data || roomsRes.data.rooms || []);
      setStaff(staffRes.data.data || staffRes.data.users || []);
    }).catch(() => {});
  }, [fetchTasks]);

  const handleRefresh = useCallback(() => fetchTasks(pagination.page), [fetchTasks, pagination.page]);
  useWebSocket('housekeeping', { 'housekeeping:update': handleRefresh });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await withSubmit(async () => {
      try {
        await api.post('/housekeeping', form);
        toast.success(t('housekeeping.addTask'));
        setShowModal(false);
        setForm(defaultForm);
        fetchTasks(pagination.page);
      } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    });
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/housekeeping/${id}`, { status });
      toast.success(t('common.save'));
      fetchTasks(pagination.page);
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: t('common.delete'), message: t('common.confirm') });
    if (!ok) return;
    try {
      await api.delete(`/housekeeping/${id}`);
      toast.success(t('common.delete'));
      fetchTasks(pagination.page);
    } catch { toast.error('Failed to delete'); }
  };

  const statusFlow = { pending: 'in_progress', in_progress: 'completed', completed: 'inspected' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('housekeeping.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('housekeeping.subtitle')}</p>
        </div>
        <button onClick={() => { setForm(defaultForm); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> {t('housekeeping.addTask')}
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'in_progress', 'completed', 'inspected'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>
            {s ? t(`housekeeping.${s === 'in_progress' ? 'inProgress' : s}`) : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" /></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Sparkles size={48} className="mx-auto mb-4 text-gray-300" />
          <p>{t('housekeeping.noTasks')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map(task => (
            <div key={task.id} className="card space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('housekeeping.room')} {task.room?.roomNumber}
                  </h3>
                  <p className="text-xs text-gray-500">{t(`housekeeping.${task.type === 'checkout_clean' ? 'checkoutClean' : task.type === 'daily_clean' ? 'dailyClean' : task.type === 'deep_clean' ? 'deepClean' : task.type}`)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                  {t(`housekeeping.${task.priority}`)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={task.status} />
                {task.assignee && (
                  <span className="text-xs text-gray-500">→ {task.assignee.firstName} {task.assignee.lastName}</span>
                )}
              </div>

              {task.notes && <p className="text-sm text-gray-600 dark:text-gray-400">{task.notes}</p>}

              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                {statusFlow[task.status] && (
                  <button onClick={() => updateStatus(task.id, statusFlow[task.status])}
                    className="btn-primary text-xs flex-1 flex items-center justify-center gap-1">
                    {task.status === 'completed' ? <><Eye size={14} /> {t('housekeeping.inspect')}</> : <><CheckCircle size={14} /> {t('housekeeping.markComplete')}</>}
                  </button>
                )}
                <button onClick={() => handleDelete(task.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination current={pagination.page} totalPages={pagination.totalPages} onPageChange={(p) => fetchTasks(p)} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t('housekeeping.addTask')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{t('housekeeping.room')}</label>
            <select value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value })} className="input-field" required>
              <option value="">{t('common.search')}...</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber} - {r.type}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('housekeeping.type')}</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
              {taskTypes.map(tt => <option key={tt} value={tt}>{t(`housekeeping.${tt === 'checkout_clean' ? 'checkoutClean' : tt === 'daily_clean' ? 'dailyClean' : tt === 'deep_clean' ? 'deepClean' : tt}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('housekeeping.priority')}</label>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="input-field">
              {priorities.map(p => <option key={p} value={p}>{t(`housekeeping.${p}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('housekeeping.assignee')}</label>
            <select value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} className="input-field">
              <option value="">Unassigned</option>
              {staff.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('common.notes')}</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field" rows={3} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? t('common.loading') : t('common.save')}
          </button>
        </form>
      </Modal>
    </div>
  );
}
