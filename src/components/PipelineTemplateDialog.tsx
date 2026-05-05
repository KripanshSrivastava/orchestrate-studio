import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/apiClient";
import useIntegrations from "@/hooks/useIntegrations";
import { useNavigate } from "react-router-dom";

interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  flow: string[];
  requiredInputs: string[];
  secretsRequired: string[];
  deploy_target?: string;
  deploy_mode?: string;
  use_case?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function PipelineTemplateDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { getState } = useIntegrations();

  const githubState = getState("github");
  const githubActionsState = getState("github-actions");

  const buildDefaultInputs = (template: WorkflowTemplate): Record<string, string> => {
    const defaults: Record<string, string> = {};

    if (template.requiredInputs.includes("repo")) {
      const repository = githubState.verification?.repository;
      const repoValue = repository?.fullName || [githubState.values.owner, githubState.values.repository].filter(Boolean).join("/");
      if (repoValue) {
        defaults.repo = repoValue;
      }
    }

    if (template.requiredInputs.includes("branch")) {
      const branchValue =
        githubActionsState.verification?.branch ||
        githubActionsState.values.branch ||
        githubState.verification?.repository?.defaultBranch ||
        "";
      if (branchValue) {
        defaults.branch = branchValue;
      }
    }

    if (template.requiredInputs.includes("workflowFile")) {
      const workflowFileValue =
        githubActionsState.verification?.workflowFile ||
        githubActionsState.values.workflowFile ||
        githubActionsState.verification?.configuredWorkflow?.path ||
        "";
      if (workflowFileValue) {
        defaults.workflowFile = workflowFileValue;
      }
    }

    return defaults;
  };

  useEffect(() => {
    if (open) {
      apiGet<{success: boolean, data: WorkflowTemplate[]}>(`${API_BASE}/api/workflows/templates`)
        .then(res => {
          if (res.success) {
            setTemplates(res.data);
          }
        })
        .catch(err => {
          toast.error("Failed to fetch templates");
        });
    }
  }, [open]);

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    const defaults = buildDefaultInputs(selectedTemplate);
    setInputs((currentInputs) => {
      const nextInputs = { ...defaults, ...currentInputs };
      const currentKeys = Object.keys(currentInputs);
      const nextKeys = Object.keys(nextInputs);

      if (currentKeys.length === nextKeys.length && nextKeys.every((key) => currentInputs[key] === nextInputs[key])) {
        return currentInputs;
      }

      return nextInputs;
    });
  }, [githubActionsState.values.branch, githubActionsState.values.workflowFile, githubActionsState.verification?.branch, githubActionsState.verification?.configuredWorkflow?.path, githubState.values.owner, githubState.values.repository, githubState.verification?.repository?.defaultBranch, githubState.verification?.repository?.fullName, selectedTemplate]);

  const categories = Array.from(new Set(templates.map(t => t.category)));

  const handleRun = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    try {
      const res = await apiPost<{success: boolean, message?: string, error?: string}>(`${API_BASE}/api/workflows/templates/${selectedTemplate.id}/run`, { inputs });
      if (res.success) {
        toast.success(res.message || "Template triggered successfully");
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to trigger template");
      }
    } catch (e: any) {
      toast.error(e.message || "Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDragDropBuilder = (templateId: string) => {
    setOpen(false);
    setSelectedTemplate(null);
    navigate(`/workflows/${templateId}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Play className="w-4 h-4" /> Run New Template
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl min-h-[500px] flex flex-col bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Run Pipeline Template</DialogTitle>
        </DialogHeader>
        
        {!selectedTemplate ? (
          <div className="flex flex-1 gap-4 mt-4">
            <div className="w-48 border-r border-border pr-4 space-y-2">
              <h3 className="text-sm font-semibold mb-2 text-foreground">Categories</h3>
              <button
                  onClick={() => setSelectedCategory("")}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${!selectedCategory ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent text-muted-foreground'}`}
                >
                  All Templates
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedCategory === cat ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent text-muted-foreground'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3 content-start overflow-y-auto pr-2" style={{ maxHeight: "400px" }}>
              {templates.filter(t => !selectedCategory || t.category === selectedCategory).map(t => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTemplate(t);
                    setInputs(buildDefaultInputs(t));
                  }}
                  className="border border-border rounded-md p-3 cursor-pointer hover:border-primary bg-card/50 transition-colors group"
                >
                  <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{t.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.use_case || "Automated workflow"}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {t.flow.slice(0, 3).map(f => (
                      <span key={f} className="text-[10px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded">{f}</span>
                    ))}
                    {t.flow.length > 3 && <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground rounded">+{t.flow.length - 3} more</span>}
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenDragDropBuilder(t.id);
                    }}
                    className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    <Play className="h-3.5 w-3.5" /> Open Drag and Drop
                  </button>
                </div>
              ))}
              {templates.length === 0 && <div className="col-span-2 text-center text-sm text-muted-foreground py-10">Loading templates...</div>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 mt-4">
            <button onClick={() => setSelectedTemplate(null)} className="text-sm text-muted-foreground mb-4 hover:text-foreground self-start transition-colors flex items-center gap-1">
              &larr; Back to templates
            </button>
            <h3 className="text-xl font-semibold mb-6 text-foreground flex items-center gap-2">
              <span className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                <Play className="w-4 h-4 text-primary" />
              </span>
              {selectedTemplate.name}
            </h3>

            {(inputs.repo || inputs.branch || inputs.workflowFile) && (
              <div className="mb-4 rounded-md border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                <p className="mb-2 font-medium uppercase tracking-wider text-foreground/80">Using saved settings</p>
                <div className="flex flex-wrap gap-2">
                  {inputs.repo && <span className="rounded bg-background px-2 py-1">Repo: {inputs.repo}</span>}
                  {inputs.branch && <span className="rounded bg-background px-2 py-1">Branch: {inputs.branch}</span>}
                  {inputs.workflowFile && <span className="rounded bg-background px-2 py-1">Workflow: {inputs.workflowFile}</span>}
                </div>
              </div>
            )}
            
            <div className="space-y-4 flex-1">
              <h4 className="text-sm font-medium border-b border-border pb-2 mb-4">Required Inputs</h4>
              <div className="grid grid-cols-1 gap-4 max-w-lg">
                {selectedTemplate.requiredInputs.filter((inputKey) => !inputs[inputKey]).map(inputKey => (
                  <div key={inputKey} className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground capitalize">{inputKey.replace(/_/g, ' ')}</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-colors"
                      value={inputs[inputKey] || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, [inputKey]: e.target.value }))}
                      placeholder={`Enter ${inputKey}...`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button 
                className="px-4 py-2 text-sm font-medium rounded-md hover:bg-secondary text-foreground transition-colors" 
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                onClick={handleRun} 
                disabled={loading || selectedTemplate.requiredInputs.some((k) => !inputs[k])}
              >
                {loading ? (
                  "Starting..."
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Run Workflow
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
