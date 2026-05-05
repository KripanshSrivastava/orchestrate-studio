import {
  GitBranch,
  Play,
  Shield,
  Box,
  Rocket,
  Cloud,
  Activity,
  Search,
  Lock,
  TestTube,
  Bell,
  FileText,
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
    category: "Source / Trigger",
    icon: GitBranch,
    nodes: [
      { type: "github", label: "GitHub", icon: "source" },
      { type: "webhook-trigger", label: "Webhook Trigger", icon: "trigger" },
      { type: "schedule-trigger", label: "Schedule (cron)", icon: "trigger" },
      { type: "manual-trigger", label: "Manual Trigger", icon: "trigger" },
    ],
  },
  {
    category: "CI",
    icon: Play,
    nodes: [
      { type: "install-dependencies", label: "Install Dependencies", icon: "ci" },
      { type: "build", label: "Build", icon: "ci" },
      { type: "test", label: "Test", icon: "ci" },
      { type: "lint", label: "Lint", icon: "ci" },
      { type: "custom-script", label: "Custom Script", icon: "ci" },
    ],
  },
  {
    category: "Container",
    icon: Box,
    nodes: [
      { type: "docker-build", label: "Docker Build", icon: "container" },
      { type: "docker-push", label: "Docker Push", icon: "container" },
      { type: "docker-run", label: "Docker Run", icon: "container" },
    ],
  },
  {
    category: "Deployment - AWS",
    icon: Rocket,
    nodes: [
      { type: "deploy-ec2", label: "Deploy to EC2", icon: "deploy" },
      { type: "deploy-ecs", label: "Deploy to ECS", icon: "deploy" },
      { type: "deploy-eks", label: "Deploy to EKS", icon: "deploy" },
      { type: "deploy-s3", label: "Deploy to S3 (static)", icon: "deploy" },
    ],
  },
  {
    category: "Deployment - Generic",
    icon: Cloud,
    nodes: [
      { type: "deploy-ssh", label: "Deploy via SSH", icon: "deploy" },
      { type: "deploy-docker-host", label: "Deploy via Docker Host", icon: "deploy" },
      { type: "deploy-argocd", label: "Deploy via ArgoCD", icon: "deploy" },
    ],
  },
  {
    category: "Security",
    icon: Shield,
    nodes: [
      { type: "dependency-scan", label: "Dependency Scan", icon: "security" },
      { type: "container-scan", label: "Container Scan", icon: "security" },
      { type: "secret-scan", label: "Secret Scan", icon: "security" },
    ],
  },
  {
    category: "Monitoring",
    icon: Activity,
    nodes: [
      { type: "metrics-prometheus", label: "Metrics (Prometheus)", icon: "monitoring" },
      { type: "logs-loki-elk", label: "Logs (Loki / ELK)", icon: "logging" },
      { type: "alerts", label: "Alerts", icon: "alerting" },
    ],
  },
  {
    category: "Testing",
    icon: TestTube,
    nodes: [
      { type: "unit-test", label: "Unit Test", icon: "testing" },
      { type: "integration-test", label: "Integration Test", icon: "testing" },
      { type: "load-test-k6", label: "Load Test (k6)", icon: "testing" },
    ],
  },
  {
    category: "Secrets",
    icon: Key,
    nodes: [
      { type: "get-secret", label: "Get Secret (Vault / Env)", icon: "secrets" },
      { type: "inject-secrets", label: "Inject Secrets", icon: "secrets" },
    ],
  },
  {
    category: "Infrastructure as Code",
    icon: Blocks,
    nodes: [
      { type: "terraform-plan", label: "Plan (Preview)", icon: "iac" },
      { type: "terraform-provision", label: "Provision Infrastructure", icon: "iac" },
      { type: "terraform-destroy", label: "Destroy Infrastructure", icon: "iac" },
    ],
  },
];

export const nodeIconMap: Record<string, React.ElementType> = {
  source: GitBranch,
  trigger: Play,
  ci: Play,
  search: Search,
  security: Shield,
  container: Box,
  "docker-build": Box,
  "docker-push": Box,
  "docker-run": Box,
  deploy: Rocket,
  "deploy-ec2": Rocket,
  "deploy-ecs": Rocket,
  "deploy-eks": Rocket,
  "deploy-s3": Rocket,
  "deploy-ssh": Rocket,
  "deploy-docker-host": Rocket,
  "deploy-argocd": Rocket,
  k8s: Cloud,
  monitoring: Activity,
  "metrics-prometheus": Activity,
  logging: FileText,
  "logs-loki-elk": FileText,
  alerting: Bell,
  testing: TestTube,
  "unit-test": TestTube,
  "integration-test": TestTube,
  "load-test-k6": TestTube,
  secrets: Key,
  "get-secret": Key,
  "inject-secrets": Key,
  iac: Blocks,
  "terraform-plan": Blocks,
  "terraform-provision": Blocks,
  "terraform-destroy": Blocks,
};
