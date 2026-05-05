import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('axios', () => ({
  default: {
    request: requestMock,
  },
}));

import { testExternalIntegration } from '../../services/integrations/externalIntegrationService.js';

describe('externalIntegrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies Docker Hub with the access-token bearer flow', async () => {
    requestMock
      .mockResolvedValueOnce({
        status: 200,
        data: { access_token: 'hub-access-token' },
      });

    const result = await testExternalIntegration('dockerhub', {
      username: 'docker-user',
      token: 'docker-token',
    });

    expect(result).not.toBeNull();
    expect(result?.healthy).toBe(true);
    expect(result?.message).toContain('Docker Hub connected as docker-user');
    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: 'POST',
        url: 'https://hub.docker.com/v2/auth/token',
        data: {
          identifier: 'docker-user',
          secret: 'docker-token',
        },
      })
    );
    expect(requestMock).toHaveBeenCalledTimes(1);
  });
});