import { Request, Response } from 'express';

import { updateExecutionRun } from '../../services/workflow/workflowExecutionService.js';

export const handleGithubWebhookWorkflowRun = async (req: Request, res: Response) => {
  try {
    const { workflow_run } = req.body;

    if (!workflow_run) {
      res.status(400).json({ error: 'Invalid payload: missing workflow_run' });
      return;
    }

    // Extract run ID from workflow run inputs (we stored it there during dispatch)
    const runInputs = workflow_run.inputs || {};
    const executionRunId = runInputs.runId || workflow_run.name?.match(/run-(\w+)/)?.[1];

    if (!executionRunId) {
      console.warn('[webhook] Could not extract execution run ID from workflow run:', workflow_run.name);
      res.status(200).json({ success: true, message: 'Event received but no execution run ID found' });
      return;
    }

    // Map GitHub workflow run status to our execution status
    let executionStatus: string;
    switch (workflow_run.status) {
      case 'queued':
      case 'in_progress':
        executionStatus = 'running';
        break;
      case 'completed':
        executionStatus = workflow_run.conclusion === 'success' ? 'success' : 'failed';
        break;
      default:
        executionStatus = 'pending';
    }

    // Update execution run status in DB
    await updateExecutionRun(executionRunId, {
      status: executionStatus,
      finished_at: workflow_run.status === 'completed' ? new Date().toISOString() : undefined,
      error: workflow_run.conclusion === 'failure' ? `GitHub Actions workflow failed: ${workflow_run.conclusion}` : undefined
    }).catch(err => {
      console.error(`[webhook] Failed to update execution run ${executionRunId}:`, err);
    });

    console.log(`[webhook] Updated execution run ${executionRunId} to status: ${executionStatus}`);

    res.status(200).json({
      success: true,
      message: 'Workflow status updated',
      execution_run_id: executionRunId,
      status: executionStatus
    });

  } catch (error) {
    console.error('[webhook] Error handling GitHub workflow_run event:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process webhook'
    });
  }
};

export const githubWebhookHealth = async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'GitHub webhook endpoint is healthy',
    events: ['workflow_run']
  });
};
