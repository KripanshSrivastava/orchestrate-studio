import { Shield, AlertTriangle, Bug, FileWarning, CheckCircle2 } from "lucide-react";

const vulnSummary = [
  { label: "Critical", count: 2, color: "bg-destructive text-destructive-foreground" },
  { label: "High", count: 5, color: "bg-warning text-warning-foreground" },
  { label: "Medium", count: 12, color: "bg-info text-info-foreground" },
  { label: "Low", count: 23, color: "bg-muted text-muted-foreground" },
];

const findings = [
  { type: "SAST", title: "SQL Injection in user-service", severity: "critical", file: "src/db/queries.ts:42", tool: "SonarQube" },
  { type: "Container", title: "CVE-2024-3094 in xz-utils", severity: "critical", file: "api-gateway:latest", tool: "Trivy" },
  { type: "SAST", title: "Hardcoded API key detected", severity: "high", file: "src/config/stripe.ts:8", tool: "SonarQube" },
  { type: "Policy", title: "Container running as root", severity: "high", file: "payment-svc/Dockerfile", tool: "OPA" },
  { type: "Container", title: "CVE-2024-21626 in runc", severity: "high", file: "order-service:v1.5.3", tool: "Trivy" },
  { type: "SAST", title: "XSS vulnerability in template", severity: "medium", file: "src/views/profile.tsx:115", tool: "SonarQube" },
  { type: "Policy", title: "Missing resource limits", severity: "medium", file: "k8s/deploy.yaml", tool: "OPA" },
  { type: "Container", title: "Outdated base image (node:16)", severity: "medium", file: "auth-service:v2.0.0", tool: "Trivy" },
];

const severityStyle: Record<string, { badge: string; icon: React.ElementType }> = {
  critical: { badge: "bg-destructive/15 text-destructive", icon: AlertTriangle },
  high: { badge: "bg-warning/15 text-warning", icon: AlertTriangle },
  medium: { badge: "bg-info/15 text-info", icon: Bug },
  low: { badge: "bg-muted text-muted-foreground", icon: FileWarning },
};

const typeIcon: Record<string, string> = {
  SAST: "🔍",
  Container: "📦",
  Policy: "📋",
};

export default function Security() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Security Center
          </h1>
          <p className="text-sm text-muted-foreground">Vulnerability assessment and policy compliance</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-success" /> Last scan: 12 minutes ago
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {vulnSummary.map((v) => (
          <div key={v.label} className="metric-card flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${v.color}`}>
              {v.count}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{v.label}</p>
              <p className="text-xs text-muted-foreground">vulnerabilities</p>
            </div>
          </div>
        ))}
      </div>

      {/* Findings Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Active Findings</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b border-border bg-secondary/30">
              <th className="text-left py-3 px-4 font-medium">Type</th>
              <th className="text-left py-3 px-4 font-medium">Finding</th>
              <th className="text-left py-3 px-4 font-medium">Severity</th>
              <th className="text-left py-3 px-4 font-medium">Location</th>
              <th className="text-left py-3 px-4 font-medium">Scanner</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f, i) => {
              const s = severityStyle[f.severity];
              return (
                <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-4 text-xs">{typeIcon[f.type]} {f.type}</td>
                  <td className="py-3 px-4 text-foreground text-xs font-medium">{f.title}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${s.badge}`}>{f.severity}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{f.file}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{f.tool}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
