import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
}));

vi.mock('../../database/pool.js', () => ({
  default: {
    connect: mocks.connect,
  },
  query: mocks.query,
}));

import applicationService from '../../services/application/ApplicationService.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { TenantContext } from '../../types/multi-tenant.js';

const acmeContext: TenantContext = {
  org_id: 'org-acme',
  user_id: 'user-acme',
  email: 'admin@acme.com',
  trace_id: 'trace-acme',
};

const buildHash = (value: unknown): string => {
  const stableStringify = (input: unknown): string => {
    if (input === null || typeof input !== 'object') {
      return JSON.stringify(input);
    }

    if (Array.isArray(input)) {
      return `[${input.map((item) => stableStringify(item)).join(',')}]`;
    }

    return `{${Object.entries(input as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  };

  return createHash('sha256').update(stableStringify(value)).digest('hex');
};

const createQueryResult = <T>(rows: T[] = []) => ({
  rows,
  rowCount: rows.length,
});

const makeClient = (responses: Array<ReturnType<typeof createQueryResult>>) => {
  const query = vi.fn();
  responses.forEach((response) => {
    query.mockResolvedValueOnce(response);
  });

  return {
    query,
    release: vi.fn(),
  };
};

describe('ApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists applications with pagination and filters', async () => {
    mocks.query
      .mockResolvedValueOnce(createQueryResult([{ total: 2 }]))
      .mockResolvedValueOnce(
        createQueryResult([
          {
            id: 'app-1',
            org_id: 'org-acme',
            name: 'Platform',
            description: 'Main app',
            status: 'active',
            created_at: new Date('2026-01-01T00:00:00.000Z'),
            updated_at: new Date('2026-01-02T00:00:00.000Z'),
          },
        ])
      );

    const result = await applicationService.listApplications(acmeContext, {
      page: 2,
      limit: 10,
      status: 'active',
      search: 'plat',
      sortBy: 'name',
      sortDirection: 'DESC',
      includeDeleted: false,
    });

    expect(result).toEqual({
      items: [
        {
          id: 'app-1',
          org_id: 'org-acme',
          name: 'Platform',
          description: 'Main app',
          status: 'active',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        },
      ],
      total: 2,
      page: 2,
      limit: 10,
    });

    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.query.mock.calls[0][0]).toContain('FROM applications');
  });

  it('gets an application by id', async () => {
    mocks.query.mockResolvedValueOnce(
      createQueryResult([
        {
          id: 'app-1',
          org_id: 'org-acme',
          name: 'Platform',
          description: null,
          status: 'active',
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-01-02T00:00:00.000Z'),
        },
      ])
    );

    const result = await applicationService.getApplicationById(acmeContext, 'app-1');

    expect(result.id).toBe('app-1');
    expect(result.org_id).toBe('org-acme');
    expect(result.name).toBe('Platform');
  });

  it('creates an application and replays the response for the same idempotency key', async () => {
    const payload = {
      name: 'Payments',
      description: 'Payments application',
      status: 'active' as const,
    };
    const requestHash = buildHash(payload);

    const firstClient = makeClient([
      createQueryResult([]),
      createQueryResult([
        {
          id: 'app-100',
          org_id: 'org-acme',
          name: 'Payments',
          description: 'Payments application',
          status: 'active',
          created_at: new Date('2026-02-01T00:00:00.000Z'),
          updated_at: new Date('2026-02-01T00:00:00.000Z'),
        },
      ]),
      createQueryResult([]),
      createQueryResult([]),
    ]);

    const secondClient = makeClient([
      createQueryResult([
        {
          request_hash: requestHash,
          response_body: {
            id: 'app-100',
            org_id: 'org-acme',
            name: 'Payments',
            description: 'Payments application',
            status: 'active',
            created_at: '2026-02-01T00:00:00.000Z',
            updated_at: '2026-02-01T00:00:00.000Z',
          },
        },
      ]),
    ]);

    mocks.connect
      .mockResolvedValueOnce(firstClient as any)
      .mockResolvedValueOnce(secondClient as any);

    const firstResult = await applicationService.createApplication(acmeContext, payload, 'idem-123');
    const secondResult = await applicationService.createApplication(acmeContext, payload, 'idem-123');

    expect(firstResult.replayed).toBe(false);
    expect(firstResult.application.id).toBe('app-100');
    expect(secondResult.replayed).toBe(true);
    expect(secondResult.application.id).toBe('app-100');
    expect(firstClient.query).toHaveBeenCalledWith('BEGIN');
    expect(firstClient.release).toHaveBeenCalled();
    expect(secondClient.release).toHaveBeenCalled();
  });

  it('rejects create without an idempotency key', async () => {
    await expect(
      applicationService.createApplication(acmeContext, {
        name: 'Missing Key',
        description: 'Should fail',
        status: 'active',
      }, '')
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('updates an application', async () => {
    mocks.query.mockResolvedValueOnce(
      createQueryResult([
        {
          id: 'app-1',
          org_id: 'org-acme',
          name: 'Platform v2',
          description: 'Updated',
          status: 'inactive',
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-03-01T00:00:00.000Z'),
        },
      ])
    );

    const result = await applicationService.updateApplication(acmeContext, 'app-1', {
      name: 'Platform v2',
      description: 'Updated',
      status: 'inactive',
    });

    expect(result.name).toBe('Platform v2');
    expect(result.status).toBe('inactive');
  });

  it('soft deletes by default and hard deletes when requested', async () => {
    mocks.query
      .mockResolvedValueOnce(createQueryResult([{ id: 'app-soft' }]))
      .mockResolvedValueOnce(createQueryResult([{ id: 'app-hard' }]));

    const softResult = await applicationService.deleteApplication(acmeContext, 'app-soft', false);
    const hardResult = await applicationService.deleteApplication(acmeContext, 'app-hard', true);

    expect(softResult).toEqual({ id: 'app-soft', deleted: true, mode: 'soft' });
    expect(hardResult).toEqual({ id: 'app-hard', deleted: true, mode: 'hard' });
  });
});
