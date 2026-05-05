import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Cloud,
  Container,
  GitBranch,
  RefreshCw,
  Rocket,
  Shield,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiGet } from "@/lib/apiClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

type ExecutionRun = {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: string;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
  started_at: string;
  finished_at?: string | null;
};

type IntegrationState = {
  connected: boolean;
  values?: Record<string, string>;
  verification?: {
    healthy?: boolean;
    message?: string;
  };
};

type AwsConnection = {
  id: string;
  name?: string;
  account_id?: string;
  region?: string;
  status?: string;
};

type ProvisioningJob = {
  id: string;
  status: string;
  approval_status?: string;
  source?: string;
  created_at: string;
  updated_at?: string;
  error_message?: string;
};

type DashboardData = {
  runs: ExecutionRun[];
  integrations: Record<string, IntegrationState>;
  awsConnections: AwsConnection[];
  provisioningJobs: ProvisioningJob[];
};

const emptyData: DashboardData = {
  runs: [],
  integrations: {},
  awsConnections: [],
  provisioningJobs: [],
};

const statusDot: Record<string, string> = {
  success: "status-dot-success",
  running: "status-dot-running",
  pending: "status-dot-running",
  queued: "status-dot-running",
  failed: "status-dot-error",
};

const statusColors: Record<string, string> = {
  success: "hsl(142, 71%, 45%)",
  running: "hsl(187, 80%, 48%)",
  pending: "hsl(220, 80%, 58%)",
  queued: "hsl(220, 80%, 58%)",
  failed: "hsl(0, 72%, 51%)",
};

function timeAgo(date: string) {
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return "-";

  const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDuration(run: ExecutionRun) {
  const start = new Date(run.started_at).getTime();
  const end = run.finished_at ? new Date(run.finished_at).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "-";

  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function isToday(date: string) {
  const value = new Date(date);
  const now = new Date();
  return value.toDateString() === now.toDateString();
}

function dayLabel(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    setError("");

    try {
      const [runsResult, integrationsResult, awsResult, jobsResult] = await Promise.allSettled([
        apiGet<{ success: boolean; data: ExecutionRun[] }>(`${API_BASE}/api/runs`),
        apiGet<{ success: boolean; state: Record<string, IntegrationState> }>(`${API_BASE}/api/integrations`),
        apiGet<{ success: boolean; connections: AwsConnection[] }>(`${API_BASE}/api/provisioning/aws/connections`),
        apiGet<{ success: boolean; jobs: ProvisioningJob[] }>(`${API_BASE}/api/provisioning/jobs`),
      ]);

      setData({
        runs: runsResult.status === "fulfilled" ? runsResult.value.data || [] : [],
        integrations: integrationsResult.status === "fulfilled" ? integrationsResult.value.state || {} : {},
        awsConnections: awsResult.status === "fulfilled" ? awsResult.value.connections || [] : [],
        provisioningJobs: jobsResult.status === "fulfilled" ? jobsResult.value.jobs || [] : [],
      });

      const failures = [runsResult, integrationsResult, awsResult, jobsResult].filter((item) => item.status === "rejected");
      if (failures.length > 0) {
        setError(`${failures.length} dashboard source${failures.length > 1 ? "s" : ""} could not be loaded.`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = window.setInterval(fetchDashboard, 10000);
    return () => window.clearInterval(interval);
  }, []);

  const connectedIntegrations = useMemo(
    () => Object.values(data.integrations).filter((item) => item.connected).length,
    [data.integrations]
  );

  const unhealthyIntegrations = useMemo(
    () => Object.values(data.integrations).filter((item) => item.verification && item.verification.healthy === false).length,
    [data.integrations]
  );

  const activeRuns = data.runs.filter((run) => ["pending", "queued", "running"].includes(run.status)).length;
  const failedToday = data.runs.filter((run) => run.status === "failed" && isToday(run.started_at)).length;
  const successToday = data.runs.filter((run) => run.status === "success" && isToday(run.started_at)).length;
  const jobsActive = data.provisioningJobs.filter((job) => !["applied", "failed", "cancelled"].includes(job.status)).length;

  const completedRuns = data.runs.filter((run) => run.finished_at);
  const avgDurationSeconds = completedRuns.length
    ? Math.round(
        completedRuns.reduce((total, run) => {
          const start = new Date(run.started_at).getTime();
          const end = new Date(run.finished_at || run.started_at).getTime();
          return total + Math.max(0, end - start) / 1000;
        }, 0) / completedRuns.length
      )
    : 0;

  const stats = [
    {
      label: "AWS Connections",
      value: String(data.awsConnections.length),
      change: jobsActive ? `${jobsActive} active job${jobsActive === 1 ? "" : "s"}` : "stable",
      up: jobsActive > 0,
      icon: Cloud,
      color: "text-primary",
    },
    {
      label: "Active Pipelines",
      value: String(activeRuns),
      change: `${data.runs.length} total`,
      up: activeRuns > 0,
      icon: GitBranch,
      color: "text-info",
    },
    {
      label: "Successful Today",
      value: String(successToday),
      change: failedToday ? `${failedToday} failed` : "no failures",
      up: successToday > 0,
      icon: Rocket,
      color: "text-success",
    },
    {
      label: "Failed Today",
      value: String(failedToday),
      change: failedToday ? "needs review" : "clear",
      up: failedToday > 0,
      icon: AlertTriangle,
      color: failedToday ? "text-destructive" : "text-success",
    },
    {
      label: "Integrations",
      value: String(connectedIntegrations),
      change: unhealthyIntegrations ? `${unhealthyIntegrations} unhealthy` : "healthy",
      up: unhealthyIntegrations > 0,
      icon: Shield,
      color: unhealthyIntegrations ? "text-warning" : "text-success",
    },
    {
      label: "Avg Run Time",
      value: avgDurationSeconds ? `${avgDurationSeconds}s` : "-",
      change: `${completedRuns.length} complete`,
      up: false,
      icon: Activity,
      color: "text-success",
    },
  ];

  const runTrend = useMemo(() => {
    return Array.from({ length: 7 }, (_, offset) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - offset));
      const label = dayLabel(6 - offset);
      const runs = data.runs.filter((run) => new Date(run.started_at).toDateString() === day.toDateString());
      return {
        day: label,
        success: runs.filter((run) => run.status === "success").length,
        failed: runs.filter((run) => run.status === "failed").length,
        active: runs.filter((run) => ["pending", "queued", "running"].includes(run.status)).length,
      };
    });
  }, [data.runs]);

  const statusBreakdown = useMemo(() => {
    const counts = data.runs.reduce<Record<string, number>>((acc, run) => {
      acc[run.status] = (acc[run.status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [data.runs]);

  const provisioningTrend = useMemo(() => {
    const counts = data.provisioningJobs.reduce<Record<string, number>>((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [data.provisioningJobs]);

  const recentRuns = data.runs.slice(0, 6);
  const platformHealthy = failedToday === 0 && unhealthyIntegrations === 0;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Control Plane</h1>
          <p className="text-sm text-muted-foreground">
            Live platform overview from pipeline, integration, and AWS provisioning data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={platformHealthy ? "status-dot-success" : "status-dot-error"} />
            <span className="text-sm text-muted-foreground">
              {platformHealthy ? "Operational" : "Needs attention"}
            </span>
          </div>
          <button
            onClick={fetchDashboard}
            className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs text-foreground hover:bg-accent"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-md border border-border/60 bg-card/50 px-3 py-2 text-sm text-muted-foreground">
          Loading dashboard data...
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <div className={`flex items-center gap-0.5 text-xs ${s.up ? "text-warning" : "text-success"}`}>
                {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {s.change}
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-panel p-4 lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground mb-3">Pipeline Runs (7d)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={runTrend}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 16%)", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(215, 25%, 90%)" }}
              />
              <Bar dataKey="success" stackId="runs" fill="hsl(142, 71%, 45%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="failed" stackId="runs" fill="hsl(0, 72%, 51%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="active" stackId="runs" fill="hsl(187, 80%, 48%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel p-4 lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground mb-3">Run Status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusBreakdown} dataKey="count" nameKey="status" innerRadius={45} outerRadius={70} paddingAngle={3}>
                {statusBreakdown.map((entry) => (
                  <Cell key={entry.status} fill={statusColors[entry.status] || "hsl(215, 15%, 45%)"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 16%)", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(215, 25%, 90%)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          {statusBreakdown.length === 0 && (
            <p className="-mt-24 pb-20 text-center text-xs text-muted-foreground">No pipeline runs yet</p>
          )}
        </div>

        <div className="glass-panel p-4 lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground mb-3">Provisioning Jobs</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={provisioningTrend.length ? provisioningTrend : [{ status: "none", count: 0 }]}>
              <XAxis dataKey="status" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 35%)" tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 16%)", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(215, 25%, 90%)" }}
              />
              <Bar dataKey="count" fill="hsl(187, 80%, 48%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Recent Workflow Runs</h3>
            <button onClick={() => navigate("/pipelines")} className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <TrendingUp className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                  <th className="text-left py-2 px-3 font-medium">Workflow</th>
                  <th className="text-left py-2 px-3 font-medium">Repository</th>
                  <th className="text-left py-2 px-3 font-medium">Branch</th>
                  <th className="text-left py-2 px-3 font-medium">Status</th>
                  <th className="text-left py-2 px-3 font-medium">Duration</th>
                  <th className="text-left py-2 px-3 font-medium">Started</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground font-mono text-xs">
                      {run.workflow_name || "Workflow Run"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">
                      {String(run.input?.repo || "-")}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">
                      {String(run.input?.branch || "-")}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="flex items-center gap-1.5">
                        <span className={statusDot[run.status] || "status-dot-running"} />
                        <span className="text-xs capitalize">{run.status}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs">{formatDuration(run)}</td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs">{timeAgo(run.started_at)}</td>
                  </tr>
                ))}
                {recentRuns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      No workflow runs found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">System Signals</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-md border border-border/60 bg-background/20 p-3">
              <Container className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{data.awsConnections.length} AWS connection(s)</p>
                <p className="text-xs text-muted-foreground">Loaded from provisioning connections.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border border-border/60 bg-background/20 p-3">
              {unhealthyIntegrations ? <XCircle className="mt-0.5 h-4 w-4 text-warning" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {unhealthyIntegrations ? `${unhealthyIntegrations} integration issue(s)` : "Integrations healthy"}
                </p>
                <p className="text-xs text-muted-foreground">Based on saved integration verification state.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border border-border/60 bg-background/20 p-3">
              {failedToday ? <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {failedToday ? `${failedToday} failed run(s) today` : "No failed runs today"}
                </p>
                <p className="text-xs text-muted-foreground">From execution run status history.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
