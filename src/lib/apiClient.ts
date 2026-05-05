import keycloak from '@/auth/keycloak';
import { clearKeycloakAuthState, storeAuthTokens } from '@/auth/tokenStorage';

/**
 * Validate JWT format
 */
const isValidJwtFormat = (token?: string): boolean => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * Attach Keycloak token to API requests
 * Usage: const response = await apiCall('/api/endpoint');
 */
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  // Ensure token is still valid
  if (keycloak.token) {
    if (!isValidJwtFormat(keycloak.token)) {
      console.error('[apiCall] Stored token has invalid format, clearing auth');
      clearKeycloakAuthState(keycloak);
    } else {
      try {
        const refreshed = await keycloak.updateToken(30);
        if (refreshed) {
          console.log('[apiCall] Token refreshed');
          if (keycloak.token) {
            storeAuthTokens(keycloak.token, keycloak.refreshToken);
          }
        }
      } catch (error) {
        console.error('[apiCall] Failed to refresh token:', error instanceof Error ? error.message : error);
        clearKeycloakAuthState(keycloak);
        try {
          keycloak.logout();
        } catch {
          // If no active IdP browser session exists, local auth state is already cleared.
        }
      }
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (keycloak.token) {
    headers['Authorization'] = `Bearer ${keycloak.token}`;
  }

  return fetch(endpoint, {
    ...options,
    headers,
  });
};

/**
 * Typed GET request
 */
export const apiGet = async <T>(endpoint: string): Promise<T> => {
  const response = await apiCall(endpoint, { method: 'GET' });
  if (!response.ok) {
    let errMsg = `API Error: ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body.error) {
        errMsg = typeof body.error === 'string' ? body.error : body.error.message || errMsg;
      } else if (body.message) {
        errMsg = body.message;
      }
    } catch (_) {}
    throw new Error(errMsg);
  }
  return response.json();
};

/**
 * Typed POST request
 */
export const apiPost = async <T>(
  endpoint: string,
  data?: unknown
): Promise<T> => {
  const response = await apiCall(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    let errMsg = `API Error: ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body.error) {
        errMsg = typeof body.error === 'string' ? body.error : body.error.message || errMsg;
      } else if (body.message) {
        errMsg = body.message;
      }
    } catch (_) {}
    throw new Error(errMsg);
  }
  return response.json();
};

/**
 * Typed PUT request
 */
export const apiPut = async <T>(
  endpoint: string,
  data?: unknown
): Promise<T> => {
  const response = await apiCall(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    let errMsg = `API Error: ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body.error) {
        errMsg = typeof body.error === 'string' ? body.error : body.error.message || errMsg;
      } else if (body.message) {
        errMsg = body.message;
      }
    } catch (_) {}
    throw new Error(errMsg);
  }
  return response.json();
};

/**
 * Typed DELETE request
 */
export const apiDelete = async <T>(endpoint: string): Promise<T> => {
  const response = await apiCall(endpoint, { method: 'DELETE' });
  if (!response.ok) {
    let errMsg = `API Error: ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body.error) {
        errMsg = typeof body.error === 'string' ? body.error : body.error.message || errMsg;
      } else if (body.message) {
        errMsg = body.message;
      }
    } catch (_) {}
    throw new Error(errMsg);
  }
  return response.json();
};

export default apiCall;
