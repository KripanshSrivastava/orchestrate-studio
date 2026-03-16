export interface KeycloakUser {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  credentials?: Array<{
    type: string;
    value: string;
    temporary: boolean;
  }>;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Keycloak Admin Service
 * Handles user creation and token management via Keycloak Admin API
 */
export class KeycloakService {
  private baseUrl: string;
  private realm: string;
  private clientId: string;
  private clientSecret: string;
  private adminToken: string | null = null;
  private adminTokenExpiry: number = 0;

  constructor() {
    this.baseUrl = process.env.KEYCLOAK_URL || 'http://localhost:8081';
    this.realm = process.env.KEYCLOAK_REALM || 'idp';
    this.clientId = process.env.KEYCLOAK_CLIENT_ID || 'idp-backend';
    this.clientSecret = process.env.KEYCLOAK_CLIENT_SECRET || '';
  }

  /**
   * Get admin token for API access
   */
  private async getAdminToken(): Promise<string> {
    // Check if cached token is still valid
    if (this.adminToken && this.adminTokenExpiry > Date.now()) {
      return this.adminToken;
    }

    try {
      const response = await fetch(`${this.baseUrl}/realms/master/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: 'admin-cli',
          grant_type: 'password',
          username: process.env.KEYCLOAK_ADMIN_USER || 'admin',
          password: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin',
        }).toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ Admin token response:', errorBody);
        throw new Error(`Failed to get admin token: ${response.statusText}`);
      }

      const data = await response.json() as TokenResponse;
      this.adminToken = data.access_token;
      this.adminTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer

      console.log('✅ Admin token refreshed');
      return this.adminToken;
    } catch (error) {
      console.error('❌ Error getting admin token:', error);
      throw error;
    }
  }

  /**
   * Check if email already exists in Keycloak
   */
  async getUserByEmail(email: string): Promise<any | null> {
    try {
      const token = await this.getAdminToken();

      const response = await fetch(
        `${this.baseUrl}/admin/realms/${this.realm}/users?email=${encodeURIComponent(email)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to search users: ${response.statusText}`);
      }

      const users = await response.json() as any[];
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('❌ Error checking email:', error);
      throw error;
    }
  }

  /**
   * Create a new user in Keycloak
   */
  async createUser(userData: KeycloakUser): Promise<string> {
    try {
      const token = await this.getAdminToken();

      const response = await fetch(
        `${this.baseUrl}/admin/realms/${this.realm}/users`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: userData.username,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            enabled: userData.enabled,
            credentials: userData.credentials || [],
            emailVerified: false,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Keycloak error response:', error);
        throw new Error(`Failed to create user: ${response.statusText}`);
      }

      // Get user ID from Location header
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('No user ID returned from Keycloak');
      }

      const userId = location.split('/').pop();
      console.log(`✅ User created in Keycloak: ${userId}`);

      return userId || '';
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get user token for newly created user
   */
  async getTokenForUser(username: string, password: string): Promise<TokenResponse> {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        grant_type: 'password',
        username: username,
        password: password,
        scope: 'openid profile email',
      });

      if (this.clientSecret) {
        params.append('client_secret', this.clientSecret);
      }

      const response = await fetch(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        }
      );

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error_description || 'Failed to get user token');
      }

      const tokenData = await response.json() as TokenResponse;
      console.log('✅ User token obtained');

      return tokenData;
    } catch (error) {
      console.error('❌ Error getting user token:', error);
      throw error;
    }
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: string, roleName: string): Promise<void> {
    try {
      const token = await this.getAdminToken();

      // First, get the role
      const roleResponse = await fetch(
        `${this.baseUrl}/admin/realms/${this.realm}/roles/${roleName}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!roleResponse.ok) {
        throw new Error(`Role "${roleName}" not found`);
      }

      const role = await roleResponse.json();

      // Assign role to user
      const assignResponse = await fetch(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([role]),
        }
      );

      if (!assignResponse.ok) {
        throw new Error(`Failed to assign role: ${assignResponse.statusText}`);
      }

      console.log(`✅ Role "${roleName}" assigned to user`);
    } catch (error) {
      console.error('❌ Error assigning role:', error);
      throw error;
    }
  }
}

export default new KeycloakService();
