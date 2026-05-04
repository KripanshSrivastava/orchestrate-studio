import { Octokit } from 'octokit';
import { type GithubIntegrationValues, type GithubWorkflowRunSummary } from './githubOctokitService.js';

export interface GithubActionsValues {
  workflowFile: string;
  branch: string;
}

export interface GithubWorkflowSummary {
  id: number;
  name: string;
  path: string;
  state: string;
  htmlUrl: string;
}

export interface GithubActionsTestResult {
  healthy: boolean;
  message: string;
  checkedAt: string;
  workflowFile: string;
  branch: string;
  workflows: GithubWorkflowSummary[];
  configuredWorkflow: GithubWorkflowSummary | null;
  latestWorkflowRun: GithubWorkflowRunSummary | null;
}

type CombinedGithubActionsValues = Partial<GithubIntegrationValues & GithubActionsValues>;

const createOctokit = (token: string) => new Octokit({ auth: token });

const normalizeField = (value: string | undefined | null) => (value || '').trim();

const toWorkflowSummary = (workflow: {
  id: number;
  name: string;
  path: string;
  state: string;
  html_url: string;
}): GithubWorkflowSummary => ({
  id: workflow.id,
  name: workflow.name,
  path: workflow.path,
  state: workflow.state,
  htmlUrl: workflow.html_url,
});

const toRunSummary = (run: {
  name?: string | null;
  status?: string | null;
  conclusion?: string | null;
  html_url: string;
  head_sha: string;
  created_at: string;
  updated_at: string;
}): GithubWorkflowRunSummary => ({
  name: run.name || 'workflow-run',
  status: run.status || 'unknown',
  conclusion: run.conclusion || null,
  htmlUrl: run.html_url,
  headSha: run.head_sha,
  createdAt: run.created_at,
  updatedAt: run.updated_at,
});

const findConfiguredWorkflow = (
  workflows: GithubWorkflowSummary[],
  workflowFile: string
): GithubWorkflowSummary | null => {
  const normalized = workflowFile.toLowerCase();
  return workflows.find((workflow) => {
    const workflowPath = workflow.path.toLowerCase();
    const workflowName = workflow.name.toLowerCase();
    return (
      workflowPath === normalized ||
      workflowPath.endsWith(`/${normalized}`) ||
      workflowName === normalized ||
      String(workflow.id) === workflowFile
    );
  }) || null;
};

const getRequiredValues = (values: CombinedGithubActionsValues) => {
  return {
    owner: normalizeField(values.owner),
    repository: normalizeField(values.repository),
    token: normalizeField(values.token),
    workflowFile: normalizeField(values.workflowFile),
    branch: normalizeField(values.branch),
  };
};

export const testGithubActionsConnection = async (
  values: CombinedGithubActionsValues
): Promise<GithubActionsTestResult> => {
  const { owner, repository, token, workflowFile, branch } = getRequiredValues(values);

  if (!owner || !repository || !token) {
    return {
      healthy: false,
      message: 'Connect GitHub first so GitHub Actions can reuse owner, repository, and token',
      checkedAt: new Date().toISOString(),
      workflowFile,
      branch,
      workflows: [],
      configuredWorkflow: null,
      latestWorkflowRun: null,
    };
  }

  if (!workflowFile || !branch) {
    return {
      healthy: false,
      message: 'Workflow file and branch are required',
      checkedAt: new Date().toISOString(),
      workflowFile,
      branch,
      workflows: [],
      configuredWorkflow: null,
      latestWorkflowRun: null,
    };
  }

  const octokit = createOctokit(token);

  try {
    const workflowsResponse = await octokit.rest.actions.listRepoWorkflows({
      owner,
      repo: repository,
      per_page: 100,
    });

    const workflows = workflowsResponse.data.workflows.map(toWorkflowSummary);
    const configuredWorkflow = findConfiguredWorkflow(workflows, workflowFile);

    if (!configuredWorkflow) {
      return {
        healthy: false,
        message: `Workflow ${workflowFile} was not found in ${owner}/${repository}`,
        checkedAt: new Date().toISOString(),
        workflowFile,
        branch,
        workflows,
        configuredWorkflow: null,
        latestWorkflowRun: null,
      };
    }

    const runsResponse = await octokit.rest.actions.listWorkflowRuns({
      owner,
      repo: repository,
      workflow_id: configuredWorkflow.id,
      branch,
      per_page: 1,
    });
    const latestRun = runsResponse.data.workflow_runs[0] || null;

    return {
      healthy: true,
      message: `GitHub Actions connected to ${configuredWorkflow.name}`,
      checkedAt: new Date().toISOString(),
      workflowFile,
      branch,
      workflows,
      configuredWorkflow,
      latestWorkflowRun: latestRun ? toRunSummary(latestRun) : null,
    };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Failed to connect to GitHub Actions',
      checkedAt: new Date().toISOString(),
      workflowFile,
      branch,
      workflows: [],
      configuredWorkflow: null,
      latestWorkflowRun: null,
    };
  }
};

export const listGithubActionsWorkflows = async (
  values: CombinedGithubActionsValues
): Promise<GithubWorkflowSummary[]> => {
  const { owner, repository, token } = getRequiredValues(values);

  if (!owner || !repository || !token) {
    throw new Error('Connect GitHub first so workflows can be listed');
  }

  const octokit = createOctokit(token);
  const workflowsResponse = await octokit.rest.actions.listRepoWorkflows({
    owner,
    repo: repository,
    per_page: 100,
  });

  return workflowsResponse.data.workflows.map(toWorkflowSummary);
};

export const listGithubActionsRuns = async (
  values: CombinedGithubActionsValues
): Promise<GithubWorkflowRunSummary[]> => {
  const { owner, repository, token, workflowFile, branch } = getRequiredValues(values);

  if (!owner || !repository || !token) {
    throw new Error('Connect GitHub first so workflow runs can be listed');
  }

  const octokit = createOctokit(token);
  const options = {
    owner,
    repo: repository,
    branch: branch || undefined,
    per_page: 10,
  };

  if (!workflowFile) {
    const runsResponse = await octokit.rest.actions.listWorkflowRunsForRepo(options);
    return runsResponse.data.workflow_runs.map(toRunSummary);
  }

  const runsResponse = await octokit.rest.actions.listWorkflowRuns({
    ...options,
    workflow_id: workflowFile,
  });

  return runsResponse.data.workflow_runs.map(toRunSummary);
};

export const dispatchGithubActionsWorkflow = async (
  values: CombinedGithubActionsValues,
  inputs: Record<string, string> = {}
): Promise<{ dispatched: true; workflowFile: string; branch: string }> => {
  const { owner, repository, token, workflowFile, branch } = getRequiredValues(values);

  if (!owner || !repository || !token) {
    throw new Error('Connect GitHub first so workflows can be dispatched');
  }

  if (!workflowFile || !branch) {
    throw new Error('Workflow file and branch are required to dispatch a workflow');
  }

  const octokit = createOctokit(token);
  await octokit.rest.actions.createWorkflowDispatch({
    owner,
    repo: repository,
    workflow_id: workflowFile,
    ref: branch,
    inputs,
  });

  return {
    dispatched: true,
    workflowFile,
    branch,
  };
};
