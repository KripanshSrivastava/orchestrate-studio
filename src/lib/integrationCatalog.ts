export interface IntegrationField {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "password" | "url";
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  group: "Git Providers" | "CI Tools" | "Cloud Providers" | "Delivery";
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
    id: "github-webhooks",
    name: "GitHub Webhooks",
    group: "CI Tools",
    description: "Receive repository push and workflow status events from GitHub.",
    nodeTypes: ["github-webhook"],
    fields: [
      { key: "repository", label: "Repository", placeholder: "owner/repo or https://github.com/owner/repo" },
      { key: "secret", label: "Webhook Secret", placeholder: "Use the same value in GitHub webhook settings", type: "password" },
      { key: "events", label: "Events", placeholder: "push,workflow_run" },
    ],
  },
  {
    id: "aws-credentials",
    name: "AWS Credentials",
    group: "Cloud Providers",
    description: "AWS access keys used by provisioning and deployment workflows.",
    nodeTypes: ["aws"],
    fields: [
      { key: "accessKeyId", label: "Access Key ID", placeholder: "AKIA..." },
      { key: "secretAccessKey", label: "Secret Access Key", placeholder: "AWS secret access key", type: "password" },
      { key: "region", label: "Default Region", placeholder: "ap-south-1" },
    ],
  },
  {
    id: "dockerhub",
    name: "Docker",
    group: "Delivery",
    description: "Docker registry credentials for build and deploy workflows.",
    nodeTypes: ["dockerhub"],
    fields: [
      { key: "username", label: "Username", placeholder: "dockerhub-user" },
      { key: "token", label: "Access Token", placeholder: "docker-token", type: "password" },
    ],
  },
];

export const getIntegrationByNodeType = (nodeType: string): IntegrationDefinition | undefined => {
  return integrationCatalog.find((integration) => integration.nodeTypes.includes(nodeType));
};

export const getIntegrationById = (integrationId: string): IntegrationDefinition | undefined => {
  return integrationCatalog.find((integration) => integration.id === integrationId);
};
