import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  GitBranch, Play, Shield, Box, Rocket, Cloud, Activity, Eye,
  Brain, ArrowRight, ArrowDown, Lock, Search, FileText, Bell,
  Network, Scale, Blocks, Globe, Waypoints, Server, Zap,
  CheckCircle2, ExternalLink, Github
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Tiny helpers                                                       */
/* ------------------------------------------------------------------ */
const Section = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`w-full max-w-7xl mx-auto px-6 py-20 ${className}`}>{children}</section>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-3 font-mono">{children}</span>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">{children}</h2>
);

const SectionDesc = ({ children }: { children: React.ReactNode }) => (
  <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">{children}</p>
);

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const pipelineSteps = [
  "Developer Push Code", "CI Pipeline", "Security Scans", "Docker Build",
  "Image Scan", "Registry Push", "GitOps Deployment", "Kubernetes Rollout",
  "Monitoring & Logs", "Alerts", "Auto Scaling",
];

const features = [
  { icon: Waypoints, title: "Visual Workflow Studio", desc: "Drag-and-drop DevOps pipeline builder with 90+ tool integrations." },
  { icon: GitBranch, title: "GitOps Deployments", desc: "Automated deployments using Git as the single source of truth." },
  { icon: Shield, title: "Built-in Security", desc: "Dependency scanning, SAST, container security built into every pipeline." },
  { icon: Cloud, title: "Kubernetes Automation", desc: "Deploy, scale, and manage workloads visually across clusters." },
  { icon: Activity, title: "Observability", desc: "Integrated metrics, logs, distributed tracing, and alert management." },
  { icon: Brain, title: "AI Insights", desc: "AI-powered log anomaly detection and deployment risk prediction." },
];

const tools = [
  { name: "GitHub", icon: GitBranch },
  { name: "GitLab", icon: GitBranch },
  { name: "Jenkins", icon: Play },
  { name: "SonarQube", icon: Shield },
  { name: "Trivy", icon: Lock },
  { name: "Docker", icon: Box },
  { name: "ArgoCD", icon: Rocket },
  { name: "Kubernetes", icon: Cloud },
  { name: "Prometheus", icon: Activity },
  { name: "Grafana", icon: Eye },
  { name: "Terraform", icon: Blocks },
  { name: "Helm", icon: Server },
];

const archLayers = [
  {
    label: "Experience Layer",
    desc: "Frontend UI, Workflow Studio, dashboards, and developer portal.",
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
  },
  {
    label: "Orchestration Layer",
    desc: "Platform backend APIs, pipeline engine, policy engine, and automation logic.",
    color: "text-info",
    bg: "bg-info/10 border-info/20",
  },
  {
    label: "Execution Layer",
    desc: "CI/CD runners, Kubernetes clusters, security scanners, monitoring stack.",
    color: "text-success",
    bg: "bg-success/10 border-success/20",
  },
];

const heroPipeline = [
  { label: "GitHub", icon: GitBranch },
  { label: "CI", icon: Play },
  { label: "Security", icon: Shield },
  { label: "Build", icon: Box },
  { label: "Registry", icon: Server },
  { label: "K8s", icon: Cloud },
  { label: "Monitor", icon: Activity },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* -------- Nav -------- */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">IDP</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary ml-1">v2.0</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#lifecycle" className="hover:text-foreground transition-colors">Lifecycle</a>
            <a href="#architecture" className="hover:text-foreground transition-colors">Architecture</a>
            <a href="#security" className="hover:text-foreground transition-colors">Security</a>
          </div>
          <Button size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
            Launch Platform <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </nav>

      {/* -------- Hero -------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center relative z-10">
          <SectionLabel>Internal Developer Platform</SectionLabel>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            The Visual DevOps<br />
            <span className="text-gradient">Control Plane</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Visually orchestrate the entire DevOps lifecycle — from code push to production monitoring — in a single unified platform.
          </p>
          <div className="flex items-center justify-center gap-3 mb-16">
            <Button size="lg" onClick={() => navigate("/dashboard")} className="gap-2 px-6">
              Launch Platform <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              document.getElementById("architecture")?.scrollIntoView({ behavior: "smooth" });
            }} className="gap-2 px-6">
              View Architecture
            </Button>
          </div>

          {/* Mini pipeline illustration */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
            {heroPipeline.map((step, i) => (
              <div key={step.label} className="flex items-center gap-1 sm:gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-card border border-border flex items-center justify-center shadow-lg shadow-black/20 hover:border-primary/50 transition-colors">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{step.label}</span>
                </div>
                {i < heroPipeline.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 mb-5 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------- Features -------- */}
      <Section className="border-t border-border/30" >
        <div id="features" className="scroll-mt-20" />
        <SectionLabel>Capabilities</SectionLabel>
        <SectionTitle>Everything you need to ship faster</SectionTitle>
        <SectionDesc>A unified platform that replaces fragmented DevOps tooling with a single, visual control plane.</SectionDesc>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {features.map((f) => (
            <div key={f.title} className="group p-5 rounded-lg border border-border/50 bg-card/50 hover:border-primary/30 hover:bg-card transition-all duration-200">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* -------- DevOps Lifecycle -------- */}
      <Section className="border-t border-border/30">
        <div id="lifecycle" className="scroll-mt-20" />
        <SectionLabel>DevOps Lifecycle</SectionLabel>
        <SectionTitle>End-to-end pipeline automation</SectionTitle>
        <SectionDesc>Every stage of the software delivery lifecycle, visualised and automated.</SectionDesc>
        <div className="mt-12 flex flex-col items-center gap-0">
          {pipelineSteps.map((step, i) => (
            <div key={step} className="flex flex-col items-center">
              <div className="flex items-center gap-3 px-5 py-3 rounded-lg border border-border/50 bg-card/60 min-w-[240px] justify-center hover:border-primary/40 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span className="text-sm font-medium text-foreground">{step}</span>
              </div>
              {i < pipelineSteps.length - 1 && (
                <ArrowDown className="w-4 h-4 text-muted-foreground/30 my-1" />
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* -------- Tool Integrations -------- */}
      <Section className="border-t border-border/30">
        <SectionLabel>Integrations</SectionLabel>
        <SectionTitle>Works with your existing tools</SectionTitle>
        <SectionDesc>90+ integrations across the DevOps ecosystem, from source control to observability.</SectionDesc>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mt-12">
          {tools.map((t) => (
            <div key={t.name} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border/40 bg-card/40 hover:border-primary/30 hover:bg-card/70 transition-all">
              <t.icon className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{t.name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* -------- Architecture -------- */}
      <Section className="border-t border-border/30">
        <div id="architecture" className="scroll-mt-20" />
        <SectionLabel>Architecture</SectionLabel>
        <SectionTitle>Three-layer platform design</SectionTitle>
        <SectionDesc>Built for enterprise scale with a clean separation of concerns.</SectionDesc>
        <div className="mt-12 space-y-4">
          {archLayers.map((l) => (
            <div key={l.label} className={`p-6 rounded-lg border ${l.bg} transition-all`}>
              <h3 className={`font-semibold text-lg mb-1 ${l.color}`}>{l.label}</h3>
              <p className="text-sm text-muted-foreground">{l.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* -------- Observability -------- */}
      <Section className="border-t border-border/30">
        <SectionLabel>Observability</SectionLabel>
        <SectionTitle>Full-stack visibility</SectionTitle>
        <SectionDesc>Unified monitoring, logging, tracing, and alerting in a single pane of glass.</SectionDesc>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {[
            { icon: Activity, title: "Metrics Dashboards", desc: "CPU, memory, request rate, error rate, and pod health." },
            { icon: FileText, title: "Logs Viewer", desc: "Searchable real-time logs with service and namespace filters." },
            { icon: Waypoints, title: "Distributed Tracing", desc: "End-to-end request tracing across microservices." },
            { icon: Bell, title: "Alert Management", desc: "Severity-based alerts with routing and acknowledgment." },
          ].map((item) => (
            <div key={item.title} className="p-5 rounded-lg border border-border/50 bg-card/50">
              <item.icon className="w-5 h-5 text-primary mb-3" />
              <h3 className="font-semibold text-sm text-foreground mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* -------- Security -------- */}
      <Section className="border-t border-border/30">
        <div id="security" className="scroll-mt-20" />
        <SectionLabel>DevSecOps</SectionLabel>
        <SectionTitle>Security at every stage</SectionTitle>
        <SectionDesc>Shift-left security integrated directly into your deployment pipelines.</SectionDesc>
        <div className="grid sm:grid-cols-2 gap-4 mt-12">
          {[
            { icon: Search, title: "Dependency Scanning", desc: "Detect vulnerable dependencies before they reach production." },
            { icon: Lock, title: "Container Security", desc: "Scan container images for CVEs and misconfigurations." },
            { icon: Shield, title: "Policy Enforcement", desc: "Kubernetes admission control with OPA and Kyverno." },
            { icon: Network, title: "Runtime Detection", desc: "Real-time threat detection with Falco and audit logging." },
          ].map((item) => (
            <div key={item.title} className="p-5 rounded-lg border border-border/50 bg-card/50 flex gap-4">
              <div className="w-10 h-10 shrink-0 rounded-md bg-destructive/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* -------- CTA -------- */}
      <Section className="border-t border-border/30 text-center">
        <SectionLabel>Get Started</SectionLabel>
        <SectionTitle>Ready to unify your DevOps?</SectionTitle>
        <SectionDesc className="mx-auto">Explore the platform, build your first pipeline, and ship with confidence.</SectionDesc>
        <div className="flex items-center justify-center gap-3 mt-10">
          <Button size="lg" onClick={() => navigate("/workflows")} className="gap-2 px-6">
            Open Workflow Studio <Waypoints className="w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline" className="gap-2 px-6">
            Explore Documentation <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </Section>

      {/* -------- Footer -------- */}
      <footer className="border-t border-border/30 bg-card/30">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <span className="font-bold">IDP</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                An AI-enabled Internal Developer Platform providing a visual DevOps control plane for the complete software delivery lifecycle.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => navigate("/workflows")} className="text-muted-foreground hover:text-foreground transition-colors">Workflow Studio</button></li>
                <li><button onClick={() => navigate("/monitoring")} className="text-muted-foreground hover:text-foreground transition-colors">Monitoring</button></li>
                <li><button onClick={() => navigate("/security")} className="text-muted-foreground hover:text-foreground transition-colors">Security</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#architecture" className="text-muted-foreground hover:text-foreground transition-colors">Architecture</a></li>
                <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">GitHub <ExternalLink className="w-3 h-3" /></a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border/30 text-xs text-muted-foreground">
            © {new Date().getFullYear()} IDP — Internal Developer Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
