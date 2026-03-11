import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
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
  Sparkles,
  ChefHat,
  FileText,
  QrCode,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/rooms', icon: BedDouble, labelKey: 'nav.rooms' },
  { to: '/reservations', icon: CalendarCheck, labelKey: 'nav.reservations' },
  { to: '/housekeeping', icon: Sparkles, labelKey: 'nav.housekeeping' },
  { to: '/restaurant', icon: UtensilsCrossed, labelKey: 'nav.restaurant' },
  { to: '/orders', icon: ClipboardList, labelKey: 'nav.orders' },
  { to: '/kitchen', icon: ChefHat, labelKey: 'nav.kitchen' },
  { to: '/invoices', icon: Receipt, labelKey: 'nav.invoices' },
  { to: '/folio', icon: FileText, labelKey: 'nav.folio' },
  { to: '/guests', icon: Users, labelKey: 'nav.guests' },
  { to: '/qr-ordering', icon: QrCode, labelKey: 'nav.qrOrdering' },
  { to: '/users', icon: UserCog, labelKey: 'nav.users' },
  { to: '/audit-logs', icon: ScrollText, labelKey: 'nav.auditLogs' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export default function Sidebar({ open, onClose }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { branding } = useBranding();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 text-white transform transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0 lg:flex lg:flex-col
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ backgroundColor: branding.sidebarColor }}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.brandName}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: branding.accentColor }}>
                <Building2 size={24} className="text-white" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-white truncate max-w-[140px]">{branding.brandName}</h1>
              <p className="text-xs text-gray-400 truncate max-w-[140px]">{branding.tagline}</p>
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
          <div className="px-3 py-2 bg-white/5 rounded-lg">
            <p className="text-xs font-medium capitalize" style={{ color: branding.accentColor }}>{user?.subscriptionPlan || 'Free'} Plan</p>
            <p className="text-xs text-gray-400 mt-0.5">Upgrade for more features</p>
          </div>
        </div>
      </aside>
    </>
  );
}
