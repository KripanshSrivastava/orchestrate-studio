import { ReactNode, useEffect, useState } from 'react';
import keycloak from '@/auth/keycloak';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * Initializes Keycloak and provides loading state
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initKeycloak = async () => {
      try {
        const authenticated = await keycloak.init({
          onLoad: 'login-required',
          silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
          pkceMethod: 'S256',
        });

        setIsInitialized(true);
        console.log(`Keycloak initialized. Authenticated: ${authenticated}`);

        // Setup token refresh
        keycloak.onTokenExpired = () => {
          console.log('Token expired, logging out...');
          keycloak.logout();
        };

        // Setup token ready
        keycloak.onAuthSuccess = () => {
          console.log('Auth successful');
        };
      } catch (error) {
        console.error('Keycloak initialization failed:', error);
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initKeycloak();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg bg-primary mx-auto mb-4 flex items-center justify-center animate-spin">
            <div className="w-10 h-10 rounded border-2 border-primary-foreground border-t-transparent" />
          </div>
          <p className="text-muted-foreground">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to initialize authentication</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthProvider;
