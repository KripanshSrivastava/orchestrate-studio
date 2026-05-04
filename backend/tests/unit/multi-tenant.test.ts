/**
 * Multi-Tenant Enforcement Tests
 * Verifies cross-org access is blocked and same-org access succeeds
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BaseEntity,
  TenantContext,
  CrossOrgAccessError,
  MissingOrgIdError,
} from '../../types/multi-tenant';
import BaseRepository from '../../database/BaseRepository';

/**
 * Mock repository for testing (in-memory storage)
 */
class MockRepository<T extends BaseEntity> extends BaseRepository<T> {
  private storage: Map<string, T> = new Map();
  private sequence = 0;

  constructor() {
    super('mock_table');
  }

  async findOne(context: TenantContext, filter: any): Promise<T | null> {
    this.validateTenantContext(context);
    const enforced = this.enforceOrgIdFilter(context, filter);

    for (const record of this.storage.values()) {
      let matches = true;
      for (const [key, value] of Object.entries(enforced)) {
        if (record[key as keyof T] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) return record;
    }
    return null;
  }

  async findMany(context: TenantContext, filter: any = {}, options: any = {}) {
    this.validateTenantContext(context);
    const enforced = this.enforceOrgIdFilter(context, filter);

    const matching: T[] = [];
    for (const record of this.storage.values()) {
      let matches = true;
      for (const [key, value] of Object.entries(enforced)) {
        if (record[key as keyof T] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) matching.push(record);
    }

    const offset = options.offset || 0;
    const limit = options.limit || matching.length;
    const data = matching.slice(offset, offset + limit);

    return {
      data,
      total: matching.length,
      limit,
      offset,
      org_id: context.org_id,
    };
  }

  async create(context: TenantContext, data: any): Promise<T> {
    this.validateTenantContext(context);

    const record: T = {
      ...data,
      id: `id-${++this.sequence}`,
      org_id: context.org_id,
      created_at: new Date(),
      updated_at: new Date(),
    } as T;

    this.storage.set(record.id, record);
    return record;
  }

  async update(context: TenantContext, id: string, data: any): Promise<T | null> {
    this.validateTenantContext(context);

    const existing = await this.findById(context, id);
    if (!existing) return null;

    if (existing.org_id !== context.org_id) {
      throw new CrossOrgAccessError(context.org_id, existing.org_id, this.tableName);
    }

    const updated: T = {
      ...existing,
      ...data,
      id: existing.id,
      org_id: existing.org_id,
      created_at: existing.created_at,
      updated_at: new Date(),
    } as T;

    this.storage.set(id, updated);
    return updated;
  }

  async delete(context: TenantContext, id: string): Promise<boolean> {
    this.validateTenantContext(context);

    const existing = await this.findById(context, id);
    if (!existing) return false;

    if (existing.org_id !== context.org_id) {
      throw new CrossOrgAccessError(context.org_id, existing.org_id, this.tableName);
    }

    this.storage.delete(id);
    return true;
  }

  async deleteMany(context: TenantContext, filter: any = {}): Promise<number> {
    this.validateTenantContext(context);
    const enforced = this.enforceOrgIdFilter(context, filter);

    let count = 0;
    for (const [key, record] of this.storage.entries()) {
      let matches = true;
      for (const [filterKey, filterValue] of Object.entries(enforced)) {
        if (record[filterKey as keyof T] !== filterValue) {
          matches = false;
          break;
        }
      }
      if (matches) {
        this.storage.delete(key);
        count++;
      }
    }
    return count;
  }

  async count(context: TenantContext, filter: any = {}): Promise<number> {
    this.validateTenantContext(context);
    const enforced = this.enforceOrgIdFilter(context, filter);

    let count = 0;
    for (const record of this.storage.values()) {
      let matches = true;
      for (const [key, value] of Object.entries(enforced)) {
        if (record[key as keyof T] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) count++;
    }
    return count;
  }
}

/**
 * Test fixtures
 */
const acmeContext: TenantContext = {
  org_id: 'org-acme',
  user_id: 'user-acme-1',
  email: 'alice@acme.com',
  trace_id: 'trace-1',
};

const betaContext: TenantContext = {
  org_id: 'org-beta',
  user_id: 'user-beta-1',
  email: 'bob@beta.com',
  trace_id: 'trace-2',
};

const gammaContext: TenantContext = {
  org_id: 'org-gamma',
  user_id: 'user-gamma-1',
  email: 'charlie@gamma.com',
  trace_id: 'trace-3',
};

interface MockEntity extends BaseEntity {
  name: string;
  data: string;
}

describe('Multi-Tenant Enforcement', () => {
  let repo: MockRepository<MockEntity>;

  beforeEach(() => {
    repo = new MockRepository<MockEntity>();
  });

  describe('✅ Same-Org Access (allowed)', () => {
    it('should create record in own org', async () => {
      const record = await repo.create(acmeContext, {
        name: 'ACME App',
        data: 'test-data',
      });

      expect(record.org_id).toBe('org-acme');
      expect(record.name).toBe('ACME App');
    });

    it('should read own org records', async () => {
      const record1 = await repo.create(acmeContext, { name: 'App 1', data: 'data-1' });
      const record2 = await repo.create(acmeContext, { name: 'App 2', data: 'data-2' });

      const result = await repo.findMany(acmeContext, {});
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should update own org record', async () => {
      const created = await repo.create(acmeContext, { name: 'Original', data: 'v1' });

      const updated = await repo.update(acmeContext, created.id, { name: 'Updated', data: 'v2' });

      expect(updated?.name).toBe('Updated');
      expect(updated?.data).toBe('v2');
      expect(updated?.org_id).toBe('org-acme');
    });

    it('should delete own org record', async () => {
      const created = await repo.create(acmeContext, { name: 'To Delete', data: 'temp' });

      const deleted = await repo.delete(acmeContext, created.id);
      expect(deleted).toBe(true);

      const notFound = await repo.findById(acmeContext, created.id);
      expect(notFound).toBeNull();
    });

    it('should count own org records', async () => {
      await repo.create(acmeContext, { name: 'App 1', data: 'data-1' });
      await repo.create(acmeContext, { name: 'App 2', data: 'data-2' });
      await repo.create(betaContext, { name: 'App 3', data: 'data-3' });

      const acmeCount = await repo.count(acmeContext);
      expect(acmeCount).toBe(2);

      const betaCount = await repo.count(betaContext);
      expect(betaCount).toBe(1);
    });
  });

  describe('❌ Cross-Org Access (blocked)', () => {
    let acmeRecord: MockEntity;
    let betaRecord: MockEntity;

    beforeEach(async () => {
      acmeRecord = await repo.create(acmeContext, { name: 'ACME Secret', data: 'confidential' });
      betaRecord = await repo.create(betaContext, { name: 'Beta Secret', data: 'private' });
    });

    it('should reject cross-org read by ID', async () => {
      // Beta user tries to read ACME user's record
      const result = await repo.findById(betaContext, acmeRecord.id);
      expect(result).toBeNull(); // Returns null, not error (safe access)
    });

    it('should return null on cross-org update attempt', async () => {
      // Beta user tries to update ACME record.
      // By design, cross-org records are invisible, so update returns null.
      const updated = await repo.update(betaContext, acmeRecord.id, { name: 'Hacked' });
      expect(updated).toBeNull();
    });

    it('should return false on cross-org delete attempt', async () => {
      // Gamma user tries to delete ACME record.
      // By design, cross-org records are invisible, so delete returns false.
      const deleted = await repo.delete(gammaContext, acmeRecord.id);
      expect(deleted).toBe(false);
    });

    it('should prevent accidental cross-org query by filter', async () => {
      // Try to manually specify different org_id in filter
      await expect(
        repo.findMany(acmeContext, { org_id: 'org-beta' })
      ).rejects.toThrow(CrossOrgAccessError);
    });

    it('should not show other org records in query', async () => {
      // Query all records as ACME user
      const acmeResults = await repo.findMany(acmeContext, {});

      // Should only see ACME records, not Beta records
      expect(acmeResults.data).toHaveLength(1);
      expect(acmeResults.data[0].org_id).toBe('org-acme');

      // Verify Beta record exists but is not visible
      const betaResults = await repo.findMany(betaContext, {});
      expect(betaResults.data).toHaveLength(1);
      expect(betaResults.data[0].id).toBe(betaRecord.id);
    });
  });

  describe('🔒 Tenant Context Validation', () => {
    it('should throw when org_id missing from context', async () => {
      const invalidContext = { ...acmeContext, org_id: '' };

      await expect(repo.create(invalidContext as any, { name: 'Test' })).rejects.toThrow(
        MissingOrgIdError
      );
    });

    it('should throw when context is null', async () => {
      await expect(repo.create(null as any, { name: 'Test' })).rejects.toThrow(
        MissingOrgIdError
      );
    });

    it('should enforce org_id on all query paths', async () => {
      const record = await repo.create(acmeContext, { name: 'Test', data: 'data' });

      // These should all enforce org_id:
      const byId = await repo.findById(acmeContext, record.id);
      expect(byId?.org_id).toBe('org-acme');

      const byFilter = await repo.findOne(acmeContext, { name: 'Test' });
      expect(byFilter?.org_id).toBe('org-acme');

      const many = await repo.findMany(acmeContext, { name: 'Test' });
      expect(many.data[0].org_id).toBe('org-acme');
    });
  });

  describe('🧹 Bulk Operations', () => {
    beforeEach(async () => {
      await repo.create(acmeContext, { name: 'App 1', data: 'd1' });
      await repo.create(acmeContext, { name: 'App 2', data: 'd2' });
      await repo.create(betaContext, { name: 'App 1', data: 'd3' });
    });

    it('should delete only org records', async () => {
      const deleted = await repo.deleteMany(acmeContext, { name: 'App 1' });
      expect(deleted).toBe(1);

      // Verify only ACME record deleted, Beta record remains
      const acmeCount = await repo.count(acmeContext);
      expect(acmeCount).toBe(1);

      const betaCount = await repo.count(betaContext);
      expect(betaCount).toBe(1);
    });
  });
});

export default {
  MockRepository,
  acmeContext,
  betaContext,
  gammaContext,
};
