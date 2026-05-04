import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  GitBranch,
  Play,
  Box,
  Key,
  Bell,
  Globe,
  Brain,
  ChevronRight,
  Check,
  ToggleLeft,
  ToggleRight,
  Clock3,
  RefreshCcw,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import useIntegrations from "@/hooks/useIntegrations";
import type { SecretProviderId } from "@/hooks/useIntegrations";
import { IntegrationDefinition } from "@/lib/integrationCatalog";
import { apiCall } from "@/lib/apiClient";

type Section = "cloud" | "integrations" | "secrets" | "notifications" | "environments" | "ai";
type CloudMode = "platform-managed" | "bring-aws" | "self-managed";
type EstimateCurrency = "INR" | "USDT" | "USD";
type ProvisionSource = "platform-template" | "user-terraform";

interface TerraformModuleDraft {
  id: string;
  name: string;
  description: string;
  code: string;
}

interface AwsConnectionState {
  id: string;
  name: string;
  account_id: string;
  region: string;
  role_arn: string;
  status: string;
}

interface ProvisioningJobState {
  id: string;
  status: string;
  approval_status: string;
  source: ProvisionSource;
  plan_log?: string;
  apply_log?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

const sections = [
  { key: "cloud" as const, label: "Cloud Setup", icon: Globe },
  { key: "integrations" as const, label: "Platform Integrations", icon: Play },
  { key: "secrets" as const, label: "Secrets Management", icon: Key },
  { key: "notifications" as const, label: "Notifications", icon: Bell },
  { key: "environments" as const, label: "Environment Settings", icon: Globe },
  { key: "ai" as const, label: "AI Insights", icon: Brain },
];

const notificationChannels = [
  { name: "Slack", channel: "#devops-alerts", enabled: true },
  { name: "Email", channel: "team@company.com", enabled: true },
  { name: "PagerDuty", channel: "Production Service", enabled: false },
];

const environments = [
  { name: "Development", cluster: "dev-cluster-01", namespace: "dev", status: "active" },
  { name: "Staging", cluster: "stage-cluster-01", namespace: "staging", status: "active" },
  { name: "Production", cluster: "prod-cluster-01", namespace: "production", status: "active" },
];

const aiFeatures = [
  { name: "Log Anomaly Detection", description: "AI-powered detection of unusual log patterns and error spikes", enabled: true },
  { name: "Deployment Risk Prediction", description: "Predict deployment failure probability based on historical data", enabled: false },
  { name: "Auto-scaling Recommendations", description: "ML-based scaling suggestions based on traffic patterns", enabled: false },
  { name: "Security Threat Detection", description: "Detect potential security threats from runtime behavior", enabled: true },
];

const usdToInr = 94.91;
const estimateHoursPerMonth = 730;

const cloudModes: Array<{
  id: CloudMode;
  label: string;
  description: string;
}> = [
  {
    id: "platform-managed",
    label: "Create from our platform",
    description: "Use AWS auth to provision and manage the required platform tooling automatically.",
  },
  {
    id: "bring-aws",
    label: "Use existing AWS resources",
    description: "Connect AWS and let the platform discover clusters, registries, load balancers, and observability endpoints.",
  },
  {
    id: "self-managed",
    label: "Created by user",
    description: "Keep manually hosted tools and use Platform Integrations for only the endpoints and credentials you choose.",
  },
];

const estimatesByMode: Record<CloudMode, Array<{ label: string; monthlyUsd: number; note: string }>> = {
  "platform-managed": [
    { label: "EKS control plane", monthlyUsd: 0.1 * estimateHoursPerMonth, note: "$0.10/hour AWS EKS standard support" },
    { label: "Platform tooling compute", monthlyUsd: 45, note: "Starter estimate for ArgoCD, monitoring, and controllers" },
    { label: "Load balancer and ingress", monthlyUsd: 25, note: "Planning placeholder; traffic/LCU changes this" },
    { label: "Logs, metrics, and storage", monthlyUsd: 30, note: "Depends on retention and ingestion volume" },
  ],
  "bring-aws": [
    { label: "Discovery and control-plane integration", monthlyUsd: 0, note: "Uses resources already present in the AWS account" },
    { label: "Incremental platform-managed tooling", monthlyUsd: 20, note: "Only for optional agents/controllers installed by the platform" },
  ],
  "self-managed": [
    { label: "Platform-created cloud resources", monthlyUsd: 0, note: "No AWS resources are created by the platform" },
    { label: "External service cost", monthlyUsd: 0, note: "Paid outside this platform by the user's own setup" },
  ],
};

export default function Settings() {
  const [activeSection, setActiveSection] = useState<Section>("cloud");
  const [cloudMode, setCloudMode] = useState<CloudMode>("platform-managed");
  const [provisionSource, setProvisionSource] = useState<ProvisionSource>("platform-template");
  const [estimateCurrency, setEstimateCurrency] = useState<EstimateCurrency>("INR");
  const [awsDraft, setAwsDraft] = useState({
    name: "default-aws",
    accountId: "",
    region: "ap-south-1",
    roleArn: "",
    externalId: "",
  });
  const [awsConnections, setAwsConnections] = useState<AwsConnectionState[]>([]);
  const [selectedAwsConnectionId, setSelectedAwsConnectionId] = useState("");
  const [provisioningJobs, setProvisioningJobs] = useState<ProvisioningJobState[]>([]);
  const [activeProvisioningJob, setActiveProvisioningJob] = useState<ProvisioningJobState | null>(null);
  const [terraformModules, setTerraformModules] = useState<TerraformModuleDraft[]>([
    {
      id: "core-platform",
      name: "Core platform",
      description: "EKS, namespaces, ingress, and platform controllers",
      code: "",
    },
  ]);
  const {
    groupedIntegrations,
    getState,
    connectIntegration,
    disconnectIntegration,
    refreshIntegrations,
    saveUserSecret,
    deleteUserSecret,
    isLoading,
    error,
    secretProviders,
    userSecrets,
  } = useIntegrations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [secretDraft, setSecretDraft] = useState({
    id: "",
    name: "",
    value: "",
    provider: "openbao" as SecretProviderId,
  });
  const [actionError, setActionError] = useState<string>("");

  const startEditing = (integration: IntegrationDefinition) => {
    const integrationState = getState(integration.id);
    setEditingId(integration.id);
    setDraftValues(integrationState.values || {});
  };

  const saveEditing = async (integration: IntegrationDefinition) => {
    const values = integration.fields.reduce<Record<string, string>>((acc, field) => {
      acc[field.key] = (draftValues[field.key] || "").trim();
      return acc;
    }, {});

    setActionError("");

    try {
      await connectIntegration(integration.id, values);
      setEditingId(null);
      setDraftValues({});
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save integration");
    }
  };

  const saveSecret = async () => {
    setActionError("");

    try {
      const id = secretDraft.id.trim() || secretDraft.name.trim().toLowerCase().replace(/\s+/g, "-");
      await saveUserSecret({
        ...secretDraft,
        id,
      });
      setSecretDraft({
        id: "",
        name: "",
        value: "",
        provider: "openbao",
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save secret");
    }
  };

  const formatEstimate = (monthlyUsd: number) => {
    if (estimateCurrency === "INR") {
      return `₹${Math.round(monthlyUsd * usdToInr).toLocaleString("en-IN")}`;
    }

    if (estimateCurrency === "USDT") {
      return `${monthlyUsd.toFixed(2)} USDT`;
    }

    return `$${monthlyUsd.toFixed(2)}`;
  };

  const selectedEstimate = estimatesByMode[cloudMode];
  const selectedEstimateTotal = selectedEstimate.reduce((total, item) => total + item.monthlyUsd, 0);

  const loadProvisioningState = async () => {
    try {
      const [connectionsResponse, jobsResponse] = await Promise.all([
        apiCall(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/provisioning/aws/connections`),
        apiCall(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/provisioning/jobs`),
      ]);

      if (connectionsResponse.ok) {
        const data = await connectionsResponse.json();
        const connections = data.connections || [];
        setAwsConnections(connections);
        if (!selectedAwsConnectionId && connections[0]?.id) {
          setSelectedAwsConnectionId(connections[0].id);
        }
      }

      if (jobsResponse.ok) {
        const data = await jobsResponse.json();
        setProvisioningJobs(data.jobs || []);
      }
    } catch {
      // Provisioning APIs are optional while the backend is being started.
    }
  };

  useEffect(() => {
    loadProvisioningState();
  }, []);

  const updateTerraformModule = (
    id: string,
    patch: Partial<Omit<TerraformModuleDraft, "id">>
  ) => {
    setTerraformModules((prev) =>
      prev.map((module) => (module.id === id ? { ...module, ...patch } : module))
    );
  };

  const addTerraformModule = () => {
    const nextIndex = terraformModules.length + 1;
    setTerraformModules((prev) => [
      ...prev,
      {
        id: `terraform-module-${Date.now()}`,
        name: `Terraform module ${nextIndex}`,
        description: "",
        code: "",
      },
    ]);
  };

  const removeTerraformModule = (id: string) => {
    setTerraformModules((prev) => prev.filter((module) => module.id !== id));
  };

  const saveAwsConnection = async () => {
    setActionError("");

    try {
      const response = await apiCall(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/provisioning/aws/connections`, {
        method: "POST",
        body: JSON.stringify(awsDraft),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to save AWS connection");
      }

      setAwsConnections((prev) => [
        data.connection,
        ...prev.filter((connection) => connection.id !== data.connection.id),
      ]);
      setSelectedAwsConnectionId(data.connection.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save AWS connection");
    }
  };

  const createProvisioningJob = async () => {
    setActionError("");

    if (!selectedAwsConnectionId) {
      setActionError("Save or select an AWS connection before creating a provisioning job.");
      return null;
    }

    try {
      const response = await apiCall(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/provisioning/jobs`, {
        method: "POST",
        body: JSON.stringify({
          awsConnectionId: selectedAwsConnectionId,
          source: provisionSource,
          modules: provisionSource === "user-terraform" ? terraformModules : [],
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to create provisioning job");
      }

      setActiveProvisioningJob(data.job);
      setProvisioningJobs((prev) => [data.job, ...prev]);
      return data.job as ProvisioningJobState;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create provisioning job");
      return null;
    }
  };

  const runTerraformPlan = async () => {
    const job = activeProvisioningJob || await createProvisioningJob();
    if (!job) {
      return;
    }

    setActionError("");

    try {
      const response = await apiCall(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/provisioning/jobs/${job.id}/plan`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to run terraform plan");
      }

      setActiveProvisioningJob(data.job);
      setProvisioningJobs((prev) => prev.map((item) => item.id === data.job.id ? data.job : item));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to run terraform plan");
    }
  };

  const runTerraformApply = async () => {
    if (!activeProvisioningJob) {
      setActionError("Run a successful plan before apply.");
      return;
    }

    setActionError("");

    try {
      const response = await apiCall(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/provisioning/jobs/${activeProvisioningJob.id}/apply`, {
        method: "POST",
        body: JSON.stringify({ approved: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to run terraform apply");
      }

      setActiveProvisioningJob(data.job);
      setProvisioningJobs((prev) => prev.map((item) => item.id === data.job.id ? data.job : item));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to run terraform apply");
    }
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground">Platform configuration and integrations</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 shrink-0 space-y-1">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === s.key
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
              <ChevronRight className="w-3 h-3 ml-auto" />
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {actionError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {actionError}
            </div>
          )}

          {isLoading && (
            <div className="rounded-md border border-border/60 bg-card/50 px-3 py-2 text-sm text-muted-foreground">
              Loading secure integration settings...
            </div>
          )}

          {activeSection === "cloud" && (
            <div className="space-y-4">
              <div className="glass-panel p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">AWS Provisioning Mode</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose how this platform should handle infrastructure and managed tooling.
                    </p>
                  </div>

                  <div className="flex rounded-md border border-border/60 bg-background/20 p-1">
                    {(["INR", "USDT", "USD"] as EstimateCurrency[]).map((currency) => (
                      <button
                        key={currency}
                        onClick={() => setEstimateCurrency(currency)}
                        className={`px-2.5 py-1 text-xs rounded ${
                          estimateCurrency === currency
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {currency}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
                  {cloudModes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setCloudMode(mode.id)}
                      className={`text-left rounded-md border p-3 transition-colors ${
                        cloudMode === mode.id
                          ? "border-primary/60 bg-primary/10"
                          : "border-border/60 bg-background/20 hover:bg-accent/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{mode.label}</p>
                        {cloudMode === mode.id && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{mode.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
                <div className="glass-panel p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">AWS Auth</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Connection Name</label>
                      <input
                        value={awsDraft.name}
                        onChange={(e) => setAwsDraft((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="production-aws"
                        className="w-full mt-1 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">AWS Account ID</label>
                      <input
                        value={awsDraft.accountId}
                        onChange={(e) => setAwsDraft((prev) => ({ ...prev, accountId: e.target.value }))}
                        placeholder="123456789012"
                        className="w-full mt-1 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Region</label>
                      <input
                        value={awsDraft.region}
                        onChange={(e) => setAwsDraft((prev) => ({ ...prev, region: e.target.value }))}
                        placeholder="ap-south-1"
                        className="w-full mt-1 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Role ARN</label>
                      <input
                        value={awsDraft.roleArn}
                        onChange={(e) => setAwsDraft((prev) => ({ ...prev, roleArn: e.target.value }))}
                        placeholder="arn:aws:iam::123456789012:role/idp-platform"
                        className="w-full mt-1 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">External ID</label>
                      <input
                        value={awsDraft.externalId}
                        onChange={(e) => setAwsDraft((prev) => ({ ...prev, externalId: e.target.value }))}
                        placeholder="auto-generated if empty"
                        className="w-full mt-1 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0 md:w-96">
                      <label className="text-xs font-medium text-muted-foreground">AWS Connection</label>
                      <select
                        value={selectedAwsConnectionId}
                        onChange={(e) => setSelectedAwsConnectionId(e.target.value)}
                        className="w-full mt-1 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">No AWS connection selected</option>
                        {awsConnections.map((connection) => (
                          <option key={connection.id} value={connection.id}>
                            {connection.name} / {connection.account_id} / {connection.region}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={saveAwsConnection}
                      className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      Save AWS Connection
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-md border border-border/60 bg-background/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What the platform handles</p>
                      <div className="mt-2 space-y-1 text-sm text-foreground">
                        {cloudMode === "platform-managed" && (
                          <>
                            <p>Provision EKS and platform namespaces</p>
                            <p>Install ArgoCD, monitoring, and alerting</p>
                            <p>Store discovered endpoints and tokens in the selected secret provider</p>
                          </>
                        )}
                        {cloudMode === "bring-aws" && (
                          <>
                            <p>Discover clusters, registries, load balancers, and observability endpoints</p>
                            <p>Attach lightweight controllers only when required</p>
                            <p>Keep existing AWS ownership boundaries intact</p>
                          </>
                        )}
                        {cloudMode === "self-managed" && (
                          <>
                            <p>No AWS resources are created by the platform</p>
                            <p>Manual Platform Integration fields stay available</p>
                            <p>Workflow engine asks for runtime-specific values</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="rounded-md border border-border/60 bg-background/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workflow engine will ask later</p>
                      <div className="mt-2 space-y-1 text-sm text-foreground">
                        <p>Repository, branch, workflow file</p>
                        <p>Docker image and target registry path</p>
                        <p>Cluster, namespace, environment, severity policy</p>
                      </div>
                    </div>
                  </div>

                  {cloudMode === "platform-managed" && (
                    <div className="mt-4 rounded-md border border-border/60 bg-background/20 p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provisioning Source</p>
                          <p className="text-sm text-foreground mt-1">
                            Choose platform templates or upload Terraform modules that the provisioning pipeline can plan and apply.
                          </p>
                        </div>

                        <div className="flex rounded-md border border-border/60 bg-background/30 p-1">
                          {[
                            { id: "platform-template" as const, label: "Platform templates" },
                            { id: "user-terraform" as const, label: "User Terraform" },
                          ].map((source) => (
                            <button
                              key={source.id}
                              onClick={() => setProvisionSource(source.id)}
                              className={`px-2.5 py-1 text-xs rounded ${
                                provisionSource === source.id
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {source.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {provisionSource === "platform-template" && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                          {["EKS baseline", "ArgoCD + GitOps", "Monitoring stack"].map((template) => (
                            <div key={template} className="rounded border border-border/60 bg-secondary/40 p-3">
                              <p className="text-sm font-medium text-foreground">{template}</p>
                              <p className="text-xs text-muted-foreground mt-1">Managed module maintained by the platform.</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {provisionSource === "user-terraform" && (
                        <div className="mt-3 space-y-3">
                          <div className="rounded-md border border-warning/30 bg-warning/10 p-3">
                            <p className="text-sm text-foreground">Terraform execution should run through backend jobs with plan review, isolated credentials, remote state, and explicit approval before apply.</p>
                          </div>

                          {terraformModules.map((module, index) => (
                            <div key={module.id} className="rounded-md border border-border/60 bg-background/30 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-foreground">Module {index + 1}</p>
                                {terraformModules.length > 1 && (
                                  <button
                                    onClick={() => removeTerraformModule(module.id)}
                                    className="px-2.5 py-1 rounded-md bg-destructive/15 text-xs text-destructive hover:bg-destructive/25 transition-colors"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                <div>
                                  <label className="text-xs font-medium text-muted-foreground">Module Name</label>
                                  <input
                                    value={module.name}
                                    onChange={(e) => updateTerraformModule(module.id, { name: e.target.value })}
                                    placeholder="networking, eks, monitoring"
                                    className="w-full mt-1 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                  />
                                </div>

                                <div>
                                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                                  <input
                                    value={module.description}
                                    onChange={(e) => updateTerraformModule(module.id, { description: e.target.value })}
                                    placeholder="What this module creates"
                                    className="w-full mt-1 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                  />
                                </div>
                              </div>

                              <div className="mt-3">
                                <label className="text-xs font-medium text-muted-foreground">Terraform Code</label>
                                <textarea
                                  value={module.code}
                                  onChange={(e) => updateTerraformModule(module.id, { code: e.target.value })}
                                  placeholder={'resource "aws_s3_bucket" "example" {\n  bucket = "my-platform-bucket"\n}'}
                                  className="w-full min-h-40 mt-1 bg-secondary border-0 rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                              </div>
                            </div>
                          ))}

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <button
                              onClick={addTerraformModule}
                              className="px-3 py-1.5 rounded-md bg-secondary text-xs text-foreground hover:bg-accent transition-colors"
                            >
                              Add Terraform Module
                            </button>
                            <button
                              onClick={createProvisioningJob}
                              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                            >
                              Prepare Provisioning Request
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 rounded-md border border-border/60 bg-background/20 p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provisioning Job</p>
                        <p className="text-sm text-foreground mt-1">
                          {activeProvisioningJob
                            ? `Active job ${activeProvisioningJob.id} is ${activeProvisioningJob.status}`
                            : "Create a job, run plan, review logs, then apply with approval."}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={runTerraformPlan}
                          className="px-3 py-1.5 rounded-md bg-secondary text-xs text-foreground hover:bg-accent transition-colors"
                        >
                          Run Plan
                        </button>
                        <button
                          onClick={runTerraformApply}
                          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                        >
                          Approve & Apply
                        </button>
                      </div>
                    </div>

                    {provisioningJobs.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {provisioningJobs.slice(0, 4).map((job) => (
                          <button
                            key={job.id}
                            onClick={() => setActiveProvisioningJob(job)}
                            className={`text-left rounded border p-2 ${
                              activeProvisioningJob?.id === job.id
                                ? "border-primary/60 bg-primary/10"
                                : "border-border/60 bg-background/30 hover:bg-accent/30"
                            }`}
                          >
                            <p className="text-xs font-medium text-foreground">{job.status} / {job.approval_status}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(job.created_at).toLocaleString()}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {activeProvisioningJob && (
                      <div className="mt-3 space-y-2">
                        {activeProvisioningJob.error_message && (
                          <div className="rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                            {activeProvisioningJob.error_message}
                          </div>
                        )}
                        {(activeProvisioningJob.plan_log || activeProvisioningJob.apply_log) && (
                          <pre className="max-h-72 overflow-auto rounded-md bg-black/40 p-3 text-xs text-foreground">
                            {activeProvisioningJob.apply_log || activeProvisioningJob.plan_log}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-panel p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Monthly Estimate</h3>
                    <span className="text-xs text-muted-foreground">{estimateCurrency}</span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {selectedEstimate.map((item) => (
                      <div key={item.label} className="rounded-md border border-border/60 bg-background/20 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-foreground">{item.label}</p>
                          <p className="text-sm font-medium text-foreground">{formatEstimate(item.monthlyUsd)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{item.note}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-md border border-primary/30 bg-primary/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">Estimated total</p>
                      <p className="text-sm font-semibold text-foreground">{formatEstimate(selectedEstimateTotal)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Planning estimate only. Actual AWS billing depends on region, traffic, storage, node size, and retention.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "integrations" && (
            <>
              {Object.entries(groupedIntegrations).map(([group, items]) => (
                <div key={group} className="glass-panel p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    {group === "CI Tools" ? <Play className="w-4 h-4 text-primary" /> :
                     group === "Git Providers" ? <GitBranch className="w-4 h-4 text-primary" /> :
                     <Box className="w-4 h-4 text-primary" />}
                    {group}
                  </h3>
                  <div className="space-y-2">
                    {items.map((integration) => {
                      const integrationState = getState(integration.id);
                      const isEditing = editingId === integration.id;
                      const hasSettingsFields = integration.fields.length > 0;

                      return (
                        <div key={integration.id} className="rounded-md border border-border/60 bg-background/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm text-foreground">{integration.name}</p>
                              <p className="text-xs text-muted-foreground">{integration.description}</p>
                            </div>
                            {!hasSettingsFields ? (
                              <span className="rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                                Configured in workflow
                              </span>
                            ) : integrationState.connected ? (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-xs text-success">
                                  <Check className="w-3.5 h-3.5" /> Connected
                                </span>
                                <button
                                  onClick={() => startEditing(integration)}
                                  className="px-2.5 py-1 rounded-md bg-secondary text-xs text-foreground hover:bg-accent transition-colors"
                                >
                                  Configure
                                </button>
                                <button
                                  onClick={async () => {
                                    setActionError("");
                                    try {
                                      await disconnectIntegration(integration.id);
                                    } catch (err) {
                                      setActionError(err instanceof Error ? err.message : "Failed to disconnect integration");
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-destructive/15 text-xs text-destructive hover:bg-destructive/25 transition-colors"
                                >
                                  Disconnect
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditing(integration)}
                                className="px-3 py-1 rounded-md bg-secondary text-xs text-foreground hover:bg-accent transition-colors"
                              >
                                Connect
                              </button>
                            )}
                          </div>

                          {integration.id === "github" && integrationState.verification && (
                            <div
                              className={`mt-3 rounded-md border p-3 ${
                                integrationState.verification.healthy
                                  ? "border-success/30 bg-success/10"
                                  : "border-warning/30 bg-warning/10"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    GitHub SDK Status
                                  </p>
                                  <p className="text-sm text-foreground mt-1">
                                    {integrationState.verification.healthy ? integrationState.verification.message : integrationState.verification.message}
                                  </p>
                                </div>
                                <button
                                  onClick={refreshIntegrations}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-xs text-foreground hover:bg-accent transition-colors"
                                >
                                  <RefreshCcw className="w-3 h-3" /> Refresh
                                </button>
                              </div>

                              {integrationState.verification.repository && (
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-foreground">
                                  <div className="rounded border border-border/60 bg-background/20 p-2">
                                    <p className="text-muted-foreground uppercase tracking-wider mb-0.5">Repository</p>
                                    <p className="font-medium flex items-center gap-1.5">
                                      {integrationState.verification.repository.fullName}
                                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                    </p>
                                  </div>
                                  <div className="rounded border border-border/60 bg-background/20 p-2">
                                    <p className="text-muted-foreground uppercase tracking-wider mb-0.5">Default Branch</p>
                                    <p className="font-medium">{integrationState.verification.repository.defaultBranch}</p>
                                  </div>
                                  <div className="rounded border border-border/60 bg-background/20 p-2 md:col-span-2">
                                    <p className="text-muted-foreground uppercase tracking-wider mb-0.5">Latest Workflow Run</p>
                                    {integrationState.verification.repository.latestWorkflowRun ? (
                                      <p className="font-medium flex flex-wrap items-center gap-2">
                                        <span>{integrationState.verification.repository.latestWorkflowRun.name}</span>
                                        <span className="text-muted-foreground">
                                          {integrationState.verification.repository.latestWorkflowRun.status}
                                          {integrationState.verification.repository.latestWorkflowRun.conclusion
                                            ? ` / ${integrationState.verification.repository.latestWorkflowRun.conclusion}`
                                            : ""}
                                        </span>
                                        <ShieldCheck className="w-3 h-3 text-success" />
                                      </p>
                                    ) : (
                                      <p className="font-medium text-muted-foreground">No workflow runs found yet</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {integration.id === "github-actions" && integrationState.verification && (
                            <div
                              className={`mt-3 rounded-md border p-3 ${
                                integrationState.verification.healthy
                                  ? "border-success/30 bg-success/10"
                                  : "border-warning/30 bg-warning/10"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    GitHub Actions Status
                                  </p>
                                  <p className="text-sm text-foreground mt-1">
                                    {integrationState.verification.message}
                                  </p>
                                </div>
                                <button
                                  onClick={refreshIntegrations}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-xs text-foreground hover:bg-accent transition-colors"
                                >
                                  <RefreshCcw className="w-3 h-3" /> Refresh
                                </button>
                              </div>

                              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-foreground">
                                <div className="rounded border border-border/60 bg-background/20 p-2">
                                  <p className="text-muted-foreground uppercase tracking-wider mb-0.5">Workflow</p>
                                  <p className="font-medium">
                                    {integrationState.verification.configuredWorkflow?.name ||
                                      integrationState.verification.workflowFile ||
                                      "Not configured"}
                                  </p>
                                </div>
                                <div className="rounded border border-border/60 bg-background/20 p-2">
                                  <p className="text-muted-foreground uppercase tracking-wider mb-0.5">Branch</p>
                                  <p className="font-medium">{integrationState.verification.branch || "Not configured"}</p>
                                </div>
                                <div className="rounded border border-border/60 bg-background/20 p-2">
                                  <p className="text-muted-foreground uppercase tracking-wider mb-0.5">Workflows Found</p>
                                  <p className="font-medium">{integrationState.verification.workflows?.length || 0}</p>
                                </div>
                                <div className="rounded border border-border/60 bg-background/20 p-2 md:col-span-3">
                                  <p className="text-muted-foreground uppercase tracking-wider mb-0.5">Latest Workflow Run</p>
                                  {integrationState.verification.latestWorkflowRun ? (
                                    <p className="font-medium flex flex-wrap items-center gap-2">
                                      <span>{integrationState.verification.latestWorkflowRun.name}</span>
                                      <span className="text-muted-foreground">
                                        {integrationState.verification.latestWorkflowRun.status}
                                        {integrationState.verification.latestWorkflowRun.conclusion
                                          ? ` / ${integrationState.verification.latestWorkflowRun.conclusion}`
                                          : ""}
                                      </span>
                                      <ShieldCheck className="w-3 h-3 text-success" />
                                    </p>
                                  ) : (
                                    <p className="font-medium text-muted-foreground">No workflow runs found yet</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {!["github", "github-actions"].includes(integration.id) && integrationState.verification && (
                            <div
                              className={`mt-3 rounded-md border p-3 ${
                                integrationState.verification.healthy
                                  ? "border-success/30 bg-success/10"
                                  : "border-warning/30 bg-warning/10"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {integration.name} Status
                                  </p>
                                  <p className="text-sm text-foreground mt-1">
                                    {integrationState.verification.message}
                                  </p>
                                </div>
                                <button
                                  onClick={refreshIntegrations}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-xs text-foreground hover:bg-accent transition-colors"
                                >
                                  <RefreshCcw className="w-3 h-3" /> Refresh
                                </button>
                              </div>

                              {integrationState.verification.details && (
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-foreground">
                                  {Object.entries(integrationState.verification.details).map(([key, value]) => (
                                    <div key={key} className="rounded border border-border/60 bg-background/20 p-2">
                                      <p className="text-muted-foreground uppercase tracking-wider mb-0.5">
                                        {key.replace(/([A-Z])/g, " $1")}
                                      </p>
                                      <p className="font-medium break-words">
                                        {value === null || value === "" ? "Not available" : String(value)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {isEditing && hasSettingsFields && (
                            <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                              {integration.fields.map((field) => (
                                <div key={field.key}>
                                  <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                                  <input
                                    type={field.type || "text"}
                                    value={draftValues[field.key] || ""}
                                    onChange={(e) =>
                                      setDraftValues((prev) => ({
                                        ...prev,
                                        [field.key]: e.target.value,
                                      }))
                                    }
                                    placeholder={field.placeholder}
                                    className="w-full mt-1 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                  />
                                </div>
                              ))}

                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => saveEditing(integration)}
                                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                                >
                                  Save Integration
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(null);
                                    setDraftValues({});
                                  }}
                                  className="px-3 py-1.5 rounded-md bg-secondary text-xs text-foreground hover:bg-accent transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {activeSection === "secrets" && (
            <div className="space-y-4">
              <div className="glass-panel p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Secret Provider</h3>
                <div className="space-y-3">
                  {secretProviders.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/30 transition-colors border border-border/50">
                      <div>
                        <p className="text-sm text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.details}</p>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                          <Clock3 className="w-3 h-3" />
                          {p.updatedAt ? `Updated ${new Date(p.updatedAt).toLocaleString()}` : "No updates yet"}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 text-xs ${p.connected ? "text-success" : "text-warning"}`}>
                          <Check className="w-3.5 h-3.5" /> {p.connected ? "Connected" : "Not Connected"}
                        </span>
                        <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider">{p.mode}</p>
                      </div>
                    </div>
                  ))}

                  {secretProviders.length === 0 && (
                    <div className="text-xs text-muted-foreground px-1">
                      OpenBao provider status is not available yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-panel p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Store Secret</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Secret Name</label>
                    <input
                      value={secretDraft.name}
                      onChange={(e) => setSecretDraft((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="GitHub production token"
                      className="w-full mt-1 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Secret ID</label>
                    <input
                      value={secretDraft.id}
                      onChange={(e) => setSecretDraft((prev) => ({ ...prev, id: e.target.value }))}
                      placeholder="github-production-token"
                      className="w-full mt-1 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Provider</label>
                    <select
                      value={secretDraft.provider}
                      onChange={(e) =>
                        setSecretDraft((prev) => ({
                          ...prev,
                          provider: e.target.value as SecretProviderId,
                        }))
                      }
                      className="w-full mt-1 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {secretProviders.map((provider) => (
                        <option key={provider.id} value={provider.id} disabled={!provider.writable || !provider.connected}>
                          {provider.name}{provider.writable && provider.connected ? "" : " (not configured)"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Secret Value</label>
                    <input
                      type="password"
                      value={secretDraft.value}
                      onChange={(e) => setSecretDraft((prev) => ({ ...prev, value: e.target.value }))}
                      placeholder="Paste secret value"
                      className="w-full mt-1 bg-secondary border-0 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3">
                  <button
                    onClick={saveSecret}
                    className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    Save Secret
                  </button>
                </div>
              </div>

              <div className="glass-panel p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Stored Secrets</h3>
                <div className="space-y-2">
                  {userSecrets.map((secret) => (
                    <div key={secret.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/20 p-3">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">{secret.name}</p>
                        <p className="text-xs text-muted-foreground break-all">{secret.path}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Updated {new Date(secret.updatedAt).toLocaleString()} via {secret.provider}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          setActionError("");
                          try {
                            await deleteUserSecret(secret.id, secret.provider);
                          } catch (err) {
                            setActionError(err instanceof Error ? err.message : "Failed to delete secret");
                          }
                        }}
                        className="px-2.5 py-1 rounded-md bg-destructive/15 text-xs text-destructive hover:bg-destructive/25 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ))}

                  {userSecrets.length === 0 && (
                    <div className="text-xs text-muted-foreground px-1">
                      No user secrets stored yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="glass-panel p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Notification Channels</h3>
              <div className="space-y-3">
                {notificationChannels.map((ch) => (
                  <div key={ch.name} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/30 transition-colors">
                    <div>
                      <p className="text-sm text-foreground">{ch.name}</p>
                      <p className="text-xs text-muted-foreground">{ch.channel}</p>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      {ch.enabled ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "environments" && (
            <div className="glass-panel p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Environments</h3>
              <div className="space-y-3">
                {environments.map((env) => (
                  <div key={env.name} className="flex items-center justify-between py-3 px-3 rounded-md hover:bg-accent/30 transition-colors border border-border/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">{env.name}</p>
                      <p className="text-xs text-muted-foreground">Cluster: {env.cluster} · Namespace: {env.namespace}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-success">
                      <span className="w-2 h-2 rounded-full bg-success" /> {env.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "ai" && (
            <div className="glass-panel p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">AI-Powered Insights</h3>
              <div className="space-y-3">
                {aiFeatures.map((f) => (
                  <div key={f.name} className="flex items-center justify-between py-3 px-3 rounded-md hover:bg-accent/30 transition-colors">
                    <div>
                      <p className="text-sm text-foreground">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      {f.enabled ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
