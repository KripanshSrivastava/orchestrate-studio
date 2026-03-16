import { Navigate, Outlet } from 'react-router-dom';
import keycloak from './keycloak';

/**
 * Protected route wrapper
 * Redirects to login if user is not authenticated
 */
export const ProtectedRoute = () => {
  if (!keycloak.authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
