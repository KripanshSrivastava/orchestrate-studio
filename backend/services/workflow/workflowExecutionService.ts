import { query } from '../../database/pool.js';

export interface ExecutionRunEntity {
  id: string;
  workflow_id: string;
  status: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

interface ExecutionRunRecord {
  id: string;
  workflow_id: string;
  status: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string | Date;
  finished_at: string | Date | null;
}

const toIsoString = (value: string | Date | null): string | null => {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
};

const normalizeExecutionRun = (record: ExecutionRunRecord): ExecutionRunEntity => ({
  ...record,
  started_at: toIsoString(record.started_at) as string,
  finished_at: toIsoString(record.finished_at),
});

export const createExecutionRun = async (
  workflowId: string,
  status: string,
  input: Record<string, unknown> | null = null
): Promise<ExecutionRunEntity> => {
  const result = await query<ExecutionRunRecord>(
    `
    INSERT INTO execution_runs (workflow_id, status, input)
    VALUES ($1, $2, $3::jsonb)
    RETURNING id, workflow_id, status, input, output, error, started_at, finished_at
    `,
    [workflowId, status, input]
  );

  const record = result.rows[0];
  if (!record) {
    throw new Error('Failed to create execution run');
  }

  return normalizeExecutionRun(record);
};

export const updateExecutionRun = async (
  id: string,
  updates: Partial<Pick<ExecutionRunEntity, 'status' | 'output' | 'error' | 'finished_at'>>
): Promise<ExecutionRunEntity> => {
  const result = await query<ExecutionRunRecord>(
    `
    UPDATE execution_runs
    SET status = COALESCE($2, status),
        output = COALESCE($3::jsonb, output),
        error = COALESCE($4, error),
        finished_at = COALESCE($5, finished_at)
    WHERE id = $1
    RETURNING id, workflow_id, status, input, output, error, started_at, finished_at
    `,
    [
      id,
      updates.status ?? null,
      updates.output ?? null,
      updates.error ?? null,
      updates.finished_at ?? null,
    ]
  );

  const record = result.rows[0];
  if (!record) {
    throw new Error('Execution run not found');
  }

  return normalizeExecutionRun(record);
};

export const getExecutionRun = async (id: string): Promise<ExecutionRunEntity | null> => {
  const result = await query<ExecutionRunRecord>(
    `
    SELECT id, workflow_id, status, input, output, error, started_at, finished_at
    FROM execution_runs
    WHERE id = $1
    `,
    [id]
  );

  const record = result.rows[0];
  if (!record) {
    return null;
  }

  return normalizeExecutionRun(record);
};

export const getAllExecutionRuns = async (): Promise<(ExecutionRunEntity & { workflow_name?: string })[]> => {
  const result = await query<ExecutionRunRecord & { workflow_name?: string }>(
    `
    SELECT e.id, e.workflow_id, e.status, e.input, e.output, e.error, e.started_at, e.finished_at, w.name as workflow_name
    FROM execution_runs e
    LEFT JOIN workflows w ON e.workflow_id = w.id
    ORDER BY e.started_at DESC
    LIMIT 50
    `
  );

  return result.rows.map((row) => ({
    ...normalizeExecutionRun(row),
    workflow_name: row.workflow_name,
  }));
};
