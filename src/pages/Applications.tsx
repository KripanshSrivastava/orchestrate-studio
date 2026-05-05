import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Filter, PauseCircle, Power, Rocket, RotateCcw, Search } from "lucide-react";
import { apiPut } from "@/lib/apiClient";
import usePlatformSnapshot from "@/hooks/usePlatformSnapshot";

interface App {
  id: string;
  name: string;
  env: string;
  version: string;
  status: "running" | "stopped" | "deploying" | "error";
  cpu: number;
  memory: number;
  replicas: string;
  lastDeploy: string;
  org_id?: string;
  description?: string;
  owner?: string;
  region?: string;
  namespace?: string;
  cluster?: string;
  endpoint?: string;
  image?: string;
}

const apps: App[] = [
  { name: "api-gateway", env: "prod", version: "v2.4.1", status: "running", cpu: 42, memory: 68, replicas: "3/3", lastDeploy: "5m ago" },
  { name: "user-service", env: "prod", version: "v1.8.0", status: "running", cpu: 28, memory: 55, replicas: "2/2", lastDeploy: "2h ago" },
  { name: "payment-svc", env: "prod", version: "v3.1.2", status: "error", cpu: 85, memory: 91, replicas: "1/3", lastDeploy: "28m ago" },
  { name: "notification", env: "stage", version: "v0.9.4", status: "deploying", cpu: 15, memory: 32, replicas: "2/2", lastDeploy: "1m ago" },
  { name: "auth-service", env: "prod", version: "v2.0.0", status: "running", cpu: 35, memory: 48, replicas: "3/3", lastDeploy: "1d ago" },
  { name: "order-service", env: "prod", version: "v1.5.3", status: "running", cpu: 52, memory: 63, replicas: "4/4", lastDeploy: "3h ago" },
  { name: "search-engine", env: "dev", version: "v0.3.1", status: "stopped", cpu: 0, memory: 0, replicas: "0/1", lastDeploy: "5d ago" },
  { name: "analytics-svc", env: "prod", version: "v1.2.0", status: "running", cpu: 67, memory: 72, replicas: "2/2", lastDeploy: "12h ago" },
];

const statusStyles: Record<string, { dot: string; text: string }> = {
  running: { dot: "bg-success", text: "text-success" },
  stopped: { dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
  deploying: { dot: "bg-warning animate-pulse", text: "text-warning" },
  error: { dot: "bg-destructive", text: "text-destructive" },
};

const envBadge: Record<string, string> = {
  prod: "env-prod",
  stage: "env-stage",
  dev: "env-dev",
};

function UsageBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8">{value}%</span>
    </div>
  );
}

export default function Applications() {
  const [search, setSearch] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const { snapshot, isLoading, error, refresh } = usePlatformSnapshot();
  const rows = snapshot.applications.map((app) => ({
    id: String(app.id || app.name),
    name: app.name,
    env: app.env,
    version: app.version,
    status: app.runtime_status,
    cpu: Number(app.cpu || 0),
    memory: Number(app.memory || 0),
    replicas: app.replicas,
    lastDeploy: app.last_deploy_at ? new Date(app.last_deploy_at).toLocaleString() : "-",
    org_id: app.org_id,
    description: app.description,
    owner: app.owner,
    region: app.region,
    namespace: app.namespace,
    cluster: app.cluster,
    endpoint: app.endpoint,
    image: app.image,
  }));
  const filtered = rows.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
  const selectedApp = useMemo(
    () => filtered.find((app) => app.id === selectedAppId) || filtered[0] || null,
    [filtered, selectedAppId]
  );

  const shutdownApp = async (appId: string) => {
    setBusyAction(appId);
    try {
      await apiPut(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/applications/${appId}`, {
        status: "inactive",
      });
      await refresh();
    } finally {
      setBusyAction(null);
    }
  };

  const shutdownEverything = async () => {
    const activeApps = filtered.filter((app) => app.status === "running" || app.status === "deploying");
    if (activeApps.length === 0) {
      return;
    }

    setBusyAction("shutdown-all");
    try {
      await Promise.all(activeApps.map((app) => apiPut(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/applications/${app.id}`, { status: "inactive" })));
      await refresh();
    } finally {
      setBusyAction(null);
    }
  };

  const runningCount = rows.filter((app) => app.status === "running").length;
  const pausedCount = rows.filter((app) => app.status === "stopped").length;
  const errorCount = rows.filter((app) => app.status === "error").length;

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground">{rows.length} applications across all environments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={shutdownEverything}
            disabled={busyAction === "shutdown-all" || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Power className="w-4 h-4" />
            {busyAction === "shutdown-all" ? "Shutting down..." : "Shutdown all"}
          </button>
        </div>
      </div>
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {isLoading && <div className="rounded-md border border-border/60 bg-card/50 px-3 py-2 text-sm text-muted-foreground">Loading applications from database...</div>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="metric-card">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Running</div>
          <div className="mt-1 text-2xl font-semibold text-foreground">{runningCount}</div>
        </div>
        <div className="metric-card">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Paused</div>
          <div className="mt-1 text-2xl font-semibold text-foreground">{pausedCount}</div>
        </div>
        <div className="metric-card">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Errors</div>
          <div className="mt-1 text-2xl font-semibold text-foreground">{errorCount}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter applications..."
            className="w-full bg-secondary border-0 rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-sm text-foreground hover:bg-accent transition-colors">
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-4">
      <div className="glass-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b border-border bg-secondary/30">
              <th className="text-left py-3 px-4 font-medium">Service</th>
              <th className="text-left py-3 px-4 font-medium">Environment</th>
              <th className="text-left py-3 px-4 font-medium">Version</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
              <th className="text-left py-3 px-4 font-medium">CPU</th>
              <th className="text-left py-3 px-4 font-medium">Memory</th>
              <th className="text-left py-3 px-4 font-medium">Replicas</th>
              <th className="text-left py-3 px-4 font-medium">Last Deploy</th>
              <th className="text-right py-3 px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((app) => {
              const st = statusStyles[app.status];
              return (
                <tr key={app.id} className={`border-b border-border/50 transition-colors ${selectedApp?.id === app.id ? "bg-accent/30" : "hover:bg-accent/20"}`}>
                  <td className="py-3 px-4">
                    <button onClick={() => setSelectedAppId(app.id)} className="font-medium text-foreground hover:text-primary transition-colors font-mono text-xs flex items-center gap-1.5">
                      {app.name} <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </td>
                  <td className="py-3 px-4"><span className={envBadge[app.env]}>{app.env.toUpperCase()}</span></td>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{app.version}</td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1.5">
                      <span className={`status-dot ${st.dot}`} />
                      <span className={`text-xs capitalize ${st.text}`}>{app.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <UsageBar value={app.cpu} color={app.cpu > 80 ? "bg-destructive" : app.cpu > 60 ? "bg-warning" : "bg-primary"} />
                  </td>
                  <td className="py-3 px-4">
                    <UsageBar value={app.memory} color={app.memory > 80 ? "bg-destructive" : app.memory > 60 ? "bg-warning" : "bg-success"} />
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{app.replicas}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{app.lastDeploy}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={refresh} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors" title="Refresh deployment data">
                        <Rocket className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => shutdownApp(app.id)} disabled={busyAction === app.id} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-warning transition-colors disabled:cursor-not-allowed disabled:opacity-50" title="Shutdown application">
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={refresh} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-warning transition-colors" title="Refresh rollback data">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  No applications match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="glass-panel p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Application Details</h2>
            <p className="text-xs text-muted-foreground">Selected application and runtime metadata.</p>
          </div>
          {selectedApp && (
            <button
              onClick={() => shutdownApp(selectedApp.id)}
              disabled={busyAction === selectedApp.id}
              className="inline-flex items-center gap-2 rounded-md bg-warning px-3 py-2 text-xs font-medium text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PauseCircle className="w-4 h-4" />
              Shutdown
            </button>
          )}
        </div>

        {selectedApp ? (
          <div className="grid gap-3 text-sm">
            <div className="rounded-md border border-border/60 bg-background/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
                  <p className="text-foreground font-medium">{selectedApp.name}</p>
                </div>
                <span className={`text-xs capitalize ${statusStyles[selectedApp.status].text}`}>
                  {selectedApp.status}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{selectedApp.description || "No description available"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border/60 bg-background/30 p-3"><p className="text-xs text-muted-foreground">Environment</p><p className="mt-1 font-mono text-xs text-foreground">{selectedApp.env}</p></div>
              <div className="rounded-md border border-border/60 bg-background/30 p-3"><p className="text-xs text-muted-foreground">Version</p><p className="mt-1 font-mono text-xs text-foreground">{selectedApp.version}</p></div>
              <div className="rounded-md border border-border/60 bg-background/30 p-3"><p className="text-xs text-muted-foreground">CPU</p><p className="mt-1 font-mono text-xs text-foreground">{selectedApp.cpu}%</p></div>
              <div className="rounded-md border border-border/60 bg-background/30 p-3"><p className="text-xs text-muted-foreground">Memory</p><p className="mt-1 font-mono text-xs text-foreground">{selectedApp.memory}%</p></div>
              <div className="rounded-md border border-border/60 bg-background/30 p-3"><p className="text-xs text-muted-foreground">Replicas</p><p className="mt-1 font-mono text-xs text-foreground">{selectedApp.replicas}</p></div>
              <div className="rounded-md border border-border/60 bg-background/30 p-3"><p className="text-xs text-muted-foreground">Last Deploy</p><p className="mt-1 font-mono text-xs text-foreground">{selectedApp.lastDeploy}</p></div>
            </div>

            <div className="rounded-md border border-border/60 bg-background/30 p-3 text-xs text-muted-foreground space-y-1">
              <p><span className="text-foreground">Org:</span> {selectedApp.org_id || "-"}</p>
              <p><span className="text-foreground">Owner:</span> {selectedApp.owner || "-"}</p>
              <p><span className="text-foreground">Region:</span> {selectedApp.region || "-"}</p>
              <p><span className="text-foreground">Namespace:</span> {selectedApp.namespace || "-"}</p>
              <p><span className="text-foreground">Cluster:</span> {selectedApp.cluster || "-"}</p>
              <p><span className="text-foreground">Endpoint:</span> {selectedApp.endpoint || "-"}</p>
              <p><span className="text-foreground">Image:</span> {selectedApp.image || "-"}</p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {selectedApp.status === "running" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
              <span>Use the shutdown button to mark this application inactive in the backend.</span>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-border/60 bg-background/30 p-4 text-sm text-muted-foreground">
            No application selected.
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
