import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { COUNTRIES, COUNTRY_CURRENCY_MAP } from '../context/CurrencyContext';
import { Building2, Eye, EyeOff, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Signup() {
  const [form, setForm] = useState({
    propertyName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    country: '',
    currency: 'USD',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'country') {
      const autoC = COUNTRY_CURRENCY_MAP[value] || 'USD';
      setForm({ ...form, country: value, currency: autoC });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await signup(form);
      if (data.pendingApproval) {
        setPendingApproval(true);
        toast.success('Account created! Pending admin approval.');
      } else {
        toast.success('Account created! Welcome to your dashboard.');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Pending Approval Screen */}
      {pendingApproval && (
        <div className="w-full flex items-center justify-center p-8 bg-gray-50">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Account Pending Approval</h2>
            <p className="text-gray-600 mb-6">
              Your account has been created successfully. A system administrator will review and
              approve your registration. You&apos;ll be able to log in once your account is approved.
            </p>
            <Link
              to="/login"
              className="btn-primary inline-block px-6 py-2.5"
            >
              Go to Login
            </Link>
          </div>
        </div>
      )}
      {/* Left side - Branding */}
      {!pendingApproval && <div className="hidden lg:flex lg:w-1/2 bg-hotel-dark relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/90 to-hotel-dark"></div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-hotel-gold rounded-xl flex items-center justify-center">
              <Building2 size={28} className="text-hotel-dark" />
            </div>
            <h1 className="text-3xl font-bold text-white">HotelSaaS</h1>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Start managing your<br />property today
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Create your free account and start managing rooms, orders, guests, and billing in minutes.
          </p>
          <div className="space-y-3">
            {['Free plan — no credit card', 'Set up in under 2 minutes', 'Upgrade anytime', '24/7 support'].map(
              (feature) => (
                <div key={feature} className="flex items-center gap-2 text-gray-300">
                  <div className="w-1.5 h-1.5 bg-hotel-gold rounded-full"></div>
                  {feature}
                </div>
              )
            )}
          </div>
        </div>
      </div>}

      {/* Right side - Signup form */}
      {!pendingApproval && <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-hotel-gold rounded-lg flex items-center justify-center">
              <Building2 size={24} className="text-hotel-dark" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">HotelSaaS</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
          <p className="text-gray-500 mb-6">Get started with a free property in seconds</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property / Hotel Name</label>
              <input
                name="propertyName"
                value={form.propertyName}
                onChange={handleChange}
                className="input-field"
                placeholder="My Amazing Hotel"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="John"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                placeholder="you@yourhotel.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  className="input-field pr-10"
                  placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400">(optional)</span></label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="+1 555 123 4567"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <input
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="USD"
                  maxLength={3}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>
                  Creating account...
                </span>
              ) : (
                'Create free account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>}
    </div>
  );
}
