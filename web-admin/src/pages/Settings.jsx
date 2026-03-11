import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranding, DEFAULT_BRANDING } from '../context/BrandingContext';
import { Crown, Check, Building2, Monitor, Smartphone, Keyboard, Wifi, HardDrive, Printer, Bell, Edit2, Lock, Eye, EyeOff, AlertTriangle, ArrowUp, ArrowDown, Zap, CreditCard, Palette, Download, RotateCcw } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const plans = [
  {
    name: 'Free',
    key: 'free',
    price: 0,
    features: ['Up to 10 rooms', '5 restaurant tables', 'Basic reporting', '1 staff account', 'Email support'],
    limits: 'Basic features',
  },
  {
    name: 'Basic',
    key: 'basic',
    price: 29,
    features: ['Up to 50 rooms', '20 restaurant tables', 'Advanced reporting', '5 staff accounts', 'Priority support', 'Invoice management'],
    limits: 'Most popular',
    recommended: true,
  },
  {
    name: 'Premium',
    key: 'premium',
    price: 79,
    features: ['Unlimited rooms', 'Unlimited tables', 'Full analytics', 'Unlimited staff', '24/7 phone support', 'API access', 'Custom branding'],
    limits: 'Full access',
  },
  {
    name: 'Enterprise',
    key: 'enterprise',
    price: 199,
    features: ['Everything in Premium', 'Multi-property', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee', 'On-premise option'],
    limits: 'For chains',
  },
];

const planOrder = ['free', 'basic', 'premium', 'enterprise'];

const desktopFeatures = [
  { icon: Wifi, title: 'Offline Mode', description: 'Works without internet connection. Data syncs when back online.' },
  { icon: Printer, title: 'Print Invoices & Receipts', description: 'Direct printing to thermal and regular printers.' },
  { icon: Keyboard, title: 'Keyboard Shortcuts', description: 'Fast navigation with customizable keyboard shortcuts.' },
  { icon: Bell, title: 'System Tray & Notifications', description: 'Stay informed with native system notifications.' },
  { icon: HardDrive, title: 'Local Database Backup', description: 'Automatic local backups for data safety.' },
];

export default function Settings() {
  const { user, updateProfile, changePassword, changePlan, getSubscriptionInfo } = useAuth();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [savingPassword, setSavingPassword] = useState(false);

  // Subscription state
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [changingPlan, setChangingPlan] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState(null); // Plan pending confirmation
  const [stripeEnabled, setStripeEnabled] = useState(false);

  const currentPlan = user?.subscriptionPlan || 'free';

  // Branding state
  const { branding, updateBranding, resetBranding } = useBranding();
  const [editingBranding, setEditingBranding] = useState(false);
  const [brandingForm, setBrandingForm] = useState({});
  const [savingBranding, setSavingBranding] = useState(false);
  const [desktopDownloads, setDesktopDownloads] = useState(null);

  // Check if custom branding is allowed by plan
  const canCustomBranding = ['premium', 'enterprise'].includes(currentPlan);

  // Fetch desktop download links
  useEffect(() => {
    const fetchDownloads = async () => {
      try {
        const { data } = await api.get('/properties/desktop-download');
        setDesktopDownloads(data);
      } catch (err) {
        console.error('Failed to fetch desktop downloads:', err);
      }
    };
    fetchDownloads();
  }, []);

  const handleEditBranding = () => {
    setBrandingForm({
      brandName: branding.brandName || '',
      tagline: branding.tagline || '',
      logoUrl: branding.logoUrl || '',
      faviconUrl: branding.faviconUrl || '',
      primaryColor: branding.primaryColor || DEFAULT_BRANDING.primaryColor,
      accentColor: branding.accentColor || DEFAULT_BRANDING.accentColor,
      sidebarColor: branding.sidebarColor || DEFAULT_BRANDING.sidebarColor,
    });
    setEditingBranding(true);
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setSavingBranding(true);
    try {
      await updateBranding(brandingForm);
      toast.success('Branding updated! Changes are live.');
      setEditingBranding(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update branding');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleResetBranding = async () => {
    setSavingBranding(true);
    try {
      await resetBranding();
      toast.success('Branding reset to defaults');
      setEditingBranding(false);
    } catch (error) {
      toast.error('Failed to reset branding');
    } finally {
      setSavingBranding(false);
    }
  };

  // Fetch subscription info + payment status on mount
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const [info, paymentStatus] = await Promise.all([
          getSubscriptionInfo(),
          api.get('/payments/status').then(r => r.data).catch(() => ({ configured: false })),
        ]);
        setSubscriptionInfo(info);
        setStripeEnabled(paymentStatus.configured);
      } catch (error) {
        console.error('Failed to fetch subscription info:', error);
      }
    };
    fetchSubscription();

    // Handle Stripe redirect callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      toast.success(`Payment successful! Your plan has been upgraded to ${params.get('plan') || 'the new plan'}.`);
      window.history.replaceState({}, '', '/settings');
    } else if (params.get('payment') === 'cancelled') {
      toast('Payment cancelled.', { icon: 'ℹ️' });
      window.history.replaceState({}, '', '/settings');
    }
  }, [getSubscriptionInfo, currentPlan]);

  const handleEditProfile = () => {
    setProfileForm({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
    setEditingProfile(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile(profileForm);
      toast.success('Profile updated');
      setEditingProfile(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast.success('Password changed successfully');
      setShowPasswordForm(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePlanClick = (planKey) => {
    if (planKey === currentPlan) return;
    setConfirmPlan(planKey);
  };

  const handleConfirmPlanChange = async () => {
    if (!confirmPlan) return;
    setChangingPlan(true);
    try {
      const isUpgrade = planOrder.indexOf(confirmPlan) > planOrder.indexOf(currentPlan);

      // If Stripe is enabled and upgrading to a paid plan, use Stripe Checkout
      if (stripeEnabled && isUpgrade && confirmPlan !== 'free') {
        const { data } = await api.post('/payments/checkout', { plan: confirmPlan });
        // Redirect to Stripe Checkout
        window.location.href = data.url;
        return;
      }

      // Otherwise, direct plan change (admin privilege, or downgrade, or Stripe not configured)
      await changePlan(confirmPlan);
      toast.success(`${isUpgrade ? 'Upgraded' : 'Changed'} to ${confirmPlan.charAt(0).toUpperCase() + confirmPlan.slice(1)} plan!`);
      // Refresh subscription info
      const info = await getSubscriptionInfo();
      setSubscriptionInfo(info);
      setConfirmPlan(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change plan');
    } finally {
      setChangingPlan(false);
    }
  };

  const getUsagePercent = (used, max) => {
    if (max === 'unlimited') return 0;
    return Math.min(Math.round((used / max) * 100), 100);
  };

  const getUsageColor = (percent) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and subscription</p>
      </div>

      {/* Profile Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
          {!editingProfile && (
            <button onClick={handleEditProfile} className="btn-secondary flex items-center gap-1 text-sm">
              <Edit2 size={14} /> Edit Profile
            </button>
          )}
        </div>
        {editingProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input id="profile-firstName" value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label htmlFor="profile-lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input id="profile-lastName" value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input id="profile-phone" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p className="text-gray-900 py-2">{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={savingProfile} className="btn-primary">{savingProfile ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={() => setEditingProfile(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="block text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="text-gray-900 font-medium">{user?.firstName} {user?.lastName}</dd>
            </div>
            <div>
              <dt className="block text-sm font-medium text-gray-500">Email</dt>
              <dd className="text-gray-900">{user?.email}</dd>
            </div>
            <div>
              <dt className="block text-sm font-medium text-gray-500">Phone</dt>
              <dd className="text-gray-900">{user?.phone || '—'}</dd>
            </div>
            <div>
              <dt className="block text-sm font-medium text-gray-500">Role</dt>
              <dd className="text-gray-900 capitalize">{user?.role}</dd>
            </div>
            <div>
              <dt className="block text-sm font-medium text-gray-500">Current Plan</dt>
              <dd className="text-gray-900 capitalize">{user?.subscriptionPlan || 'Free'}</dd>
            </div>
          </dl>
        )}
      </div>

      {/* Password Change */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
          {!showPasswordForm && (
            <button onClick={() => setShowPasswordForm(true)} className="btn-secondary flex items-center gap-1 text-sm">
              <Lock size={14} /> Change Password
            </button>
          )}
        </div>
        {showPasswordForm ? (
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <div className="relative">
                <input id="current-password" type={showPasswords.current ? 'text' : 'password'} value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="input-field pr-10" required />
                <button type="button" onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input id="new-password" type={showPasswords.new ? 'text' : 'password'} value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="input-field pr-10" required minLength={8}
                  placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special" />
                <button type="button" onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <input id="confirm-password" type={showPasswords.confirm ? 'text' : 'password'} value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="input-field pr-10" required minLength={8} />
                <button type="button" onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={savingPassword} className="btn-primary">{savingPassword ? 'Changing...' : 'Change Password'}</button>
              <button type="button" onClick={() => { setShowPasswordForm(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-500">Use a strong password with at least 8 characters, including uppercase letters, numbers, and special characters.</p>
        )}
      </div>

      {/* ─── Hotel Branding ─────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Palette size={20} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Hotel Branding</h2>
            {!canCustomBranding && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
                <Crown size={12} /> Premium+
              </span>
            )}
          </div>
          {!editingBranding && (
            <button onClick={handleEditBranding} disabled={!canCustomBranding}
              className={`btn-secondary flex items-center gap-1 text-sm ${!canCustomBranding ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Edit2 size={14} /> Customize
            </button>
          )}
        </div>

        {!canCustomBranding && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              Custom branding is available on Premium and Enterprise plans. Upgrade your plan to personalize your hotel's app name, logo, and colors.
            </p>
          </div>
        )}

        {editingBranding ? (
          <form onSubmit={handleSaveBranding} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="brand-name" className="block text-sm font-medium text-gray-700 mb-1">Hotel / Brand Name</label>
                <input id="brand-name" value={brandingForm.brandName}
                  onChange={e => setBrandingForm({ ...brandingForm, brandName: e.target.value })}
                  className="input-field" placeholder="e.g. Grand Palace Hotel" maxLength={100} required />
                <p className="text-xs text-gray-400 mt-1">Displayed in sidebar, page title, and reports</p>
              </div>
              <div>
                <label htmlFor="brand-tagline" className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                <input id="brand-tagline" value={brandingForm.tagline}
                  onChange={e => setBrandingForm({ ...brandingForm, tagline: e.target.value })}
                  className="input-field" placeholder="e.g. Luxury Hospitality" maxLength={200} />
                <p className="text-xs text-gray-400 mt-1">Shown below the brand name in sidebar</p>
              </div>
              <div>
                <label htmlFor="brand-logo" className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input id="brand-logo" value={brandingForm.logoUrl}
                  onChange={e => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                  className="input-field" placeholder="https://example.com/logo.png" type="url" />
                <p className="text-xs text-gray-400 mt-1">Square image recommended (40×40px min)</p>
              </div>
              <div>
                <label htmlFor="brand-favicon" className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
                <input id="brand-favicon" value={brandingForm.faviconUrl}
                  onChange={e => setBrandingForm({ ...brandingForm, faviconUrl: e.target.value })}
                  className="input-field" placeholder="https://example.com/favicon.ico" type="url" />
                <p className="text-xs text-gray-400 mt-1">Browser tab icon (16×16 or 32×32px)</p>
              </div>
            </div>

            {/* Color pickers */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Brand Colors</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="brand-primary" className="block text-xs text-gray-500 mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input id="brand-primary" type="color" value={brandingForm.primaryColor}
                      onChange={e => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300" />
                    <input value={brandingForm.primaryColor}
                      onChange={e => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      className="input-field font-mono text-sm" placeholder="#2563eb" />
                  </div>
                </div>
                <div>
                  <label htmlFor="brand-accent" className="block text-xs text-gray-500 mb-1">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input id="brand-accent" type="color" value={brandingForm.accentColor}
                      onChange={e => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300" />
                    <input value={brandingForm.accentColor}
                      onChange={e => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                      className="input-field font-mono text-sm" placeholder="#d4a843" />
                  </div>
                </div>
                <div>
                  <label htmlFor="brand-sidebar" className="block text-xs text-gray-500 mb-1">Sidebar Color</label>
                  <div className="flex items-center gap-2">
                    <input id="brand-sidebar" type="color" value={brandingForm.sidebarColor}
                      onChange={e => setBrandingForm({ ...brandingForm, sidebarColor: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-300" />
                    <input value={brandingForm.sidebarColor}
                      onChange={e => setBrandingForm({ ...brandingForm, sidebarColor: e.target.value })}
                      className="input-field font-mono text-sm" placeholder="#1a1f2e" />
                  </div>
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
              <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: brandingForm.sidebarColor }}>
                {brandingForm.logoUrl ? (
                  <img src={brandingForm.logoUrl} alt="Logo preview" className="w-10 h-10 rounded-lg object-cover"
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: brandingForm.accentColor }}>
                    <Building2 size={24} className="text-white" />
                  </div>
                )}
                <div>
                  <p className="text-lg font-bold text-white">{brandingForm.brandName || 'Hotel Name'}</p>
                  <p className="text-xs text-gray-400">{brandingForm.tagline || 'Your tagline'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={savingBranding} className="btn-primary">
                {savingBranding ? 'Saving...' : 'Save Branding'}
              </button>
              <button type="button" onClick={() => setEditingBranding(false)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={handleResetBranding} disabled={savingBranding}
                className="btn-secondary flex items-center gap-1 ml-auto text-sm text-gray-500">
                <RotateCcw size={14} /> Reset to Defaults
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg flex-1" style={{ backgroundColor: branding.sidebarColor }}>
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.brandName} className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: branding.accentColor }}>
                  <Building2 size={24} className="text-white" />
                </div>
              )}
              <div>
                <p className="text-lg font-bold text-white">{branding.brandName}</p>
                <p className="text-xs text-gray-400">{branding.tagline}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-gray-200" style={{ backgroundColor: branding.primaryColor }} title="Primary" />
              <div className="w-8 h-8 rounded-full border-2 border-gray-200" style={{ backgroundColor: branding.accentColor }} title="Accent" />
              <div className="w-8 h-8 rounded-full border-2 border-gray-200" style={{ backgroundColor: branding.sidebarColor }} title="Sidebar" />
            </div>
          </div>
        )}
      </div>

      {/* ─── Desktop App Download ───────────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Download size={20} className="text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Download Desktop App</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Get the desktop version for offline access, native printing, system notifications, and more.
          The desktop app wraps the same admin panel with native OS features powered by Tauri.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {desktopDownloads ? Object.values(desktopDownloads.platforms).map((platform) => (
            <a key={platform.name} href={platform.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-colors group">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <Monitor size={24} className="text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{platform.name}</p>
                <p className="text-xs text-gray-500">{platform.ext} • {platform.size}</p>
              </div>
              <Download size={18} className="text-gray-400 group-hover:text-primary-600 transition-colors" />
            </a>
          )) : (
            <div className="col-span-3 text-center py-6 text-gray-400">
              <Monitor size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Loading download links...</p>
            </div>
          )}
        </div>
        {desktopDownloads && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-400">Version {desktopDownloads.version} • {desktopDownloads.releaseNotes}</p>
          </div>
        )}
      </div>

      {/* Current Plan Usage */}
      {subscriptionInfo && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={20} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Plan Usage</h2>
            {stripeEnabled && currentPlan !== 'free' && (
              <button
                onClick={async () => {
                  try {
                    const { data } = await api.get('/payments/portal');
                    window.location.href = data.url;
                  } catch (e) {
                    toast.error(e.response?.data?.error || 'Unable to open billing portal');
                  }
                }}
                className="ml-auto btn-secondary flex items-center gap-1 text-xs"
              >
                <CreditCard size={14} /> Manage Billing
              </button>
            )}
            <span className={`${stripeEnabled && currentPlan !== 'free' ? '' : 'ml-auto'} px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium capitalize`}>
              {currentPlan} Plan
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Rooms usage */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Rooms</span>
                <span className="font-medium text-gray-900">
                  {subscriptionInfo.usage.rooms} / {subscriptionInfo.limits.maxRooms === 'unlimited' ? '∞' : subscriptionInfo.limits.maxRooms}
                </span>
              </div>
              {subscriptionInfo.limits.maxRooms !== 'unlimited' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${getUsageColor(getUsagePercent(subscriptionInfo.usage.rooms, subscriptionInfo.limits.maxRooms))}`}
                    style={{ width: `${getUsagePercent(subscriptionInfo.usage.rooms, subscriptionInfo.limits.maxRooms)}%` }} />
                </div>
              )}
              {subscriptionInfo.limits.maxRooms === 'unlimited' && (
                <div className="w-full bg-green-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-green-500" style={{ width: '100%' }} />
                </div>
              )}
            </div>
            {/* Tables usage */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Restaurant Tables</span>
                <span className="font-medium text-gray-900">
                  {subscriptionInfo.usage.tables} / {subscriptionInfo.limits.maxTables === 'unlimited' ? '∞' : subscriptionInfo.limits.maxTables}
                </span>
              </div>
              {subscriptionInfo.limits.maxTables !== 'unlimited' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${getUsageColor(getUsagePercent(subscriptionInfo.usage.tables, subscriptionInfo.limits.maxTables))}`}
                    style={{ width: `${getUsagePercent(subscriptionInfo.usage.tables, subscriptionInfo.limits.maxTables)}%` }} />
                </div>
              )}
              {subscriptionInfo.limits.maxTables === 'unlimited' && (
                <div className="w-full bg-green-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-green-500" style={{ width: '100%' }} />
                </div>
              )}
            </div>
            {/* Staff usage */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Staff Accounts</span>
                <span className="font-medium text-gray-900">
                  {subscriptionInfo.usage.staff} / {subscriptionInfo.limits.maxStaff === 'unlimited' ? '∞' : subscriptionInfo.limits.maxStaff}
                </span>
              </div>
              {subscriptionInfo.limits.maxStaff !== 'unlimited' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${getUsageColor(getUsagePercent(subscriptionInfo.usage.staff, subscriptionInfo.limits.maxStaff))}`}
                    style={{ width: `${getUsagePercent(subscriptionInfo.usage.staff, subscriptionInfo.limits.maxStaff)}%` }} />
                </div>
              )}
              {subscriptionInfo.limits.maxStaff === 'unlimited' && (
                <div className="w-full bg-green-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-green-500" style={{ width: '100%' }} />
                </div>
              )}
            </div>
          </div>
          {/* Feature flags */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">Enabled features:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'invoices', label: 'Invoice Management' },
                { key: 'analytics', label: 'Full Analytics' },
                { key: 'apiAccess', label: 'API Access' },
                { key: 'customBranding', label: 'Custom Branding' },
                { key: 'multiProperty', label: 'Multi-Property' },
              ].map(({ key, label }) => (
                <span key={key} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                  subscriptionInfo.limits[key]
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400 line-through'
                }`}>
                  {subscriptionInfo.limits[key] ? <Check size={12} /> : null}
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Platform Availability */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Availability</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <Monitor size={24} className="text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Web Admin</p>
              <p className="text-sm text-gray-500">React Dashboard (this app)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
            <Building2 size={24} className="text-purple-600" />
            <div>
              <p className="font-medium text-gray-900">Desktop App</p>
              <p className="text-sm text-gray-500">Tauri (Windows/Mac/Linux)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <Smartphone size={24} className="text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Mobile App</p>
              <p className="text-sm text-gray-500">Flutter (iOS/Android)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Features */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Desktop App Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {desktopFeatures.map((feature) => (
            <div key={feature.title} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <feature.icon size={18} className="text-primary-600" />
                <h3 className="font-medium text-gray-900">{feature.title}</h3>
              </div>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription Plans */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.key === currentPlan;
            const isUpgrade = planOrder.indexOf(plan.key) > planOrder.indexOf(currentPlan);
            const isDowngrade = planOrder.indexOf(plan.key) < planOrder.indexOf(currentPlan);
            return (
              <div key={plan.name} className={`card relative transition-all ${
                isCurrent ? 'ring-2 ring-primary-500 shadow-lg' :
                plan.recommended ? 'border-2 border-primary-300 shadow-md' : ''
              }`}>
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-3 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                    <Crown size={12} /> Current Plan
                  </div>
                )}
                {!isCurrent && plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white px-3 py-0.5 rounded-full text-xs font-medium">
                    Recommended
                  </div>
                )}
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                    {plan.price > 0 && <span className="text-gray-500 text-sm">/month</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{plan.limits}</p>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check size={16} className="text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePlanClick(plan.key)}
                  disabled={isCurrent || changingPlan}
                  className={`w-full py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1 transition-all ${
                    isCurrent ? 'bg-gray-100 text-gray-500 cursor-default' :
                    isUpgrade ? 'btn-primary' :
                    'btn-secondary'
                  }`}
                >
                  {isCurrent ? 'Current Plan' :
                   isUpgrade ? <><ArrowUp size={14} /> Upgrade</> :
                   <><ArrowDown size={14} /> Downgrade</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan change confirmation dialog */}
      {confirmPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              {planOrder.indexOf(confirmPlan) > planOrder.indexOf(currentPlan)
                ? <ArrowUp size={24} className="text-green-600" />
                : <AlertTriangle size={24} className="text-yellow-600" />
              }
              <h3 className="text-lg font-bold text-gray-900">
                {planOrder.indexOf(confirmPlan) > planOrder.indexOf(currentPlan) ? 'Upgrade' : 'Downgrade'} Plan
              </h3>
            </div>
            <p className="text-gray-600 mb-2">
              You are about to change from <strong className="capitalize">{currentPlan}</strong> to{' '}
              <strong className="capitalize">{confirmPlan}</strong>.
            </p>
            {planOrder.indexOf(confirmPlan) < planOrder.indexOf(currentPlan) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800 flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  Downgrading may limit your current resources. If your usage exceeds the new plan's limits, you won't be able to add more until you reduce usage or upgrade again.
                </p>
              </div>
            )}
            <p className="text-sm text-gray-500 mb-4">
              New monthly price: <strong>${plans.find(p => p.key === confirmPlan)?.price || 0}/month</strong>
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmPlan(null)} disabled={changingPlan} className="btn-secondary">Cancel</button>
              <button onClick={handleConfirmPlanChange} disabled={changingPlan} className="btn-primary">
                {changingPlan ? 'Changing...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
