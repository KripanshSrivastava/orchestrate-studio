import {
  Search,
  Bell,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  User,
} from "lucide-react";
import { useState } from "react";

interface TopNavProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const environments = ["Development", "Staging", "Production"] as const;
type Env = (typeof environments)[number];
const envClass: Record<Env, string> = {
  Development: "env-dev",
  Staging: "env-stage",
  Production: "env-prod",
};

export function TopNav({ sidebarOpen, onToggleSidebar, isDark, onToggleTheme }: TopNavProps) {
  const [env, setEnv] = useState<Env>("Development");
  const [envOpen, setEnvOpen] = useState(false);

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-xl flex items-center px-4 gap-4 shrink-0 z-50">
      <button onClick={onToggleSidebar} className="p-1.5 rounded-md hover:bg-accent transition-colors">
        {sidebarOpen ? <PanelLeftClose className="w-5 h-5 text-muted-foreground" /> : <PanelLeft className="w-5 h-5 text-muted-foreground" />}
      </button>

      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">D</span>
        </div>
        <span className="font-semibold text-foreground text-sm">DevPlane</span>
      </div>

      <div className="relative ml-4">
        <button
          onClick={() => setEnvOpen(!envOpen)}
          className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded-md transition-colors"
        >
          <span className={envClass[env]}>{env.slice(0, 3).toUpperCase()}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        {envOpen && (
          <div className="absolute top-full mt-1 left-0 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[160px] z-50">
            {environments.map((e) => (
              <button
                key={e}
                onClick={() => { setEnv(e); setEnvOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
              >
                <span className={envClass[e]}>{e.slice(0, 3).toUpperCase()}</span>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search services, deployments, pipelines..."
            className="w-full bg-secondary border-0 rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <button className="p-2 rounded-md hover:bg-accent transition-colors relative">
          <Bell className="w-4.5 h-4.5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>
        <button onClick={onToggleTheme} className="p-2 rounded-md hover:bg-accent transition-colors">
          {isDark ? <Sun className="w-4.5 h-4.5 text-muted-foreground" /> : <Moon className="w-4.5 h-4.5 text-muted-foreground" />}
        </button>
        <button className="p-1.5 rounded-md hover:bg-accent transition-colors flex items-center gap-2 ml-1">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        </button>
      </div>
    </header>
  );
}
