import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import WorkflowStudio from "./pages/WorkflowStudio";
import Applications from "./pages/Applications";
import Monitoring from "./pages/Monitoring";
import Security from "./pages/Security";
import Infrastructure from "./pages/Infrastructure";
import Pipelines from "./pages/Pipelines";
import Deployments from "./pages/Deployments";
import Settings from "./pages/Settings";
import Docs from "./pages/Docs";
import GithubActionsDocs from "./pages/GithubActionsDocs";
import ProviderIntegrationDocs from "./pages/ProviderIntegrationDocs";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/docs/github-actions" element={<GithubActionsDocs />} />
          <Route path="/docs/integrations/:providerId" element={<ProviderIntegrationDocs />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/workflows" element={<WorkflowStudio />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/monitoring" element={<Monitoring />} />
              <Route path="/security" element={<Security />} />
              <Route path="/infrastructure" element={<Infrastructure />} />
              <Route path="/pipelines" element={<Pipelines />} />
              <Route path="/deployments" element={<Deployments />} />
              <Route path="/metrics" element={<Monitoring />} />
              <Route path="/logs" element={<Monitoring />} />
              <Route path="/alerts" element={<Monitoring />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
