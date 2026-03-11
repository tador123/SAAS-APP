import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Eye, EyeOff, Server } from 'lucide-react';
import toast from 'react-hot-toast';
import { isTauri, setServerUrl, getServerUrl } from '../api/axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverUrl, setServerUrlState] = useState(getServerUrl());
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isTauri && !serverUrl) {
      toast.error('Please enter your server URL');
      return;
    }
    if (isTauri && serverUrl) {
      setServerUrl(serverUrl);
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed. Check your server URL and credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-hotel-dark relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/90 to-hotel-dark"></div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-hotel-gold rounded-xl flex items-center justify-center">
              <Building2 size={28} className="text-hotel-dark" />
            </div>
            <h1 className="text-3xl font-bold text-white">HotelSaaS</h1>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Complete Hospitality<br />Management Platform
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Manage your hotel rooms, restaurant orders, guest services, and billing — all in one place.
          </p>
          <div className="space-y-3">
            {['Hotel & Room Management', 'Restaurant & Order System', 'Billing & Invoicing', 'Guest Management'].map(
              (feature) => (
                <div key={feature} className="flex items-center gap-2 text-gray-300">
                  <div className="w-1.5 h-1.5 bg-hotel-gold rounded-full"></div>
                  {feature}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-hotel-gold rounded-lg flex items-center justify-center">
              <Building2 size={24} className="text-hotel-dark" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">HotelSaaS</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in</h2>
          <p className="text-gray-500 mb-8">Enter your credentials to access the dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isTauri && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="flex items-center gap-1"><Server size={14} /> Server URL</span>
                </label>
                <input
                  type="url"
                  value={serverUrl}
                  onChange={(e) => setServerUrlState(e.target.value)}
                  className="input-field"
                  placeholder="https://yourdomain.com"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Your HotelSaaS server address</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@hotel.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Enter your password"
                  required
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

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-medium">
              Create free account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
