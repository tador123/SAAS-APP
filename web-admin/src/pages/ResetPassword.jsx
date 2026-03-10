import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api/axios';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const passwordErrors = [];
  if (password && password.length < 8) passwordErrors.push('At least 8 characters');
  if (password && !/[A-Z]/.test(password)) passwordErrors.push('One uppercase letter');
  if (password && !/[0-9]/.test(password)) passwordErrors.push('One number');
  if (password && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) passwordErrors.push('One special character');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (passwordErrors.length > 0) {
      setError('Password does not meet requirements');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="card max-w-md text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
          <p className="text-gray-500 mb-4">The password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="btn-primary inline-block">Request New Link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-hotel-gold rounded-lg flex items-center justify-center">
            <Building2 size={24} className="text-hotel-dark" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HotelSaaS</h1>
        </div>

        <div className="card">
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset!</h2>
              <p className="text-gray-500 mb-4">
                Your password has been changed. Redirecting to sign in...
              </p>
              <Link to="/login" className="btn-primary inline-flex items-center gap-2">
                <ArrowLeft size={16} /> Sign In Now
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Reset Password</h2>
              <p className="text-gray-500 mb-6 text-sm">Enter your new password below.</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rp-password">New Password</label>
                  <input
                    id="rp-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    placeholder="Enter new password"
                    required
                    minLength={8}
                  />
                  {password && passwordErrors.length > 0 && (
                    <ul className="mt-1 text-xs space-y-0.5">
                      {['At least 8 characters', 'One uppercase letter', 'One number', 'One special character'].map((req) => (
                        <li key={req} className={passwordErrors.includes(req) ? 'text-red-500' : 'text-green-600'}>
                          {passwordErrors.includes(req) ? '✗' : '✓'} {req}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="rp-confirm">Confirm Password</label>
                  <input
                    id="rp-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`input-field ${confirmPassword && confirmPassword !== password ? 'border-red-400 focus:ring-red-500' : ''}`}
                    placeholder="Confirm new password"
                    required
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>

                <button type="submit" disabled={loading || passwordErrors.length > 0} className="btn-primary w-full py-2.5">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>
                      Resetting...
                    </span>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1">
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
