/**
 * Frontend Workflow Templates and Step Definitions
 * Synced from backend config/workflowTemplates.ts and config/workflowStepDefinitions.ts
 */

export interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  flow: string[];
  requiredInputs: string[];
  secretsRequired: string[];
  deploy_target?: string;
  deploy_mode?: string;
  use_case?: string;
  success_criteria?: string;
}

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

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "nodejs-ci",
    name: "Node.js CI",
    category: "CI",
    flow: ["checkout", "install", "lint", "test"],
    requiredInputs: ["repo", "branch"],
    secretsRequired: [],
    use_case: "validate PRs",
    success_criteria: "tests pass/fail, no deploy",
  },
  {
    id: "nodejs-ci-build",
    name: "Node.js CI + Build",
    category: "CI",
    flow: ["checkout", "install", "test", "build", "artifact_upload"],
    requiredInputs: ["repo", "branch"],
    secretsRequired: [],
    use_case: "produce build output (zip/dist)",
    success_criteria: "artifact available in run",
  },
  {
    id: "aws-ec2-deploy-node",
    name: "AWS EC2 Deploy (Node)",
    category: "Deploy",
    flow: ["checkout", "install", "test", "deploy_ec2"],
    requiredInputs: ["repo", "branch", "app_port"],
    secretsRequired: ["EC2_HOST", "EC2_USER", "EC2_SSH_KEY"],
    deploy_target: "aws_ec2",
    deploy_mode: "node",
  },
  {
    id: "aws-ec2-deploy-docker",
    name: "AWS EC2 Deploy (Docker)",
    category: "Deploy",
    flow: ["checkout", "test", "docker_build", "docker_push", "deploy_ec2"],
    requiredInputs: ["repo", "branch", "image_name", "app_port"],
    secretsRequired: [
      "DOCKER_USER",
      "DOCKER_PASSWORD",
      "EC2_HOST",
      "EC2_USER",
      "EC2_SSH_KEY",
    ],
    deploy_target: "aws_ec2",
    deploy_mode: "docker",
  },
  {
    id: "static-site-s3",
    name: "Static Site Deploy (S3)",
    category: "Deploy",
    flow: ["checkout", "build", "deploy_s3"],
    requiredInputs: ["repo", "branch", "bucket_name", "region"],
    secretsRequired: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
  },
  {
    id: "docker-image-only",
    name: "Build & Push Docker Image",
    category: "CI",
    flow: ["checkout", "test", "docker_build", "docker_push"],
    requiredInputs: ["repo", "branch", "image_name"],
    secretsRequired: ["DOCKER_USER", "DOCKER_PASSWORD"],
    use_case: "CI for containers",
    success_criteria: "image available in registry",
  },
  {
    id: "security-scan",
    name: "Security Scan",
    category: "Security",
    flow: ["checkout", "dependency_scan", "container_scan"],
    requiredInputs: ["repo", "branch"],
    secretsRequired: ["SNYK_TOKEN"],
    use_case: "find vulnerabilities",
    success_criteria: "report generated",
  },
  {
    id: "monorepo-service-build",
    name: "Monorepo Service Build",
    category: "CI",
    flow: ["checkout", "select_service", "install", "test", "build"],
    requiredInputs: ["repo", "branch", "service_path"],
    secretsRequired: [],
    use_case: "build a specific service in monorepo",
  },
  {
    id: "ec2-blue-green",
    name: "EC2 Blue/Green Deploy",
    category: "Deploy",
    flow: [
      "checkout",
      "test",
      "docker_build",
      "docker_push",
      "deploy_green",
      "switch_traffic",
    ],
    requiredInputs: ["repo", "branch", "image_name", "app_port"],
    secretsRequired: [
      "DOCKER_USER",
      "DOCKER_PASSWORD",
      "EC2_HOST",
      "EC2_USER",
      "EC2_SSH_KEY",
    ],
    deploy_target: "aws_ec2",
    deploy_mode: "docker",
  },
  {
    id: "scheduled-job",
    name: "Scheduled Job",
    category: "CI",
    flow: ["checkout", "run_job"],
    requiredInputs: ["repo", "schedule"],
    secretsRequired: [],
    use_case: "periodic tasks (backup, cleanup)",
  },
  {
    id: "load-test",
    name: "Load Test",
    category: "Performance",
    flow: ["deploy", "run_load_test", "report"],
    requiredInputs: ["target_url"],
    secretsRequired: [],
  },
  {
    id: "db-migrate-deploy",
    name: "DB Migrate + Deploy",
    category: "Deploy",
    flow: ["checkout", "migrate_db", "test", "deploy_ec2"],
    requiredInputs: ["repo", "branch", "app_port"],
    secretsRequired: ["DB_URL", "EC2_HOST", "EC2_USER", "EC2_SSH_KEY"],
    use_case: "safe schema changes before deploy",
  },
  {
    id: "devops-full-lifecycle",
    name: "DevOps Pipeline — Full Lifecycle",
    category: "DevOps",
    flow: [
      "checkout",
      "dependency_install",
      "lint_format_check",
      "dependency_security_scan",
      "unit_tests",
      "integration_tests",
      "build_typescript",
      "build_docker_image",
      "push_docker_registry",
      "deploy_staging",
      "smoke_tests_staging",
      "performance_baseline",
      "security_scan_deployed",
      "manual_approval",
      "deploy_production",
      "smoke_tests_production",
      "health_checks",
      "performance_monitoring",
      "alert_config",
      "slack_notification",
    ],
    requiredInputs: [
      "repo",
      "branch",
      "service_name",
      "image_name",
      "app_port",
      "environment",
      "slack_webhook",
    ],
    secretsRequired: [
      "DOCKER_USERNAME",
      "DOCKER_PASSWORD",
      "DOCKER_REGISTRY_URL",
      "STAGING_EC2_HOST",
      "STAGING_EC2_USER",
      "STAGING_EC2_SSH_KEY",
      "PROD_EC2_HOST",
      "PROD_EC2_USER",
      "PROD_EC2_SSH_KEY",
      "DATABASE_URL",
      "REDIS_URL",
      "VAULT_ADDR",
      "VAULT_TOKEN",
    ],
    deploy_target: "aws_ec2",
    deploy_mode: "docker",
    use_case:
      "complete production CI/CD with security, testing, and monitoring",
    success_criteria:
      "production deployment successful with health checks passing and alerts configured",
  },
];

export const workflowSteps: WorkflowStep[] = [
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
    secretsRequired: [
      "DOCKER_USERNAME",
      "DOCKER_PASSWORD",
      "DOCKER_REGISTRY_URL",
    ],
    timeout: 600,
    retryCount: 2,
    handler: "pushDockerImage",
    dragDropEnabled: true,
    dependencies: ["build_docker_image"],
  },
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

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === id);
}

export function getStepById(id: string): WorkflowStep | undefined {
  return workflowSteps.find((s) => s.id === id);
}

export function getStepsByIds(ids: string[]): WorkflowStep[] {
  return ids.map((id) => getStepById(id)).filter(Boolean) as WorkflowStep[];
}

export function getTemplateSteps(templateId: string): WorkflowStep[] {
  const template = getTemplateById(templateId);
  if (!template) return [];
  return getStepsByIds(template.flow);
}
