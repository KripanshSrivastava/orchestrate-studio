import { ReactNode, useEffect, useState } from 'react';
import keycloak from '@/auth/keycloak';

/**
 * Verify authenticated user with backend
 * Audits login event and validates user/org_id setup
 */
async function verifyUserWithBackend(token: string): Promise<void> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/auth/verify`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.info(`✅ Backend verification successful:`, {
        user: data.user?.id,
        email: data.user?.email,
        org_id: data.user?.org_id,
      });
    } else {
      console.warn(`⚠️ Backend verification returned ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Backend verification failed:', error);
    // Non-blocking: verification failure doesn't logout user
  }
}

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
        // Initialize keycloak without automatic SSO re-login.
        const authenticated = await keycloak.init({
          // Disable login iframe checks to avoid third-party cookie iframe errors in modern browsers.
          checkLoginIframe: false,
          // Removed PKCE (pkceMethod: 'S256') due to Web Crypto API availability issues
        });

        setIsInitialized(true);
        console.log(`✅ Keycloak initialized. Authenticated: ${authenticated}`);
        console.log(`🔑 Token: ${keycloak.token ? 'Present' : 'Not present'}`);

        // If authenticated, verify user with backend (audits login, validates org_id)
        if (authenticated && keycloak.token) {
          await verifyUserWithBackend(keycloak.token);
        }

        // Setup token refresh
        keycloak.onTokenExpired = () => {
          console.log('⏰ Token expired, logging out...');
          keycloak.authenticated = false;
          keycloak.token = undefined;
          keycloak.refreshToken = undefined;
          keycloak.tokenParsed = undefined;
        };

        // Setup token ready
        keycloak.onAuthSuccess = () => {
          console.log('✅ Auth successful');
          // Verify user with backend after successful auth (including social logins)
          if (keycloak.token) {
            verifyUserWithBackend(keycloak.token);
          }
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
