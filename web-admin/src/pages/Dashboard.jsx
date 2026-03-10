import { useState, useEffect, useCallback } from 'react';
import {
  BedDouble,
  Users,
  CalendarCheck,
  DollarSign,
  TrendingUp,
  ClipboardList,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { useWebSocket } from '../hooks/useWebSocket';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentReservations, setRecentReservations] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, reservationsRes, ordersRes, revenueRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-reservations'),
        api.get('/dashboard/recent-orders'),
        api.get('/dashboard/revenue-chart'),
      ]);
      setStats(statsRes.data);
      setRecentReservations(reservationsRes.data);
      setRecentOrders(ordersRes.data);
      setRevenueData(revenueRes.data.map(d => ({ name: d.day, revenue: d.revenue })));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time refresh: listen for dashboard-refresh events via WebSocket
  const handleDashboardRefresh = useCallback(() => { fetchData(); }, [fetchData]);
  useWebSocket('dashboard', { 'dashboard:refresh': handleDashboardRefresh });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">Failed to load dashboard</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
        <button onClick={() => { setLoading(true); fetchData(); }} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Rooms',
      value: stats?.totalRooms || 0,
      icon: BedDouble,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      change: `${stats?.occupancyRate || 0}% occupied`,
      up: true,
    },
    {
      label: 'Today Check-ins',
      value: stats?.todayCheckIns || 0,
      icon: CalendarCheck,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      change: `${stats?.todayCheckOuts || 0} check-outs`,
      up: true,
    },
    {
      label: 'Active Orders',
      value: stats?.activeOrders || 0,
      icon: ClipboardList,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      change: 'In restaurant',
      up: false,
    },
    {
      label: 'Monthly Revenue',
      value: `$${(stats?.monthlyRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      change: `$${(stats?.dailyRevenue || 0).toLocaleString()} today`,
      up: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your hospitality operations</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="card flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              <div className="flex items-center gap-1 mt-2">
                {card.up ? (
                  <ArrowUpRight size={14} className="text-green-500" />
                ) : (
                  <ArrowDownRight size={14} className="text-gray-400" />
                )}
                <span className="text-xs text-gray-500">{card.change}</span>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${card.bgColor}`}>
              <card.icon size={22} className={`${card.color.replace('bg-', 'text-')}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Revenue</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#93c5fd" name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Day</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reservations */}
        <div className="card p-0">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Reservations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Recent Reservations</caption>
              <thead>
                <tr>
                  <th className="table-header">Guest</th>
                  <th className="table-header">Room</th>
                  <th className="table-header">Check In</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentReservations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="table-cell text-center text-gray-400">No reservations yet</td>
                  </tr>
                ) : (
                  recentReservations.slice(0, 5).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium text-gray-900">
                        {r.guest?.firstName} {r.guest?.lastName}
                      </td>
                      <td className="table-cell text-gray-500">{r.room?.roomNumber}</td>
                      <td className="table-cell text-gray-500">{r.checkIn}</td>
                      <td className="table-cell">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card p-0">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Recent Orders</caption>
              <thead>
                <tr>
                  <th className="table-header">Order #</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="table-cell text-center text-gray-400">No orders yet</td>
                  </tr>
                ) : (
                  recentOrders.slice(0, 5).map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium text-gray-900">{o.orderNumber}</td>
                      <td className="table-cell text-gray-500 capitalize">{o.orderType?.replace('_', ' ')}</td>
                      <td className="table-cell text-gray-900">${Number(o.total).toFixed(2)}</td>
                      <td className="table-cell">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
