import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ArrowRight, Eye, EyeOff, GitBranch, Play, Shield, Cloud, Activity, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const floatingNodes = [
  { icon: GitBranch, label: "GitHub", x: "8%", y: "18%", delay: "0s" },
  { icon: Play, label: "CI", x: "85%", y: "12%", delay: "0.5s" },
  { icon: Shield, label: "Security", x: "78%", y: "75%", delay: "1s" },
  { icon: Cloud, label: "K8s", x: "12%", y: "72%", delay: "1.5s" },
  { icon: Activity, label: "Monitor", x: "90%", y: "45%", delay: "0.8s" },
  { icon: Lock, label: "Vault", x: "5%", y: "45%", delay: "1.2s" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex relative overflow-hidden">
      {/* Floating background nodes */}
      {floatingNodes.map((node, i) => (
        <div
          key={i}
          className="absolute hidden md:flex flex-col items-center gap-1 opacity-[0.07] pointer-events-none"
          style={{
            left: node.x,
            top: node.y,
            animation: `float ${4 + i}s ease-in-out infinite`,
            animationDelay: node.delay,
          }}
        >
          <div className="w-14 h-14 rounded-lg border border-border flex items-center justify-center">
            <node.icon className="w-6 h-6 text-primary" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{node.label}</span>
        </div>
      ))}

      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-info/[0.03] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-[120px] pointer-events-none" />

      {/* Center card */}
      <div className="m-auto w-full max-w-md px-6 relative z-10">
        <div className="animate-fade-in">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/20 animate-scale-in">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">IDP</h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Internal Developer Platform</p>
          </div>

          {/* Card */}
          <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/20">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">{isSignUp ? "Create account" : "Sign in"}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isSignUp ? "Get started with the DevOps control plane." : "Access your DevOps control plane."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="bg-background/50 border-border/60 focus:border-primary/50 h-10"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="bg-background/50 border-border/60 focus:border-primary/50 h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-background/50 border-border/60 focus:border-primary/50 h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isSignUp && (
                <div className="flex justify-end">
                  <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>
                </div>
              )}

              <Button type="submit" className="w-full h-10 gap-2 mt-2">
                {isSignUp ? "Create account" : "Sign in"} <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or continue with</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* SSO buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-10 text-xs gap-2 bg-background/30">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub
              </Button>
              <Button variant="outline" className="h-10 text-xs gap-2 bg-background/30">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </Button>
            </div>

            {/* Toggle */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary hover:underline font-medium">
                {isSignUp ? "Sign in" : "Create one"}
              </button>
            </p>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/50 mt-6">
            By continuing, you agree to IDP's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      {/* Float keyframe style */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
