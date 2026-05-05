import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Github,
  GitBranch,
  KeyRound,
  LockKeyhole,
  Play,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  Webhook,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";

const docNav = [
  { id: "start", label: "Start Here", icon: FileText },
  { id: "github-setup", label: "GitHub Setup", icon: Github },
  { id: "github-actions", label: "GitHub Actions", icon: Play, to: "/docs/github-actions" },
  { id: "github-webhooks", label: "GitHub Webhooks", icon: Webhook, to: "/docs/github-webhooks" },
  { id: "provider-matrix", label: "Provider Matrix", icon: ShieldCheck },
  { id: "github-api", label: "GitHub API Flow", icon: Server },
  { id: "auth", label: "Auth & Tenancy", icon: LockKeyhole },
  { id: "troubleshooting", label: "Troubleshooting", icon: AlertTriangle },
];

const providerDocLinks = [
  { id: "snyk", label: "Snyk" },
  { id: "sonarqube", label: "SonarQube" },
  { id: "trivy", label: "Trivy" },
  { id: "dockerhub", label: "Docker Hub" },
  { id: "argocd", label: "ArgoCD" },
  { id: "prometheus", label: "Prometheus" },
  { id: "elk", label: "ELK Stack" },
  { id: "alertmanager", label: "Alertmanager" },
];

const githubSteps = [
  {
    title: "Create a GitHub token",
    detail:
      "Create a fine-grained personal access token for the repository you want to connect. Give it read access to repository metadata and Actions if you want workflow run status.",
  },
  {
    title: "Open platform settings",
    detail:
      "Go to Settings, open Platform Integrations, and find the GitHub card under Git Providers.",
  },
  {
    title: "Enter repository details",
    detail:
      "Use the owner or organization name, repository name, and the token. The repository field should be only the repo name, not owner/repo.",
  },
  {
    title: "Save and verify",
    detail:
      "Saving calls the backend integration API. The backend stores the secret, checks GitHub through Octokit, and returns repository metadata to the UI.",
  },
  {
    title: "Refresh when needed",
    detail:
      "Use the refresh action after token rotation, repository permission changes, or workflow updates.",
  },
];

const apiFlow = [
  {
    label: "Browser",
    text: "Sends authenticated requests to /api/integrations with the Keycloak Bearer token.",
    icon: Workflow,
  },
  {
    label: "Backend",
    text: "Validates the token, resolves tenant context, filters allowed fields, and stores secret values.",
    icon: ShieldCheck,
  },
  {
    label: "Secret store",
    text: "Uses Vault when configured. In local development, falls back to an ignored local secrets file.",
    icon: KeyRound,
  },
  {
    label: "Provider API",
    text: "The integration-specific verifier checks the remote service and returns a health result with provider details.",
    icon: GitBranch,
  },
];

const providerGroups = [
  {
    group: "Security & Quality",
    providers: [
      {
        id: "snyk",
        name: "Snyk",
        fields: "Organization ID, API token",
        verification: "Calls the Snyk organization API and confirms the token can read the configured organization.",
      },
      {
        id: "sonarqube",
        name: "SonarQube",
        fields: "Server URL, project key, token",
        verification: "Checks system status and attempts to read the project quality gate.",
      },
      {
        id: "trivy",
        name: "Trivy",
        fields: "Severity threshold, scan timeout",
        verification: "Validates local scan policy values used by workflow nodes.",
      },
    ],
  },
  {
    group: "Delivery",
    providers: [
      {
        id: "dockerhub",
        name: "Docker Hub",
        fields: "Username, repository, access token",
        verification: "Checks Docker Hub token access and reads repository metadata.",
      },
      {
        id: "argocd",
        name: "ArgoCD",
        fields: "ArgoCD URL, project, API token",
        verification: "Checks the ArgoCD session endpoint and verifies whether the project is reachable.",
      },
    ],
  },
  {
    group: "Observability",
    providers: [
      {
        id: "prometheus",
        name: "Prometheus",
        fields: "Prometheus URL, scrape interval",
        verification: "Reads Prometheus build information from the HTTP API.",
      },
      {
        id: "elk",
        name: "ELK Stack",
        fields: "Elasticsearch URL, index prefix",
        verification: "Checks Elasticsearch root metadata and cluster health when available.",
      },
      {
        id: "alertmanager",
        name: "Alertmanager",
        fields: "Alertmanager URL, default receiver",
        verification: "Reads Alertmanager API status and reports config availability.",
      },
    ],
  },
];

const authNotes = [
  "Protected API requests require a valid Keycloak Bearer token.",
  "The backend accepts the configured audience or authorized party from the token.",
  "Tenant context uses an org:* role when present, then falls back to DEFAULT_ORG_ID for local development.",
  "If the frontend stores an old token, sign out and sign in again before testing integrations.",
];

const troubleshooting = [
  {
    issue: "401 Unauthorized",
    fix: "The browser is missing a valid token or the token failed signature, issuer, audience, or claim validation. Sign in again and confirm the backend Keycloak URL and realm match the frontend.",
  },
  {
    issue: "403 User has no organization assigned",
    fix: "Assign an org:* role in Keycloak for production. For local development, restart the backend after the tenant fallback change so DEFAULT_ORG_ID can be used.",
  },
  {
    issue: "GitHub shows disconnected",
    fix: "Check owner, repository, and token. Fine-grained tokens must be granted to the selected repository.",
  },
  {
    issue: "No workflow run appears",
    fix: "The repository may not have Actions runs yet, or the token may not have Actions read access.",
  },
  {
    issue: "Provider card saves but stays disconnected",
    fix: "The required fields were saved, but the provider verification failed. Open the status panel on the card and check the returned message from the remote API.",
  },
  {
    issue: "Internal provider URL cannot be reached",
    fix: "For SonarQube, ArgoCD, Prometheus, Elasticsearch, and Alertmanager, the backend process must be able to reach the URL you entered.",
  },
  {
    issue: "Vault is not configured",
    fix: "Set VAULT_ADDR and VAULT_TOKEN for shared environments. Local development can use the automatic local secret file fallback.",
  },
];

export default function Docs() {
  return (
    <div className="min-h-full bg-black text-white">
      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="hidden xl:block w-64 shrink-0 border-r border-white/10 bg-black">
          <div className="sticky top-0 p-5">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.18em] text-white/50">Docs</p>
              <h1 className="mt-2 text-xl font-semibold text-white">Integration Guide</h1>
            </div>
            <nav className="space-y-1">
              {docNav.map((item) => (
                item.to ? (
                  <Link
                    key={item.id}
                    to={item.to}
                    className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-white/70 transition-colors hover:bg-white hover:text-black"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-white/70 transition-colors hover:bg-white hover:text-black"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </a>
                )
              ))}
              <div className="pt-3">
                <p className="px-3 pb-2 text-[11px] uppercase tracking-[0.16em] text-white/40">Provider Pages</p>
                {providerDocLinks.map((item) => (
                  <Link
                    key={item.id}
                    to={`/docs/integrations/${item.id}`}
                    className="flex h-9 items-center gap-3 rounded-md px-3 text-sm text-white/70 transition-colors hover:bg-white hover:text-black"
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
            <section id="start" className="border-b border-white/10 pb-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Platform Documentation</p>
                  <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                    One place for integration setup, API behavior, auth, and operations.
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-white/65">
                    This documentation collects the integration workflow into a single clean reference. Use it to connect
                    GitHub, security tools, delivery providers, observability systems, and diagnose auth or provider access errors.
                  </p>
                </div>
                <div className="grid w-full max-w-sm grid-cols-2 gap-2">
                  <div className="border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-2xl font-semibold text-white">6</p>
                    <p className="mt-1 text-xs text-white/50">Doc sections</p>
                  </div>
                  <div className="border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-2xl font-semibold text-white">10</p>
                    <p className="mt-1 text-xs text-white/50">Integration cards</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="github-setup" className="py-8">
              <div className="mb-5 flex items-center gap-3">
                <Github className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">GitHub Setup</h2>
                  <p className="text-sm text-white/55">Connect a repository through Settings and verify access.</p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-5">
                {githubSteps.map((step, index) => (
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

            <section id="provider-matrix" className="border-t border-white/10 py-8">
              <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Provider Matrix</h2>
                  <p className="text-sm text-white/55">What each non-GitHub integration stores and verifies.</p>
                </div>
              </div>

              <div className="space-y-5">
                {providerGroups.map((group) => (
                  <div key={group.group}>
                    <h3 className="mb-3 text-sm font-semibold text-white">{group.group}</h3>
                    <div className="grid gap-3 lg:grid-cols-3">
                      {group.providers.map((provider) => (
                        <article key={provider.name} className="border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-semibold text-white">{provider.name}</h4>
                            <Link
                              to={`/docs/integrations/${provider.id}`}
                              className="text-xs text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
                            >
                              Open docs
                            </Link>
                          </div>
                          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/45">Required fields</p>
                          <p className="mt-1 text-xs leading-5 text-white/65">{provider.fields}</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/45">Verification</p>
                          <p className="mt-1 text-xs leading-5 text-white/65">{provider.verification}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-medium text-white">Status behavior</p>
                <p className="mt-2 text-xs leading-5 text-white/55">
                  A card is only marked connected when all required fields are present and its verifier returns healthy.
                  Sensitive fields are stored in the configured secret store and returned to the browser as masked values.
                </p>
              </div>
            </section>

            <section id="github-api" className="border-t border-white/10 py-8">
              <div className="mb-5 flex items-center gap-3">
                <Server className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Integration API Flow</h2>
                  <p className="text-sm text-white/55">What happens after any integration card is saved.</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {apiFlow.map((item) => (
                  <article key={item.label} className="border border-white/10 bg-white/[0.03] p-4">
                    <item.icon className="h-5 w-5 text-white" />
                    <h3 className="mt-4 text-sm font-semibold text-white">{item.label}</h3>
                    <p className="mt-2 text-xs leading-5 text-white/60">{item.text}</p>
                  </article>
                ))}
              </div>
              <div className="mt-4 border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">GitHub Actions has a dedicated setup page</p>
                    <p className="mt-1 text-xs leading-5 text-white/55">
                      Use it after GitHub is connected to configure workflow file, branch, status checks, and dispatch endpoints.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/docs/github-actions"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-white/20 px-3 text-sm text-white transition-colors hover:bg-white hover:text-black"
                    >
                      Open GitHub Actions Docs
                    </Link>
                    <Link
                      to="/docs/github-webhooks"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-white/20 px-3 text-sm text-white transition-colors hover:bg-white hover:text-black"
                    >
                      Open Webhook Docs
                    </Link>
                  </div>
                </div>
              </div>
              <div className="mt-4 border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-medium text-white">Expected request path</p>
                <code className="mt-2 block overflow-x-auto bg-black p-3 text-xs text-white/75">
                  PUT http://localhost:3000/api/integrations/github
                </code>
                <p className="mt-3 text-xs leading-5 text-white/55">
                  Replace github with any supported integration id such as snyk, sonarqube, dockerhub, argocd,
                  prometheus, elk, or alertmanager. The response masks sensitive fields and includes verification
                  status when available.
                </p>
              </div>
            </section>

            <section id="auth" className="border-t border-white/10 py-8">
              <div className="mb-5 flex items-center gap-3">
                <LockKeyhole className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Auth & Tenancy</h2>
                  <p className="text-sm text-white/55">How integration endpoints decide whether a request is allowed.</p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {authNotes.map((note) => (
                  <div key={note} className="flex items-start gap-3 border border-white/10 bg-white/[0.03] p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                    <p className="text-sm leading-6 text-white/70">{note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="troubleshooting" className="border-t border-white/10 py-8">
              <div className="mb-5 flex items-center gap-3">
                <Settings className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Troubleshooting</h2>
                  <p className="text-sm text-white/55">Common integration failures and the fix to try first.</p>
                </div>
              </div>
              <div className="space-y-3">
                {troubleshooting.map((item) => (
                  <article key={item.issue} className="border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-white" />
                      <h3 className="text-sm font-semibold text-white">{item.issue}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/60">{item.fix}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
