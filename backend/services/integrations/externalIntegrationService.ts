import axios, { type AxiosRequestConfig } from 'axios';

export interface ExternalIntegrationTestResult {
  healthy: boolean;
  message: string;
  checkedAt: string;
  details: Record<string, string | number | boolean | null>;
}

type IntegrationValues = Record<string, string>;

const DEFAULT_TIMEOUT_MS = 8000;

const checkedAt = () => new Date().toISOString();

const normalizeUrl = (value: string): string => value.trim().replace(/\/$/, '');

const normalizeField = (value: string | undefined | null): string => (value || '').trim();

const success = (
  message: string,
  details: ExternalIntegrationTestResult['details'] = {}
): ExternalIntegrationTestResult => ({
  healthy: true,
  message,
  checkedAt: checkedAt(),
  details,
});

const failure = (
  message: string,
  details: ExternalIntegrationTestResult['details'] = {}
): ExternalIntegrationTestResult => ({
  healthy: false,
  message,
  checkedAt: checkedAt(),
  details,
});

const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const response = await axios.request<T>({
    timeout: DEFAULT_TIMEOUT_MS,
    validateStatus: (status) => status >= 200 && status < 500,
    ...config,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.data;
};

const messageFromError = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const testSnyk = async (values: IntegrationValues): Promise<ExternalIntegrationTestResult> => {
  const orgId = normalizeField(values.orgId);
  const apiToken = normalizeField(values.apiToken);

  if (!orgId || !apiToken) {
    return failure('Organization ID and API token are required', { orgId });
  }

  try {
    const data = await request<{ id?: string; name?: string; slug?: string }>({
      method: 'GET',
      url: `https://snyk.io/api/v1/org/${encodeURIComponent(orgId)}`,
      headers: { Authorization: `token ${apiToken}` },
    });

    return success(`Snyk connected to ${data.name || data.slug || orgId}`, {
      orgId: data.id || orgId,
      orgName: data.name || data.slug || null,
    });
  } catch (error) {
    return failure(`Snyk verification failed: ${messageFromError(error, 'Unable to reach Snyk')}`, { orgId });
  }
};

const testSonarQube = async (values: IntegrationValues): Promise<ExternalIntegrationTestResult> => {
  const serverUrl = normalizeUrl(values.serverUrl || '');
  const token = normalizeField(values.token);

  if (!serverUrl || !token) {
    return failure('Server URL and token are required', { serverUrl });
  }

  try {
    const auth = Buffer.from(`${token}:`).toString('base64');
    const system = await request<{ status?: string; version?: string }>({
      method: 'GET',
      url: `${serverUrl}/api/system/status`,
      headers: { Authorization: `Basic ${auth}` },
    });

    return success(`SonarQube is ${system.status || 'reachable'}`, {
      serverUrl,
      serverStatus: system.status || null,
      version: system.version || null,
    });
  } catch (error) {
    return failure(`SonarQube verification failed: ${messageFromError(error, 'Unable to reach SonarQube')}`, {
      serverUrl,
    });
  }
};

const testTrivy = async (values: IntegrationValues): Promise<ExternalIntegrationTestResult> => {
  const severity = normalizeField(values.severity) || 'HIGH,CRITICAL';
  const timeout = normalizeField(values.timeout) || '600';
  const severities = severity.split(',').map((item) => item.trim()).filter(Boolean);
  const allowedSeverities = new Set(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
  const invalidSeverities = severities.filter((item) => !allowedSeverities.has(item.toUpperCase()));
  const timeoutSeconds = Number(timeout);

  if (invalidSeverities.length > 0) {
    return failure(`Unsupported Trivy severity: ${invalidSeverities.join(', ')}`, { severity, timeout });
  }

  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
    return failure('Trivy scan timeout must be a positive number of seconds', { severity, timeout });
  }

  return success('Trivy scan policy is configured', {
    severity: severities.join(','),
    timeoutSeconds,
  });
};

const testDockerHub = async (values: IntegrationValues): Promise<ExternalIntegrationTestResult> => {
  const username = normalizeField(values.username);
  const token = normalizeField(values.token);

  if (!username || !token) {
    return failure('Username and access token are required', { username });
  }

  try {
    const accessToken = await request<{ access_token?: string }>({
      method: 'POST',
      url: 'https://hub.docker.com/v2/auth/token',
      headers: { 'Content-Type': 'application/json' },
      data: {
        identifier: username,
        secret: token,
      },
    });

    if (!accessToken.access_token) {
      return failure('Docker Hub did not return an API session token', { username });
    }

    return success(`Docker Hub connected as ${username}`, {
      username,
      authMethod: 'access-token',
    });
  } catch (error) {
    return failure(`Docker Hub verification failed: ${messageFromError(error, 'Unable to reach Docker Hub')}`, {
      username,
    });
  }
};

const testArgoCd = async (values: IntegrationValues): Promise<ExternalIntegrationTestResult> => {
  const serverUrl = normalizeUrl(values.serverUrl || '');
  const token = normalizeField(values.token);

  if (!serverUrl || !token) {
    return failure('ArgoCD URL and API token are required', { serverUrl });
  }

  try {
    const userInfo = await request<{ username?: string; iss?: string }>({
      method: 'GET',
      url: `${serverUrl}/api/v1/session/userinfo`,
      headers: { Authorization: `Bearer ${token}` },
    });

    return success(`ArgoCD connected as ${userInfo.username || 'token user'}`, {
      serverUrl,
      issuer: userInfo.iss || null,
    });
  } catch (error) {
    return failure(`ArgoCD verification failed: ${messageFromError(error, 'Unable to reach ArgoCD')}`, {
      serverUrl,
    });
  }
};

const testPrometheus = async (values: IntegrationValues): Promise<ExternalIntegrationTestResult> => {
  const serverUrl = normalizeUrl(values.serverUrl || '');

  if (!serverUrl) {
    return failure('Prometheus URL is required', { serverUrl });
  }

  try {
    const buildInfo = await request<{ data?: { version?: string; revision?: string } }>({
      method: 'GET',
      url: `${serverUrl}/api/v1/status/buildinfo`,
    });

    return success('Prometheus API is reachable', {
      serverUrl,
      version: buildInfo.data?.version || null,
      revision: buildInfo.data?.revision || null,
    });
  } catch (error) {
    return failure(`Prometheus verification failed: ${messageFromError(error, 'Unable to reach Prometheus')}`, {
      serverUrl,
    });
  }
};

const testElk = async (values: IntegrationValues): Promise<ExternalIntegrationTestResult> => {
  const elasticsearchUrl = normalizeUrl(values.elasticsearchUrl || '');

  if (!elasticsearchUrl) {
    return failure('Elasticsearch URL is required', { elasticsearchUrl });
  }

  try {
    const root = await request<{ cluster_name?: string; version?: { number?: string } }>({
      method: 'GET',
      url: elasticsearchUrl,
    });

    let clusterHealth: string | null = null;
    try {
      const health = await request<{ status?: string }>({
        method: 'GET',
        url: `${elasticsearchUrl}/_cluster/health`,
      });
      clusterHealth = health.status || null;
    } catch {
      clusterHealth = null;
    }

    return success(`Elasticsearch cluster ${root.cluster_name || 'default'} is reachable`, {
      elasticsearchUrl,
      cluster: root.cluster_name || null,
      version: root.version?.number || null,
      health: clusterHealth,
    });
  } catch (error) {
    return failure(`ELK verification failed: ${messageFromError(error, 'Unable to reach Elasticsearch')}`, {
      elasticsearchUrl,
    });
  }
};

const testAlertmanager = async (values: IntegrationValues): Promise<ExternalIntegrationTestResult> => {
  const serverUrl = normalizeUrl(values.serverUrl || '');

  if (!serverUrl) {
    return failure('Alertmanager URL is required', { serverUrl });
  }

  try {
    const status = await request<{ versionInfo?: { version?: string }; config?: { original?: string } }>({
      method: 'GET',
      url: `${serverUrl}/api/v2/status`,
    });

    return success('Alertmanager API is reachable', {
      serverUrl,
      version: status.versionInfo?.version || null,
      hasConfig: Boolean(status.config?.original),
    });
  } catch (error) {
    return failure(`Alertmanager verification failed: ${messageFromError(error, 'Unable to reach Alertmanager')}`, {
      serverUrl,
    });
  }
};

export const testExternalIntegration = async (
  integrationId: string,
  values: IntegrationValues
): Promise<ExternalIntegrationTestResult | null> => {
  switch (integrationId) {
    case 'snyk':
      return testSnyk(values);
    case 'sonarqube':
      return testSonarQube(values);
    case 'trivy':
      return testTrivy(values);
    case 'dockerhub':
      return testDockerHub(values);
    case 'argocd':
      return testArgoCd(values);
    case 'prometheus':
      return testPrometheus(values);
    case 'elk':
      return testElk(values);
    case 'alertmanager':
      return testAlertmanager(values);
    default:
      return null;
  }
};
