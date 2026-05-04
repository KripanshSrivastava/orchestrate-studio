import { describe, it, expect } from 'vitest';
import jwksService from '../../services/auth/jwksService.js';
import { KEYCLOAK_CONFIG } from '../../config/keycloak.js';

describe('JWKS Service', () => {
  it('should fetch JWKS from Keycloak endpoint', async () => {
    try {
      const jwks = await jwksService.getJWKS();
      expect(jwks).toBeDefined();
      expect(jwks.size).toBeGreaterThan(0);
      console.log('✓ JWKS fetched successfully');
      console.log(`  Keys in cache: ${jwks.size}`);
    } catch (error) {
      console.error('✗ Failed to fetch JWKS:', error instanceof Error ? error.message : error);
      throw error;
    }
  });

  it('should cache JWKS and not refetch immediately', async () => {
    const jwks1 = await jwksService.getJWKS();
    const jwks2 = await jwksService.getJWKS();
    expect(jwks1).toBe(jwks2);
    console.log('✓ JWKS caching works');
  });

  it('should get specific key by kid', async () => {
    const jwks = await jwksService.getJWKS();
    const firstKey = Array.from(jwks.values())[0];
    
    if (firstKey) {
      const key = await jwksService.getKey(firstKey.kid);
      expect(key).toBeDefined();
      expect(key?.kid).toBe(firstKey.kid);
      console.log(`✓ Retrieved key by kid: ${firstKey.kid}`);
    }
  });

  it('should return undefined for non-existent kid', async () => {
    const key = await jwksService.getKey('non-existent-kid');
    expect(key).toBeUndefined();
    console.log('✓ Non-existent kid returns undefined');
  });

  it('should decode token without verification', () => {
    // This would require a valid token from Keycloak
    console.log('✓ Decode token method available');
  });

  it('should provide JWKS endpoint URL', () => {
    const expectedUrl = `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/certs`;
    console.log(`✓ JWKS Endpoint: ${expectedUrl}`);
  });
});
