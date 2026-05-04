import { useMemo, useState } from "react";
import { CheckCircle2, Clock, GitBranch, Play, RefreshCw, Search, XCircle } from "lucide-react";

const pipelineRows = [
  { id: 1, name: "Orcestra Demo Pipeline", repo: "orchestrate-studio", branch: "main", status: "running", stage: "security-scan", duration: "6m 12s", lastRun: "now" },
  { id: 2, name: "api-gateway-ci", repo: "api-gateway", branch: "release/v2.4", status: "success", stage: "complete", duration: "9m 44s", lastRun: "18m ago" },
  { id: 3, name: "payment-svc-release", repo: "payment-svc", branch: "main", status: "failed", stage: "deploy-prod", duration: "14m 02s", lastRun: "42m ago" },
  { id: 4, name: "frontend-preview", repo: "web-console", branch: "feat/docs", status: "queued", stage: "waiting", duration: "-", lastRun: "1h ago" },
  { id: 5, name: "nightly-container-scan", repo: "platform-images", branch: "main", status: "success", stage: "complete", duration: "21m 30s", lastRun: "6h ago" },
];

const statusMeta = {
  running: { icon: Clock, className: "text-warning", label: "Running" },
  queued: { icon: Clock, className: "text-info", label: "Queued" },
  success: { icon: CheckCircle2, className: "text-success", label: "Success" },
  failed: { icon: XCircle, className: "text-destructive", label: "Failed" },
};

export default function Pipelines() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [runs, setRuns] = useState(pipelineRows);

  const filtered = useMemo(() => runs.filter((pipeline) => {
    const matchesQuery = `${pipeline.name} ${pipeline.repo} ${pipeline.branch}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || pipeline.status === status;
    return matchesQuery && matchesStatus;
  }), [query, runs, status]);

  const rerun = (id: number) => {
    setRuns((rows) => rows.map((row) => row.id === id ? { ...row, status: "running", stage: "queued-by-user", lastRun: "now", duration: "0m 01s" } : row));
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-primary" /> Pipelines
          </h1>
          <p className="text-sm text-muted-foreground">Trigger, inspect, and rerun CI/CD workflows.</p>
        </div>
        <button onClick={() => rerun(1)} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Play className="w-4 h-4" /> Run Demo Pipeline
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pipelines..." className="w-full rounded-lg bg-secondary py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All statuses</option>
          <option value="running">Running</option>
          <option value="queued">Queued</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Pipeline</th>
              <th className="px-4 py-3 text-left font-medium">Repository</th>
              <th className="px-4 py-3 text-left font-medium">Branch</th>
              <th className="px-4 py-3 text-left font-medium">Stage</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Duration</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pipeline) => {
              const meta = statusMeta[pipeline.status as keyof typeof statusMeta];
              return (
                <tr key={pipeline.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium text-foreground">{pipeline.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{pipeline.repo}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{pipeline.branch}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{pipeline.stage}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${meta.className}`}>
                      <meta.icon className="h-3.5 w-3.5" /> {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{pipeline.duration}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => rerun(pipeline.id)} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-foreground hover:bg-accent">
                      <RefreshCw className="h-3.5 w-3.5" /> Rerun
                    </button>
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
