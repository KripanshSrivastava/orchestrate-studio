export interface SecretProviderStatus {
  id: 'hashicorp-vault' | 'aws-secrets-manager' | 'kubernetes-secrets' | 'azure-key-vault';
  name: string;
  connected: boolean;
  mode: 'active' | 'standby';
  updatedAt?: string;
  details: string;
}

interface IntegrationIndex {
  integrations: Record<string, string>;
}

class SecretManagerService {
  private readonly vaultAddr: string;
  private readonly vaultToken: string;
  private readonly vaultKvMount: string;
  private readonly vaultPathPrefix: string;

  constructor() {
    this.vaultAddr = (process.env.VAULT_ADDR || '').replace(/\/$/, '');
    this.vaultToken = process.env.VAULT_TOKEN || '';
    this.vaultKvMount = process.env.VAULT_KV_MOUNT || 'secret';
    this.vaultPathPrefix = process.env.VAULT_PATH_PREFIX || 'idp';
  }

  private ensureVaultConfigured(): void {
    if (!this.vaultAddr || !this.vaultToken) {
      throw new Error('HashiCorp Vault is not configured. Set VAULT_ADDR and VAULT_TOKEN.');
    }
  }

  private sanitizeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private dataEndpoint(path: string): string {
    return `${this.vaultAddr}/v1/${this.vaultKvMount}/data/${path}`;
  }

  private async writeSecret(path: string, data: Record<string, unknown>): Promise<void> {
    this.ensureVaultConfigured();

    const response = await fetch(this.dataEndpoint(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Vault-Token': this.vaultToken,
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Vault write failed: ${response.status} ${details}`);
    }
  }

  private async readSecret<T>(path: string): Promise<T | null> {
    this.ensureVaultConfigured();

    const response = await fetch(this.dataEndpoint(path), {
      method: 'GET',
      headers: {
        'X-Vault-Token': this.vaultToken,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Vault read failed: ${response.status} ${details}`);
    }

    const body = (await response.json()) as { data?: { data?: T } };
    return body.data?.data || null;
  }

  private async deleteSecret(path: string): Promise<void> {
    this.ensureVaultConfigured();

    const response = await fetch(this.dataEndpoint(path), {
      method: 'DELETE',
      headers: {
        'X-Vault-Token': this.vaultToken,
      },
    });

    if (response.status === 404) {
      return;
    }

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Vault delete failed: ${response.status} ${details}`);
    }
  }

  private userBasePath(userId: string): string {
    return `${this.vaultPathPrefix}/users/${this.sanitizeSegment(userId)}`;
  }

  private indexPath(userId: string): string {
    return `${this.userBasePath(userId)}/integration-index`;
  }

  private integrationPath(userId: string, integrationId: string): string {
    return `${this.userBasePath(userId)}/integrations/${this.sanitizeSegment(integrationId)}`;
  }

  private async readIndex(userId: string): Promise<IntegrationIndex> {
    const index = await this.readSecret<IntegrationIndex>(this.indexPath(userId));
    return index || { integrations: {} };
  }

  async upsertUserIntegrationSecret(userId: string, integrationId: string, values: Record<string, string>): Promise<string> {
    const updatedAt = new Date().toISOString();
    await this.writeSecret(this.integrationPath(userId, integrationId), {
      values,
      updatedAt,
    });

    const index = await this.readIndex(userId);
    index.integrations[integrationId] = updatedAt;
    await this.writeSecret(this.indexPath(userId), index);

    return updatedAt;
  }

  async getUserIntegrationValues(userId: string, integrationId: string): Promise<{ values: Record<string, string>; updatedAt?: string }> {
    const saved = await this.readSecret<{ values?: Record<string, string>; updatedAt?: string }>(
      this.integrationPath(userId, integrationId)
    );

    if (!saved) {
      return { values: {} };
    }

    return {
      values: saved.values || {},
      updatedAt: saved.updatedAt,
    };
  }

  async listUserIntegrationValues(userId: string): Promise<Record<string, { values: Record<string, string>; updatedAt?: string }>> {
    const index = await this.readIndex(userId);
    const result: Record<string, { values: Record<string, string>; updatedAt?: string }> = {};

    for (const integrationId of Object.keys(index.integrations)) {
      result[integrationId] = await this.getUserIntegrationValues(userId, integrationId);
    }

    return result;
  }

  async removeUserIntegrationSecret(userId: string, integrationId: string): Promise<void> {
    await this.deleteSecret(this.integrationPath(userId, integrationId));

    const index = await this.readIndex(userId);
    delete index.integrations[integrationId];
    await this.writeSecret(this.indexPath(userId), index);
  }

  async getProviderStatuses(userId: string): Promise<SecretProviderStatus[]> {
    const hashiConnected = Boolean(this.vaultAddr && this.vaultToken);
    const index = hashiConnected ? await this.readIndex(userId) : { integrations: {} };
    const latestUpdate = Object.values(index.integrations).sort().at(-1);

    return [
      {
        id: 'hashicorp-vault',
        name: 'HashiCorp Vault',
        connected: hashiConnected,
        mode: 'active',
        updatedAt: latestUpdate,
        details: hashiConnected
          ? `Storing all integration secrets at ${this.vaultAddr}`
          : 'Configure VAULT_ADDR and VAULT_TOKEN',
      },
      {
        id: 'aws-secrets-manager',
        name: 'AWS Secrets Manager',
        connected: false,
        mode: 'standby',
        updatedAt: latestUpdate,
        details: 'Available as standby provider',
      },
      {
        id: 'kubernetes-secrets',
        name: 'Kubernetes Secrets',
        connected: false,
        mode: 'standby',
        updatedAt: latestUpdate,
        details: 'Available as standby provider',
      },
      {
        id: 'azure-key-vault',
        name: 'Azure Key Vault',
        connected: false,
        mode: 'standby',
        updatedAt: latestUpdate,
        details: 'Available as standby provider',
      },
    ];
  }
}

export default new SecretManagerService();
