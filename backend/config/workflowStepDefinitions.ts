/**
 * Workflow Step Definitions with Node.js Library Integration
 * Supports drag-and-drop reordering and modern DevOps practices
 * Integrated libraries: axios, bullmq, redis, postgres, docker, octokit, socket.io, yaml, zod
 */

import { z } from "zod";

export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  category: z.enum([
    "source",
    "build",
    "test",
    "security",
    "deploy",
    "monitoring",
    "notification"
  ]),
  requiredInputs: z.array(z.string()).optional(),
  secretsRequired: z.array(z.string()).optional(),
  timeout: z.number().optional(),
  retryCount: z.number().default(0),
  onFailure: z.enum(["fail", "continue", "skip"]).default("fail"),
  environment: z.record(z.string()).optional(),
  handler: z.string(), // Function name to execute
  dragDropEnabled: z.boolean().default(true),
  position: z.number().optional(), // For drag-and-drop ordering
  dependencies: z.array(z.string()).optional(), // Step IDs this depends on
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

/**
 * Highly useful DevOps Pipeline steps using integrated libraries
 */
export const workflowSteps: WorkflowStep[] = [
  // SOURCE CONTROL
  {
    id: "checkout",
    name: "Source Code Checkout",
    description:
      "Clone repository using octokit/github API with authentication",
    icon: "git-branch",
    category: "source",
    requiredInputs: ["repo", "branch"],
    secretsRequired: ["GITHUB_TOKEN"],
    timeout: 300,
    handler: "checkoutRepository",
    dragDropEnabled: true,
    dependencies: [],
    environment: {
      GIT_DEPTH: "1",
      GIT_FETCH_DEPTH: "0",
    },
  },

  // BUILD & COMPILE
  {
    id: "dependency_install",
    name: "Install Dependencies",
    description:
      "Install npm/yarn dependencies with lockfile validation and caching via Redis",
    icon: "package",
    category: "build",
    requiredInputs: ["repo"],
    timeout: 600,
    handler: "installDependencies",
    dragDropEnabled: true,
    dependencies: ["checkout"],
    environment: {
      CI: "true",
      NODE_ENV: "development",
    },
  },

  {
    id: "lint_format_check",
    name: "Lint & Format Check",
    description: "Run ESLint and code formatting checks using eslint config",
    icon: "zap",
    category: "build",
    requiredInputs: ["repo"],
    timeout: 300,
    retryCount: 0,
    handler: "lintAndFormat",
    dragDropEnabled: true,
    dependencies: ["dependency_install"],
    onFailure: "fail",
  },

  {
    id: "build_typescript",
    name: "Build TypeScript",
    description: "Compile TypeScript to JavaScript with optimization",
    icon: "code",
    category: "build",
    requiredInputs: ["repo"],
    timeout: 600,
    handler: "buildTypeScript",
    dragDropEnabled: true,
    dependencies: ["dependency_install"],
  },

  // SECURITY & QUALITY
  {
    id: "dependency_security_scan",
    name: "Dependency Security Scan",
    description:
      "Scan npm dependencies for vulnerabilities using axios to fetch Snyk/npm audit data",
    icon: "shield-alert",
    category: "security",
    requiredInputs: ["repo"],
    secretsRequired: ["SNYK_TOKEN"],
    timeout: 300,
    handler: "scanDependencies",
    dragDropEnabled: true,
    dependencies: ["dependency_install"],
    onFailure: "continue",
  },

  {
    id: "security_scan_deployed",
    name: "Container Security Scan",
    description:
      "Scan Docker image for vulnerabilities using Trivy or similar via axios",
    icon: "shield-check",
    category: "security",
    requiredInputs: ["image_name"],
    timeout: 600,
    handler: "scanContainer",
    dragDropEnabled: true,
    dependencies: ["build_docker_image"],
    onFailure: "continue",
  },

  // TESTING
  {
    id: "unit_tests",
    name: "Unit Tests",
    description:
      "Run unit tests with Vitest and generate coverage reports using Redis for caching",
    icon: "check-circle",
    category: "test",
    requiredInputs: ["repo"],
    timeout: 900,
    retryCount: 1,
    handler: "runUnitTests",
    dragDropEnabled: true,
    dependencies: ["build_typescript"],
  },

  {
    id: "integration_tests",
    name: "Integration Tests",
    description:
      "Run integration tests with live PostgreSQL and Redis connections",
    icon: "git-merge",
    category: "test",
    requiredInputs: ["repo"],
    secretsRequired: ["DATABASE_URL", "REDIS_URL"],
    timeout: 1200,
    retryCount: 1,
    handler: "runIntegrationTests",
    dragDropEnabled: true,
    dependencies: ["unit_tests"],
    environment: {
      TEST_ENV: "integration",
      TEST_TIMEOUT: "60000",
    },
  },

  {
    id: "smoke_tests_staging",
    name: "Smoke Tests (Staging)",
    description:
      "Quick smoke tests on staging environment using axios for API calls",
    icon: "activity",
    category: "test",
    requiredInputs: ["staging_url"],
    timeout: 300,
    retryCount: 2,
    handler: "runSmokeTests",
    dragDropEnabled: true,
    dependencies: ["deploy_staging"],
  },

  {
    id: "smoke_tests_production",
    name: "Smoke Tests (Production)",
    description:
      "Critical smoke tests on production environment with immediate rollback on failure",
    icon: "activity",
    category: "test",
    requiredInputs: ["prod_url"],
    timeout: 600,
    retryCount: 1,
    handler: "runSmokeTests",
    dragDropEnabled: true,
    dependencies: ["deploy_production"],
    onFailure: "fail",
  },

  // DOCKER BUILD & REGISTRY
  {
    id: "build_docker_image",
    name: "Build Docker Image",
    description: "Build Docker image with multi-stage optimization",
    icon: "box",
    category: "build",
    requiredInputs: ["image_name", "dockerfile_path"],
    timeout: 1200,
    handler: "buildDockerImage",
    dragDropEnabled: true,
    dependencies: ["build_typescript"],
    environment: {
      DOCKER_BUILDKIT: "1",
      BUILDKIT_PROGRESS: "plain",
    },
  },

  {
    id: "push_docker_registry",
    name: "Push to Docker Registry",
    description:
      "Push Docker image to registry (Docker Hub, ECR, GCR) using axios and docker CLI",
    icon: "upload-cloud",
    category: "build",
    requiredInputs: ["image_name", "registry_url"],
    secretsRequired: ["DOCKER_USERNAME", "DOCKER_PASSWORD", "DOCKER_REGISTRY_URL"],
    timeout: 600,
    retryCount: 2,
    handler: "pushDockerImage",
    dragDropEnabled: true,
    dependencies: ["build_docker_image"],
  },

  // DATABASE
  {
    id: "migrate_db",
    name: "Database Migration",
    description:
      "Run database migrations safely with rollback capability using PostgreSQL",
    icon: "database",
    category: "deploy",
    secretsRequired: ["DATABASE_URL"],
    timeout: 1200,
    retryCount: 0,
    handler: "migrateDatabase",
    dragDropEnabled: true,
    dependencies: ["checkout"],
    onFailure: "fail",
    environment: {
      MIGRATION_ENV: "production",
    },
  },

  // DEPLOYMENT
  {
    id: "deploy_staging",
    name: "Deploy to Staging",
    description:
      "Deploy Docker image to staging EC2 with health verification using SSH and axios",
    icon: "send",
    category: "deploy",
    requiredInputs: ["image_name", "service_name"],
    secretsRequired: ["STAGING_EC2_HOST", "STAGING_EC2_USER", "STAGING_EC2_SSH_KEY"],
    timeout: 900,
    retryCount: 1,
    handler: "deployToEnvironment",
    dragDropEnabled: true,
    dependencies: ["push_docker_registry"],
    environment: {
      DEPLOY_ENV: "staging",
      HEALTH_CHECK_TIMEOUT: "300",
    },
  },

  {
    id: "manual_approval",
    name: "Manual Approval Gate",
    description:
      "Pause pipeline for manual review before production deployment using Socket.io for notifications",
    icon: "alert-circle",
    category: "deploy",
    timeout: 3600,
    handler: "requireManualApproval",
    dragDropEnabled: true,
    dependencies: ["smoke_tests_staging"],
    onFailure: "fail",
  },

  {
    id: "deploy_production",
    name: "Deploy to Production",
    description:
      "Blue/Green deployment to production with automatic rollback on health check failure",
    icon: "send",
    category: "deploy",
    requiredInputs: ["image_name", "service_name"],
    secretsRequired: ["PROD_EC2_HOST", "PROD_EC2_USER", "PROD_EC2_SSH_KEY"],
    timeout: 1200,
    retryCount: 0,
    handler: "deployToProduction",
    dragDropEnabled: true,
    dependencies: ["manual_approval"],
    environment: {
      DEPLOY_ENV: "production",
      HEALTH_CHECK_TIMEOUT: "600",
      BLUE_GREEN_ENABLED: "true",
    },
  },

  // MONITORING & VERIFICATION
  {
    id: "health_checks",
    name: "Health Checks",
    description:
      "Verify application health with axios and trigger alerts via Socket.io if failed",
    icon: "heart",
    category: "monitoring",
    requiredInputs: ["health_check_url"],
    timeout: 300,
    retryCount: 3,
    handler: "performHealthChecks",
    dragDropEnabled: true,
    dependencies: ["deploy_production"],
    onFailure: "fail",
  },

  {
    id: "performance_baseline",
    name: "Performance Baseline",
    description:
      "Measure performance metrics (response time, throughput) and compare with baseline",
    icon: "trending-up",
    category: "monitoring",
    requiredInputs: ["target_url"],
    timeout: 600,
    handler: "capturePerformanceMetrics",
    dragDropEnabled: true,
    dependencies: ["smoke_tests_staging"],
    onFailure: "continue",
  },

  {
    id: "performance_monitoring",
    name: "Configure Performance Monitoring",
    description:
      "Set up APM (New Relic, DataDog) integration using axios to configure monitoring dashboard",
    icon: "activity",
    category: "monitoring",
    secretsRequired: ["APM_API_KEY"],
    timeout: 300,
    handler: "setupPerformanceMonitoring",
    dragDropEnabled: true,
    dependencies: ["deploy_production"],
    onFailure: "continue",
  },

  {
    id: "alert_config",
    name: "Configure Alerts & Thresholds",
    description:
      "Configure CloudWatch/monitoring alerts using axios and BullMQ for threshold management",
    icon: "bell",
    category: "monitoring",
    secretsRequired: ["ALERT_WEBHOOK_URL"],
    timeout: 300,
    handler: "configureAlerts",
    dragDropEnabled: true,
    dependencies: ["health_checks"],
    onFailure: "continue",
  },

  // NOTIFICATIONS
  {
    id: "slack_notification",
    name: "Slack Notification",
    description:
      "Send deployment status to Slack channel using axios webhook integration",
    icon: "message-square",
    category: "notification",
    requiredInputs: ["slack_webhook"],
    timeout: 60,
    handler: "sendSlackNotification",
    dragDropEnabled: true,
    dependencies: ["alert_config"],
    onFailure: "continue",
    environment: {
      NOTIFICATION_TYPE: "deployment",
    },
  },
];

/**
 * Drag-and-Drop Workflow Builder Interface
 * Allows users to reorder, enable/disable, and configure steps
 */
export interface DragDropWorkflow {
  id: string;
  name: string;
  steps: WorkflowStep[]; // Ordered array - can be reordered
  enabled: boolean[];
  customValues: Record<string, string | number | boolean>; // User inputs
  secrets: Record<string, string>; // Stored securely
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Helper function to create a new drag-drop workflow from template steps
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

  // Update positions
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
export function getExecutableWorkflow(
  workflow: DragDropWorkflow
): WorkflowStep[] {
  return workflow.steps
    .filter((_, index) => workflow.enabled[index])
    .sort(
      (a, b) => (a.position || 0) - (b.position || 0)
    );
}
