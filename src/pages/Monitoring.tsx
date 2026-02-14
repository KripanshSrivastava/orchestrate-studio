import { useState } from "react";
import { Activity, Search, Filter, BarChart3, FileText, GitBranch, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const requestRateData = Array.from({ length: 60 }, (_, i) => ({
  time: `${i}m`,
  value: 800 + Math.random() * 400 + (i > 20 && i < 40 ? 200 : 0),
}));

const errorRateData = Array.from({ length: 60 }, (_, i) => ({
  time: `${i}m`,
  value: 0.5 + Math.random() * 2 + (i === 32 ? 8 : 0),
}));

const latencyData = Array.from({ length: 60 }, (_, i) => ({
  time: `${i}m`,
  p50: 30 + Math.random() * 20,
  p99: 80 + Math.random() * 60,
}));

const logs = [
  { time: "12:34:21.432", level: "info", service: "api-gateway", message: "GET /api/v1/users 200 - 42ms" },
  { time: "12:34:21.128", level: "warn", service: "payment-svc", message: "Retry attempt 2/3 for payment processing" },
  { time: "12:34:20.891", level: "error", service: "payment-svc", message: "Connection timeout to stripe API after 30000ms" },
  { time: "12:34:20.654", level: "info", service: "auth-service", message: "Token refresh successful for user_id=a3f2c1d" },
  { time: "12:34:20.321", level: "info", service: "order-service", message: "Order #12847 created successfully" },
  { time: "12:34:19.987", level: "debug", service: "user-service", message: "Cache hit for user profile lookup" },
  { time: "12:34:19.654", level: "error", service: "payment-svc", message: "Failed to process payment: insufficient funds" },
  { time: "12:34:19.321", level: "info", service: "api-gateway", message: "POST /api/v1/orders 201 - 128ms" },
  { time: "12:34:18.987", level: "warn", service: "notification", message: "Email queue depth exceeding threshold: 150/100" },
  { time: "12:34:18.654", level: "info", service: "analytics-svc", message: "Batch processing completed: 1,247 events" },
];

const alerts = [
  { title: "High CPU usage on payment-svc", severity: "critical", time: "5m ago", acked: false },
  { title: "Error rate spike on api-gateway", severity: "warning", time: "12m ago", acked: false },
  { title: "Disk usage > 85% on rds-prod", severity: "warning", time: "1h ago", acked: true },
  { title: "Certificate expiring in 7 days", severity: "info", time: "2h ago", acked: false },
];

const logLevelStyle: Record<string, string> = {
  info: "text-info",
  warn: "text-warning",
  error: "text-destructive",
  debug: "text-muted-foreground",
};

const alertSeverityStyle: Record<string, { bg: string; icon: React.ElementType }> = {
  critical: { bg: "bg-destructive/10 border-destructive/30", icon: XCircle },
  warning: { bg: "bg-warning/10 border-warning/30", icon: AlertTriangle },
  info: { bg: "bg-info/10 border-info/30", icon: Activity },
};

type Tab = "metrics" | "logs" | "alerts";

export default function Monitoring() {
  const [tab, setTab] = useState<Tab>("metrics");

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Monitoring
          </h1>
          <p className="text-sm text-muted-foreground">Real-time system observability</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: "metrics", label: "Metrics", icon: BarChart3 },
          { key: "logs", label: "Logs", icon: FileText },
          { key: "alerts", label: "Alerts", icon: AlertTriangle, count: 2 },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {"count" in t && t.count && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "metrics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-panel p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Request Rate (req/s)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={requestRateData}>
                <defs>
                  <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(187, 80%, 48%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(187, 80%, 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 16%)", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="value" stroke="hsl(187, 80%, 48%)" fill="url(#reqGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-panel p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Error Rate (%)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={errorRateData}>
                <defs>
                  <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 16%)", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="value" stroke="hsl(0, 72%, 51%)" fill="url(#errGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-panel p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-3">Latency (ms) — P50 vs P99</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={latencyData}>
                <defs>
                  <linearGradient id="p50Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="p99Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 16%)", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="p50" stroke="hsl(142, 71%, 45%)" fill="url(#p50Grad)" strokeWidth={2} />
                <Area type="monotone" dataKey="p99" stroke="hsl(38, 92%, 50%)" fill="url(#p99Grad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "logs" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input placeholder="Search logs..." className="w-full bg-secondary border-0 rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-sm text-foreground hover:bg-accent transition-colors">
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>
          <div className="glass-panel font-mono text-xs overflow-hidden">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2 border-b border-border/30 hover:bg-accent/20 transition-colors">
                <span className="text-muted-foreground shrink-0 w-24">{log.time}</span>
                <span className={`shrink-0 w-12 font-semibold uppercase ${logLevelStyle[log.level]}`}>{log.level}</span>
                <span className="text-primary shrink-0 w-28">{log.service}</span>
                <span className="text-foreground">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "alerts" && (
        <div className="space-y-3">
          {alerts.map((alert, i) => {
            const style = alertSeverityStyle[alert.severity];
            return (
              <div key={i} className={`glass-panel p-4 border ${style.bg} flex items-center gap-4`}>
                <style.icon className={`w-5 h-5 shrink-0 ${alert.severity === "critical" ? "text-destructive" : alert.severity === "warning" ? "text-warning" : "text-info"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {alert.time}</p>
                </div>
                {alert.acked ? (
                  <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged</span>
                ) : (
                  <button className="px-3 py-1 rounded-md bg-secondary text-xs text-foreground hover:bg-accent transition-colors">Acknowledge</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
