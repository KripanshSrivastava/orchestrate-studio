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
    description: "Repository and webhook integration for source events.",
    nodeTypes: ["github"],
    fields: [
      { key: "owner", label: "Owner / Organization", placeholder: "acme-org" },
      { key: "repository", label: "Repository", placeholder: "platform-service" },
      { key: "token", label: "Personal Access Token", placeholder: "ghp_xxx", type: "password" },
    ],
  },
  {
    id: "github-actions",
    name: "GitHub Actions",
    group: "CI Tools",
    description: "Trigger and monitor workflow runs.",
    nodeTypes: ["gh-actions", "gh-actions-cd"],
    fields: [
      { key: "workflowFile", label: "Workflow File", placeholder: "ci.yml" },
      { key: "branch", label: "Default Branch", placeholder: "main" },
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
      { key: "projectKey", label: "Project Key", placeholder: "platform-api" },
      { key: "token", label: "Token", placeholder: "sonar-token", type: "password" },
    ],
  },
  {
    id: "trivy",
    name: "Trivy",
    group: "Security & Quality",
    description: "Container image and IaC scanning.",
    nodeTypes: ["trivy"],
    fields: [
      { key: "severity", label: "Severity Threshold", placeholder: "HIGH,CRITICAL" },
      { key: "timeout", label: "Scan Timeout (seconds)", placeholder: "600" },
    ],
  },
  {
    id: "dockerhub",
    name: "Docker Hub",
    group: "Delivery",
    description: "Push and pull container images.",
    nodeTypes: ["dockerhub"],
    fields: [
      { key: "username", label: "Username", placeholder: "dockerhub-user" },
      { key: "repository", label: "Repository", placeholder: "idp/platform" },
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
      { key: "project", label: "Project", placeholder: "default" },
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
      { key: "scrapeInterval", label: "Scrape Interval", placeholder: "15s" },
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
      { key: "indexPrefix", label: "Index Prefix", placeholder: "logs-platform" },
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
      { key: "receiver", label: "Default Receiver", placeholder: "devops-slack" },
    ],
  },
];

export const getIntegrationByNodeType = (nodeType: string): IntegrationDefinition | undefined => {
  return integrationCatalog.find((integration) => integration.nodeTypes.includes(nodeType));
};

export const getIntegrationById = (integrationId: string): IntegrationDefinition | undefined => {
  return integrationCatalog.find((integration) => integration.id === integrationId);
};
