import { useState } from "react";
import { CheckCircle2, Clock, Rocket, RotateCcw, ShieldCheck, XCircle } from "lucide-react";

const initialDeployments = [
  { id: 1, service: "api-gateway", env: "prod", version: "v2.4.1", status: "healthy", strategy: "rolling", approved: true, time: "5m ago" },
  { id: 2, service: "user-service", env: "stage", version: "v1.8.0", status: "progressing", strategy: "canary", approved: true, time: "12m ago" },
  { id: 3, service: "payment-svc", env: "prod", version: "v3.1.2", status: "failed", strategy: "blue-green", approved: false, time: "28m ago" },
  { id: 4, service: "notification", env: "dev", version: "v0.9.4", status: "healthy", strategy: "rolling", approved: true, time: "1h ago" },
];

const statusMeta = {
  healthy: { icon: CheckCircle2, className: "text-success", label: "Healthy" },
  progressing: { icon: Clock, className: "text-warning", label: "Progressing" },
  failed: { icon: XCircle, className: "text-destructive", label: "Failed" },
};

const envBadge: Record<string, string> = {
  prod: "env-prod",
  stage: "env-stage",
  dev: "env-dev",
};

export default function Deployments() {
  const [deployments, setDeployments] = useState(initialDeployments);

  const promote = (id: number) => {
    setDeployments((rows) => rows.map((row) => row.id === id ? { ...row, env: "prod", status: "progressing", approved: true, time: "now" } : row));
  };

  const rollback = (id: number) => {
    setDeployments((rows) => rows.map((row) => row.id === id ? { ...row, version: `${row.version}-rollback`, status: "progressing", time: "now" } : row));
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Rocket className="w-6 h-6 text-primary" /> Deployments
          </h1>
          <p className="text-sm text-muted-foreground">Promote, rollback, and inspect environment rollout state.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="metric-card"><p className="text-2xl font-bold text-foreground">{deployments.length}</p><p className="text-xs text-muted-foreground">Active deployments</p></div>
        <div className="metric-card"><p className="text-2xl font-bold text-success">{deployments.filter((d) => d.status === "healthy").length}</p><p className="text-xs text-muted-foreground">Healthy rollouts</p></div>
        <div className="metric-card"><p className="text-2xl font-bold text-destructive">{deployments.filter((d) => d.status === "failed").length}</p><p className="text-xs text-muted-foreground">Needs attention</p></div>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Service</th>
              <th className="px-4 py-3 text-left font-medium">Environment</th>
              <th className="px-4 py-3 text-left font-medium">Version</th>
              <th className="px-4 py-3 text-left font-medium">Strategy</th>
              <th className="px-4 py-3 text-left font-medium">Approval</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deployments.map((deployment) => {
              const meta = statusMeta[deployment.status as keyof typeof statusMeta];
              return (
                <tr key={deployment.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{deployment.service}</td>
                  <td className="px-4 py-3"><span className={envBadge[deployment.env]}>{deployment.env.toUpperCase()}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{deployment.version}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{deployment.strategy}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs ${deployment.approved ? "text-success" : "text-warning"}`}>
                      <ShieldCheck className="h-3.5 w-3.5" /> {deployment.approved ? "Approved" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${meta.className}`}>
                      <meta.icon className="h-3.5 w-3.5" /> {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => promote(deployment.id)} className="rounded-md bg-secondary px-2 py-1 text-xs hover:bg-accent">Promote</button>
                      <button onClick={() => rollback(deployment.id)} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs hover:bg-accent">
                        <RotateCcw className="h-3.5 w-3.5" /> Rollback
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
