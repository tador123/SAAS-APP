import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard that checks:
 * 1. Authentication (redirect to /login if not)
 * 2. Role-based access (optional `allowedRoles` prop)
 *
 * @param {string[]} [allowedRoles]  Roles allowed to access child routes.
 *   If omitted, any authenticated user can access.
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role check
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to view this page.</p>
          <button onClick={() => window.history.back()} className="btn-primary mt-4">Go Back</button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
