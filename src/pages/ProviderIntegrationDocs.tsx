import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  FileText,
  Gauge,
  Github,
  HardDrive,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  ShipWheel,
  Webhook,
} from "lucide-react";

type ProviderDoc = {
  id: string;
  name: string;
  group: string;
  summary: string;
  fields: Array<{ label: string; key: string; note: string }>;
  setupSteps: Array<{ title: string; detail: string }>;
  verification: Array<string>;
  troubleshooting: Array<{ issue: string; fix: string }>;
  apiExample: string;
};

const providerDocs: ProviderDoc[] = [
  {
    id: "snyk",
    name: "Snyk",
    group: "Security & Quality",
    summary: "Dependency and container vulnerability scanning for pipeline nodes.",
    fields: [
      { label: "Organization ID", key: "orgId", note: "Use the Snyk organization identifier the token can access." },
      { label: "API Token", key: "apiToken", note: "Use a Snyk token with organization read access." },
    ],
    setupSteps: [
      { title: "Create or choose an org token", detail: "Use a token scoped to the organization you want pipelines to scan against." },
      { title: "Open Snyk in Settings", detail: "Go to Platform Integrations, then Security & Quality, then Snyk." },
      { title: "Save the org and token", detail: "The backend stores the token in the secret store and masks it in the UI response." },
      { title: "Review status", detail: "The Snyk card shows whether the org endpoint was reachable with that token." },
    ],
    verification: [
      "Checks that organization ID and API token are present.",
      "Calls the Snyk organization API.",
      "Returns organization name or slug when available.",
    ],
    troubleshooting: [
      { issue: "401 or 403 from Snyk", fix: "Use a token with access to the configured organization." },
      { issue: "Organization not found", fix: "Confirm the org ID matches the Snyk organization, not the display name." },
    ],
    apiExample: `PUT /api/integrations/snyk
{
  "values": {
    "orgId": "your-snyk-org-id",
    "apiToken": "snyk-token"
  }
}`,
  },
  {
    id: "sonarqube",
    name: "SonarQube",
    group: "Security & Quality",
    summary: "Static code analysis and quality gate status for projects.",
    fields: [
      { label: "Server URL", key: "serverUrl", note: "Base URL of the SonarQube server reachable from the backend." },
      { label: "Project Key", key: "projectKey", note: "The SonarQube project key to check." },
      { label: "Token", key: "token", note: "A SonarQube token with permission to read the project." },
    ],
    setupSteps: [
      { title: "Create a user token", detail: "Create a token in SonarQube for a user that can read the project." },
      { title: "Confirm backend network access", detail: "The backend must be able to reach the SonarQube URL." },
      { title: "Save the project config", detail: "Enter server URL, project key, and token in the SonarQube card." },
      { title: "Check quality gate data", detail: "The status panel reports system status and quality gate if available." },
    ],
    verification: [
      "Checks SonarQube system status.",
      "Attempts to read the configured project quality gate.",
      "Reports server version, status, and quality gate details.",
    ],
    troubleshooting: [
      { issue: "Server URL fails", fix: "Use the backend-reachable base URL with no trailing API path." },
      { issue: "Quality gate unavailable", fix: "Confirm the project key exists and the token has Browse permission." },
    ],
    apiExample: `PUT /api/integrations/sonarqube
{
  "values": {
    "serverUrl": "https://sonar.company.com",
    "projectKey": "platform-api",
    "token": "sonar-token"
  }
}`,
  },
  {
    id: "trivy",
    name: "Trivy",
    group: "Security & Quality",
    summary: "Container image and IaC scanning policy used by workflow nodes.",
    fields: [
      { label: "Severity Threshold", key: "severity", note: "Comma-separated severities such as HIGH,CRITICAL." },
      { label: "Scan Timeout", key: "timeout", note: "Positive timeout in seconds." },
    ],
    setupSteps: [
      { title: "Choose severity policy", detail: "Set which vulnerability severities should fail or warn in pipeline nodes." },
      { title: "Set timeout", detail: "Give large images or IaC repos enough time to scan." },
      { title: "Save Trivy", detail: "The backend validates the policy values before marking the card healthy." },
    ],
    verification: [
      "Validates severity names against UNKNOWN, LOW, MEDIUM, HIGH, and CRITICAL.",
      "Validates timeout as a positive number of seconds.",
      "Stores policy values for Trivy workflow nodes.",
    ],
    troubleshooting: [
      { issue: "Unsupported severity", fix: "Use comma-separated Trivy severity names such as HIGH,CRITICAL." },
      { issue: "Invalid timeout", fix: "Use a positive numeric value such as 600." },
    ],
    apiExample: `PUT /api/integrations/trivy
{
  "values": {
    "severity": "HIGH,CRITICAL",
    "timeout": "600"
  }
}`,
  },
  {
    id: "dockerhub",
    name: "Docker Hub",
    group: "Delivery",
    summary: "Container registry access for pushing and pulling images.",
    fields: [
      { label: "Username", key: "username", note: "Docker Hub username or namespace owner." },
      { label: "Repository", key: "repository", note: "Repository path such as namespace/image." },
      { label: "Access Token", key: "token", note: "Docker Hub access token used by the backend verifier." },
    ],
    setupSteps: [
      { title: "Create an access token", detail: "Create a Docker Hub token for the account or namespace." },
      { title: "Enter repository path", detail: "Use namespace/repository so the verifier can read the target image repository." },
      { title: "Save Docker Hub", detail: "The card verifies token access and repository metadata." },
    ],
    verification: [
      "Checks Docker Hub user endpoint with the token.",
      "Reads repository metadata for the configured repository.",
      "Reports privacy and star count when available.",
    ],
    troubleshooting: [
      { issue: "Repository not found", fix: "Use the full namespace/repository path and confirm token access." },
      { issue: "Token rejected", fix: "Rotate the Docker Hub token and save the card again." },
    ],
    apiExample: `PUT /api/integrations/dockerhub
{
  "values": {
    "username": "dockerhub-user",
    "repository": "idp/platform",
    "token": "docker-token"
  }
}`,
  },
  {
    id: "argocd",
    name: "ArgoCD",
    group: "Delivery",
    summary: "GitOps sync access for deployment manifests and applications.",
    fields: [
      { label: "ArgoCD URL", key: "serverUrl", note: "Base ArgoCD URL reachable from the backend." },
      { label: "Project", key: "project", note: "ArgoCD project name, commonly default." },
      { label: "API Token", key: "token", note: "Bearer token with permission to read session and project information." },
    ],
    setupSteps: [
      { title: "Create an ArgoCD token", detail: "Generate a token for an account with access to the target project." },
      { title: "Confirm URL reachability", detail: "The backend must be able to call the ArgoCD API URL." },
      { title: "Save ArgoCD", detail: "The verifier checks user info and project reachability." },
    ],
    verification: [
      "Calls ArgoCD session userinfo.",
      "Attempts to read the configured project.",
      "Reports whether the project was reachable.",
    ],
    troubleshooting: [
      { issue: "Project reachable is false", fix: "Check the project name and token permissions." },
      { issue: "TLS or URL error", fix: "Use the backend-accessible ArgoCD base URL and valid certificates." },
    ],
    apiExample: `PUT /api/integrations/argocd
{
  "values": {
    "serverUrl": "https://argocd.company.com",
    "project": "default",
    "token": "argocd-token"
  }
}`,
  },
  {
    id: "prometheus",
    name: "Prometheus",
    group: "Observability",
    summary: "Runtime metrics collection and query integration.",
    fields: [
      { label: "Prometheus URL", key: "serverUrl", note: "Base Prometheus URL reachable from the backend." },
      { label: "Scrape Interval", key: "scrapeInterval", note: "Interval label used by the platform, such as 15s." },
    ],
    setupSteps: [
      { title: "Choose the Prometheus endpoint", detail: "Use the base URL for the Prometheus HTTP API." },
      { title: "Set scrape interval", detail: "Match the interval used by your runtime metrics pipeline." },
      { title: "Save Prometheus", detail: "The card reads build information from the API." },
    ],
    verification: [
      "Reads /api/v1/status/buildinfo.",
      "Reports version and revision when available.",
      "Stores scrape interval for workflow and observability nodes.",
    ],
    troubleshooting: [
      { issue: "Connection refused", fix: "Confirm the backend can reach Prometheus over the configured host and port." },
      { issue: "Wrong path", fix: "Enter only the base URL, not /api/v1/status/buildinfo." },
    ],
    apiExample: `PUT /api/integrations/prometheus
{
  "values": {
    "serverUrl": "http://prometheus:9090",
    "scrapeInterval": "15s"
  }
}`,
  },
  {
    id: "elk",
    name: "ELK Stack",
    group: "Observability",
    summary: "Elasticsearch-backed log indexing and search integration.",
    fields: [
      { label: "Elasticsearch URL", key: "elasticsearchUrl", note: "Base Elasticsearch URL reachable from the backend." },
      { label: "Index Prefix", key: "indexPrefix", note: "Prefix used for platform log indexes." },
    ],
    setupSteps: [
      { title: "Choose Elasticsearch URL", detail: "Use the backend-accessible Elasticsearch base URL." },
      { title: "Set index prefix", detail: "Use the index family the platform should query or write." },
      { title: "Save ELK Stack", detail: "The verifier reads root metadata and cluster health when available." },
    ],
    verification: [
      "Reads Elasticsearch root metadata.",
      "Attempts to read cluster health.",
      "Reports cluster name, version, and health when available.",
    ],
    troubleshooting: [
      { issue: "Unauthorized Elasticsearch", fix: "This verifier currently expects an unauthenticated or network-authorized endpoint." },
      { issue: "Cluster health unavailable", fix: "Root metadata can be reachable while _cluster/health is restricted; check Elasticsearch permissions." },
    ],
    apiExample: `PUT /api/integrations/elk
{
  "values": {
    "elasticsearchUrl": "http://elasticsearch:9200",
    "indexPrefix": "logs-platform"
  }
}`,
  },
  {
    id: "alertmanager",
    name: "Alertmanager",
    group: "Observability",
    summary: "Alert routing and deduplication status integration.",
    fields: [
      { label: "Alertmanager URL", key: "serverUrl", note: "Base Alertmanager URL reachable from the backend." },
      { label: "Default Receiver", key: "receiver", note: "Receiver name expected in alert routing." },
    ],
    setupSteps: [
      { title: "Choose Alertmanager URL", detail: "Use the base URL for the Alertmanager API." },
      { title: "Set default receiver", detail: "Enter the receiver that should be used by generated alert routes." },
      { title: "Save Alertmanager", detail: "The verifier reads API status and config availability." },
    ],
    verification: [
      "Reads /api/v2/status.",
      "Reports version when available.",
      "Reports whether Alertmanager returned configuration data.",
    ],
    troubleshooting: [
      { issue: "Status endpoint not reachable", fix: "Confirm the backend can reach Alertmanager and the URL is the base service URL." },
      { issue: "Receiver not found later", fix: "The card stores the receiver name; make sure Alertmanager config defines it." },
    ],
    apiExample: `PUT /api/integrations/alertmanager
{
  "values": {
    "serverUrl": "http://alertmanager:9093",
    "receiver": "devops-slack"
  }
}`,
  },
];

const iconByGroup = {
  "Security & Quality": ShieldCheck,
  Delivery: ShipWheel,
  Observability: Gauge,
};

const providerLinks = providerDocs.map((doc) => ({
  id: doc.id,
  label: doc.name,
  to: `/docs/integrations/${doc.id}`,
}));

const whatItDoes: Record<string, string[]> = {
  snyk: [
    "Snyk connects the platform to your Snyk organization so pipeline steps can use the same organization context for dependency, container, and open source risk checks.",
    "The integration currently verifies that the supplied API token can read the configured organization. Once healthy, Snyk workflow nodes can treat the saved organization and token as the platform-wide default for scans.",
    "Use it when you want dependency risk to be part of build, pull request, release, or deployment workflows instead of being a separate manual check.",
  ],
  sonarqube: [
    "SonarQube connects static code analysis and quality gate results to the platform. It is meant for repositories or services where code quality, maintainability, coverage, and security findings influence delivery decisions.",
    "The integration stores the SonarQube server, project key, and token, then verifies both server health and project quality gate visibility.",
    "Use it when workflow nodes need to block, warn, or annotate a pipeline based on a project's quality gate.",
  ],
  trivy: [
    "Trivy stores the platform's default vulnerability scanning policy for container image and IaC scanning nodes.",
    "Unlike SaaS integrations, the Trivy card does not call an external hosted API. It validates the scan policy values that workflow execution will apply when Trivy is run in the pipeline environment.",
    "Use it to standardize severity thresholds and scan timeout behavior across teams.",
  ],
  dockerhub: [
    "Docker Hub connects the platform to a container registry repository so delivery workflows can push, pull, or verify image repository access.",
    "The integration stores username, repository, and access token, then verifies token access against Docker Hub and reads repository metadata.",
    "Use it when build pipelines publish images to Docker Hub or deployment pipelines need a known registry source.",
  ],
  argocd: [
    "ArgoCD connects GitOps deployment operations to the platform. It gives workflow nodes a configured ArgoCD endpoint, project, and API token.",
    "The integration verifies the token by reading session user info and then checks whether the configured project can be reached.",
    "Use it when delivery workflows need to sync, inspect, or gate deployment state through ArgoCD.",
  ],
  prometheus: [
    "Prometheus connects runtime metrics visibility to the platform. It gives observability nodes a configured metrics API endpoint and scrape interval context.",
    "The integration verifies the Prometheus HTTP API by reading build information, which confirms the backend can reach the metrics service.",
    "Use it when workflows or dashboards need a standard Prometheus endpoint for health, SLO, or deployment verification queries.",
  ],
  elk: [
    "ELK Stack connects log search and indexing context to the platform through Elasticsearch.",
    "The integration stores the Elasticsearch base URL and index prefix, then verifies root cluster metadata and cluster health when that endpoint is accessible.",
    "Use it when incident, deployment, or monitoring workflows need to search logs by a known index family.",
  ],
  alertmanager: [
    "Alertmanager connects alert routing and deduplication context to the platform.",
    "The integration stores the Alertmanager base URL and default receiver, then verifies the API status endpoint and whether configuration data is visible.",
    "Use it when workflows need to create, route, or validate alerts against an existing Alertmanager setup.",
  ],
};

const prerequisites: Record<string, string[]> = {
  snyk: [
    "A Snyk organization already exists.",
    "You know the organization ID, not only the display name.",
    "You have an API token that can read organization metadata.",
    "The backend has outbound network access to snyk.io.",
  ],
  sonarqube: [
    "A SonarQube server is running and reachable from the backend.",
    "The target project already exists in SonarQube.",
    "The token belongs to a user or service account with Browse permission for the project.",
    "The URL entered in Settings is the base server URL, not a deep API endpoint.",
  ],
  trivy: [
    "The pipeline runner or workflow environment has Trivy available when scan nodes execute.",
    "Your team has chosen which severities should be treated as important.",
    "You know a reasonable scan timeout for your image and IaC repository sizes.",
  ],
  dockerhub: [
    "A Docker Hub repository exists or the token can access the namespace where it will be created.",
    "You have a Docker Hub access token for the configured account.",
    "Use repository format namespace/repository, for example idp/platform.",
  ],
  argocd: [
    "An ArgoCD server is running and reachable from the backend.",
    "A project exists in ArgoCD, commonly default for simple setups.",
    "You have an API token for an account with project visibility.",
    "TLS certificates and ingress rules allow backend-to-ArgoCD API calls.",
  ],
  prometheus: [
    "A Prometheus server is running and reachable from the backend.",
    "The HTTP API is enabled.",
    "You know the scrape interval convention your platform should display or use.",
  ],
  elk: [
    "Elasticsearch is reachable from the backend.",
    "The configured endpoint allows root metadata reads.",
    "You know the index prefix used for platform or application logs.",
  ],
  alertmanager: [
    "Alertmanager is running and reachable from the backend.",
    "The API v2 status endpoint is available.",
    "The receiver name exists in Alertmanager configuration if workflows will rely on it.",
  ],
};

const workflowUsage: Record<string, string[]> = {
  snyk: [
    "Use Snyk nodes after dependency installation, image build, or before release approval.",
    "A healthy Snyk integration means workflows can reuse the saved org and token instead of asking every pipeline author to paste credentials.",
    "Typical policy: warn on medium findings, block on high or critical findings, and attach scan results to the pipeline run.",
  ],
  sonarqube: [
    "Use SonarQube nodes after build/test jobs publish analysis results.",
    "Quality gate status can become a release condition before deployment nodes run.",
    "For monorepos, configure one integration per current project key expectation, then use node-level values for project-specific overrides when implemented.",
  ],
  trivy: [
    "Use Trivy nodes after container image build or before manifest promotion.",
    "The saved severity threshold lets workflow authors keep scan policy consistent across services.",
    "Timeout controls protect runners from hanging on very large images or IaC trees.",
  ],
  dockerhub: [
    "Use Docker Hub nodes in build workflows to publish images and in delivery workflows to validate image availability.",
    "The repository value identifies the registry target that deployment stages should consume.",
    "Use separate Docker Hub credentials for automation instead of personal tokens when running shared pipelines.",
  ],
  argocd: [
    "Use ArgoCD nodes after image publish or manifest update steps.",
    "Common operations include checking application health, triggering sync, waiting for sync completion, and surfacing deployment state.",
    "Project reachability in the status panel helps confirm the token can see the GitOps scope before pipeline execution.",
  ],
  prometheus: [
    "Use Prometheus nodes after deployment to query service health, error rates, latency, or saturation metrics.",
    "The configured endpoint becomes the default runtime metrics source for release verification.",
    "Scrape interval helps users interpret how fresh metrics are when a deployment gate runs.",
  ],
  elk: [
    "Use ELK nodes during incident workflows, post-deployment smoke checks, and release diagnostics.",
    "The index prefix narrows log searches to the correct application or platform log family.",
    "Cluster health in the status panel helps distinguish app log problems from search backend problems.",
  ],
  alertmanager: [
    "Use Alertmanager nodes to validate alert routing, inspect active alerts, or send deployment-related notifications through existing alert channels.",
    "The default receiver gives workflows a stable routing target.",
    "Configuration visibility helps confirm the backend can inspect Alertmanager state before relying on it for operations.",
  ],
};

const securityNotes: Record<string, string[]> = {
  snyk: [
    "Store a service token with the minimum organization access needed.",
    "Rotate the token if a team member leaves or if the token appears in logs.",
    "The browser only receives masked token values after save.",
  ],
  sonarqube: [
    "Use a service account token with read-only project access unless future workflow actions require writes.",
    "Prefer HTTPS for SonarQube traffic outside local development.",
    "If SonarQube is internal, allowlist backend network access instead of exposing it publicly.",
  ],
  trivy: [
    "No external credential is stored for Trivy in the current integration.",
    "Treat severity policy changes as platform policy changes and review them before broad rollout.",
    "Keep runner Trivy versions patched so scan results remain current.",
  ],
  dockerhub: [
    "Use Docker Hub access tokens instead of account passwords.",
    "Scope the token to the repository or namespace permissions required by automation.",
    "Rotate tokens used by shared runners on a regular schedule.",
  ],
  argocd: [
    "Use project-scoped ArgoCD permissions where possible.",
    "Avoid admin tokens for workflow automation.",
    "Keep the ArgoCD URL internal when the platform and ArgoCD run inside the same network.",
  ],
  prometheus: [
    "Prometheus often has broad operational visibility; restrict backend network access to approved instances.",
    "If your Prometheus endpoint requires auth, add that support before exposing it broadly in production.",
    "Avoid querying high-cardinality metrics aggressively in workflow gates.",
  ],
  elk: [
    "Elasticsearch can contain sensitive logs; restrict access to the backend and trusted operators.",
    "This verifier currently assumes unauthenticated or network-protected Elasticsearch access.",
    "Use index prefixes carefully so teams do not accidentally search unrelated logs.",
  ],
  alertmanager: [
    "Alertmanager can reveal incident and routing data; keep it internal or protected.",
    "Use receivers intentionally so generated workflow alerts reach the correct team.",
    "Avoid giving workflow automation broad admin access unless it must manage routes.",
  ],
};

const statusDetails: Record<string, string[]> = {
  snyk: ["orgId", "orgName"],
  sonarqube: ["serverUrl", "projectKey", "serverStatus", "version", "qualityGate"],
  trivy: ["severity", "timeoutSeconds"],
  dockerhub: ["username", "repository", "private", "stars"],
  argocd: ["serverUrl", "project", "projectReachable", "issuer"],
  prometheus: ["serverUrl", "scrapeInterval", "version", "revision"],
  elk: ["elasticsearchUrl", "indexPrefix", "cluster", "version", "health"],
  alertmanager: ["serverUrl", "receiver", "version", "hasConfig"],
};

export default function ProviderIntegrationDocs() {
  const { providerId } = useParams();
  const doc = providerDocs.find((item) => item.id === providerId) || providerDocs[0];
  const GroupIcon = iconByGroup[doc.group as keyof typeof iconByGroup] || Boxes;

  return (
    <div className="min-h-full bg-black text-white">
      <div className="flex min-h-screen">
        <aside className="hidden xl:block w-64 shrink-0 border-r border-white/10 bg-black">
          <div className="sticky top-0 p-5">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.18em] text-white/50">Docs</p>
              <h1 className="mt-2 text-xl font-semibold text-white">Integration Guide</h1>
            </div>
            <nav className="space-y-1">
              <Link to="/docs" className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-white/70 transition-colors hover:bg-white hover:text-black">
                <FileText className="h-4 w-4" />
                <span>Overview</span>
              </Link>
              <Link to="/docs/github-actions" className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-white/70 transition-colors hover:bg-white hover:text-black">
                <Play className="h-4 w-4" />
                <span>GitHub Actions</span>
              </Link>
              <Link to="/docs/github-webhooks" className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-white/70 transition-colors hover:bg-white hover:text-black">
                <Webhook className="h-4 w-4" />
                <span>GitHub Webhooks</span>
              </Link>
              <div className="pt-3">
                <p className="px-3 pb-2 text-[11px] uppercase tracking-[0.16em] text-white/40">Providers</p>
                {providerLinks.map((item) => (
                  <Link
                    key={item.id}
                    to={item.to}
                    className={`flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                      item.id === doc.id ? "bg-white text-black" : "text-white/70 hover:bg-white hover:text-black"
                    }`}
                  >
                    <Server className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </aside>

        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:px-10">
            <section className="border-b border-white/10 pb-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">{doc.group}</p>
                  <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{doc.name} integration setup.</h1>
                  <p className="mt-4 text-sm leading-6 text-white/65">{doc.summary}</p>
                </div>
                <div className="grid w-full max-w-sm grid-cols-2 gap-2">
                  <div className="border border-white/10 bg-white/[0.03] p-4">
                    <GroupIcon className="h-5 w-5 text-white" />
                    <p className="mt-3 text-xs text-white/50">{doc.group}</p>
                  </div>
                  <div className="border border-white/10 bg-white/[0.03] p-4">
                    <HardDrive className="h-5 w-5 text-white" />
                    <p className="mt-3 text-xs text-white/50">Secret-backed config</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-8">
              <div className="mb-5 flex items-center gap-3">
                <GroupIcon className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">What It Does</h2>
                  <p className="text-sm text-white/55">How this provider fits into the platform.</p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {whatItDoes[doc.id].map((item) => (
                  <article key={item} className="border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm leading-6 text-white/70">{item}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="border-t border-white/10 py-8">
              <div className="mb-5 flex items-center gap-3">
                <FileText className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Before You Start</h2>
                  <p className="text-sm text-white/55">Prerequisites to confirm before saving the integration.</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {prerequisites[doc.id].map((item) => (
                  <div key={item} className="flex items-start gap-3 border border-white/10 bg-white/[0.03] p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                    <p className="text-sm leading-6 text-white/70">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="border-t border-white/10 py-8">
              <div className="mb-5 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Required Fields</h2>
                  <p className="text-sm text-white/55">Values saved from the Settings integration card.</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {doc.fields.map((field) => (
                  <article key={field.key} className="border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/45">{field.key}</p>
                    <h3 className="mt-2 text-sm font-semibold text-white">{field.label}</h3>
                    <p className="mt-2 text-xs leading-5 text-white/60">{field.note}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="border-t border-white/10 py-8">
              <div className="mb-5 flex items-center gap-3">
                <Github className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">How To Configure It</h2>
                  <p className="text-sm text-white/55">Follow this order from Settings.</p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-4">
                {doc.setupSteps.map((step, index) => (
                  <article key={step.title} className="border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-4 flex h-8 w-8 items-center justify-center border border-white/20 text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-white/60">{step.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-6 border-t border-white/10 py-8 lg:grid-cols-2">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-white" />
                  <div>
                    <h2 className="text-xl font-semibold text-white">Verification</h2>
                    <p className="text-sm text-white/55">What the backend checks after save and refresh.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {doc.verification.map((item) => (
                    <div key={item} className="flex items-start gap-3 border border-white/10 bg-white/[0.03] p-4">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                      <p className="text-sm leading-6 text-white/70">{item}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white">Status fields returned</p>
                  <p className="mt-2 text-xs leading-5 text-white/55">
                    When verification runs, the provider card can display these detail fields:
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {statusDetails[doc.id].map((item) => (
                      <span key={item} className="border border-white/10 bg-black px-2 py-1 text-xs text-white/65">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-5 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-white" />
                  <div>
                    <h2 className="text-xl font-semibold text-white">Troubleshooting</h2>
                    <p className="text-sm text-white/55">Common setup failures for this provider.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {doc.troubleshooting.map((item) => (
                    <article key={item.issue} className="border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-white" />
                        <h3 className="text-sm font-semibold text-white">{item.issue}</h3>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/60">{item.fix}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="border-t border-white/10 py-8">
              <div className="mb-5 flex items-center gap-3">
                <Play className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Using It In Workflows</h2>
                  <p className="text-sm text-white/55">Where this provider usually appears in pipeline design.</p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {workflowUsage[doc.id].map((item) => (
                  <article key={item} className="border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm leading-6 text-white/70">{item}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="border-t border-white/10 py-8">
              <div className="mb-5 flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Security And Operations</h2>
                  <p className="text-sm text-white/55">How to run this integration safely over time.</p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {securityNotes[doc.id].map((item) => (
                  <article key={item} className="border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm leading-6 text-white/70">{item}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="border-t border-white/10 py-8">
              <div className="mb-5 flex items-center gap-3">
                <Server className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">API Example</h2>
                  <p className="text-sm text-white/55">All requests require the logged-in user Bearer token.</p>
                </div>
              </div>
              <pre className="overflow-x-auto border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-white/75">
                <code>{doc.apiExample}</code>
              </pre>
              <div className="mt-4 border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-medium text-white">Response behavior</p>
                <p className="mt-2 text-xs leading-5 text-white/55">
                  The API stores raw values in the configured secret backend, returns sensitive values as masked strings,
                  and includes a verification object with healthy, message, checkedAt, and provider-specific details.
                  The Settings card is marked connected only when all required fields are present and verification is healthy.
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
