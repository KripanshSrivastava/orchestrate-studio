export type SecretProviderId =
  | 'openbao'
  | 'hashicorp-vault'
  | 'aws-secrets-manager'
  | 'kubernetes-secrets'
  | 'azure-key-vault';

export interface SecretProviderStatus {
  id: SecretProviderId;
  name: string;
  connected: boolean;
  writable: boolean;
  mode: 'active' | 'standby';
  updatedAt?: string;
  details: string;
}

export interface UserSecretMetadata {
  id: string;
  name: string;
  provider: SecretProviderId;
  path: string;
  updatedAt: string;
}

export interface AwsConnectionSecret {
  externalId: string;
  roleArn: string;
  accountId: string;
  region: string;
  updatedAt: string;
}

interface IntegrationIndex {
  integrations: Record<string, string>;
}

interface UserSecretIndex {
  secrets: Record<string, UserSecretMetadata>;
}

interface KvProviderConfig {
  id: Extract<SecretProviderId, 'openbao' | 'hashicorp-vault'>;
  name: string;
  addr: string;
  token: string;
  kvMount: string;
  pathPrefix: string;
}

type WritableProviderId = KvProviderConfig['id'];

class SecretManagerService {
  private readonly openBao: KvProviderConfig;
  private readonly vault: KvProviderConfig;
  private readonly integrationProviderId: WritableProviderId;

  constructor() {
    this.openBao = {
      id: 'openbao',
      name: 'OpenBao',
      addr: (process.env.OPENBAO_ADDR || '').replace(/\/$/, ''),
      token: process.env.OPENBAO_TOKEN || '',
      kvMount: process.env.OPENBAO_KV_MOUNT || 'secret',
      pathPrefix: process.env.OPENBAO_PATH_PREFIX || 'idp',
    };

    this.vault = {
      id: 'hashicorp-vault',
      name: 'HashiCorp Vault',
      addr: (process.env.VAULT_ADDR || '').replace(/\/$/, ''),
      token: process.env.VAULT_TOKEN || '',
      kvMount: process.env.VAULT_KV_MOUNT || 'secret',
      pathPrefix: process.env.VAULT_PATH_PREFIX || 'idp',
    };

    const requestedProvider = process.env.SECRET_STORE_PROVIDER;
    this.integrationProviderId = requestedProvider === 'hashicorp-vault' ? 'hashicorp-vault' : 'openbao';
  }

  private getKvProvider(providerId: WritableProviderId = this.integrationProviderId): KvProviderConfig {
    return providerId === 'hashicorp-vault' ? this.vault : this.openBao;
  }

  private getConfiguredKvProviders(): KvProviderConfig[] {
    return [this.openBao, this.vault].filter((provider) => this.isKvProviderConfigured(provider));
  }

  private isKvProviderConfigured(provider: KvProviderConfig): boolean {
    return Boolean(provider.addr && provider.token);
  }

  private assertKvProviderConfigured(provider: KvProviderConfig): void {
    if (!this.isKvProviderConfigured(provider)) {
      throw new Error(`${provider.name} is not configured. Configure its address and token before storing secrets.`);
    }
  }

  private assertWritableProvider(providerId: SecretProviderId): asserts providerId is WritableProviderId {
    if (providerId !== 'openbao' && providerId !== 'hashicorp-vault') {
      throw new Error('This provider is listed for planning, but write support is not enabled yet.');
    }
  }

  private sanitizeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private dataEndpoint(provider: KvProviderConfig, path: string): string {
    return `${provider.addr}/v1/${provider.kvMount}/data/${path}`;
  }

  private async writeSecret<T extends object>(provider: KvProviderConfig, path: string, data: T): Promise<void> {
    this.assertKvProviderConfigured(provider);

    const response = await fetch(this.dataEndpoint(provider, path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Vault-Token': provider.token,
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`${provider.name} write failed: ${response.status} ${details}`);
    }
  }

  private async readSecret<T>(provider: KvProviderConfig, path: string): Promise<T | null> {
    this.assertKvProviderConfigured(provider);

    const response = await fetch(this.dataEndpoint(provider, path), {
      method: 'GET',
      headers: {
        'X-Vault-Token': provider.token,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`${provider.name} read failed: ${response.status} ${details}`);
    }

    const body = (await response.json()) as { data?: { data?: T } };
    return body.data?.data || null;
  }

  private async deleteSecret(provider: KvProviderConfig, path: string): Promise<void> {
    this.assertKvProviderConfigured(provider);

    const response = await fetch(this.dataEndpoint(provider, path), {
      method: 'DELETE',
      headers: {
        'X-Vault-Token': provider.token,
      },
    });

    if (response.status === 404) {
      return;
    }

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`${provider.name} delete failed: ${response.status} ${details}`);
    }
  }

  private userBasePath(provider: KvProviderConfig, userId: string): string {
    return `${provider.pathPrefix}/users/${this.sanitizeSegment(userId)}`;
  }

  private integrationIndexPath(provider: KvProviderConfig, userId: string): string {
    return `${this.userBasePath(provider, userId)}/integration-index`;
  }

  private integrationPath(provider: KvProviderConfig, userId: string, integrationId: string): string {
    return `${this.userBasePath(provider, userId)}/integrations/${this.sanitizeSegment(integrationId)}`;
  }

  private userSecretIndexPath(provider: KvProviderConfig, userId: string): string {
    return `${this.userBasePath(provider, userId)}/user-secret-index`;
  }

  private userSecretPath(provider: KvProviderConfig, userId: string, secretId: string): string {
    return `${this.userBasePath(provider, userId)}/user-secrets/${this.sanitizeSegment(secretId)}`;
  }

  private awsConnectionPath(provider: KvProviderConfig, userId: string, connectionId: string): string {
    return `${this.userBasePath(provider, userId)}/aws-connections/${this.sanitizeSegment(connectionId)}`;
  }

  private async readIntegrationIndex(provider: KvProviderConfig, userId: string): Promise<IntegrationIndex> {
    const index = await this.readSecret<IntegrationIndex>(provider, this.integrationIndexPath(provider, userId));
    return index || { integrations: {} };
  }

  private async readUserSecretIndex(provider: KvProviderConfig, userId: string): Promise<UserSecretIndex> {
    const index = await this.readSecret<UserSecretIndex>(provider, this.userSecretIndexPath(provider, userId));
    return index || { secrets: {} };
  }

  async upsertUserIntegrationSecret(userId: string, integrationId: string, values: Record<string, string>): Promise<string> {
    const provider = this.getKvProvider();
    const updatedAt = new Date().toISOString();
    await this.writeSecret(provider, this.integrationPath(provider, userId, integrationId), {
      values,
      updatedAt,
      provider: provider.id,
    });

    const index = await this.readIntegrationIndex(provider, userId);
    index.integrations[integrationId] = updatedAt;
    await this.writeSecret(provider, this.integrationIndexPath(provider, userId), index);

    return updatedAt;
  }

  async getUserIntegrationValues(userId: string, integrationId: string): Promise<{ values: Record<string, string>; updatedAt?: string }> {
    const provider = this.getKvProvider();
    const saved = await this.readSecret<{ values?: Record<string, string>; updatedAt?: string }>(
      provider,
      this.integrationPath(provider, userId, integrationId)
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
    const provider = this.getKvProvider();
    const index = await this.readIntegrationIndex(provider, userId);
    const result: Record<string, { values: Record<string, string>; updatedAt?: string }> = {};

    for (const integrationId of Object.keys(index.integrations)) {
      result[integrationId] = await this.getUserIntegrationValues(userId, integrationId);
    }

    return result;
  }

  async removeUserIntegrationSecret(userId: string, integrationId: string): Promise<void> {
    const provider = this.getKvProvider();
    await this.deleteSecret(provider, this.integrationPath(provider, userId, integrationId));

    const index = await this.readIntegrationIndex(provider, userId);
    delete index.integrations[integrationId];
    await this.writeSecret(provider, this.integrationIndexPath(provider, userId), index);
  }

  async listUserSecrets(userId: string): Promise<UserSecretMetadata[]> {
    const secrets: UserSecretMetadata[] = [];

    for (const provider of this.getConfiguredKvProviders()) {
      const index = await this.readUserSecretIndex(provider, userId);
      secrets.push(...Object.values(index.secrets));
    }

    return secrets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async upsertUserSecret(
    userId: string,
    secretId: string,
    input: { name: string; value: string; provider: SecretProviderId }
  ): Promise<UserSecretMetadata> {
    this.assertWritableProvider(input.provider);
    const provider = this.getKvProvider(input.provider);
    const normalizedId = this.sanitizeSegment(secretId.trim() || input.name.trim().toLowerCase().replace(/\s+/g, '-'));

    if (!normalizedId) {
      throw new Error('Secret name is required.');
    }

    const name = input.name.trim();
    if (!name) {
      throw new Error('Secret name is required.');
    }

    if (!input.value) {
      throw new Error('Secret value is required.');
    }

    const path = this.userSecretPath(provider, userId, normalizedId);
    const updatedAt = new Date().toISOString();

    await this.writeSecret(provider, path, {
      name,
      value: input.value,
      provider: provider.id,
      updatedAt,
    });

    const metadata: UserSecretMetadata = {
      id: normalizedId,
      name,
      provider: provider.id,
      path: `${provider.kvMount}/data/${path}`,
      updatedAt,
    };

    const index = await this.readUserSecretIndex(provider, userId);
    index.secrets[normalizedId] = metadata;
    await this.writeSecret(provider, this.userSecretIndexPath(provider, userId), index);

    return metadata;
  }

  async removeUserSecret(userId: string, providerId: SecretProviderId, secretId: string): Promise<void> {
    this.assertWritableProvider(providerId);
    const provider = this.getKvProvider(providerId);
    const normalizedId = this.sanitizeSegment(secretId);
    await this.deleteSecret(provider, this.userSecretPath(provider, userId, normalizedId));

    const index = await this.readUserSecretIndex(provider, userId);
    delete index.secrets[normalizedId];
    await this.writeSecret(provider, this.userSecretIndexPath(provider, userId), index);
  }

  async upsertAwsConnectionSecret(
    userId: string,
    connectionId: string,
    data: Omit<AwsConnectionSecret, 'updatedAt'>
  ): Promise<{ path: string; updatedAt: string }> {
    const provider = this.getKvProvider();
    const updatedAt = new Date().toISOString();
    const path = this.awsConnectionPath(provider, userId, connectionId);

    await this.writeSecret(provider, path, {
      ...data,
      updatedAt,
      provider: provider.id,
    });

    return {
      path: `${provider.kvMount}/data/${path}`,
      updatedAt,
    };
  }

  async getAwsConnectionSecret(userId: string, connectionId: string): Promise<AwsConnectionSecret | null> {
    const provider = this.getKvProvider();
    return this.readSecret<AwsConnectionSecret>(provider, this.awsConnectionPath(provider, userId, connectionId));
  }

  private providerStatus(provider: KvProviderConfig, latestUpdate?: string): SecretProviderStatus {
    const connected = this.isKvProviderConfigured(provider);
    const active = provider.id === this.integrationProviderId;
    return {
      id: provider.id,
      name: provider.name,
      connected,
      writable: connected,
      mode: active ? 'active' : 'standby',
      updatedAt: latestUpdate,
      details: connected
        ? `Storing secrets at ${provider.addr}`
        : `Configure ${provider.id === 'openbao' ? 'OPENBAO_ADDR and OPENBAO_TOKEN' : 'VAULT_ADDR and VAULT_TOKEN'}`,
    };
  }

  async getProviderStatuses(userId: string): Promise<SecretProviderStatus[]> {
    const updates: Partial<Record<WritableProviderId, string>> = {};

    for (const provider of this.getConfiguredKvProviders()) {
      const integrationIndex = await this.readIntegrationIndex(provider, userId);
      const userSecretIndex = await this.readUserSecretIndex(provider, userId);
      updates[provider.id] = [
        ...Object.values(integrationIndex.integrations),
        ...Object.values(userSecretIndex.secrets).map((secret) => secret.updatedAt),
      ].sort().at(-1);
    }

    return [
      this.providerStatus(this.openBao, updates.openbao),
      this.providerStatus(this.vault, updates['hashicorp-vault']),
      {
        id: 'aws-secrets-manager',
        name: 'AWS Secrets Manager',
        connected: Boolean(process.env.AWS_REGION),
        writable: false,
        mode: 'standby',
        details: 'Provider card is available; write adapter requires AWS Secrets Manager client configuration.',
      },
      {
        id: 'kubernetes-secrets',
        name: 'Kubernetes Secrets',
        connected: Boolean(process.env.KUBERNETES_SERVICE_HOST || process.env.KUBERNETES_API_URL),
        writable: false,
        mode: 'standby',
        details: 'Provider card is available; write adapter requires Kubernetes API credentials and namespace policy.',
      },
      {
        id: 'azure-key-vault',
        name: 'Azure Key Vault',
        connected: Boolean(process.env.AZURE_KEY_VAULT_URL),
        writable: false,
        mode: 'standby',
        details: 'Provider card is available; write adapter requires Azure Key Vault credentials.',
      },
    ];
  }
}

export default new SecretManagerService();
