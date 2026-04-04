import { useEffect, useMemo, useState } from "react";
import keycloak from "@/auth/keycloak";
import { getIntegrationByNodeType, integrationCatalog } from "@/lib/integrationCatalog";

export interface IntegrationState {
  connected: boolean;
  values: Record<string, string>;
  updatedAt?: string;
}

export interface SecretProviderState {
  id: string;
  name: string;
  connected: boolean;
  mode: "active" | "standby";
  updatedAt?: string;
  details: string;
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

const withAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (keycloak.token) {
    headers.Authorization = `Bearer ${keycloak.token}`;
  }

  return headers;
};

export const useIntegrations = () => {
  const [state, setState] = useState<IntegrationStateRecord>(() => buildDefaultState());
  const [secretProviders, setSecretProviders] = useState<SecretProviderState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchState = async () => {
    if (!keycloak.token) {
      setState(buildDefaultState());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/integrations`, {
        method: "GET",
        headers: withAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to load integrations");
      }

      const data = await response.json();
      const defaults = buildDefaultState();
      setState({ ...defaults, ...(data.state || {}) });

      const providerResponse = await fetch(`${API_BASE}/api/integrations/secrets/providers`, {
        method: "GET",
        headers: withAuthHeaders(),
      });

      if (providerResponse.ok) {
        const providerData = await providerResponse.json();
        setSecretProviders(providerData.providers || []);
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

  const connectIntegration = async (integrationId: string, values: Record<string, string>) => {
    if (!keycloak.token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE}/api/integrations/${integrationId}`, {
      method: "PUT",
      headers: withAuthHeaders(),
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
  };

  const disconnectIntegration = async (integrationId: string) => {
    if (!keycloak.token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_BASE}/api/integrations/${integrationId}`, {
      method: "DELETE",
      headers: withAuthHeaders(),
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
    refreshIntegrations: fetchState,
    secretProviders,
    isLoading,
    error,
  };
};

export default useIntegrations;
