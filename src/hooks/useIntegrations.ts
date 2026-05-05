import { useEffect, useMemo, useState } from "react";
import keycloak from "@/auth/keycloak";
import { getIntegrationByNodeType, integrationCatalog } from "@/lib/integrationCatalog";
import { apiCall } from "@/lib/apiClient";

export interface IntegrationState {
  connected: boolean;
  values: Record<string, string>;
  updatedAt?: string;
  verification?: {
    healthy: boolean;
    message: string;
    checkedAt: string;
    details?: Record<string, string | number | boolean | null>;
    workflowFile?: string;
    branch?: string;
    workflows?: Array<{
      id: number;
      name: string;
      path: string;
      state: string;
      htmlUrl: string;
    }>;
    configuredWorkflow?: {
      id: number;
      name: string;
      path: string;
      state: string;
      htmlUrl: string;
    } | null;
    latestWorkflowRun?: {
      name: string;
      status: string;
      conclusion: string | null;
      htmlUrl: string;
      headSha: string;
      createdAt: string;
      updatedAt: string;
    } | null;
    repository?: {
      fullName: string;
      description: string | null;
      defaultBranch: string;
      isPrivate: boolean;
      isArchived: boolean;
      htmlUrl: string;
      latestWorkflowRun: {
        name: string;
        status: string;
        conclusion: string | null;
        htmlUrl: string;
        headSha: string;
        createdAt: string;
        updatedAt: string;
      } | null;
    } | null;
  };
}

export interface SecretProviderState {
  id: string;
  name: string;
  connected: boolean;
  writable: boolean;
  mode: "active" | "standby";
  updatedAt?: string;
  details: string;
}

export type SecretProviderId =
  | "openbao"
  | "hashicorp-vault"
  | "aws-secrets-manager"
  | "kubernetes-secrets"
  | "azure-key-vault";

export interface UserSecretState {
  id: string;
  name: string;
  provider: SecretProviderId;
  path: string;
  updatedAt: string;
}

type IntegrationStateRecord = Record<string, IntegrationState>;

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const buildDefaultState = (): IntegrationStateRecord => {
  return integrationCatalog.reduce<IntegrationStateRecord>((acc, integration) => {
    acc[integration.id] = {
      connected: false,
      values: {},
    };
    return acc;
  }, {});
};

export const useIntegrations = () => {
  const [state, setState] = useState<IntegrationStateRecord>(() => buildDefaultState());
  const [secretProviders, setSecretProviders] = useState<SecretProviderState[]>([]);
  const [userSecrets, setUserSecrets] = useState<UserSecretState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchState = async () => {
    if (!keycloak.token) {
      setState(buildDefaultState());
      setSecretProviders([]);
      setUserSecrets([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiCall(`${API_BASE}/api/integrations`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || "Failed to load integrations");
      }

      const data = await response.json();
      const defaults = buildDefaultState();
      setState({ ...defaults, ...(data.state || {}) });

      const providerResponse = await apiCall(`${API_BASE}/api/integrations/secrets/providers`, {
        method: "GET",
      });

      if (providerResponse.ok) {
        const providerData = await providerResponse.json();
        setSecretProviders(providerData.providers || []);
      }

      const userSecretsResponse = await apiCall(`${API_BASE}/api/integrations/secrets/user`, {
        method: "GET",
      });

      if (userSecretsResponse.ok) {
        const userSecretsData = await userSecretsResponse.json();
        setUserSecrets(userSecretsData.secrets || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load integrations";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const connectIntegration = async (integrationId: string, values: Record<string, string>): Promise<IntegrationState> => {
    if (!keycloak.token) {
      throw new Error("Authentication required");
    }

    const response = await apiCall(`${API_BASE}/api/integrations/${integrationId}`, {
      method: "PUT",
      body: JSON.stringify({ values }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || "Failed to save integration");
    }

    const data = await response.json();
    setState((prev) => ({
      ...prev,
      [integrationId]: data.state,
    }));

    return data.state as IntegrationState;
  };

  const disconnectIntegration = async (integrationId: string) => {
    if (!keycloak.token) {
      throw new Error("Authentication required");
    }

    const response = await apiCall(`${API_BASE}/api/integrations/${integrationId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || "Failed to disconnect integration");
    }

    const data = await response.json();
    setState((prev) => ({
      ...prev,
      [integrationId]: data.state,
    }));
  };

  const saveUserSecret = async (secret: { id: string; name: string; value: string; provider: SecretProviderId }) => {
    if (!keycloak.token) {
      throw new Error("Authentication required");
    }

    const response = await apiCall(`${API_BASE}/api/integrations/secrets/user/${encodeURIComponent(secret.id)}`, {
      method: "PUT",
      body: JSON.stringify({
        name: secret.name,
        value: secret.value,
        provider: secret.provider,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || "Failed to save secret");
    }

    const data = await response.json();
    setUserSecrets((prev) => [
      data.secret,
      ...prev.filter((item) => item.id !== data.secret.id),
    ]);
  };

  const deleteUserSecret = async (secretId: string, provider: SecretProviderId) => {
    if (!keycloak.token) {
      throw new Error("Authentication required");
    }

    const response = await apiCall(`${API_BASE}/api/integrations/secrets/user/${encodeURIComponent(provider)}/${encodeURIComponent(secretId)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || "Failed to delete secret");
    }

    setUserSecrets((prev) => prev.filter((item) => item.id !== secretId || item.provider !== provider));
  };

  const getState = (integrationId: string): IntegrationState => {
    return state[integrationId] || { connected: false, values: {} };
  };

  const getNodeIntegration = (nodeType: string) => {
    const definition = getIntegrationByNodeType(nodeType);
    if (!definition) {
      return null;
    }

    return {
      definition,
      state: getState(definition.id),
    };
  };

  const groupedIntegrations = useMemo(() => {
    const groups: Record<string, typeof integrationCatalog> = {};
    for (const integration of integrationCatalog) {
      if (!groups[integration.group]) {
        groups[integration.group] = [];
      }
      groups[integration.group].push(integration);
    }
    return groups;
  }, []);

  return {
    integrationCatalog,
    groupedIntegrations,
    getState,
    getNodeIntegration,
    connectIntegration,
    disconnectIntegration,
    saveUserSecret,
    deleteUserSecret,
    refreshIntegrations: fetchState,
    secretProviders,
    userSecrets,
    isLoading,
    error,
  };
};

export default useIntegrations;
