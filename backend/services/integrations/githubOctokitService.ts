import { Octokit } from 'octokit';

export interface GithubIntegrationValues {
  owner: string;
  repository: string;
  token: string;
}

export interface GithubWorkflowRunSummary {
  name: string;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  headSha: string;
  createdAt: string;
  updatedAt: string;
}

export interface GithubRepositorySummary {
  fullName: string;
  description: string | null;
  defaultBranch: string;
  isPrivate: boolean;
  isArchived: boolean;
  htmlUrl: string;
  latestWorkflowRun: GithubWorkflowRunSummary | null;
}

export interface GithubConnectionTestResult {
  healthy: boolean;
  message: string;
  repository: GithubRepositorySummary | null;
  account?: {
    login: string;
    name: string | null;
    htmlUrl: string;
  } | null;
  checkedAt: string;
}

const createOctokit = (token: string) => new Octokit({ auth: token });

const normalizeField = (value: string | undefined | null) => (value || '').trim();

export const testGithubConnection = async (
  values: Partial<GithubIntegrationValues>
): Promise<GithubConnectionTestResult> => {
  const owner = normalizeField(values.owner);
  const repository = normalizeField(values.repository);
  const token = normalizeField(values.token);

  if (!token) {
    return {
      healthy: false,
      message: 'GitHub token is required',
      repository: null,
      account: null,
      checkedAt: new Date().toISOString(),
    };
  }

  const octokit = createOctokit(token);

  try {
    const userResponse = await octokit.rest.users.getAuthenticated();

    if (!owner || !repository) {
      return {
        healthy: true,
        message: `GitHub connected as ${userResponse.data.login}`,
        repository: null,
        account: {
          login: userResponse.data.login,
          name: userResponse.data.name,
          htmlUrl: userResponse.data.html_url,
        },
        checkedAt: new Date().toISOString(),
      };
    }

    const repoResponse = await octokit.rest.repos.get({ owner, repo: repository });
    const workflowRunsResponse = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo: repository,
      per_page: 1,
    });

    const latestRun = workflowRunsResponse.data.workflow_runs[0] || null;

    return {
      healthy: true,
      message: `Connected to ${repoResponse.data.full_name}`,
      account: {
        login: userResponse.data.login,
        name: userResponse.data.name,
        htmlUrl: userResponse.data.html_url,
      },
      repository: {
        fullName: repoResponse.data.full_name,
        description: repoResponse.data.description,
        defaultBranch: repoResponse.data.default_branch,
        isPrivate: repoResponse.data.private,
        isArchived: repoResponse.data.archived,
        htmlUrl: repoResponse.data.html_url,
        latestWorkflowRun: latestRun
          ? {
              name: latestRun.name || 'workflow-run',
              status: latestRun.status || 'unknown',
              conclusion: latestRun.conclusion,
              htmlUrl: latestRun.html_url,
              headSha: latestRun.head_sha,
              createdAt: latestRun.created_at,
              updatedAt: latestRun.updated_at,
            }
          : null,
      },
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect to GitHub';

    return {
      healthy: false,
      message,
      repository: null,
      account: null,
      checkedAt: new Date().toISOString(),
    };
  }
};
