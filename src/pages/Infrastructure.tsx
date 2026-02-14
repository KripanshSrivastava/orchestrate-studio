import { Server, Cpu, HardDrive, MemoryStick, Cloud, ArrowUpDown, Settings } from "lucide-react";

const resources = [
  { name: "k8s-prod-cluster", type: "Kubernetes", provider: "AWS EKS", region: "us-east-1", nodes: 6, status: "healthy" },
  { name: "k8s-stage-cluster", type: "Kubernetes", provider: "AWS EKS", region: "us-east-1", nodes: 3, status: "healthy" },
  { name: "rds-prod-primary", type: "RDS PostgreSQL", provider: "AWS", region: "us-east-1", nodes: 2, status: "healthy" },
  { name: "redis-prod", type: "ElastiCache", provider: "AWS", region: "us-east-1", nodes: 3, status: "healthy" },
  { name: "cdn-global", type: "CloudFront", provider: "AWS", region: "Global", nodes: 1, status: "degraded" },
];

const terraformModules = [
  { name: "vpc-production", status: "applied", resources: 24, lastRun: "2h ago", drift: false },
  { name: "eks-cluster", status: "applied", resources: 42, lastRun: "1d ago", drift: false },
  { name: "rds-databases", status: "applied", resources: 8, lastRun: "3d ago", drift: true },
  { name: "monitoring-stack", status: "planning", resources: 15, lastRun: "5m ago", drift: false },
];

const hpaConfigs = [
  { name: "api-gateway", minReplicas: 2, maxReplicas: 10, currentReplicas: 3, targetCPU: 70, currentCPU: 42 },
  { name: "user-service", minReplicas: 2, maxReplicas: 6, currentReplicas: 2, targetCPU: 75, currentCPU: 28 },
  { name: "order-service", minReplicas: 3, maxReplicas: 12, currentReplicas: 4, targetCPU: 65, currentCPU: 52 },
  { name: "payment-svc", minReplicas: 2, maxReplicas: 8, currentReplicas: 3, targetCPU: 60, currentCPU: 85 },
];

const tfStatus: Record<string, { badge: string; label: string }> = {
  applied: { badge: "bg-success/15 text-success", label: "Applied" },
  planning: { badge: "bg-info/15 text-info", label: "Planning" },
  failed: { badge: "bg-destructive/15 text-destructive", label: "Failed" },
};

export default function Infrastructure() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Server className="w-6 h-6 text-primary" /> Infrastructure
        </h1>
        <p className="text-sm text-muted-foreground">Resource management and scaling configuration</p>
      </div>

      {/* Resource Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {resources.map((r) => (
          <div key={r.name} className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{r.name}</span>
              </div>
              <span className={`status-dot ${r.status === "healthy" ? "bg-success" : "bg-warning"}`} />
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Type</span><span className="text-foreground">{r.type}</span></div>
              <div className="flex justify-between"><span>Provider</span><span className="text-foreground">{r.provider}</span></div>
              <div className="flex justify-between"><span>Region</span><span className="text-foreground font-mono">{r.region}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Terraform Modules */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Terraform Modules</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b border-border bg-secondary/30">
              <th className="text-left py-3 px-4 font-medium">Module</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
              <th className="text-left py-3 px-4 font-medium">Resources</th>
              <th className="text-left py-3 px-4 font-medium">Last Run</th>
              <th className="text-left py-3 px-4 font-medium">Drift</th>
            </tr>
          </thead>
          <tbody>
            {terraformModules.map((m) => (
              <tr key={m.name} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                <td className="py-3 px-4 font-mono text-xs text-foreground font-medium">{m.name}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${tfStatus[m.status].badge}`}>{tfStatus[m.status].label}</span>
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">{m.resources}</td>
                <td className="py-3 px-4 text-xs text-muted-foreground">{m.lastRun}</td>
                <td className="py-3 px-4">
                  {m.drift ? <span className="text-xs text-warning font-medium">⚠ Drift detected</span> : <span className="text-xs text-success">✓ In sync</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HPA Config */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Horizontal Pod Autoscaler</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b border-border bg-secondary/30">
              <th className="text-left py-3 px-4 font-medium">Service</th>
              <th className="text-left py-3 px-4 font-medium">Min</th>
              <th className="text-left py-3 px-4 font-medium">Max</th>
              <th className="text-left py-3 px-4 font-medium">Current</th>
              <th className="text-left py-3 px-4 font-medium">Target CPU</th>
              <th className="text-left py-3 px-4 font-medium">Current CPU</th>
            </tr>
          </thead>
          <tbody>
            {hpaConfigs.map((h) => (
              <tr key={h.name} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                <td className="py-3 px-4 font-mono text-xs text-foreground font-medium">{h.name}</td>
                <td className="py-3 px-4 text-xs text-muted-foreground">{h.minReplicas}</td>
                <td className="py-3 px-4 text-xs text-muted-foreground">{h.maxReplicas}</td>
                <td className="py-3 px-4 text-xs text-foreground font-medium">{h.currentReplicas}</td>
                <td className="py-3 px-4 text-xs text-muted-foreground">{h.targetCPU}%</td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-mono font-medium ${h.currentCPU > h.targetCPU ? "text-destructive" : "text-success"}`}>
                    {h.currentCPU}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
