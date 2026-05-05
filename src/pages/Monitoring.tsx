import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiGet } from "@/lib/apiClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

type Tab = "metrics" | "logs" | "alerts";
type RunStatus = "pending" | "queued" | "running" | "success" | "failed" | string;
type LogLevel = "info" | "warn" | "error" | "debug";

interface PipelineRun {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: RunStatus;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
  started_at?: string;
  finished_at?: string | null;
}

interface LogRow {
  time: string;
  level: LogLevel;
  service: string;
  message: string;
}

const statusTone: Record<string, string> = {
  pending: "text-info",
  queued: "text-info",
  running: "text-warning",
  success: "text-success",
  failed: "text-destructive",
};

const logLevelStyle: Record<LogLevel, string> = {
  info: "text-info",
  warn: "text-warning",
  error: "text-destructive",
  debug: "text-muted-foreground",
};

const formatTime = (value?: string | null) => {
  if (!value) return "--:--:--";
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
};

const formatDuration = (start?: string, end?: string | null) => {
  if (!start) return "-";
  const started = new Date(start).getTime();
  const finished = end ? new Date(end).getTime() : Date.now();
  const seconds = Math.max(0, Math.floor((finished - started) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const timeAgo = (value?: string | null) => {
  if (!value) return "unknown";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const getRunName = (run: PipelineRun) => run.workflow_name || `Workflow ${run.workflow_id?.slice(0, 8) || run.id.slice(0, 8)}`;

const getInitialTab = (pathname: string): Tab => {
  if (pathname.includes("logs")) return "logs";
  if (pathname.includes("alerts")) return "alerts";
  return "metrics";
};

export default function Monitoring() {
  const location = useLocation();
  const [tab, setTab] = useState<Tab>(() => getInitialTab(location.pathname));
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ackedAlerts, setAckedAlerts] = useState<Set<string>>(new Set());

  const fetchRuns = async () => {
    try {
      setError("");
      const response = await apiGet<{ success: boolean; data: PipelineRun[] }>(`${API_BASE}/api/runs`);
      setRuns(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline runs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTab(getInitialTab(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    fetchRuns();
    const interval = window.setInterval(fetchRuns, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const logs = useMemo<LogRow[]>(() => {
    const rows = runs.flatMap((run) => {
      const name = getRunName(run);
      const base: LogRow[] = [
        {
          time: formatTime(run.started_at),
          level: run.status === "failed" ? "error" : run.status === "running" ? "warn" : "info",
          service: "workflow-runner",
          message: `${name} is ${run.status}. Duration ${formatDuration(run.started_at, run.finished_at)}.`,
        },
      ];

      if (run.error) {
        base.push({
          time: formatTime(run.finished_at || run.started_at),
          level: "error",
          service: "github-actions",
          message: run.error,
        });
      }

      const githubUrl = (run.output as any)?.githubActions?.htmlUrl;
      if (githubUrl) {
        base.push({
          time: formatTime((run.output as any)?.githubActions?.updatedAt || run.finished_at || run.started_at),
          level: "debug",
          service: "github-actions",
          message: `Remote run: ${githubUrl}`,
        });
      }

      return base;
    });

    return rows.sort((a, b) => b.time.localeCompare(a.time));
  }, [runs]);

  const filteredLogs = logs.filter((log) => {
    const matchesQuery = `${log.service} ${log.level} ${log.message}`.toLowerCase().includes(query.toLowerCase());
    const matchesLevel = level === "all" || log.level === level;
    return matchesQuery && matchesLevel;
  });

  const alerts = useMemo(
    () =>
      runs
        .filter((run) => run.status === "failed" || run.error)
        .map((run) => ({
          id: run.id,
          title: `${getRunName(run)} failed`,
          severity: "critical" as const,
          time: timeAgo(run.finished_at || run.started_at),
          detail: run.error || "GitHub Actions reported a failed workflow run.",
          acked: ackedAlerts.has(run.id),
        })),
    [ackedAlerts, runs]
  );

  const metrics = useMemo(() => {
    const total = runs.length;
    const failed = runs.filter((run) => run.status === "failed").length;
    const running = runs.filter((run) => run.status === "running" || run.status === "queued" || run.status === "pending").length;
    const success = runs.filter((run) => run.status === "success").length;
    const successRate = total ? Math.round((success / total) * 100) : 0;

    const chartRows = runs.slice(0, 12).reverse().map((run, index) => ({
      name: `Run ${index + 1}`,
      success: run.status === "success" ? 1 : 0,
      failed: run.status === "failed" ? 1 : 0,
      duration: run.started_at
        ? Math.max(1, Math.round(((run.finished_at ? new Date(run.finished_at).getTime() : Date.now()) - new Date(run.started_at).getTime()) / 1000))
        : 0,
    }));

    return { total, failed, running, success, successRate, chartRows };
  }, [runs]);

  const openAlerts = alerts.filter((alert) => !alert.acked).length;

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Monitoring
          </h1>
          <p className="text-sm text-muted-foreground">Pipeline logs, metrics, and alerts from Workflow Studio runs.</p>
        </div>
        <button onClick={fetchRuns} className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm text-foreground hover:bg-accent">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="flex gap-1 border-b border-border">
        {([
          { key: "metrics", label: "Metrics", icon: BarChart3 },
          { key: "logs", label: "Logs", icon: FileText },
          { key: "alerts", label: "Alerts", icon: AlertTriangle, count: openAlerts },
        ] as const).map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === item.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
            {"count" in item && item.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold">{item.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "metrics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              ["Total Runs", metrics.total, "text-foreground"],
              ["Running", metrics.running, "text-warning"],
              ["Successful", metrics.success, "text-success"],
              ["Failed", metrics.failed, "text-destructive"],
            ].map(([label, value, tone]) => (
              <div key={label} className="glass-panel p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-panel p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Run Outcomes</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={metrics.chartRows}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 16%)", borderRadius: "8px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="success" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="failed" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%)" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-panel p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Duration by Run (seconds)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={metrics.chartRows}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 16%)", borderRadius: "8px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="duration" stroke="hsl(187, 80%, 48%)" fill="hsl(187, 80%, 48%)" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === "logs" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search logs..." className="w-full bg-secondary border-0 rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-sm text-foreground">
              <Filter className="w-4 h-4" />
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="bg-transparent text-sm outline-none">
                <option value="all">All levels</option>
                <option value="error">Error</option>
                <option value="warn">Warn</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
          </div>
          <div className="glass-panel font-mono text-xs overflow-hidden">
            {filteredLogs.map((log, index) => (
              <div key={`${log.time}-${index}`} className="flex items-start gap-3 px-4 py-2 border-b border-border/30 hover:bg-accent/20 transition-colors">
                <span className="text-muted-foreground shrink-0 w-24">{log.time}</span>
                <span className={`shrink-0 w-12 font-semibold uppercase ${logLevelStyle[log.level]}`}>{log.level}</span>
                <span className="text-primary shrink-0 w-32">{log.service}</span>
                <span className="text-foreground">{log.message}</span>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground">{loading ? "Loading logs..." : "No logs match the current filters."}</div>
            )}
          </div>
        </div>
      )}

      {tab === "alerts" && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="glass-panel p-4 border border-destructive/30 bg-destructive/10 flex items-center gap-4">
              <XCircle className="w-5 h-5 shrink-0 text-destructive" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{alert.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="w-3 h-3" /> {alert.time}</p>
              </div>
              {alert.acked ? (
                <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged</span>
              ) : (
                <button onClick={() => setAckedAlerts((current) => new Set(current).add(alert.id))} className="px-3 py-1 rounded-md bg-secondary text-xs text-foreground hover:bg-accent transition-colors">
                  Acknowledge
                </button>
              )}
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="glass-panel p-8 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-success" />
              <p className="text-sm font-medium text-foreground">No active pipeline alerts</p>
              <p className="mt-1 text-xs text-muted-foreground">Failed workflow runs will appear here with their error message.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
