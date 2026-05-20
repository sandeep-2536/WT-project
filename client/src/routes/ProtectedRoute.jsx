import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Generic protected route (must be logged in)
export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

// Role-specific guard
export const RoleRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return <Outlet />;
};

// Redirect logged-in users away from auth pages
export const PublicRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (user) return <Navigate to={`/${user.role}`} replace />;
  return <Outlet />;
};
