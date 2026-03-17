import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, ChefHat, Bell, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import { useWebSocket } from '../hooks/useWebSocket';
import toast from 'react-hot-toast';

const statusColors = {
  confirmed: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
  preparing: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20',
  ready: 'border-green-400 bg-green-50 dark:bg-green-900/20',
};

const statusLabels = { confirmed: 'newOrders', preparing: 'preparing', ready: 'ready' };

function ElapsedTimer({ since }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(since).getTime()) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [since]);
  return <span className="font-mono text-sm">{elapsed}</span>;
}

export default function KitchenDisplay() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0 });
  const [loading, setLoading] = useState(true);
  const audioRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, statsRes] = await Promise.all([
        api.get('/kitchen/orders'),
        api.get('/kitchen/stats'),
      ]);
      setOrders(ordersRes.data.data || []);
      setStats(statsRes.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleNewOrder = useCallback(() => {
    fetchData();
    try { audioRef.current?.play(); } catch {}
  }, [fetchData]);

  useWebSocket(['kitchen', 'orders'], {
    'order:new': handleNewOrder,
    'order:status': fetchData,
    'order:updated': fetchData,
  });

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      toast.success(`→ ${status}`);
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const columns = [
    { key: 'confirmed', label: t('kitchen.newOrders'), icon: Bell, color: 'text-blue-600' },
    { key: 'preparing', label: t('kitchen.preparing'), icon: ChefHat, color: 'text-orange-600' },
    { key: 'ready', label: t('kitchen.ready'), icon: CheckCircle, color: 'text-green-600' },
  ];

  const statusMap = {
    confirmed: orders.filter(o => o.status === 'confirmed'),
    preparing: orders.filter(o => o.status === 'preparing'),
    ready: orders.filter(o => o.status === 'ready'),
  };

  const nextAction = { confirmed: 'preparing', preparing: 'ready', ready: 'served' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full">
      {/* Audio notification for new orders */}
      <audio ref={audioRef} preload="none">
        <source src="data:audio/wav;base64,UklGRl9vT19teleWWF2ZUZtdCAQAAEAAQBEAAABAAg" type="audio/wav" />
      </audio>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ChefHat size={28} /> {t('kitchen.title')}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t('kitchen.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          {columns.map(col => (
            <div key={col.key} className="text-center">
              <p className={`text-2xl font-bold ${col.color}`}>{stats[col.key] || 0}</p>
              <p className="text-xs text-gray-500">{col.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[60vh]">
        {columns.map(col => (
          <div key={col.key} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <col.icon size={18} className={col.color} />
              <h2 className="font-semibold text-gray-900 dark:text-white">{col.label}</h2>
              <span className="ml-auto bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold px-2 py-0.5 rounded-full">
                {statusMap[col.key].length}
              </span>
            </div>

            {statusMap[col.key].length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">{t('kitchen.noOrders')}</p>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
                {statusMap[col.key].map(order => (
                  <div key={order.id} className={`rounded-lg border-l-4 p-3 bg-white dark:bg-gray-800 shadow-sm ${statusColors[order.status]}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{order.orderNumber}</p>
                        <p className="text-xs text-gray-500">
                          {order.table ? `Table ${order.table.tableNumber}` : order.orderType?.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock size={12} />
                        <ElapsedTimer since={order.createdAt} />
                      </div>
                    </div>

                    <div className="space-y-1 mb-3">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700 dark:text-gray-300">
                              <span className="font-medium">{item.quantity}×</span> {item.name}
                            </span>
                            {item.notes && <span className="text-xs text-gray-400 italic">{item.notes}</span>}
                          </div>
                          {item.categoryName && (
                            <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mt-0.5">
                              {item.categoryName}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <p className="text-xs text-gray-500 italic mb-2 border-t pt-1">{order.notes}</p>
                    )}

                    {nextAction[order.status] && (
                      <button
                        onClick={() => updateStatus(order.id, nextAction[order.status])}
                        className="w-full btn-primary text-xs py-1.5"
                      >
                        {order.status === 'confirmed'
                          ? t('kitchen.markPreparing')
                          : order.status === 'preparing'
                          ? t('kitchen.markReady')
                          : t('kitchen.markServed')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
