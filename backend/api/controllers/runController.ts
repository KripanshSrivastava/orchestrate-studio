import { Request, Response } from 'express';
import { getAllExecutionRuns, getExecutionRun, updateExecutionRun } from '../../services/workflow/workflowExecutionService.js';
import { listGithubActionsRuns } from '../../services/integrations/githubActionsService.js';
import secretManagerService from '../../services/secrets/secretManagerService.js';

const REFRESHABLE_STATUSES = new Set(['pending', 'queued', 'running']);

const mapGithubRunStatus = (status: string, conclusion: string | null): string => {
  if (status === 'in_progress') {
    return 'running';
  }

  if (status === 'completed') {
    return conclusion === 'success' ? 'success' : 'failed';
  }

  return 'pending';
};

const getGithubActionsValues = async (userId: string) => {
  const github = await secretManagerService.getUserIntegrationValues(userId, 'github');
  const githubActions = await secretManagerService.getUserIntegrationValues(userId, 'github-actions');

  return {
    ...github.values,
    ...githubActions.values,
  };
};

const getRunBranch = (run: { input: Record<string, unknown> | null }): string | undefined => {
  const branch = run.input?.branch;
  return typeof branch === 'string' && branch.trim() ? branch.trim() : undefined;
};

const refreshGithubStatuses = async (
  userId: string,
  runs: Awaited<ReturnType<typeof getAllExecutionRuns>>
) => {
  const refreshableRuns = runs.filter((run) => REFRESHABLE_STATUSES.has(run.status));
  if (refreshableRuns.length === 0) {
    return runs;
  }

  const values = await getGithubActionsValues(userId);
  const githubRunsByBranch = new Map<string, Awaited<ReturnType<typeof listGithubActionsRuns>>>();
  const branches = Array.from(
    new Set(refreshableRuns.map(getRunBranch).filter((branch): branch is string => Boolean(branch)))
  );
  const branchesToRefresh = branches.length > 0 ? branches : [values.branch || ''];

  for (const branch of branchesToRefresh) {
    try {
      githubRunsByBranch.set(branch, await listGithubActionsRuns({ ...values, branch }));
    } catch (error) {
      console.warn(
        `[runs] Skipping GitHub Actions status refresh for branch "${branch}":`,
        error instanceof Error ? error.message : error
      );
    }
  }

  if (githubRunsByBranch.size === 0) {
    return runs;
  }

  const updatedById = new Map<string, Awaited<ReturnType<typeof updateExecutionRun>>>();
  const usedGithubRuns = new Set<string>();

  for (const run of refreshableRuns) {
    const githubRuns = githubRunsByBranch.get(getRunBranch(run) || values.branch || '') || [];
    if (githubRuns.length === 0) {
      continue;
    }

    const startedAt = new Date(run.started_at).getTime();
    const matchingGithubRun = githubRuns.find((githubRun) => {
      const key = `${githubRun.htmlUrl}:${githubRun.headSha}`;
      if (usedGithubRuns.has(key)) {
        return false;
      }

      const createdAt = new Date(githubRun.createdAt).getTime();
      return Number.isFinite(createdAt) && createdAt >= startedAt - 120_000;
    });

    if (!matchingGithubRun) {
      continue;
    }

    usedGithubRuns.add(`${matchingGithubRun.htmlUrl}:${matchingGithubRun.headSha}`);

    const nextStatus = mapGithubRunStatus(matchingGithubRun.status, matchingGithubRun.conclusion);
    const finishedAt = matchingGithubRun.status === 'completed'
      ? matchingGithubRun.updatedAt || new Date().toISOString()
      : null;
    const output = {
      ...(run.output || {}),
      githubActions: matchingGithubRun,
    };

    const updated = await updateExecutionRun(run.id, {
      status: nextStatus,
      output,
      error: nextStatus === 'failed'
        ? `GitHub Actions concluded: ${matchingGithubRun.conclusion || 'failure'}`
        : null,
      finished_at: finishedAt,
    });

    updatedById.set(run.id, updated);
  }

  return runs.map((run) => {
    const updated = updatedById.get(run.id);
    return updated ? { ...updated, workflow_name: run.workflow_name } : run;
  });
};

export const getRunStatusHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const run = await getExecutionRun(id);

    if (!run) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Execution run not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: run,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};

export const getAllRunsHandler = async (_req: Request, res: Response) => {
  try {
    const runs = await getAllExecutionRuns();
    const userId = _req.tenantContext?.user_id;
    const refreshedRuns = userId ? await refreshGithubStatuses(userId, runs) : runs;

    res.status(200).json({
      success: true,
      data: refreshedRuns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};
