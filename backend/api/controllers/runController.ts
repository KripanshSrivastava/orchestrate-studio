import { Request, Response } from 'express';
import { getExecutionRun } from '../../services/workflow/workflowExecutionService.js';

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
