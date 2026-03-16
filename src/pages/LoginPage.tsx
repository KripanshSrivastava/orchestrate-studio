import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ArrowRight, Eye, EyeOff, GitBranch, Play, Shield, Cloud, Activity, Lock, Box, Rocket, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import keycloak from "@/auth/keycloak";

const floatingNodes = [
  { icon: GitBranch, label: "GitHub", x: "6%", y: "15%", delay: 0 },
  { icon: Play, label: "CI/CD", x: "88%", y: "10%", delay: 0.3 },
  { icon: Shield, label: "SAST", x: "82%", y: "78%", delay: 0.6 },
  { icon: Cloud, label: "K8s", x: "10%", y: "75%", delay: 0.9 },
  { icon: Activity, label: "Monitor", x: "92%", y: "44%", delay: 0.4 },
  { icon: Lock, label: "Vault", x: "3%", y: "44%", delay: 0.7 },
  { icon: Box, label: "Docker", x: "15%", y: "30%", delay: 1.0 },
  { icon: Rocket, label: "Deploy", x: "80%", y: "30%", delay: 0.5 },
  { icon: Search, label: "Scan", x: "20%", y: "88%", delay: 1.1 },
  { icon: FileText, label: "Logs", x: "75%", y: "90%", delay: 0.8 },
];

const particles = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 8 + 6,
  delay: Math.random() * 5,
}));

export default function LoginPage() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Call Keycloak token endpoint to authenticate
      const tokenResponse = await fetch(
        `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}/protocol/openid-connect/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
            grant_type: "password",
            username: email,
            password: password,
          }),
        }
      );

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error_description || "Invalid credentials");
      }

      const tokenData = await tokenResponse.json();

      // Store token in Keycloak JS instance
      keycloak.token = tokenData.access_token;
      keycloak.refreshToken = tokenData.refresh_token;
      keycloak.tokenParsed = JSON.parse(
        atob(tokenData.access_token.split(".")[1])
      );
      keycloak.authenticated = true;

      console.log("✅ Login successful, redirecting to dashboard...");

      // Navigate to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      console.error("❌ Login error:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex relative overflow-hidden">

      {/* ---- Animated grid background ---- */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* ---- Ambient particles ---- */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-primary pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: 0,
            animation: `particleFade ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* ---- Floating DevOps nodes ---- */}
      {floatingNodes.map((node, i) => (
        <div
          key={i}
          className="absolute hidden md:flex flex-col items-center gap-1.5 pointer-events-none"
          style={{
            left: node.x,
            top: node.y,
            opacity: 0,
            animation: `nodeAppear 0.6s ease-out forwards, float ${5 + i * 0.7}s ease-in-out infinite`,
            animationDelay: `${node.delay + 0.5}s, ${node.delay + 1.1}s`,
          }}
        >
          <div className="w-12 h-12 rounded-lg border border-border/40 bg-card/30 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-primary/5"
            style={{ animation: `pulseNode ${3 + i * 0.5}s ease-in-out infinite`, animationDelay: `${node.delay}s` }}
          >
            <node.icon className="w-5 h-5 text-primary/50" />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground/40">{node.label}</span>
        </div>
      ))}

      {/* ---- Connection lines between nodes (SVG) ---- */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" style={{ opacity: 0, animation: "svgFadeIn 2s ease-out 1.5s forwards" }}>
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.12" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Decorative connection paths */}
        <path d="M 100,180 Q 300,100 500,200" stroke="url(#lineGrad)" strokeWidth="1" fill="none" className="animate-dash" />
        <path d="M 900,120 Q 700,250 500,200" stroke="url(#lineGrad)" strokeWidth="1" fill="none" className="animate-dash" style={{ animationDelay: "0.5s" }} />
        <path d="M 500,200 Q 500,400 300,600" stroke="url(#lineGrad)" strokeWidth="1" fill="none" className="animate-dash" style={{ animationDelay: "1s" }} />
        <path d="M 500,200 Q 600,450 800,650" stroke="url(#lineGrad)" strokeWidth="1" fill="none" className="animate-dash" style={{ animationDelay: "1.5s" }} />
      </svg>

      {/* ---- Gradient orbs ---- */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[150px] pointer-events-none"
        style={{ animation: "orbFloat 12s ease-in-out infinite" }} />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-info/[0.04] rounded-full blur-[120px] pointer-events-none"
        style={{ animation: "orbFloat 10s ease-in-out infinite reverse" }} />

      {/* ---- Center login card ---- */}
      <div className="m-auto w-full max-w-md px-6 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8" style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0) scale(1)" : "translateY(-20px) scale(0.9)",
          transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-4 shadow-xl shadow-primary/25"
            style={{ animation: "logoGlow 3s ease-in-out infinite" }}>
            <Zap className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">IDP</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono tracking-widest">INTERNAL DEVELOPER PLATFORM</p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl border border-border/50 bg-card/70 backdrop-blur-2xl p-8 shadow-2xl shadow-black/30"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0) scale(1)" : "translateY(30px) scale(0.95)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
          }}
        >
          <div className="mb-6" style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.5s ease-out 0.4s",
          }}>
            <h2 className="text-lg font-semibold">{isSignUp ? "Create account" : "Sign in"}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp ? "Get started with the DevOps control plane." : "Access your DevOps control plane."}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2" style={{ animation: "fieldSlideIn 0.4s ease-out" }}>
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="bg-background/50 border-border/60 focus:border-primary/50 h-10 transition-all duration-300 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                />
              </div>
            )}

            <div className="space-y-2" style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateX(0)" : "translateX(-15px)",
              transition: "all 0.5s ease-out 0.5s",
            }}>
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="bg-background/50 border-border/60 focus:border-primary/50 h-10 transition-all duration-300 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
              />
            </div>

            <div className="space-y-2" style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateX(0)" : "translateX(-15px)",
              transition: "all 0.5s ease-out 0.6s",
            }}>
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-background/50 border-border/60 focus:border-primary/50 h-10 pr-10 transition-all duration-300 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex justify-end" style={{
                opacity: mounted ? 1 : 0,
                transition: "opacity 0.4s ease-out 0.7s",
              }}>
                <button type="button" className="text-xs text-primary hover:underline transition-colors">Forgot password?</button>
              </div>
            )}

            <div style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(10px)",
              transition: "all 0.5s ease-out 0.75s",
            }}>
              <Button 
                type="submit" 
                className="w-full h-10 gap-2 mt-2 group relative overflow-hidden"
                disabled={isLoading}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isLoading ? "Authenticating..." : (isSignUp ? "Create account" : "Sign in")}
                  {!isLoading && <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-info opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6" style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.5s ease-out 0.85s",
          }}>
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or continue with</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* SSO buttons */}
          <div className="grid grid-cols-2 gap-3" style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.5s ease-out 0.9s",
          }}>
            <Button variant="outline" className="h-10 text-xs gap-2 bg-background/30 hover:bg-background/60 hover:border-primary/30 transition-all duration-300 group">
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </Button>
            <Button variant="outline" className="h-10 text-xs gap-2 bg-background/30 hover:bg-background/60 hover:border-primary/30 transition-all duration-300 group">
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </Button>
          </div>

          {/* Toggle */}
          <p className="text-center text-xs text-muted-foreground mt-6" style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.5s ease-out 1s",
          }}>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary hover:underline font-medium transition-colors">
              {isSignUp ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-6" style={{
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.5s ease-out 1.1s",
        }}>
          By continuing, you agree to IDP's Terms of Service and Privacy Policy.
        </p>
      </div>

      {/* ---- Keyframes ---- */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-15px) rotate(1deg); }
          66% { transform: translateY(-8px) rotate(-1deg); }
        }
        @keyframes nodeAppear {
          from { opacity: 0; transform: scale(0.5) translateY(20px); }
          to { opacity: 0.12; transform: scale(1) translateY(0); }
        }
        @keyframes pulseNode {
          0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0); }
          50% { box-shadow: 0 0 20px 4px hsl(var(--primary) / 0.08); }
        }
        @keyframes particleFade {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0.15; transform: scale(1); }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(30px, -20px); }
          66% { transform: translate(-20px, 15px); }
        }
        @keyframes logoGlow {
          0%, 100% { box-shadow: 0 0 20px hsl(var(--primary) / 0.2), 0 4px 15px hsl(var(--primary) / 0.15); }
          50% { box-shadow: 0 0 35px hsl(var(--primary) / 0.35), 0 4px 25px hsl(var(--primary) / 0.25); }
        }
        @keyframes svgFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fieldSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dashDraw {
          to { stroke-dashoffset: 0; }
        }
        .animate-dash {
          stroke-dasharray: 800;
          stroke-dashoffset: 800;
          animation: dashDraw 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
