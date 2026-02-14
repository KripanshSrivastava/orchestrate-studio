import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  GitBranch,
  Rocket,
  Shield,
  Activity,
  Server,
  Settings,
  Workflow,
  Container,
  BarChart3,
  FileText,
  AlertTriangle,
} from "lucide-react";

interface AppSidebarProps {
  open: boolean;
}

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", path: "/", icon: LayoutDashboard },
      { title: "Applications", path: "/applications", icon: Container },
    ],
  },
  {
    label: "Build & Deploy",
    items: [
      { title: "Workflow Studio", path: "/workflows", icon: Workflow },
      { title: "Pipelines", path: "/pipelines", icon: GitBranch },
      { title: "Deployments", path: "/deployments", icon: Rocket },
    ],
  },
  {
    label: "Observe",
    items: [
      { title: "Monitoring", path: "/monitoring", icon: Activity },
      { title: "Metrics", path: "/metrics", icon: BarChart3 },
      { title: "Logs", path: "/logs", icon: FileText },
      { title: "Alerts", path: "/alerts", icon: AlertTriangle },
    ],
  },
  {
    label: "Secure",
    items: [
      { title: "Security", path: "/security", icon: Shield },
    ],
  },
  {
    label: "Manage",
    items: [
      { title: "Infrastructure", path: "/infrastructure", icon: Server },
      { title: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar({ open }: AppSidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={`${
        open ? "w-56" : "w-0"
      } shrink-0 border-r border-border bg-sidebar overflow-hidden transition-all duration-200`}
    >
      <nav className="p-3 space-y-5 min-w-[224px]">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={active ? "nav-item-active" : "nav-item-inactive"}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
