import { useEffect, useState } from 'react';
import keycloak from './keycloak';

interface KeycloakUser {
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
}

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: KeycloakUser | null;
  token: string | undefined;
  logout: () => void;
  login: () => void;
}

/**
 * Hook to access Keycloak authentication state
 * USE THIS to check if user is authenticated anywhere in your app
 */
export const useAuth = (): UseAuthReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(keycloak.authenticated && keycloak.token));

  useEffect(() => {
    // Update state when keycloak.authenticated changes
    setIsAuthenticated(Boolean(keycloak.authenticated && keycloak.token));
    console.log(`🔔 useAuth: isAuthenticated = ${isAuthenticated}, token = ${keycloak.token ? 'present' : 'absent'}`);
  }, [keycloak.authenticated, keycloak.token]);

  const logout = () => {
    console.log('🚪 Logout initiated');
    keycloak.authenticated = false;
    keycloak.token = undefined;
    keycloak.refreshToken = undefined;
    keycloak.tokenParsed = undefined;
    try {
      keycloak.logout({ redirectUri: `${window.location.origin}/login` });
    } catch {
      // No active IdP session; local auth state has already been cleared.
    }
  };

  const login = () => {
    console.log('🔐 Login initiated');
    keycloak.login();
  };

  return {
    isAuthenticated,
    isLoading,
    user: keycloak.tokenParsed as KeycloakUser | null,
    token: keycloak.token,
    logout,
    login,
  };
};

export default useAuth;
