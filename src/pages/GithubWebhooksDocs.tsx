import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  GitBranch,
  Github,
  KeyRound,
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
  { id: "github-actions", label: "GitHub Actions", icon: Play, to: "/docs/github-actions" },
  { id: "github-webhooks", label: "GitHub Webhooks", icon: Webhook, to: "/docs/github-webhooks", active: true },
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
    title: "Create a shared secret",
    detail:
      "Choose a strong random value and set the same value as GITHUB_WEBHOOK_SECRET in the backend environment.",
  },
  {
    title: "Expose the backend URL",
    detail:
      "Use your deployed API host, or a tunnel during local development, so GitHub can reach /webhooks/github.",
  },
  {
    title: "Add the GitHub webhook",
    detail:
      "In the repository, open Settings, then Webhooks, then add a webhook using the payload URL and shared secret.",
  },
  {
    title: "Select events",
    detail:
      "Enable push for automatic pipeline runs. Enable workflow_run if you want GitHub Actions to update execution status.",
  },
  {
    title: "Verify delivery",
    detail:
      "Use GitHub's Recent Deliveries panel and the platform health endpoint to confirm the webhook is accepted.",
  },
];

const eventBehavior = [
  {
    event: "push",
    detail:
      "Accepted only for the main branch. The backend records a queued pipeline run, caches the raw payload by commit SHA, queues pipeline execution, emits realtime updates, and writes an audit log.",
  },
  {
    event: "workflow_run",
    detail:
      "Maps GitHub workflow status to platform execution status. The workflow run inputs must include runId or run_id so the backend can update the matching execution run.",
  },
  {
    event: "other events",
    detail:
      "Accepted with an ignored response. This keeps GitHub delivery healthy while preventing unsupported events from creating work.",
  },
];

const requestHeaders = [
  "Content-Type: application/json",
  "X-GitHub-Event: push or workflow_run",
  "X-Hub-Signature-256: sha256=<hmac>",
];

const readinessChecks = [
  "GITHUB_WEBHOOK_SECRET is configured before the backend starts.",
  "Payload URL points to the public backend route /webhooks/github.",
  "Content type is application/json.",
  "Secret in GitHub exactly matches the backend environment value.",
  "Push events are enabled for automatic pipeline creation.",
  "Redis and the queue worker are healthy for async processing.",
];

const healthFields = [
  "integration",
  "healthy",
  "redis.connected",
  "queue.healthy",
  "lastProcessedAt",
  "lastError",
];

const troubleshooting = [
  {
    issue: "500 secret is not configured",
    fix: "Set GITHUB_WEBHOOK_SECRET in the backend environment and restart the backend process.",
  },
  {
    issue: "401 invalid webhook signature",
    fix: "Confirm the GitHub webhook secret matches GITHUB_WEBHOOK_SECRET exactly. Regenerate both values if needed.",
  },
  {
    issue: "400 expected raw JSON body",
    fix: "Set webhook Content type to application/json. The backend intentionally bypasses normal JSON parsing for /webhooks so it can verify the raw body signature.",
  },
  {
    issue: "Push delivery is accepted but no pipeline starts",
    fix: "Only pushes to main create pipeline runs. Pushes to other branches are acknowledged and ignored.",
  },
  {
    issue: "Workflow run delivery is ignored",
    fix: "Pass runId or run_id in workflow dispatch inputs so the workflow_run event can update the correct execution run.",
  },
  {
    issue: "Health endpoint is unhealthy",
    fix: "Check Redis and queue connectivity. The health response includes the failing dependency and last webhook error when available.",
  },
];

export default function GithubWebhooksDocs() {
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
                    item.active ? "bg-white text-black" : "text-white/70 hover:bg-white hover:text-black"
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
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Event Integration</p>
                  <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                    GitHub webhooks setup for pipeline triggers and workflow status.
                  </h1>
                  <p className="mt-4 text-sm leading-6 text-white/65">
                    GitHub webhooks let a repository notify Orchestrate Studio when code is pushed or a workflow run
                    changes state. The backend verifies each delivery with the GitHub HMAC signature before it queues
                    platform work.
                  </p>
                </div>
                <div className="grid w-full max-w-sm grid-cols-2 gap-2">
                  <div className="border border-white/10 bg-white/[0.03] p-4">
                    <Webhook className="h-5 w-5 text-white" />
                    <p className="mt-3 text-xs text-white/50">Public webhook route</p>
                  </div>
                  <div className="border border-white/10 bg-white/[0.03] p-4">
                    <KeyRound className="h-5 w-5 text-white" />
                    <p className="mt-3 text-xs text-white/50">HMAC verified payloads</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-8">
              <div className="mb-5 flex items-center gap-3">
                <Webhook className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">How To Configure It</h2>
                  <p className="text-sm text-white/55">Use this order when adding the webhook in GitHub.</p>
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
                <Server className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">GitHub Webhook Settings</h2>
                  <p className="text-sm text-white/55">Values to enter in the repository webhook form.</p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <article className="border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">Payload URL</p>
                  <code className="mt-2 block overflow-x-auto bg-black p-3 text-xs text-white/75">
                    https://your-api.example.com/webhooks/github
                  </code>
                  <p className="mt-3 text-xs leading-5 text-white/55">
                    Use your backend host. For local testing, replace the host with your tunnel URL.
                  </p>
                </article>
                <article className="border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">Content type</p>
                  <code className="mt-2 block bg-black p-3 text-xs text-white/75">application/json</code>
                  <p className="mt-3 text-xs leading-5 text-white/55">
                    The backend verifies the raw JSON body before parsing it.
                  </p>
                </article>
                <article className="border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">Secret</p>
                  <code className="mt-2 block bg-black p-3 text-xs text-white/75">GITHUB_WEBHOOK_SECRET</code>
                  <p className="mt-3 text-xs leading-5 text-white/55">
                    GitHub and the backend must use the same value for signature verification.
                  </p>
                </article>
              </div>
            </section>

            <section className="border-t border-white/10 py-8">
              <div className="mb-5 flex items-center gap-3">
                <Workflow className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Event Behavior</h2>
                  <p className="text-sm text-white/55">What the backend does with each supported GitHub event.</p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {eventBehavior.map((item) => (
                  <article key={item.event} className="border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-white" />
                      <h3 className="text-sm font-semibold text-white">{item.event}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/60">{item.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="border-t border-white/10 py-8">
              <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Verification Contract</h2>
                  <p className="text-sm text-white/55">Headers and routes used by the webhook receiver.</p>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white">Required headers</p>
                  <div className="mt-3 space-y-2">
                    {requestHeaders.map((header) => (
                      <code key={header} className="block overflow-x-auto bg-black p-3 text-xs text-white/75">
                        {header}
                      </code>
                    ))}
                  </div>
                </div>
                <div className="border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white">Receiver endpoints</p>
                  <pre className="mt-3 overflow-x-auto bg-black p-3 text-xs leading-5 text-white/75">
                    <code>{`POST /webhooks/github
GET  /webhooks/github/health`}</code>
                  </pre>
                  <p className="mt-3 text-xs leading-5 text-white/55">
                    These routes do not require a user Bearer token. Signature verification is the access control for
                    incoming GitHub deliveries.
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-6 border-t border-white/10 py-8 lg:grid-cols-2">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                  <div>
                    <h2 className="text-xl font-semibold text-white">Readiness Checklist</h2>
                    <p className="text-sm text-white/55">Confirm these before testing deliveries.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {readinessChecks.map((check) => (
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
                    <h2 className="text-xl font-semibold text-white">Health Response</h2>
                    <p className="text-sm text-white/55">Fields returned by the backend health endpoint.</p>
                  </div>
                </div>
                <div className="border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap gap-2">
                    {healthFields.map((field) => (
                      <span key={field} className="border border-white/10 bg-black px-2 py-1 text-xs text-white/65">
                        {field}
                      </span>
                    ))}
                  </div>
                  <pre className="mt-4 overflow-x-auto bg-black p-3 text-xs leading-5 text-white/75">
                    <code>{`{
  "success": true,
  "data": {
    "integration": "github-webhook",
    "healthy": true,
    "redis": { "connected": true },
    "queue": { "healthy": true },
    "lastProcessedAt": "2026-05-05T10:30:00.000Z",
    "lastError": null
  }
}`}</code>
                  </pre>
                </div>
              </div>
            </section>

            <section className="border-t border-white/10 py-8">
              <div className="mb-5 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Troubleshooting</h2>
                  <p className="text-sm text-white/55">Most webhook failures come from URL, content type, branch, or secret mismatch.</p>
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
