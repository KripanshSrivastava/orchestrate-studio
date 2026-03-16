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
 */
export const useAuth = (): UseAuthReturn => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    keycloak
      .init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        pkceMethod: 'S256',
      })
      .then((authenticated) => {
        setIsAuthenticated(authenticated);
        setIsLoading(false);
        console.log(`User is ${authenticated ? 'authenticated' : 'not authenticated'}`);
      })
      .catch((error) => {
        console.error('Failed to initialize Keycloak:', error);
        setIsLoading(false);
      });
  }, []);

  const logout = () => {
    keycloak.logout();
  };

  const login = () => {
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
