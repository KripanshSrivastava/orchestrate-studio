import { useState } from "react";
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
} from "lucide-react";
import useIntegrations from "@/hooks/useIntegrations";
import { IntegrationDefinition } from "@/lib/integrationCatalog";

type Section = "integrations" | "secrets" | "notifications" | "environments" | "ai";

const sections = [
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

export default function Settings() {
  const [activeSection, setActiveSection] = useState<Section>("integrations");
  const { groupedIntegrations, getState, connectIntegration, disconnectIntegration, isLoading, error, secretProviders } = useIntegrations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
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

                      return (
                        <div key={integration.id} className="rounded-md border border-border/60 bg-background/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm text-foreground">{integration.name}</p>
                              <p className="text-xs text-muted-foreground">{integration.description}</p>
                            </div>
                            {integrationState.connected ? (
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

                          {isEditing && (
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
            <div className="glass-panel p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Secret Providers</h3>
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
                    No provider data available. Save an integration to initialize provider status.
                  </div>
                )}
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
