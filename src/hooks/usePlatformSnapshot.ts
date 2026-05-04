import { useCallback, useEffect, useState } from "react";
import { apiCall } from "@/lib/apiClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface PlatformSnapshot {
  applications: Array<Record<string, any>>;
  pipelines: Array<Record<string, any>>;
  deployments: Array<Record<string, any>>;
  metrics: Array<Record<string, any>>;
  logs: Array<Record<string, any>>;
  alerts: Array<Record<string, any>>;
  vulnerabilities: Array<Record<string, any>>;
  infrastructure: Array<Record<string, any>>;
  terraformModules: Array<Record<string, any>>;
  hpaConfigs: Array<Record<string, any>>;
  generatedAt?: string;
}

const emptySnapshot: PlatformSnapshot = {
  applications: [],
  pipelines: [],
  deployments: [],
  metrics: [],
  logs: [],
  alerts: [],
  vulnerabilities: [],
  infrastructure: [],
  terraformModules: [],
  hpaConfigs: [],
};

export const usePlatformSnapshot = () => {
  const [snapshot, setSnapshot] = useState<PlatformSnapshot>(emptySnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiCall(`${API_BASE}/api/platform/snapshot`, { method: "GET" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Failed to load platform data");
      }

      const body = await response.json();
      setSnapshot({ ...emptySnapshot, ...(body.data || {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load platform data");
      setSnapshot(emptySnapshot);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runAction = useCallback(async (resource: string, id: string, action: string) => {
    const response = await apiCall(`${API_BASE}/api/platform/actions/${resource}/${id}`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || "Failed to update platform data");
    }

    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { snapshot, isLoading, error, refresh, runAction };
};

export default usePlatformSnapshot;
