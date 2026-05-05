import { useMemo, useState, useEffect } from "react";
import { CheckCircle2, Clock, GitBranch, Play, RefreshCw, Search, XCircle } from "lucide-react";
import { PipelineTemplateDialog } from "@/components/PipelineTemplateDialog";
import { apiGet, apiPost } from "@/lib/apiClient";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const statusMeta = {
  running: { icon: Clock, className: "text-warning", label: "Running" },
  pending: { icon: Clock, className: "text-info", label: "Queued" },
  queued: { icon: Clock, className: "text-info", label: "Queued" },
  success: { icon: CheckCircle2, className: "text-success", label: "Success" },
  failed: { icon: XCircle, className: "text-destructive", label: "Failed" },
};

function formatDuration(start: string, end: string | null) {
  if (!start) return "-";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diff = Math.floor((e - s) / 1000);
  if (diff < 60) return `${diff}s`;
  const m = Math.floor(diff / 60);
  const rs = diff % 60;
  return `${m}m ${rs}s`;
}

function timeAgo(date: string) {
  if (!date) return "now";
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function Pipelines() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = async () => {
    try {
      const res = await apiGet<{success: boolean, data: any[]}>(`${API_BASE}/api/runs`);
      if (res.success) {
        setRuns(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch runs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => runs.filter((run) => {
    const runName = run.workflow_name || 'Workflow Run';
    const repo = run.input?.repo || '';
    const branch = run.input?.branch || '';
    const searchString = `${runName} ${repo} ${branch}`.toLowerCase();
    
    const matchesQuery = searchString.includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || run.status === statusFilter;
    return matchesQuery && matchesStatus;
  }), [query, runs, statusFilter]);

  const rerun = async (workflowId: string) => {
    try {
      toast.info("Triggering run...");
      const res = await apiPost<{success: boolean}>(`${API_BASE}/api/workflows/${workflowId}/execute`);
      if (res.success) {
        toast.success("Workflow executed");
        fetchRuns();
      }
    } catch (e) {
      toast.error("Failed to rerun workflow");
    }
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
        <PipelineTemplateDialog />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pipelines..." className="w-full rounded-lg bg-secondary py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
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
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Duration</th>
              <th className="px-4 py-3 text-left font-medium">Started</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((run) => {
              const meta = statusMeta[run.status as keyof typeof statusMeta] || statusMeta.queued;
              const duration = formatDuration(run.started_at, run.finished_at);
              const lastRun = timeAgo(run.started_at);
              return (
                <tr key={run.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium text-foreground">{run.workflow_name || 'Workflow Run'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{run.input?.repo || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{run.input?.branch || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${meta.className}`}>
                      <meta.icon className="h-3.5 w-3.5" /> {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{duration}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{lastRun}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => rerun(run.workflow_id)} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-foreground hover:bg-accent">
                      <RefreshCw className="h-3.5 w-3.5" /> Rerun
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No pipelines found. Try running a new template.
                </td>
              </tr>
            )}
            {loading && runs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Loading pipelines...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
