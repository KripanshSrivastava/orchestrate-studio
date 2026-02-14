import {
  Container,
  GitBranch,
  Rocket,
  AlertTriangle,
  Shield,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar } from "recharts";

const cpuData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  value: 30 + Math.random() * 40 + (i > 8 && i < 18 ? 15 : 0),
}));

const memoryData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  value: 50 + Math.random() * 25,
}));

const deployData = [
  { day: "Mon", success: 12, failed: 1 },
  { day: "Tue", success: 8, failed: 0 },
  { day: "Wed", success: 15, failed: 2 },
  { day: "Thu", success: 10, failed: 1 },
  { day: "Fri", success: 18, failed: 0 },
  { day: "Sat", success: 3, failed: 0 },
  { day: "Sun", success: 2, failed: 0 },
];

const stats = [
  { label: "Running Services", value: "24", change: "+2", up: true, icon: Container, color: "text-success" },
  { label: "Active Pipelines", value: "8", change: "+1", up: true, icon: GitBranch, color: "text-info" },
  { label: "Deployments Today", value: "12", change: "+5", up: true, icon: Rocket, color: "text-primary" },
  { label: "Active Alerts", value: "3", change: "-2", up: false, icon: AlertTriangle, color: "text-warning" },
  { label: "Vulnerabilities", value: "7", change: "+3", up: true, icon: Shield, color: "text-destructive" },
  { label: "Avg Response Time", value: "142ms", change: "-12ms", up: false, icon: Activity, color: "text-success" },
];

const recentDeployments = [
  { app: "api-gateway", env: "prod", version: "v2.4.1", status: "success", time: "5m ago" },
  { app: "user-service", env: "stage", version: "v1.8.0", status: "running", time: "12m ago" },
  { app: "payment-svc", env: "prod", version: "v3.1.2", status: "failed", time: "28m ago" },
  { app: "notification", env: "dev", version: "v0.9.4", status: "success", time: "1h ago" },
  { app: "auth-service", env: "prod", version: "v2.0.0", status: "success", time: "2h ago" },
];

const statusDot: Record<string, string> = {
  success: "status-dot-success",
  running: "status-dot-running",
  failed: "status-dot-error",
};
const envBadge: Record<string, string> = {
  prod: "env-prod",
  stage: "env-stage",
  dev: "env-dev",
};

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Control Plane</h1>
          <p className="text-sm text-muted-foreground">Platform health and deployment overview</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="status-dot-success" />
          <span className="text-sm text-muted-foreground">All systems operational</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <div className={`flex items-center gap-0.5 text-xs ${s.up ? (s.label.includes("Vulnerabilities") || s.label.includes("Alerts") ? "text-destructive" : "text-success") : "text-success"}`}>
                {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {s.change}
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-panel p-4 lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground mb-3">CPU Usage (24h)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={cpuData}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(187, 80%, 48%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(187, 80%, 48%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 16%)", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(215, 25%, 90%)" }}
              />
              <Area type="monotone" dataKey="value" stroke="hsl(187, 80%, 48%)" fill="url(#cpuGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel p-4 lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground mb-3">Memory Usage (24h)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={memoryData}>
              <defs>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 16%)", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(215, 25%, 90%)" }}
              />
              <Area type="monotone" dataKey="value" stroke="hsl(142, 71%, 45%)" fill="url(#memGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel p-4 lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground mb-3">Deployments (7d)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={deployData}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 16%)", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(215, 25%, 90%)" }}
              />
              <Bar dataKey="success" fill="hsl(142, 71%, 45%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="failed" fill="hsl(0, 72%, 51%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Deployments */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Recent Deployments</h3>
          <button className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <TrendingUp className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                <th className="text-left py-2 px-3 font-medium">Service</th>
                <th className="text-left py-2 px-3 font-medium">Environment</th>
                <th className="text-left py-2 px-3 font-medium">Version</th>
                <th className="text-left py-2 px-3 font-medium">Status</th>
                <th className="text-left py-2 px-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentDeployments.map((d, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-foreground font-mono text-xs">{d.app}</td>
                  <td className="py-2.5 px-3"><span className={envBadge[d.env]}>{d.env.toUpperCase()}</span></td>
                  <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">{d.version}</td>
                  <td className="py-2.5 px-3">
                    <span className="flex items-center gap-1.5">
                      <span className={statusDot[d.status]} />
                      <span className="text-xs capitalize">{d.status}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground text-xs">{d.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
