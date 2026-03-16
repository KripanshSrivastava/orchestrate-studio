import { ReactNode, useEffect, useState } from 'react';
import keycloak from '@/auth/keycloak';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * Initializes Keycloak and provides loading state
 * Uses 'check-sso' to allow custom login page
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initKeycloak = async () => {
      try {
        // Use 'check-sso' to check existing session without redirecting to login
        const authenticated = await keycloak.init({
          onLoad: 'check-sso',
          silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
          // Removed PKCE (pkceMethod: 'S256') due to Web Crypto API availability issues
        });

        setIsInitialized(true);
        console.log(`✅ Keycloak initialized. Authenticated: ${authenticated}`);
        console.log(`🔑 Token: ${keycloak.token ? 'Present' : 'Not present'}`);

        // Setup token refresh
        keycloak.onTokenExpired = () => {
          console.log('⏰ Token expired, logging out...');
          keycloak.logout();
        };

        // Setup token ready
        keycloak.onAuthSuccess = () => {
          console.log('✅ Auth successful');
        };

        // Setup auth error
        keycloak.onAuthError = () => {
          console.error('❌ Auth error');
        };
      } catch (error) {
        console.error('❌ Keycloak initialization failed:', error);
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
