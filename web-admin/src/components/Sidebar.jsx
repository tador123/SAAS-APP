import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';
import {
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  UtensilsCrossed,
  ClipboardList,
  Receipt,
  Users,
  UserCog,
  Settings,
  Building2,
  X,
  Globe,
  ScrollText,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/rooms', icon: BedDouble, labelKey: 'nav.rooms' },
  { to: '/reservations', icon: CalendarCheck, labelKey: 'nav.reservations' },
  { to: '/restaurant', icon: UtensilsCrossed, labelKey: 'nav.restaurant' },
  { to: '/orders', icon: ClipboardList, labelKey: 'nav.orders' },
  { to: '/invoices', icon: Receipt, labelKey: 'nav.invoices' },
  { to: '/guests', icon: Users, labelKey: 'nav.guests' },
  { to: '/users', icon: UserCog, labelKey: 'nav.users' },
  { to: '/audit-logs', icon: ScrollText, labelKey: 'nav.auditLogs' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export default function Sidebar({ open, onClose }) {
  const { t, i18n } = useTranslation();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-hotel-dark text-white transform transition-transform duration-200 ease-in-out
        lg:static lg:translate-x-0 lg:flex lg:flex-col
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-hotel-gold rounded-lg flex items-center justify-center">
              <Building2 size={24} className="text-hotel-dark" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">HotelSaaS</h1>
              <p className="text-xs text-gray-400">Hospitality Platform</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* Language selector + Footer */}
        <div className="px-4 py-3 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-2 px-2">
            <Globe size={14} className="text-gray-400 shrink-0" />
            <select
              value={i18n.language?.split('-')[0] || 'en'}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="bg-white/5 text-gray-300 text-xs rounded-lg border-0 py-1 px-2 w-full focus:ring-1 focus:ring-primary-500 cursor-pointer"
              aria-label="Select language"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-hotel-dark">
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
          <div className="px-3 py-2 bg-hotel-accent/50 rounded-lg">
            <p className="text-xs text-hotel-gold font-medium">Free Plan</p>
            <p className="text-xs text-gray-400 mt-0.5">Upgrade for more features</p>
          </div>
        </div>
      </aside>
    </>
  );
}
