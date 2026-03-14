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
      { type: "gitlab", label: "GitLab", icon: "source" },
      { type: "bitbucket", label: "Bitbucket", icon: "source" },
      { type: "azure-devops", label: "Azure DevOps", icon: "source" },
    ],
  },
  {
    category: "Dependency Scanning",
    icon: Search,
    nodes: [
      { type: "snyk", label: "Snyk", icon: "dep-scan" },
      { type: "dependabot", label: "Dependabot", icon: "dep-scan" },
      { type: "owasp-dep", label: "OWASP Dep Check", icon: "dep-scan" },
      { type: "whitesource", label: "Whitesource", icon: "dep-scan" },
    ],
  },
  {
    category: "CI Pipeline",
    icon: Play,
    nodes: [
      { type: "jenkins", label: "Jenkins", icon: "ci" },
      { type: "gh-actions", label: "GitHub Actions", icon: "ci" },
      { type: "gitlab-ci", label: "GitLab CI", icon: "ci" },
      { type: "circleci", label: "CircleCI", icon: "ci" },
      { type: "azure-pipelines", label: "Azure Pipelines", icon: "ci" },
    ],
  },
  {
    category: "Static Code Analysis",
    icon: Shield,
    nodes: [
      { type: "sonarqube", label: "SonarQube", icon: "sast" },
      { type: "checkmarx", label: "Checkmarx", icon: "sast" },
      { type: "semgrep", label: "Semgrep", icon: "sast" },
      { type: "codacy", label: "Codacy", icon: "sast" },
    ],
  },
  {
    category: "Container Security",
    icon: Lock,
    nodes: [
      { type: "trivy", label: "Trivy", icon: "container-sec" },
      { type: "clair", label: "Clair", icon: "container-sec" },
      { type: "anchore", label: "Anchore", icon: "container-sec" },
      { type: "grype", label: "Grype", icon: "container-sec" },
      { type: "docker-scout", label: "Docker Scout", icon: "container-sec" },
      { type: "aqua-security", label: "Aqua Security", icon: "container-sec" },
    ],
  },
  {
    category: "Container Registry",
    icon: Box,
    nodes: [
      { type: "dockerhub", label: "Docker Hub", icon: "registry" },
      { type: "aws-ecr", label: "AWS ECR", icon: "registry" },
      { type: "azure-acr", label: "Azure ACR", icon: "registry" },
      { type: "gcp-artifact", label: "GCP Artifact Registry", icon: "registry" },
      { type: "harbor", label: "Harbor", icon: "registry" },
    ],
  },
  {
    category: "CD Deployment",
    icon: Rocket,
    nodes: [
      { type: "argocd", label: "ArgoCD", icon: "deploy" },
      { type: "fluxcd", label: "FluxCD", icon: "deploy" },
      { type: "spinnaker", label: "Spinnaker", icon: "deploy" },
      { type: "jenkins-cd", label: "Jenkins CD", icon: "deploy" },
      { type: "gh-actions-cd", label: "GitHub Actions CD", icon: "deploy" },
    ],
  },
  {
    category: "Kubernetes Runtime",
    icon: Cloud,
    nodes: [
      { type: "k8s-pods", label: "Pods", icon: "k8s" },
      { type: "k8s-services", label: "Services", icon: "k8s" },
      { type: "k8s-ingress", label: "Ingress", icon: "k8s" },
      { type: "k8s-configmaps", label: "ConfigMaps", icon: "k8s" },
      { type: "k8s-secrets", label: "Secrets", icon: "k8s" },
      { type: "k8s-deploy", label: "Deployments", icon: "k8s" },
      { type: "k8s-hpa", label: "HPA", icon: "k8s" },
    ],
  },
  {
    category: "Kubernetes Security",
    icon: Shield,
    nodes: [
      { type: "falco", label: "Falco", icon: "k8s-sec" },
      { type: "kyverno", label: "Kyverno", icon: "k8s-sec" },
      { type: "opa-gatekeeper", label: "OPA Gatekeeper", icon: "k8s-sec" },
      { type: "kube-bench", label: "Kube Bench", icon: "k8s-sec" },
      { type: "kube-hunter", label: "Kube Hunter", icon: "k8s-sec" },
    ],
  },
  {
    category: "Monitoring",
    icon: Activity,
    nodes: [
      { type: "prometheus", label: "Prometheus", icon: "monitoring" },
      { type: "grafana", label: "Grafana", icon: "monitoring" },
      { type: "datadog", label: "Datadog", icon: "monitoring" },
      { type: "new-relic", label: "New Relic", icon: "monitoring" },
      { type: "zabbix", label: "Zabbix", icon: "monitoring" },
      { type: "nagios", label: "Nagios", icon: "monitoring" },
    ],
  },
  {
    category: "Logging",
    icon: FileText,
    nodes: [
      { type: "elk-stack", label: "ELK Stack", icon: "logging" },
      { type: "efk", label: "EFK", icon: "logging" },
      { type: "loki-grafana", label: "Loki + Grafana", icon: "logging" },
      { type: "splunk", label: "Splunk", icon: "logging" },
      { type: "datadog-logs", label: "Datadog Logs", icon: "logging" },
    ],
  },
  {
    category: "Distributed Tracing",
    icon: Waypoints,
    nodes: [
      { type: "jaeger", label: "Jaeger", icon: "tracing" },
      { type: "zipkin", label: "Zipkin", icon: "tracing" },
      { type: "opentelemetry", label: "OpenTelemetry", icon: "tracing" },
      { type: "datadog-apm", label: "Datadog APM", icon: "tracing" },
      { type: "newrelic-apm", label: "New Relic APM", icon: "tracing" },
    ],
  },
  {
    category: "Alerting",
    icon: Bell,
    nodes: [
      { type: "alertmanager", label: "Alertmanager", icon: "alerting" },
      { type: "pagerduty", label: "PagerDuty", icon: "alerting" },
      { type: "opsgenie", label: "Opsgenie", icon: "alerting" },
      { type: "grafana-alerts", label: "Grafana Alerts", icon: "alerting" },
    ],
  },
  {
    category: "Ingress & Traffic",
    icon: Globe,
    nodes: [
      { type: "nginx-ingress", label: "NGINX Ingress", icon: "ingress" },
      { type: "traefik", label: "Traefik", icon: "ingress" },
      { type: "istio-gateway", label: "Istio Gateway", icon: "ingress" },
      { type: "haproxy", label: "HAProxy", icon: "ingress" },
    ],
  },
  {
    category: "Service Mesh",
    icon: Network,
    nodes: [
      { type: "istio", label: "Istio", icon: "mesh" },
      { type: "linkerd", label: "Linkerd", icon: "mesh" },
      { type: "consul", label: "Consul", icon: "mesh" },
    ],
  },
  {
    category: "Auto Scaling",
    icon: Scale,
    nodes: [
      { type: "hpa", label: "HPA", icon: "scaling" },
      { type: "vpa", label: "VPA", icon: "scaling" },
      { type: "cluster-autoscaler", label: "Cluster Autoscaler", icon: "scaling" },
    ],
  },
  {
    category: "Testing",
    icon: TestTube,
    nodes: [
      { type: "selenium", label: "Selenium", icon: "testing" },
      { type: "cypress", label: "Cypress", icon: "testing" },
      { type: "jmeter", label: "JMeter", icon: "testing" },
      { type: "k6", label: "k6", icon: "testing" },
      { type: "locust", label: "Locust", icon: "testing" },
      { type: "chaos-mesh", label: "Chaos Mesh", icon: "testing" },
      { type: "litmus-chaos", label: "LitmusChaos", icon: "testing" },
    ],
  },
  {
    category: "Secrets & Config",
    icon: Key,
    nodes: [
      { type: "k8s-secrets-mgr", label: "K8s Secrets", icon: "secrets" },
      { type: "hashicorp-vault", label: "HashiCorp Vault", icon: "secrets" },
      { type: "aws-secrets", label: "AWS Secrets Manager", icon: "secrets" },
      { type: "azure-keyvault", label: "Azure Key Vault", icon: "secrets" },
    ],
  },
  {
    category: "Infrastructure as Code",
    icon: Blocks,
    nodes: [
      { type: "terraform", label: "Terraform", icon: "iac" },
      { type: "pulumi", label: "Pulumi", icon: "iac" },
      { type: "cloudformation", label: "AWS CloudFormation", icon: "iac" },
      { type: "bicep", label: "Bicep", icon: "iac" },
    ],
  },
];

export const nodeIconMap: Record<string, React.ElementType> = {
  source: GitBranch,
  "dep-scan": Search,
  ci: Play,
  sast: Shield,
  "container-sec": Lock,
  registry: Box,
  deploy: Rocket,
  k8s: Cloud,
  "k8s-sec": Shield,
  monitoring: Activity,
  logging: FileText,
  tracing: Waypoints,
  alerting: Bell,
  ingress: Globe,
  mesh: Network,
  scaling: Scale,
  testing: TestTube,
  secrets: Key,
  iac: Blocks,
};
