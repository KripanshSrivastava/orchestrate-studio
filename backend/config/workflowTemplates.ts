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

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "nodejs-ci",
    name: "Node.js CI",
    category: "CI",
    flow: ["checkout", "install", "lint", "test"],
    requiredInputs: ["repo", "branch"],
    secretsRequired: [],
    use_case: "validate PRs",
    success_criteria: "tests pass/fail, no deploy"
  },
  {
    id: "nodejs-ci-build",
    name: "Node.js CI + Build",
    category: "CI",
    flow: ["checkout", "install", "test", "build", "artifact_upload"],
    requiredInputs: ["repo", "branch"],
    secretsRequired: [],
    use_case: "produce build output (zip/dist)",
    success_criteria: "artifact available in run"
  },
  {
    id: "aws-ec2-deploy-node",
    name: "AWS EC2 Deploy (Node)",
    category: "Deploy",
    flow: ["checkout", "install", "test", "deploy_ec2"],
    requiredInputs: ["repo", "branch", "app_port"],
    secretsRequired: ["EC2_HOST", "EC2_USER", "EC2_SSH_KEY"],
    deploy_target: "aws_ec2",
    deploy_mode: "node"
  },
  {
    id: "aws-ec2-deploy-docker",
    name: "AWS EC2 Deploy (Docker)",
    category: "Deploy",
    flow: ["checkout", "test", "docker_build", "docker_push", "deploy_ec2"],
    requiredInputs: ["repo", "branch", "image_name", "app_port"],
    secretsRequired: ["DOCKER_USER", "DOCKER_PASSWORD", "EC2_HOST", "EC2_USER", "EC2_SSH_KEY"],
    deploy_target: "aws_ec2",
    deploy_mode: "docker"
  },
  {
    id: "static-site-s3",
    name: "Static Site Deploy (S3)",
    category: "Deploy",
    flow: ["checkout", "build", "deploy_s3"],
    requiredInputs: ["repo", "branch", "bucket_name", "region"],
    secretsRequired: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
  },
  {
    id: "docker-image-only",
    name: "Build & Push Docker Image",
    category: "CI",
    flow: ["checkout", "test", "docker_build", "docker_push"],
    requiredInputs: ["repo", "branch", "image_name"],
    secretsRequired: ["DOCKER_USER", "DOCKER_PASSWORD"],
    use_case: "CI for containers",
    success_criteria: "image available in registry"
  },
  {
    id: "security-scan",
    name: "Security Scan",
    category: "Security",
    flow: ["checkout", "dependency_scan", "container_scan"],
    requiredInputs: ["repo", "branch"],
    secretsRequired: ["SNYK_TOKEN"],
    use_case: "find vulnerabilities",
    success_criteria: "report generated"
  },
  {
    id: "monorepo-service-build",
    name: "Monorepo Service Build",
    category: "CI",
    flow: ["checkout", "select_service", "install", "test", "build"],
    requiredInputs: ["repo", "branch", "service_path"],
    secretsRequired: [],
    use_case: "build a specific service in monorepo"
  },
  {
    id: "ec2-blue-green",
    name: "EC2 Blue/Green Deploy",
    category: "Deploy",
    flow: ["checkout", "test", "docker_build", "docker_push", "deploy_green", "switch_traffic"],
    requiredInputs: ["repo", "branch", "image_name", "app_port"],
    secretsRequired: ["DOCKER_USER", "DOCKER_PASSWORD", "EC2_HOST", "EC2_USER", "EC2_SSH_KEY"],
    deploy_target: "aws_ec2",
    deploy_mode: "docker"
  },
  {
    id: "scheduled-job",
    name: "Scheduled Job",
    category: "CI",
    flow: ["checkout", "run_job"],
    requiredInputs: ["repo", "schedule"],
    secretsRequired: [],
    use_case: "periodic tasks (backup, cleanup)"
  },
  {
    id: "load-test",
    name: "Load Test",
    category: "Performance",
    flow: ["deploy", "run_load_test", "report"],
    requiredInputs: ["target_url"],
    secretsRequired: []
  },
  {
    id: "db-migrate-deploy",
    name: "DB Migrate + Deploy",
    category: "Deploy",
    flow: ["checkout", "migrate_db", "test", "deploy_ec2"],
    requiredInputs: ["repo", "branch", "app_port"],
    secretsRequired: ["DB_URL", "EC2_HOST", "EC2_USER", "EC2_SSH_KEY"],
    use_case: "safe schema changes before deploy"
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
      "slack_notification"
    ],
    requiredInputs: [
      "repo",
      "branch",
      "service_name",
      "image_name",
      "app_port",
      "environment",
      "slack_webhook"
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
      "VAULT_TOKEN"
    ],
    deploy_target: "aws_ec2",
    deploy_mode: "docker",
    use_case: "complete production CI/CD with security, testing, and monitoring",
    success_criteria: "production deployment successful with health checks passing and alerts configured"
  }
];
