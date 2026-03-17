import { Link } from 'react-router-dom';
import {
  Building2, BedDouble, UtensilsCrossed, CalendarCheck, Receipt, Users,
  Sparkles, ChefHat, QrCode, BarChart3, Shield, Globe, Monitor, Smartphone,
  ChevronRight, Star, Check, Download, ArrowRight, Zap, Lock, Cloud,
} from 'lucide-react';

const features = [
  { icon: BedDouble, title: 'Room Management', desc: 'Track room status, availability, and housekeeping in real-time with an intuitive visual dashboard.' },
  { icon: CalendarCheck, title: 'Reservations', desc: 'Handle bookings, check-ins, check-outs, and manage guest folios seamlessly.' },
  { icon: UtensilsCrossed, title: 'Restaurant & POS', desc: 'Manage menus, tables, orders, and kitchen display systems from one place.' },
  { icon: ChefHat, title: 'Kitchen Display', desc: 'Real-time kitchen order display with category badges, timers, and status tracking.' },
  { icon: Receipt, title: 'Invoicing & Billing', desc: 'Generate professional invoices, manage guest folios, and track payments with Stripe integration.' },
  { icon: Users, title: 'Guest Management', desc: 'Maintain guest profiles, preferences, ID documents, and self-registration QR codes.' },
  { icon: QrCode, title: 'QR Code Ordering', desc: 'Guests scan a QR code at their table to browse the menu and place orders directly.' },
  { icon: Sparkles, title: 'Housekeeping', desc: 'Assign and track housekeeping tasks, room readiness, and maintenance requests.' },
  { icon: BarChart3, title: 'Analytics & Reports', desc: 'Occupancy rates, revenue analytics, and operational reports at your fingertips.' },
  { icon: Shield, title: 'Role-Based Access', desc: 'Admin, manager, receptionist, and staff roles with granular permissions.' },
  { icon: Globe, title: 'Multi-Language', desc: 'Built-in support for English, Spanish, French, and more with full i18n.' },
  { icon: Lock, title: 'Audit Logging', desc: 'Complete audit trail of every action for compliance and accountability.' },
];

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Perfect for trying out the platform',
    badge: null,
    features: ['Up to 10 rooms', 'Up to 5 tables', '1 staff member', 'Room management', 'Restaurant orders', 'Guest management', 'QR code ordering'],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Basic',
    price: '$29',
    period: '/month',
    desc: 'Great for small hotels & restaurants',
    badge: null,
    features: ['Up to 50 rooms', 'Up to 20 tables', '5 staff members', 'Everything in Free', 'Invoicing & billing', 'Priority email support'],
    cta: 'Start Basic',
    highlight: false,
  },
  {
    name: 'Premium',
    price: '$79',
    period: '/month',
    desc: 'For growing hospitality businesses',
    badge: 'Most Popular',
    features: ['Unlimited rooms & tables', 'Unlimited staff', 'Everything in Basic', 'Advanced analytics', 'API access', 'Custom branding', 'Priority support'],
    cta: 'Start Premium',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For hotel chains & large operations',
    badge: null,
    features: ['Everything in Premium', 'Multi-property management', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee', 'On-premise option'],
    cta: 'Contact Sales',
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-x-hidden">
      {/* ───────── NAVBAR ───────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Building2 size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">HotelSaaS</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-400">
            <a href="#features" className="hover:text-primary-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-primary-600 transition-colors">Pricing</a>
            <a href="#downloads" className="hover:text-primary-600 transition-colors">Downloads</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors">
              Log in
            </Link>
            <Link to="/signup" className="text-sm font-medium bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/25">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ───────── HERO ───────── */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-48 -right-48 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-48 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8 border border-primary-200 dark:border-primary-800">
            <Zap size={14} />
            All-in-one hospitality platform
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight">
            Manage Your Hotel &<br />
            <span className="bg-gradient-to-r from-primary-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Restaurant Effortlessly
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Rooms, reservations, restaurant, kitchen, billing, housekeeping, and guest management —
            all unified in one modern cloud platform. Available on web, desktop, and mobile.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="group flex items-center gap-2 bg-primary-600 text-white px-7 py-3.5 rounded-xl text-base font-semibold hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40"
            >
              Get Started Free
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 px-7 py-3.5 rounded-xl text-base font-semibold border border-gray-300 dark:border-gray-700 hover:border-primary-400 hover:text-primary-600 transition-all"
            >
              Explore Features
              <ChevronRight size={18} />
            </a>
          </div>
          {/* Platform badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-500">
            <span className="flex items-center gap-1.5"><Cloud size={16} /> Cloud Hosted</span>
            <span className="flex items-center gap-1.5"><Monitor size={16} /> Web & Desktop</span>
            <span className="flex items-center gap-1.5"><Smartphone size={16} /> Mobile App</span>
            <span className="flex items-center gap-1.5"><Lock size={16} /> Secure & Reliable</span>
          </div>
        </div>
      </section>

      {/* ───────── FEATURES ───────── */}
      <section id="features" className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Everything You Need</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              A complete suite of tools designed for modern hospitality businesses.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center text-primary-600 mb-4 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors">
                  <f.icon size={22} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Get Started in Minutes</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              No complex setup or installations. Sign up and start managing your property immediately.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up for free in seconds. No credit card required.' },
              { step: '02', title: 'Set Up Property', desc: 'Add your rooms, restaurant tables, menu items, and staff.' },
              { step: '03', title: 'Go Live', desc: 'Start managing operations, accepting reservations, and processing orders.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-5 shadow-lg shadow-primary-500/25">
                  {s.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── PRICING ───────── */}
      <section id="pricing" className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Start free and scale as your business grows. No hidden fees.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-white dark:bg-gray-900 rounded-2xl p-6 border-2 transition-all ${
                  plan.highlight
                    ? 'border-primary-500 shadow-xl shadow-primary-500/10 scale-[1.02]'
                    : 'border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}
                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">{plan.period}</span>
                </div>
                <Link
                  to="/signup"
                  className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    plan.highlight
                      ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/25'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {plan.cta}
                </Link>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── DOWNLOADS ───────── */}
      <section id="downloads" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Available Everywhere</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Access HotelSaaS from any device — web browser, desktop app, or mobile.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Web */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Globe size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Web App</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Access from any modern browser. No installation required.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                Open Web App
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Desktop */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Monitor size={32} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Desktop App</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Native app for Windows, macOS, and Linux with offline support.
              </p>
              <a
                href="https://github.com/tador123/SAAS-APP/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-purple-700 transition-colors"
              >
                <Download size={16} />
                Download Desktop
              </a>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">Windows (.exe) &middot; macOS (.dmg) &middot; Linux (.deb)</p>
            </div>

            {/* Mobile */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-50 dark:bg-green-950/50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Smartphone size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Mobile App</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Android app for guests — self-register, get QR codes, and order from your table.
              </p>
              <a
                href="/api/downloads/HotelSaaS.apk"
                download="HotelSaaS.apk"
                className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"
              >
                <Download size={16} />
                Download APK
              </a>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">Android 8.0+ &middot; Direct APK install</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── TRUST BAR ───────── */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '256-bit', label: 'SSL Encryption' },
              { value: '24/7', label: 'Monitoring' },
              { value: 'GDPR', label: 'Compliant' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl md:text-3xl font-extrabold text-primary-600">{s.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-3xl p-10 md:p-16 text-white shadow-2xl shadow-primary-500/20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Property?</h2>
            <p className="text-lg text-primary-100 mb-8 max-w-lg mx-auto">
              Join hundreds of hotels and restaurants already using HotelSaaS to streamline operations.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="flex items-center gap-2 bg-white text-primary-700 px-7 py-3.5 rounded-xl text-base font-semibold hover:bg-primary-50 transition-colors shadow-xl"
              >
                Start Free Today
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="flex items-center gap-2 border-2 border-white/30 text-white px-7 py-3.5 rounded-xl text-base font-semibold hover:bg-white/10 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center">
                  <Building2 size={16} className="text-white" />
                </div>
                <span className="font-bold text-lg">HotelSaaS</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Complete hospitality management platform for modern hotels and restaurants.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><a href="#features" className="hover:text-primary-600 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-primary-600 transition-colors">Pricing</a></li>
                <li><a href="#downloads" className="hover:text-primary-600 transition-colors">Downloads</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><Link to="/login" className="hover:text-primary-600 transition-colors">Web Dashboard</Link></li>
                <li><a href="https://github.com/tador123/SAAS-APP/releases/latest" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 transition-colors">Desktop App</a></li>
                <li><a href="https://github.com/tador123/SAAS-APP/releases/latest" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 transition-colors">Mobile App</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Account</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><Link to="/login" className="hover:text-primary-600 transition-colors">Log In</Link></li>
                <li><Link to="/signup" className="hover:text-primary-600 transition-colors">Sign Up</Link></li>
                <li><Link to="/forgot-password" className="hover:text-primary-600 transition-colors">Reset Password</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
            <p>&copy; {new Date().getFullYear()} HotelSaaS. All rights reserved.</p>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-1.5">Trusted by hospitality professionals</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
