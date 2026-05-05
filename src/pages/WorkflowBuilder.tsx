import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Copy,
  Download,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import DragDropWorkflowBuilder from "@/components/WorkflowBuilder/DragDropWorkflowBuilder";
import { workflowTemplates } from "@/data/workflowTemplates";
import {
  createDragDropWorkflow,
  reorderWorkflowSteps,
  toggleWorkflowStep,
  getExecutableWorkflow,
} from "@/lib/workflowStepDefinitions";
import { workflowSteps } from "@/data/workflowTemplates";

interface WorkflowBuilderPageProps {}

export const WorkflowBuilderPage: React.FC<WorkflowBuilderPageProps> = () => {
  const { templateId } = useParams<{ templateId?: string }>();
  const navigate = useNavigate();

  const [workflow, setWorkflow] = useState<any | null>(null);
  const [workflowName, setWorkflowName] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [enabled, setEnabled] = useState<boolean[]>([]);

  // Initialize workflow from template
  useEffect(() => {
    if (!templateId) return;

    const template = workflowTemplates.find((item) => item.id === templateId);
    if (!template) return;

    const orderedSteps = template.flow
      .map((stepId) => workflowSteps.find((step) => step.id === stepId))
      .filter((step): step is (typeof workflowSteps)[number] => Boolean(step));

    const newWorkflow = createDragDropWorkflow(template.name, orderedSteps);

    setWorkflow(newWorkflow);
    setWorkflowName(newWorkflow.name);
    setEnabled(newWorkflow.enabled);
  }, [templateId]);

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (workflow) {
      const reordered = reorderWorkflowSteps(workflow, fromIndex, toIndex);
      setWorkflow(reordered);
    }
  };

  const handleToggle = (stepId: string, isEnabled: boolean) => {
    if (workflow) {
      const toggled = toggleWorkflowStep(workflow, stepId, isEnabled);
      setWorkflow(toggled);
      setEnabled(toggled.enabled);
    }
  };

  const handleUpdateValue = (key: string, value: any) => {
    setCustomValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveWorkflow = async () => {
    if (!workflow) return;

    setSaveStatus("saving");
    try {
      const executableSteps = getExecutableWorkflow(workflow);

      const payload = {
        id: workflow.id,
        name: workflowName,
        steps: executableSteps,
        customValues,
        totalSteps: workflow.steps.length,
        enabledSteps: enabled.filter((e) => e).length,
        createdAt: workflow.createdAt,
        updatedAt: new Date(),
      };

      // TODO: Send to backend API
      console.log("Saving workflow:", payload);

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Failed to save workflow:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleExportYAML = () => {
    if (!workflow) return;

    const executableSteps = getExecutableWorkflow(workflow);
    const yamlContent = `# ${workflowName}
# Generated from Orchestrate Studio Workflow Builder
# Template: DevOps Pipeline - Full Lifecycle

version: "1.0"
name: "${workflowName}"
description: "Full lifecycle DevOps pipeline with security, testing, and monitoring"

variables:
${Object.entries(customValues)
  .map(([key, value]) => `  ${key}: "${value}"`)
  .join("\n")}

steps:
${executableSteps
  .map(
    (step, idx) => `
  - id: ${step.id}
    name: "${step.name}"
    description: "${step.description}"
    category: ${step.category}
    handler: ${step.handler}
    timeout: ${step.timeout || 300}
    retryCount: ${step.retryCount || 0}
    onFailure: ${step.onFailure || "fail"}
    ${
      step.requiredInputs && step.requiredInputs.length > 0
        ? `requiredInputs: [${step.requiredInputs.map((i) => `"${i}"`).join(", ")}]`
        : ""
    }
    ${
      step.secretsRequired && step.secretsRequired.length > 0
        ? `secretsRequired: [${step.secretsRequired.map((s) => `"${s}"`).join(", ")}]`
        : ""
    }
    ${step.dependencies && step.dependencies.length > 0 ? `dependencies: [${step.dependencies.map((d) => `"${d}"`).join(", ")}]` : ""}
`
  )
  .join("\n")}
`;

    const blob = new Blob([yamlContent], { type: "text/yaml" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${workflowName.replace(/\s+/g, "-").toLowerCase()}.yaml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (!workflow) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
            <AlertCircle className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Loading Workflow...
          </h3>
          <p className="text-gray-600">
            Initializing selected template with drag-and-drop support
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Workflow Builder
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Drag-and-drop pipeline builder with integrated modern Node.js
                  libraries
                </p>
              </div>
            </div>

            {/* Save Status */}
            <div className="flex items-center gap-3">
              {saveStatus === "saved" && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Saved successfully
                </div>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                  <AlertCircle className="w-4 h-4" />
                  Save failed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Workflow Name */}
        <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Workflow Name
          </label>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Workflow Builder */}
        <div className="mb-8">
          <DragDropWorkflowBuilder
            steps={workflow.steps}
            onReorder={handleReorder}
            onToggle={handleToggle}
            enabled={enabled}
            customValues={customValues}
            onUpdateValue={handleUpdateValue}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleExportYAML}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export YAML
          </button>
          <button
            onClick={() => {
              /* Handle duplicate */
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <button
            onClick={handleSaveWorkflow}
            disabled={saveStatus === "saving"}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saveStatus === "saving" ? "Saving..." : "Save Workflow"}
          </button>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            📚 Integrated Libraries
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-blue-800">
            <div>✓ <strong>axios</strong> - HTTP requests</div>
            <div>✓ <strong>bullmq</strong> - Job queue</div>
            <div>✓ <strong>redis</strong> - Cache & pub/sub</div>
            <div>✓ <strong>postgres</strong> - Database</div>
            <div>✓ <strong>docker</strong> - Container build</div>
            <div>✓ <strong>octokit</strong> - GitHub API</div>
            <div>✓ <strong>socket.io</strong> - Real-time</div>
            <div>✓ <strong>yaml</strong> - Config parsing</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilderPage;
