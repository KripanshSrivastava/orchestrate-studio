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
      console.warn("[tokenStorage] Invalid JWT format: expected 3 parts, got", parts.length);
      return null;
    }

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const decoded = JSON.parse(atob(padded)) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error("[tokenStorage] Failed to decode JWT:", error instanceof Error ? error.message : error);
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
  // Validate token before storing
  if (!accessToken || typeof accessToken !== 'string' || !accessToken.includes('.')) {
    console.warn('[tokenStorage] Skipping store: invalid access token format');
    return;
  }
  
  const decoded = decodeJwtPayload(accessToken);
  if (!decoded) {
    console.warn('[tokenStorage] Skipping store: token decode failed');
    return;
  }
  
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken && typeof refreshToken === 'string' && refreshToken.includes('.')) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  console.info('[tokenStorage] Tokens stored successfully');
};

export const clearStoredAuthTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const getStoredAccessTokenRaw = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getStoredAccessToken = (): string | null => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) {
    return null;
  }
  
  if (!isTokenValid(token)) {
    console.info('[tokenStorage] Stored token expired or invalid, clearing storage');
    clearStoredAuthTokens();
    return null;
  }
  
  return token;
};

export const getStoredRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const getStoredTokensForRestore = (): { accessToken?: string; refreshToken?: string } => {
  const accessToken = getStoredAccessTokenRaw();
  const refreshToken = getStoredRefreshToken();

  if (!accessToken && !refreshToken) {
    return {};
  }

  if (accessToken && isTokenValid(accessToken)) {
    return {
      accessToken,
      refreshToken: refreshToken || undefined,
    };
  }

  // Keep an expired access token when a refresh token exists so Keycloak can
  // attempt session restoration after a browser or laptop restart.
  if (accessToken && refreshToken) {
    return {
      accessToken,
      refreshToken,
    };
  }

  clearStoredAuthTokens();
  return {};
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
