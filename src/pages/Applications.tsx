import { useState } from "react";
import { Search, Filter, Rocket, RotateCcw, ExternalLink } from "lucide-react";

interface App {
  name: string;
  env: string;
  version: string;
  status: "running" | "stopped" | "deploying" | "error";
  cpu: number;
  memory: number;
  replicas: string;
  lastDeploy: string;
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
  const filtered = apps.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground">{apps.length} services across all environments</p>
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
                <tr key={app.name} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-4">
                    <button className="font-medium text-foreground hover:text-primary transition-colors font-mono text-xs flex items-center gap-1.5">
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
                      <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors" title="Deploy">
                        <Rocket className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-warning transition-colors" title="Rollback">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
