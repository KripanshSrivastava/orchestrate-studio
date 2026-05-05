import { Link } from "react-router-dom";
import {
  CheckCircle2,
  FileText,
  GitBranch,
  Github,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Webhook,
  Workflow,
} from "lucide-react";

const docNav = [
  { id: "start", label: "Start Here", icon: FileText, to: "/docs#start" },
  { id: "github-setup", label: "GitHub Setup", icon: Github, to: "/docs#github-setup" },
  { id: "github-actions", label: "GitHub Actions", icon: Play, to: "/docs/github-actions", active: true },
  { id: "github-webhooks", label: "GitHub Webhooks", icon: Webhook, to: "/docs/github-webhooks" },
  { id: "provider-matrix", label: "Provider Matrix", icon: ShieldCheck, to: "/docs#provider-matrix" },
  { id: "github-api", label: "GitHub API Flow", icon: Server, to: "/docs#github-api" },
  { id: "auth", label: "Auth & Tenancy", icon: ShieldCheck, to: "/docs#auth" },
  { id: "troubleshooting", label: "Troubleshooting", icon: RefreshCw, to: "/docs#troubleshooting" },
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

const setupSteps = [
  {
    title: "Connect GitHub first",
    detail:
      "GitHub Actions reuses the GitHub integration owner, repository, and token. Save the GitHub card before configuring Actions.",
  },
  {
    title: "Open GitHub Actions",
    detail:
      "In Settings, go to Platform Integrations, then open the GitHub Actions card under CI Tools.",
  },
  {
    title: "Enter workflow file",
    detail:
      "Use the workflow filename such as ci.yml, or the full workflow path such as .github/workflows/ci.yml.",
  },
  {
    title: "Enter branch",
    detail:
      "Use the branch that should be checked and dispatched, usually main or your default deployment branch.",
  },
  {
    title: "Save and refresh",
    detail:
      "The backend loads your GitHub credentials, merges the Actions config, lists workflows, and checks the latest run.",
  },
];

const endpoints = [
  {
    method: "POST",
    path: "/api/integrations/github-actions/actions/test",
    detail: "Checks workflow file, branch, workflow discovery, and latest run visibility.",
  },
  {
    method: "POST",
    path: "/api/integrations/github-actions/actions/list-workflows",
    detail: "Lists all workflows in the connected repository.",
  },
  {
    method: "POST",
    path: "/api/integrations/github-actions/actions/list-runs",
    detail: "Lists recent workflow runs for the configured workflow and branch.",
  },
  {
    method: "POST",
    path: "/api/integrations/github-actions/actions/dispatch",
    detail: "Triggers the configured workflow with optional inputs.",
  },
];

const checks = [
  "GitHub card is connected and healthy.",
  "Token has repository metadata access.",
  "Token has Actions read access for workflow status.",
  "Token has Actions write access if you want workflow dispatch.",
  "Workflow file exists in .github/workflows.",
  "Branch exists in the connected repository.",
];

const whatItDoes = [
  "GitHub Actions connects workflow discovery, run status, and manual dispatch operations to the platform.",
  "It is a companion integration: repository owner, repository name, and token come from the GitHub card, while this page adds workflow file and branch configuration.",
  "Use it when visual workflow nodes need to check CI status, list workflow runs, or trigger a workflow from inside Orchestrate Studio.",
];

const statusFields = [
  "workflowFile",
  "branch",
  "workflows",
  "configuredWorkflow",
  "latestWorkflowRun",
  "healthy",
  "message",
  "checkedAt",
];

const securityNotes = [
  "Use a fine-grained GitHub token scoped to the repository instead of a broad personal token.",
  "Read-only Actions permission is enough for status checks and listing workflow runs.",
  "Actions write permission is required only when users need workflow dispatch from the platform.",
  "Rotate the GitHub token from the GitHub card; GitHub Actions automatically reuses the updated credentials.",
];

const troubleshooting = [
  {
    issue: "Connect GitHub first",
    fix: "GitHub Actions does not store its own token. Save the GitHub integration with owner, repository, and token before saving GitHub Actions.",
  },
  {
    issue: "Workflow was not found",
    fix: "Use ci.yml, deploy.yml, the workflow id, or the full path .github/workflows/ci.yml. Make sure the workflow exists in the connected repo.",
  },
  {
    issue: "No workflow runs found",
    fix: "The workflow may not have run on that branch yet. Trigger it once from GitHub or use the dispatch endpoint.",
  },
  {
    issue: "Dispatch returns a permissions error",
    fix: "Use a token with Actions write permission. Read-only tokens can verify and list runs but cannot trigger workflows.",
  },
];

export default function GithubActionsDocs() {
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
              {docNav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                    item.active
                      ? "bg-white text-black"
                      : "text-white/70 hover:bg-white hover:text-black"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
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
        <section className="border-b border-white/10 pb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">CI Integration</p>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                GitHub Actions setup and workflow operations.
              </h1>
              <p className="mt-4 text-sm leading-6 text-white/65">
                GitHub Actions is configured as a companion integration. It uses the saved GitHub repository and token,
                then adds workflow-specific configuration for listing runs and dispatching workflows.
              </p>
            </div>
            <div className="grid w-full max-w-sm grid-cols-2 gap-2">
              <div className="border border-white/10 bg-white/[0.03] p-4">
                <Github className="h-5 w-5 text-white" />
                <p className="mt-3 text-xs text-white/50">Reuses GitHub credentials</p>
              </div>
              <div className="border border-white/10 bg-white/[0.03] p-4">
                <Workflow className="h-5 w-5 text-white" />
                <p className="mt-3 text-xs text-white/50">Adds workflow config</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="mb-5 flex items-center gap-3">
            <Workflow className="h-5 w-5 text-white" />
            <div>
              <h2 className="text-xl font-semibold text-white">What It Does</h2>
              <p className="text-sm text-white/55">How Actions support fits into the platform integration model.</p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {whatItDoes.map((item) => (
              <article key={item} className="border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm leading-6 text-white/70">{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 py-8">
          <div className="mb-5 flex items-center gap-3">
            <Play className="h-5 w-5 text-white" />
            <div>
              <h2 className="text-xl font-semibold text-white">How To Configure It</h2>
              <p className="text-sm text-white/55">Follow this order so verification has everything it needs.</p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-5">
            {setupSteps.map((step, index) => (
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

        <section className="border-t border-white/10 py-8">
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-white" />
            <div>
              <h2 className="text-xl font-semibold text-white">Verification Details</h2>
              <p className="text-sm text-white/55">What the backend checks when the card is saved or refreshed.</p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">Workflow lookup</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                The backend lists repository workflows through Octokit and matches the configured workflow by path,
                filename, workflow name, or workflow id. The saved value can be ci.yml, .github/workflows/ci.yml,
                the exact workflow name, or the numeric workflow id.
              </p>
            </div>
            <div className="border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">Run lookup</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                After the workflow is found, the backend requests the latest workflow run for the configured branch.
                The status panel then shows name, status, conclusion, commit SHA, creation time, and update time when available.
              </p>
            </div>
          </div>
          <div className="mt-4 border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">Status fields returned</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {statusFields.map((item) => (
                <span key={item} className="border border-white/10 bg-black px-2 py-1 text-xs text-white/65">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 py-8">
          <div className="mb-5 flex items-center gap-3">
            <Server className="h-5 w-5 text-white" />
            <div>
              <h2 className="text-xl font-semibold text-white">Backend Endpoints</h2>
              <p className="text-sm text-white/55">All endpoints require the logged-in user token.</p>
            </div>
          </div>
          <div className="space-y-3">
            {endpoints.map((endpoint) => (
              <article key={endpoint.path} className="border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="border border-white/20 px-2 py-1 text-xs font-semibold text-white">
                      {endpoint.method}
                    </span>
                    <code className="text-xs text-white/75">{endpoint.path}</code>
                  </div>
                  <p className="text-xs leading-5 text-white/55 md:max-w-md">{endpoint.detail}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">Save request</p>
            <pre className="mt-2 overflow-x-auto bg-black p-3 text-xs leading-5 text-white/75">
              <code>{`PUT /api/integrations/github-actions
{
  "values": {
    "workflowFile": "demo.yml",
    "branch": "main"
  }
}`}</code>
            </pre>
            <p className="mt-3 text-xs leading-5 text-white/55">
              The workflow file is normalized before it is stored, so full paths such as .github/workflows/demo.yml
              and filenames such as demo.yml can both be used.
            </p>
          </div>
        </section>

        <section className="grid gap-6 border-t border-white/10 py-8 lg:grid-cols-2">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-white" />
              <div>
                <h2 className="text-xl font-semibold text-white">Readiness Checklist</h2>
                <p className="text-sm text-white/55">Confirm these before troubleshooting deeper.</p>
              </div>
            </div>
            <div className="space-y-3">
              {checks.map((check) => (
                <div key={check} className="flex items-start gap-3 border border-white/10 bg-white/[0.03] p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                  <p className="text-sm leading-6 text-white/70">{check}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-5 flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-white" />
              <div>
                <h2 className="text-xl font-semibold text-white">Troubleshooting</h2>
                <p className="text-sm text-white/55">Most Actions errors come from order, path, or permissions.</p>
              </div>
            </div>
            <div className="space-y-3">
              {troubleshooting.map((item) => (
                <article key={item.issue} className="border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-white" />
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
            <Github className="h-5 w-5 text-white" />
            <div>
              <h2 className="text-xl font-semibold text-white">Security And Operations</h2>
              <p className="text-sm text-white/55">Token and permission guidance for stable CI operations.</p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            {securityNotes.map((item) => (
              <article key={item} className="border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm leading-6 text-white/70">{item}</p>
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
