export interface IntegrationField {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "password" | "url";
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  group: "Git Providers" | "CI Tools" | "Security & Quality" | "Delivery" | "Observability";
  description: string;
  nodeTypes: string[];
  fields: IntegrationField[];
}

export const integrationCatalog: IntegrationDefinition[] = [
  {
    id: "github",
    name: "GitHub",
    group: "Git Providers",
    description: "GitHub API credentials for repository and workflow nodes.",
    nodeTypes: ["github"],
    fields: [
      { key: "repository", label: "Repository", placeholder: "owner/repo or https://github.com/owner/repo" },
      { key: "owner", label: "Owner", placeholder: "organization or username" },
      { key: "token", label: "GitHub Token", placeholder: "ghp_xxx", type: "password" },
    ],
  },
  {
    id: "github-actions",
    name: "GitHub Actions",
    group: "CI Tools",
    description: "Trigger and monitor workflow runs using your connected GitHub credentials.",
    nodeTypes: ["gh-actions", "gh-actions-cd"],
    fields: [
      { key: "workflowFile", label: "Workflow File", placeholder: ".github/workflows/ci.yml" },
      { key: "branch", label: "Branch", placeholder: "main" },
    ],
  },
  {
    id: "snyk",
    name: "Snyk",
    group: "Security & Quality",
    description: "Dependency and container vulnerability scanning.",
    nodeTypes: ["snyk"],
    fields: [
      { key: "orgId", label: "Organization ID", placeholder: "your-snyk-org-id" },
      { key: "apiToken", label: "API Token", placeholder: "snyk-token", type: "password" },
    ],
  },
  {
    id: "sonarqube",
    name: "SonarQube",
    group: "Security & Quality",
    description: "Static code analysis and quality gates.",
    nodeTypes: ["sonarqube"],
    fields: [
      { key: "serverUrl", label: "Server URL", placeholder: "https://sonar.company.com", type: "url" },
      { key: "token", label: "Token", placeholder: "sonar-token", type: "password" },
    ],
  },
  {
    id: "trivy",
    name: "Trivy",
    group: "Security & Quality",
    description: "Container image and IaC scanning.",
    nodeTypes: ["trivy"],
    fields: [],
  },
  {
    id: "dockerhub",
    name: "Docker Hub",
    group: "Delivery",
    description: "Push and pull container images.",
    nodeTypes: ["dockerhub"],
    fields: [
      { key: "username", label: "Username", placeholder: "dockerhub-user" },
      { key: "token", label: "Access Token", placeholder: "docker-token", type: "password" },
    ],
  },
  {
    id: "argocd",
    name: "ArgoCD",
    group: "Delivery",
    description: "Sync manifests from GitOps repositories.",
    nodeTypes: ["argocd"],
    fields: [
      { key: "serverUrl", label: "ArgoCD URL", placeholder: "https://argocd.company.com", type: "url" },
      { key: "token", label: "API Token", placeholder: "argocd-token", type: "password" },
    ],
  },
  {
    id: "prometheus",
    name: "Prometheus",
    group: "Observability",
    description: "Collect and query runtime metrics.",
    nodeTypes: ["prometheus"],
    fields: [
      { key: "serverUrl", label: "Prometheus URL", placeholder: "http://prometheus:9090", type: "url" },
    ],
  },
  {
    id: "elk",
    name: "ELK Stack",
    group: "Observability",
    description: "Log indexing and search integration.",
    nodeTypes: ["elk-stack", "efk"],
    fields: [
      { key: "elasticsearchUrl", label: "Elasticsearch URL", placeholder: "http://elasticsearch:9200", type: "url" },
    ],
  },
  {
    id: "alertmanager",
    name: "Alertmanager",
    group: "Observability",
    description: "Route and deduplicate alerts.",
    nodeTypes: ["alertmanager"],
    fields: [
      { key: "serverUrl", label: "Alertmanager URL", placeholder: "http://alertmanager:9093", type: "url" },
    ],
  },
];

export const getIntegrationByNodeType = (nodeType: string): IntegrationDefinition | undefined => {
  return integrationCatalog.find((integration) => integration.nodeTypes.includes(nodeType));
};

export const getIntegrationById = (integrationId: string): IntegrationDefinition | undefined => {
  return integrationCatalog.find((integration) => integration.id === integrationId);
};
