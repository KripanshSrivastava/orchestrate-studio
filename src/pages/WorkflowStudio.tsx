import { useState, useRef, useCallback } from "react";
import {
  GitBranch,
  Github,
  Gitlab,
  Box,
  Shield,
  Cloud,
  Rocket,
  Activity,
  Server,
  Settings,
  Play,
  Square,
  ChevronRight,
  X,
  FileText,
  BarChart3,
  History,
  Cpu,
  Layers,
} from "lucide-react";

// Node type definitions
interface WorkflowNodeData {
  id: string;
  type: string;
  label: string;
  icon: string;
  category: string;
  x: number;
  y: number;
  status: "idle" | "success" | "running" | "failed";
}

interface Connection {
  from: string;
  to: string;
}

const nodeLibrary = [
  {
    category: "Source",
    icon: GitBranch,
    nodes: [
      { type: "github", label: "GitHub", icon: "github" },
      { type: "gitlab", label: "GitLab", icon: "gitlab" },
    ],
  },
  {
    category: "CI",
    icon: Play,
    nodes: [
      { type: "jenkins", label: "Jenkins", icon: "ci" },
      { type: "gh-actions", label: "GitHub Actions", icon: "ci" },
    ],
  },
  {
    category: "Security",
    icon: Shield,
    nodes: [
      { type: "sonarqube", label: "SonarQube", icon: "security" },
      { type: "trivy", label: "Trivy", icon: "security" },
    ],
  },
  {
    category: "Registry",
    icon: Box,
    nodes: [
      { type: "dockerhub", label: "Docker Hub", icon: "registry" },
      { type: "harbor", label: "Harbor", icon: "registry" },
    ],
  },
  {
    category: "Deploy",
    icon: Rocket,
    nodes: [
      { type: "argocd", label: "ArgoCD", icon: "deploy" },
      { type: "fluxcd", label: "FluxCD", icon: "deploy" },
    ],
  },
  {
    category: "Kubernetes",
    icon: Cloud,
    nodes: [
      { type: "k8s-deploy", label: "Deployment", icon: "k8s" },
      { type: "k8s-hpa", label: "HPA", icon: "k8s" },
      { type: "k8s-ingress", label: "Ingress", icon: "k8s" },
    ],
  },
  {
    category: "Monitoring",
    icon: Activity,
    nodes: [
      { type: "prometheus", label: "Prometheus", icon: "monitoring" },
      { type: "grafana", label: "Grafana", icon: "monitoring" },
    ],
  },
  {
    category: "Infrastructure",
    icon: Server,
    nodes: [
      { type: "terraform", label: "Terraform", icon: "infra" },
    ],
  },
];

const nodeIconMap: Record<string, React.ElementType> = {
  github: Github,
  gitlab: Gitlab,
  ci: Play,
  security: Shield,
  registry: Box,
  deploy: Rocket,
  k8s: Cloud,
  monitoring: Activity,
  infra: Server,
};

const statusColor: Record<string, string> = {
  idle: "border-node-border",
  success: "border-success",
  running: "border-warning",
  failed: "border-destructive",
};

const statusGlow: Record<string, string> = {
  idle: "",
  success: "shadow-success/20",
  running: "shadow-warning/20 animate-pulse",
  failed: "shadow-destructive/20",
};

// Demo workflow
const initialNodes: WorkflowNodeData[] = [
  { id: "1", type: "github", label: "GitHub", icon: "github", category: "Source", x: 80, y: 200, status: "success" },
  { id: "2", type: "gh-actions", label: "GitHub Actions", icon: "ci", category: "CI", x: 300, y: 200, status: "success" },
  { id: "3", type: "sonarqube", label: "SonarQube", icon: "security", category: "Security", x: 520, y: 120, status: "success" },
  { id: "4", type: "trivy", label: "Trivy", icon: "security", category: "Security", x: 520, y: 280, status: "running" },
  { id: "5", type: "dockerhub", label: "Docker Hub", icon: "registry", category: "Registry", x: 740, y: 200, status: "idle" },
  { id: "6", type: "argocd", label: "ArgoCD", icon: "deploy", category: "Deploy", x: 960, y: 200, status: "idle" },
  { id: "7", type: "k8s-deploy", label: "K8s Deploy", icon: "k8s", category: "Kubernetes", x: 1180, y: 140, status: "idle" },
  { id: "8", type: "prometheus", label: "Prometheus", icon: "monitoring", category: "Monitoring", x: 1180, y: 280, status: "idle" },
];

const initialConnections: Connection[] = [
  { from: "1", to: "2" },
  { from: "2", to: "3" },
  { from: "2", to: "4" },
  { from: "3", to: "5" },
  { from: "4", to: "5" },
  { from: "5", to: "6" },
  { from: "6", to: "7" },
  { from: "6", to: "8" },
];

export default function WorkflowStudio() {
  const [nodes, setNodes] = useState<WorkflowNodeData[]>(initialNodes);
  const [connections] = useState<Connection[]>(initialConnections);
  const [selectedNode, setSelectedNode] = useState<WorkflowNodeData | null>(null);
  const [configTab, setConfigTab] = useState<"config" | "logs" | "metrics" | "history">("config");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.preventDefault();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      setDragging(nodeId);
      setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
    },
    [nodes]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      setNodes((prev) =>
        prev.map((n) => (n.id === dragging ? { ...n, x: x - rect.left + canvasRef.current!.scrollLeft, y: y - rect.top + canvasRef.current!.scrollTop } : n))
      );
    },
    [dragging, dragOffset]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const getNodeCenter = (node: WorkflowNodeData) => ({
    x: node.x + 80,
    y: node.y + 28,
  });

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden animate-fade-in">
      {/* Node Library */}
      <div className="w-56 border-r border-border bg-card overflow-y-auto shrink-0">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Node Library</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Drag nodes to canvas</p>
        </div>
        <div className="p-2 space-y-3">
          {nodeLibrary.map((group) => (
            <div key={group.category}>
              <div className="flex items-center gap-1.5 px-2 py-1">
                <group.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.category}
                </span>
              </div>
              <div className="space-y-0.5">
                {group.nodes.map((node) => {
                  const Icon = nodeIconMap[node.icon];
                  return (
                    <div
                      key={node.type}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-foreground hover:bg-accent cursor-grab transition-colors"
                      draggable
                    >
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-xs">{node.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative flex flex-col">
        {/* Toolbar */}
        <div className="h-10 border-b border-border bg-card/60 backdrop-blur flex items-center px-4 gap-2">
          <span className="text-sm font-semibold text-foreground">CI/CD Pipeline — api-gateway</span>
          <div className="flex-1" />
          <button className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-success/15 text-success text-xs font-medium hover:bg-success/25 transition-colors">
            <Play className="w-3.5 h-3.5" /> Run Pipeline
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-destructive/15 text-destructive text-xs font-medium hover:bg-destructive/25 transition-colors">
            <Square className="w-3.5 h-3.5" /> Stop
          </button>
        </div>

        {/* Canvas area */}
        <div
          ref={canvasRef}
          className="flex-1 workflow-canvas overflow-auto relative"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* SVG connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 1400, minHeight: 500 }}>
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="hsl(187, 80%, 48%)" opacity="0.6" />
              </marker>
            </defs>
            {connections.map((conn) => {
              const fromNode = nodes.find((n) => n.id === conn.from);
              const toNode = nodes.find((n) => n.id === conn.to);
              if (!fromNode || !toNode) return null;
              const from = getNodeCenter(fromNode);
              const to = getNodeCenter(toNode);
              const midX = (from.x + to.x) / 2;
              return (
                <path
                  key={`${conn.from}-${conn.to}`}
                  d={`M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`}
                  stroke="hsl(187, 80%, 48%)"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.4"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          <div className="relative" style={{ minWidth: 1400, minHeight: 500 }}>
            {nodes.map((node) => {
              const Icon = nodeIconMap[node.icon];
              return (
                <div
                  key={node.id}
                  className={`workflow-node absolute select-none ${statusColor[node.status]} border-2 shadow-lg ${statusGlow[node.status]} ${
                    selectedNode?.id === node.id ? "ring-2 ring-primary ring-offset-2 ring-offset-canvas" : ""
                  }`}
                  style={{ left: node.x, top: node.y, width: 160 }}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{node.label}</p>
                      <p className="text-[10px] text-muted-foreground">{node.category}</p>
                    </div>
                    <span className={`status-dot ml-auto shrink-0 ${
                      node.status === "success" ? "bg-success" : node.status === "running" ? "bg-warning animate-pulse" : node.status === "failed" ? "bg-destructive" : "bg-muted-foreground/30"
                    }`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Config Panel */}
      {selectedNode && (
        <div className="w-80 border-l border-border bg-card overflow-y-auto shrink-0 animate-slide-in-left">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = nodeIconMap[selectedNode.icon];
                return <Icon className="w-4 h-4 text-primary" />;
              })()}
              <span className="text-sm font-semibold text-foreground">{selectedNode.label}</span>
            </div>
            <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-accent rounded transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {([
              { key: "config", label: "Config", icon: Settings },
              { key: "logs", label: "Logs", icon: FileText },
              { key: "metrics", label: "Metrics", icon: BarChart3 },
              { key: "history", label: "History", icon: History },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setConfigTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  configTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4">
            {configTab === "config" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Node Type</label>
                  <p className="text-sm text-foreground mt-1 font-mono">{selectedNode.type}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <p className="text-sm text-foreground mt-1">{selectedNode.category}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`status-dot ${
                      selectedNode.status === "success" ? "bg-success" : selectedNode.status === "running" ? "bg-warning" : selectedNode.status === "failed" ? "bg-destructive" : "bg-muted-foreground/30"
                    }`} />
                    <span className="text-sm capitalize text-foreground">{selectedNode.status}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Repository URL</label>
                  <input className="w-full bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://github.com/org/repo" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Branch</label>
                  <input className="w-full bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="main" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Timeout (seconds)</label>
                  <input type="number" className="w-full bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="300" />
                </div>
              </>
            )}
            {configTab === "logs" && (
              <div className="font-mono text-xs space-y-1.5 bg-background/50 rounded-lg p-3 max-h-80 overflow-y-auto">
                <p className="text-success">[12:34:01] ✓ Connected to repository</p>
                <p className="text-success">[12:34:02] ✓ Fetched latest commit: a3f2c1d</p>
                <p className="text-info">[12:34:03] ℹ Starting build process...</p>
                <p className="text-muted-foreground">[12:34:05] Installing dependencies...</p>
                <p className="text-muted-foreground">[12:34:12] Running tests...</p>
                <p className="text-success">[12:34:18] ✓ All 47 tests passed</p>
                <p className="text-warning">[12:34:19] ⚠ Build artifact size: 128MB</p>
                <p className="text-success">[12:34:20] ✓ Build complete</p>
              </div>
            )}
            {configTab === "metrics" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Cpu className="w-3 h-3" /> Execution Time</span>
                  <span className="text-sm font-mono text-foreground">42s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Layers className="w-3 h-3" /> Success Rate</span>
                  <span className="text-sm font-mono text-success">98.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Avg Duration</span>
                  <span className="text-sm font-mono text-foreground">38s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Runs (7d)</span>
                  <span className="text-sm font-mono text-foreground">156</span>
                </div>
              </div>
            )}
            {configTab === "history" && (
              <div className="space-y-2">
                {[
                  { time: "12:34", status: "success", commit: "a3f2c1d" },
                  { time: "11:20", status: "success", commit: "b8e4f2a" },
                  { time: "09:45", status: "failed", commit: "c1d3e5f" },
                  { time: "08:10", status: "success", commit: "d4f6a8b" },
                ].map((run, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/50">
                    <span className={`status-dot ${run.status === "success" ? "bg-success" : "bg-destructive"}`} />
                    <span className="text-xs text-muted-foreground">{run.time}</span>
                    <span className="text-xs font-mono text-foreground">{run.commit}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
