import { Navigate, Outlet } from 'react-router-dom';
import keycloak from './keycloak';

/**
 * Protected route wrapper
 * Redirects to login if user is not authenticated
 * Renders Outlet if authenticated
 */
export const ProtectedRoute = () => {
  const isAuthenticated = Boolean(keycloak.authenticated && keycloak.token);

  if (!isAuthenticated) {
    console.log('🔒 ProtectedRoute: User not authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ ProtectedRoute: User authenticated, rendering protected content');
  return <Outlet />;
};

export default ProtectedRoute;
