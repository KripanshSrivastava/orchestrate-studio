import keycloak from '@/auth/keycloak';

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
    try {
      const refreshed = await keycloak.updateToken(30);
      if (refreshed) {
        console.log('Token refreshed');
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      keycloak.authenticated = false;
      keycloak.token = undefined;
      keycloak.refreshToken = undefined;
      keycloak.tokenParsed = undefined;
      try {
        keycloak.logout();
      } catch {
        // If no active IdP browser session exists, local auth state is already cleared.
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
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
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
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
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
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

/**
 * Typed DELETE request
 */
export const apiDelete = async <T>(endpoint: string): Promise<T> => {
  const response = await apiCall(endpoint, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

export default apiCall;
