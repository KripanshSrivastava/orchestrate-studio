/**
 * Frontend Workflow Step Definitions and Utilities
 * Synced from backend config/workflowStepDefinitions.ts
 */

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  icon: string;
  category:
    | "source"
    | "build"
    | "test"
    | "security"
    | "deploy"
    | "monitoring"
    | "notification";
  requiredInputs?: string[];
  secretsRequired?: string[];
  timeout?: number;
  retryCount?: number;
  onFailure?: "fail" | "continue" | "skip";
  environment?: Record<string, string>;
  handler: string;
  dragDropEnabled: boolean;
  position?: number;
  dependencies?: string[];
}

export interface DragDropWorkflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  enabled: boolean[];
  customValues: Record<string, string | number | boolean>;
  secrets: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reorder workflow steps (for drag-and-drop)
 */
export function reorderWorkflowSteps(
  workflow: DragDropWorkflow,
  fromIndex: number,
  toIndex: number
): DragDropWorkflow {
  const newSteps = [...workflow.steps];
  const [movedStep] = newSteps.splice(fromIndex, 1);
  newSteps.splice(toIndex, 0, movedStep);

  const updatedSteps = newSteps.map((step, index) => ({
    ...step,
    position: index,
  }));

  return {
    ...workflow,
    steps: updatedSteps,
    updatedAt: new Date(),
  };
}

/**
 * Enable/disable specific workflow step
 */
export function toggleWorkflowStep(
  workflow: DragDropWorkflow,
  stepId: string,
  enabled: boolean
): DragDropWorkflow {
  const stepIndex = workflow.steps.findIndex((s) => s.id === stepId);
  if (stepIndex === -1) return workflow;

  const newEnabled = [...workflow.enabled];
  newEnabled[stepIndex] = enabled;

  return {
    ...workflow,
    enabled: newEnabled,
    updatedAt: new Date(),
  };
}

/**
 * Get executable workflow (only enabled steps with dependencies resolved)
 */
export function getExecutableWorkflow(workflow: DragDropWorkflow): WorkflowStep[] {
  return workflow.steps
    .filter((_, index) => workflow.enabled[index])
    .sort((a, b) => (a.position || 0) - (b.position || 0));
}

/**
 * Create a new drag-drop workflow from template steps
 */
export function createDragDropWorkflow(
  name: string,
  steps: WorkflowStep[]
): DragDropWorkflow {
  return {
    id: `workflow-${Date.now()}`,
    name,
    steps: steps.map((step, index) => ({ ...step, position: index })),
    enabled: steps.map(() => true),
    customValues: {},
    secrets: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get workflow execution summary
 */
export function getWorkflowSummary(workflow: DragDropWorkflow) {
  const totalSteps = workflow.steps.length;
  const enabledSteps = workflow.enabled.filter((e) => e).length;
  const totalTimeout = workflow.steps.reduce(
    (sum, step, idx) => sum + (workflow.enabled[idx] ? step.timeout || 300 : 0),
    0
  );

  const categories = {
    source: 0,
    build: 0,
    test: 0,
    security: 0,
    deploy: 0,
    monitoring: 0,
    notification: 0,
  };

  workflow.steps.forEach((step, idx) => {
    if (workflow.enabled[idx]) {
      categories[step.category]++;
    }
  });

  return {
    totalSteps,
    enabledSteps,
    disabledSteps: totalSteps - enabledSteps,
    totalTimeout,
    estimatedDuration: `${Math.ceil(totalTimeout / 60)}m`,
    categories,
    requiredInputs: Array.from(
      new Set(
        workflow.steps.flatMap(
          (step, idx) =>
            workflow.enabled[idx] && step.requiredInputs
              ? step.requiredInputs
              : []
        )
      )
    ),
    requiredSecrets: Array.from(
      new Set(
        workflow.steps.flatMap(
          (step, idx) =>
            workflow.enabled[idx] && step.secretsRequired
              ? step.secretsRequired
              : []
        )
      )
    ),
  };
}

/**
 * Export workflow as YAML
 */
export function exportWorkflowAsYAML(workflow: DragDropWorkflow): string {
  const executableSteps = getExecutableWorkflow(workflow);

  let yaml = `# ${workflow.name}
# Generated from Orchestrate Studio Workflow Builder
# Template: DevOps Pipeline - Full Lifecycle

version: "1.0"
name: "${workflow.name}"
description: "Full lifecycle DevOps pipeline with security, testing, and monitoring"

variables:
`;

  Object.entries(workflow.customValues).forEach(([key, value]) => {
    yaml += `  ${key}: "${value}"\n`;
  });

  yaml += `
steps:
`;

  executableSteps.forEach((step) => {
    yaml += `
  - id: ${step.id}
    name: "${step.name}"
    description: "${step.description}"
    category: ${step.category}
    handler: ${step.handler}
    timeout: ${step.timeout || 300}
    retryCount: ${step.retryCount || 0}
    onFailure: ${step.onFailure || "fail"}
`;

    if (step.requiredInputs && step.requiredInputs.length > 0) {
      yaml += `    requiredInputs: [${step.requiredInputs.map((i) => `"${i}"`).join(", ")}]\n`;
    }

    if (step.secretsRequired && step.secretsRequired.length > 0) {
      yaml += `    secretsRequired: [${step.secretsRequired.map((s) => `"${s}"`).join(", ")}]\n`;
    }

    if (step.dependencies && step.dependencies.length > 0) {
      yaml += `    dependencies: [${step.dependencies.map((d) => `"${d}"`).join(", ")}]\n`;
    }

    if (step.environment && Object.keys(step.environment).length > 0) {
      yaml += `    environment:\n`;
      Object.entries(step.environment).forEach(([key, value]) => {
        yaml += `      ${key}: "${value}"\n`;
      });
    }
  });

  return yaml;
}

/**
 * Export workflow as JSON
 */
export function exportWorkflowAsJSON(workflow: DragDropWorkflow): string {
  const executableSteps = getExecutableWorkflow(workflow);

  return JSON.stringify(
    {
      id: workflow.id,
      name: workflow.name,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      summary: getWorkflowSummary(workflow),
      steps: executableSteps,
      customValues: workflow.customValues,
      // Don't export secrets in JSON for security
    },
    null,
    2
  );
}

/**
 * Validate workflow configuration
 */
export function validateWorkflow(
  workflow: DragDropWorkflow
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const executableSteps = getExecutableWorkflow(workflow);

  // Check if there are any enabled steps
  if (executableSteps.length === 0) {
    errors.push("At least one step must be enabled");
  }

  // Check required inputs
  const summary = getWorkflowSummary(workflow);
  const providedInputs = Object.keys(workflow.customValues);
  summary.requiredInputs.forEach((input) => {
    if (!providedInputs.includes(input)) {
      errors.push(`Missing required input: ${input}`);
    }
  });

  // Check required secrets
  const providedSecrets = Object.keys(workflow.secrets);
  summary.requiredSecrets.forEach((secret) => {
    if (!providedSecrets.includes(secret)) {
      errors.push(`Missing required secret: ${secret}`);
    }
  });

  // Check dependencies are resolvable
  const stepIds = new Set(executableSteps.map((s) => s.id));
  executableSteps.forEach((step) => {
    if (step.dependencies) {
      step.dependencies.forEach((dep) => {
        if (!stepIds.has(dep)) {
          errors.push(
            `Step ${step.id} depends on ${dep} which is not enabled or does not exist`
          );
        }
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get category color for UI
 */
export function getCategoryColor(
  category:
    | "source"
    | "build"
    | "test"
    | "security"
    | "deploy"
    | "monitoring"
    | "notification"
): string {
  const colorMap = {
    source: "bg-blue-50 border-blue-200 text-blue-900",
    build: "bg-amber-50 border-amber-200 text-amber-900",
    test: "bg-green-50 border-green-200 text-green-900",
    security: "bg-red-50 border-red-200 text-red-900",
    deploy: "bg-purple-50 border-purple-200 text-purple-900",
    monitoring: "bg-cyan-50 border-cyan-200 text-cyan-900",
    notification: "bg-pink-50 border-pink-200 text-pink-900",
  };
  return colorMap[category] || "bg-gray-50 border-gray-200";
}

/**
 * Get category badge variant
 */
export function getCategoryBadgeVariant(
  category:
    | "source"
    | "build"
    | "test"
    | "security"
    | "deploy"
    | "monitoring"
    | "notification"
): "blue" | "amber" | "green" | "red" | "purple" | "cyan" | "pink" | "gray" {
  const variantMap = {
    source: "blue",
    build: "amber",
    test: "green",
    security: "red",
    deploy: "purple",
    monitoring: "cyan",
    notification: "pink",
  };
  return (variantMap[category] || "gray") as any;
}

/**
 * Get estimated execution time
 */
export function getEstimatedExecutionTime(
  workflow: DragDropWorkflow
): { seconds: number; formatted: string } {
  const executableSteps = getExecutableWorkflow(workflow);
  const totalSeconds = executableSteps.reduce(
    (sum, step) => sum + (step.timeout || 300),
    0
  );

  let formatted = "";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) formatted += `${hours}h `;
  if (minutes > 0) formatted += `${minutes}m `;
  if (seconds > 0 || formatted === "") formatted += `${seconds}s`;

  return {
    seconds: totalSeconds,
    formatted: formatted.trim(),
  };
}
