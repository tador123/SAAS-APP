import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Reservations from './pages/Reservations';
import Restaurant from './pages/Restaurant';
import Orders from './pages/Orders';
import Invoices from './pages/Invoices';
import Guests from './pages/Guests';
import Settings from './pages/Settings';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import Housekeeping from './pages/Housekeeping';
import KitchenDisplay from './pages/KitchenDisplay';
import GuestFolio from './pages/GuestFolio';
import QROrdering from './pages/QROrdering';
import SystemAdmin from './pages/SystemAdmin';

function App() {
  const { isAuthenticated, user } = useAuth();

  // System admin should go to system admin dashboard by default
  const defaultRoute = user?.role === 'system_admin' ? '/system-admin' : '/';

  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to={defaultRoute} replace /> : <Login />}
        />
        <Route
          path="/signup"
          element={isAuthenticated ? <Navigate to={defaultRoute} replace /> : <Signup />}
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* All authenticated users */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={
              user?.role === 'system_admin'
                ? <Navigate to="/system-admin" replace />
                : <ErrorBoundary><Dashboard /></ErrorBoundary>
            } />
            <Route path="/rooms" element={<ErrorBoundary><Rooms /></ErrorBoundary>} />
            <Route path="/reservations" element={<ErrorBoundary><Reservations /></ErrorBoundary>} />
            <Route path="/restaurant" element={<ErrorBoundary><Restaurant /></ErrorBoundary>} />
            <Route path="/orders" element={<ErrorBoundary><Orders /></ErrorBoundary>} />
            <Route path="/guests" element={<ErrorBoundary><Guests /></ErrorBoundary>} />
            <Route path="/housekeeping" element={<ErrorBoundary><Housekeeping /></ErrorBoundary>} />
            <Route path="/kitchen" element={<ErrorBoundary><KitchenDisplay /></ErrorBoundary>} />
            <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
          </Route>
        </Route>
        {/* Admin/manager only */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
          <Route element={<Layout />}>
            <Route path="/invoices" element={<ErrorBoundary><Invoices /></ErrorBoundary>} />
            <Route path="/folio" element={<ErrorBoundary><GuestFolio /></ErrorBoundary>} />
            <Route path="/qr-ordering" element={<ErrorBoundary><QROrdering /></ErrorBoundary>} />
            <Route path="/audit-logs" element={<ErrorBoundary><AuditLogs /></ErrorBoundary>} />
          </Route>
        </Route>
        {/* Admin only */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<Layout />}>
            <Route path="/users" element={<ErrorBoundary><Users /></ErrorBoundary>} />
          </Route>
        </Route>
        {/* System admin only */}
        <Route element={<ProtectedRoute allowedRoles={['system_admin']} />}>
          <Route element={<Layout />}>
            <Route path="/system-admin" element={<ErrorBoundary><SystemAdmin /></ErrorBoundary>} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
