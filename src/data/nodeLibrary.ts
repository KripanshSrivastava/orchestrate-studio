import {
  GitBranch,
  Play,
  Shield,
  Box,
  Rocket,
  Cloud,
  Activity,
  Server,
  Search,
  Lock,
  Network,
  Globe,
  TestTube,
  Bell,
  FileText,
  Waypoints,
  Scale,
  Key,
  Blocks,
} from "lucide-react";

export interface NodeDef {
  type: string;
  label: string;
  icon: string;
}

export interface NodeCategory {
  category: string;
  icon: React.ElementType;
  nodes: NodeDef[];
}

export const nodeLibrary: NodeCategory[] = [
  {
    category: "Developer Stage",
    icon: GitBranch,
    nodes: [
      { type: "github", label: "GitHub", icon: "source" },
    ],
  },
  {
    category: "CI Pipeline",
    icon: Play,
    nodes: [
      { type: "gh-actions", label: "GitHub Actions", icon: "ci" },
      { type: "rest-api-polling", label: "REST API Polling", icon: "ci" },
    ],
  },
  {
    category: "Container Security",
    icon: Lock,
    nodes: [
      { type: "trivy", label: "Trivy", icon: "container-sec" },
      { type: "trivy-cli-subprocess", label: "Trivy CLI Subprocess", icon: "container-sec" },
    ],
  },
  {
    category: "Container Registry",
    icon: Box,
    nodes: [
      { type: "docker", label: "Docker", icon: "registry" },
      { type: "dockerhub", label: "Docker Hub", icon: "registry" },
      { type: "docker-unix-socket-api", label: "Docker Unix Socket API", icon: "registry" },
    ],
  },
  {
    category: "CD Deployment",
    icon: Rocket,
    nodes: [
      { type: "argocd", label: "ArgoCD", icon: "deploy" },
      { type: "argocd-jwt-rest-api", label: "ArgoCD JWT REST API", icon: "deploy" },
    ],
  },
  {
    category: "Kubernetes Runtime",
    icon: Cloud,
    nodes: [
      { type: "kubernetes", label: "Kubernetes", icon: "k8s" },
      { type: "kubernetes-official-sdk", label: "Kubernetes Official SDK", icon: "k8s" },
    ],
  },
  {
    category: "Monitoring",
    icon: Activity,
    nodes: [
      { type: "prometheus", label: "Prometheus", icon: "monitoring" },
      { type: "grafana", label: "Grafana", icon: "monitoring" },
      { type: "prometheus-promql-http", label: "Prometheus Raw PromQL HTTP", icon: "monitoring" },
      { type: "grafana-dashboard-provisioning", label: "Grafana Dashboard Provisioning API", icon: "monitoring" },
    ],
  },
  {
    category: "Logging",
    icon: FileText,
    nodes: [
      { type: "loki", label: "Loki", icon: "logging" },
      { type: "loki-logql-ai-pipeline", label: "Loki LogQL + AI Pipeline", icon: "logging" },
    ],
  },
  {
    category: "Testing",
    icon: TestTube,
    nodes: [
      { type: "k6", label: "k6", icon: "testing" },
      { type: "k6-dynamic-k8s-job-runner", label: "k6 Dynamic K8s Job Runner", icon: "testing" },
    ],
  },
  {
    category: "Secrets & Config",
    icon: Key,
    nodes: [
      { type: "vault", label: "Vault", icon: "secrets" },
      { type: "vault-approle-sidecar", label: "Vault AppRole API + Sidecar Hybrid", icon: "secrets" },
    ],
  },
  {
    category: "Infrastructure as Code",
    icon: Blocks,
    nodes: [
      { type: "terraform", label: "Terraform", icon: "iac" },
      { type: "terraform-cli-streaming", label: "Terraform CLI Subprocess + Streaming", icon: "iac" },
    ],
  },
];

export const nodeIconMap: Record<string, React.ElementType> = {
  source: GitBranch,
  "dep-scan": Search,
  ci: Play,
  "rest-api-polling": Search,
  sast: Shield,
  "container-sec": Lock,
  "trivy-cli-subprocess": Shield,
  registry: Box,
  "docker-unix-socket-api": Box,
  deploy: Rocket,
  "argocd-jwt-rest-api": Rocket,
  k8s: Cloud,
  "kubernetes-official-sdk": Cloud,
  "k8s-sec": Shield,
  monitoring: Activity,
  "prometheus-promql-http": Activity,
  "grafana-dashboard-provisioning": FileText,
  logging: FileText,
  "loki-logql-ai-pipeline": FileText,
  tracing: Waypoints,
  alerting: Bell,
  ingress: Globe,
  mesh: Network,
  scaling: Scale,
  testing: TestTube,
  "k6-dynamic-k8s-job-runner": TestTube,
  secrets: Key,
  "vault-approle-sidecar": Key,
  iac: Blocks,
  "terraform-cli-streaming": Blocks,
};
