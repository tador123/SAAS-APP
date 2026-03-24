import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, LogOut, User, Menu, Moon, Sun, X, BedDouble, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';

// Reusable AudioContext for notification sounds (avoids browser limits)
let _audioCtx = null;
function _getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}

// Generate a coin-shuffle notification sound using Web Audio API
function playCoinSound() {
  try {
    const ctx = _getAudioCtx();
    const play = () => {
      const times = [0, 0.08, 0.16, 0.24, 0.35];
      const freqs = [1800, 2200, 2000, 2400, 2600];
      times.forEach((t, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freqs[i];
        gain.gain.setValueAtTime(0.15, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.12);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.12);
      });
    };
    if (ctx.state === 'suspended') {
      ctx.resume().then(play);
    } else {
      play();
    }
  } catch {
    // Audio not available
  }
}

export default function Header({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNewReservation = useCallback((data) => {
    const guestName = data.guest ? `${data.guest.firstName} ${data.guest.lastName}` : 'A guest';
    setNotifications(prev => [{
      id: Date.now(),
      type: 'reservation',
      message: `${guestName} booked Room ${data.room?.roomNumber || ''}`,
      time: new Date(),
      read: false,
    }, ...prev].slice(0, 50));
    playCoinSound();
  }, []);

  const handleNewTableReservation = useCallback((data) => {
    const guestName = data.guestName || 'A guest';
    const tableNum = data.table?.tableNumber || '';
    const hasPreOrder = data.preOrderItems?.length > 0;
    setNotifications(prev => [{
      id: Date.now(),
      type: 'table-reservation',
      message: `${guestName} reserved Table #${tableNum}${hasPreOrder ? ` with ${data.preOrderItems.length} pre-order items` : ''}`,
      time: new Date(),
      read: false,
    }, ...prev].slice(0, 50));
    playCoinSound();
  }, []);

  const handleNewOrder = useCallback((data) => {
    setNotifications(prev => [{
      id: Date.now(),
      type: 'order',
      message: `New order #${data.orderNumber || ''} received`,
      time: new Date(),
      read: false,
    }, ...prev].slice(0, 50));
    playCoinSound();
  }, []);

  useWebSocket(
    ['notifications', 'reservations', 'dashboard', 'orders'],
    {
      'reservation:new': handleNewReservation,
      'table-reservation:new': handleNewTableReservation,
      'order:new': handleNewOrder,
    },
    !!user
  );

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    if (diffMs < 60000) return 'Just now';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'reservation': return <BedDouble size={14} className="text-blue-500" />;
      case 'table-reservation': return <UtensilsCrossed size={14} className="text-orange-500" />;
      case 'order': return <UtensilsCrossed size={14} className="text-green-500" />;
      default: return <Bell size={14} className="text-gray-500" />;
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 rounded-lg"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Welcome back, {user?.firstName || 'User'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary-600 hover:text-primary-700">Mark all read</button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      <div className="mt-0.5 p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 shrink-0">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-200">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatTime(n.time)}</p>
                      </div>
                      <button onClick={() => removeNotification(n.id)} className="text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={toggle}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full flex items-center justify-center" aria-hidden="true">
            <User size={16} />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            aria-label="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
