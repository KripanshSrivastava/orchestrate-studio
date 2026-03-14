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
} from "lucide-react";

type Section = "integrations" | "secrets" | "notifications" | "environments" | "ai";

const sections = [
  { key: "integrations" as const, label: "Platform Integrations", icon: Play },
  { key: "secrets" as const, label: "Secrets Management", icon: Key },
  { key: "notifications" as const, label: "Notifications", icon: Bell },
  { key: "environments" as const, label: "Environment Settings", icon: Globe },
  { key: "ai" as const, label: "AI Insights", icon: Brain },
];

const integrations = {
  "CI Tools": [
    { name: "Jenkins", connected: true },
    { name: "GitHub Actions", connected: true },
    { name: "GitLab CI", connected: false },
    { name: "CircleCI", connected: false },
    { name: "Azure Pipelines", connected: false },
  ],
  "Git Providers": [
    { name: "GitHub", connected: true },
    { name: "GitLab", connected: false },
    { name: "Bitbucket", connected: false },
    { name: "Azure DevOps", connected: false },
  ],
  "Container Registries": [
    { name: "Docker Hub", connected: true },
    { name: "AWS ECR", connected: false },
    { name: "Azure ACR", connected: false },
    { name: "GCP Artifact Registry", connected: false },
    { name: "Harbor", connected: false },
  ],
};

const secretProviders = [
  { name: "HashiCorp Vault", status: "connected", secrets: 24 },
  { name: "Kubernetes Secrets", status: "connected", secrets: 18 },
  { name: "AWS Secrets Manager", status: "disconnected", secrets: 0 },
  { name: "Azure Key Vault", status: "disconnected", secrets: 0 },
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
          {activeSection === "integrations" && (
            <>
              {Object.entries(integrations).map(([group, items]) => (
                <div key={group} className="glass-panel p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    {group === "CI Tools" ? <Play className="w-4 h-4 text-primary" /> :
                     group === "Git Providers" ? <GitBranch className="w-4 h-4 text-primary" /> :
                     <Box className="w-4 h-4 text-primary" />}
                    {group}
                  </h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.name} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/30 transition-colors">
                        <span className="text-sm text-foreground">{item.name}</span>
                        {item.connected ? (
                          <span className="flex items-center gap-1 text-xs text-success">
                            <Check className="w-3.5 h-3.5" /> Connected
                          </span>
                        ) : (
                          <button className="px-3 py-1 rounded-md bg-secondary text-xs text-foreground hover:bg-accent transition-colors">
                            Connect
                          </button>
                        )}
                      </div>
                    ))}
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
                  <div key={p.name} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/30 transition-colors">
                    <div>
                      <p className="text-sm text-foreground">{p.name}</p>
                      {p.status === "connected" && (
                        <p className="text-xs text-muted-foreground">{p.secrets} secrets synced</p>
                      )}
                    </div>
                    {p.status === "connected" ? (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <Check className="w-3.5 h-3.5" /> Connected
                      </span>
                    ) : (
                      <button className="px-3 py-1 rounded-md bg-secondary text-xs text-foreground hover:bg-accent transition-colors">
                        Connect
                      </button>
                    )}
                  </div>
                ))}
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
