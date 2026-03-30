const ACCESS_TOKEN_KEY = "idp_access_token";
const REFRESH_TOKEN_KEY = "idp_refresh_token";

interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

interface KeycloakLike {
  token?: string;
  refreshToken?: string;
  tokenParsed?: unknown;
  authenticated?: boolean;
}

const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
};

export const isTokenValid = (token?: string): boolean => {
  if (!token) {
    return false;
  }

  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowSeconds + 30;
};

export const storeAuthTokens = (accessToken: string, refreshToken?: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const clearStoredAuthTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const getStoredAccessToken = (): string | null => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token || !isTokenValid(token)) {
    clearStoredAuthTokens();
    return null;
  }
  return token;
};

export const applyStoredAuthToKeycloak = (keycloak: KeycloakLike): boolean => {
  const accessToken = getStoredAccessToken();
  if (!accessToken) {
    return false;
  }

  const parsed = decodeJwtPayload(accessToken);
  if (!parsed) {
    clearStoredAuthTokens();
    return false;
  }

  keycloak.token = accessToken;
  keycloak.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || undefined;
  keycloak.tokenParsed = parsed;
  keycloak.authenticated = true;

  return true;
};

export const clearKeycloakAuthState = (keycloak: KeycloakLike): void => {
  clearStoredAuthTokens();
  keycloak.token = undefined;
  keycloak.refreshToken = undefined;
  keycloak.tokenParsed = undefined;
  keycloak.authenticated = false;
};
