import axios from 'axios';
import jwt from 'jsonwebtoken';
import { createPublicKey } from 'node:crypto';
import { KEYCLOAK_CONFIG } from '../../config/keycloak.js';

export interface JWKSKey {
  kty: string;
  kid: string;
  use: string;
  n: string;
  e: string;
  alg: string;
}

export interface DecodedToken {
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
  realm_access: { roles: string[] };
  iss: string;
  aud: string | string[];
  azp?: string;
  client_id?: string;
  exp: number;
  iat: number;
}

class JWKSService {
  private jwksUrl: string;
  private cache: Map<string, JWKSKey> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 600000; // 10 minutes in ms
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor() {
    this.jwksUrl = `${KEYCLOAK_CONFIG.internalUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/certs`;
  }

  /**
   * Fetch and cache JWKS from Keycloak
   */
  private async fetchJWKS(): Promise<Map<string, JWKSKey>> {
    try {
      console.log(`[JWKS] Fetching from ${this.jwksUrl}`);
      const response = await axios.get(this.jwksUrl, { timeout: 5000 });

      this.cache.clear();
      response.data.keys.forEach((key: JWKSKey) => {
        this.cache.set(key.kid, key);
      });

      this.cacheExpiry = Date.now() + this.CACHE_TTL;
      console.log(`[JWKS] Cached ${this.cache.size} keys`);
      return this.cache;
    } catch (error) {
      console.error('[JWKS] Fetch failed:', error instanceof Error ? error.message : error);
      throw new Error('Failed to fetch JWKS from Keycloak');
    }
  }

  /**
   * Get cached JWKS, refresh if expired
   */
  async getJWKS(): Promise<Map<string, JWKSKey>> {
    if (this.cache.size === 0 || Date.now() > this.cacheExpiry) {
      this.cacheMisses++;
      console.log(`[JWKS Cache] MISS - Fetching fresh keys (misses: ${this.cacheMisses})`);
      return await this.fetchJWKS();
    }
    this.cacheHits++;
    const ttlRemaining = Math.round((this.cacheExpiry - Date.now()) / 1000);
    console.log(`[JWKS Cache] HIT - ${this.cache.size} keys cached (TTL: ${ttlRemaining}s, hits: ${this.cacheHits})`);
    return this.cache;
  }

  /**
   * Get specific key by kid
   */
  async getKey(kid: string): Promise<JWKSKey | undefined> {
    const jwks = await this.getJWKS();
    return jwks.get(kid);
  }

  /**
   * Convert JWKS key to PEM format
   */
  private keyToPEM(key: JWKSKey): string {
    // Keycloak JWKS provides n/e in base64url, which Node can consume directly as JWK.
    const publicKey = createPublicKey({
      key: {
        kty: 'RSA',
        n: key.n,
        e: key.e,
      },
      format: 'jwk',
    });

    return publicKey.export({ type: 'spki', format: 'pem' }).toString();
  }

  /**
   * Validate JWT with full signature and claim checks
   */
  async validateToken(token: string): Promise<DecodedToken> {
    try {
      // Decode without verification to get kid
      const decoded = jwt.decode(token, { complete: true }) as any;

      if (!decoded || !decoded.header.kid) {
        throw new Error('Invalid token: missing kid in header');
      }

      console.log(`[JWT Verify] Token header - alg: ${decoded.header.alg}, kid: ${decoded.header.kid}`);

      // Fetch the key
      const key = await this.getKey(decoded.header.kid);
      if (!key) {
        throw new Error(`Invalid token: kid not found in JWKS (${decoded.header.kid})`);
      }

      console.log(`[JWT Verify] Key found - kty: ${key.kty}, use: ${key.use}, alg: ${key.alg}`);

      // Convert to PEM
      const pem = this.keyToPEM(key);
      // Verify signature, expiry, and issuer here. Audience/client validation
      // is handled in authMiddleware so Keycloak public-client tokens that use
      // azp instead of aud can still be accepted safely.
      const verified = jwt.verify(token, pem, {
        algorithms: ['RS256'],
        issuer: `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}`,
      });

      if (!verified || typeof verified === 'string') {
        throw new Error('Invalid token payload');
      }

      const payload = verified as DecodedToken;

      console.log(`[JWT Verify] ✅ Signature valid - sub: ${payload.sub}, exp: ${new Date(payload.exp * 1000).toISOString()}`);

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        console.warn(`[JWT Verify] ❌ Token expired at ${new Date(error.expiredAt).toISOString()}`);
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        console.error(`[JWT Verify] ❌ JWT Error: ${error.message}`);
        throw new Error(`Invalid token: ${error.message}`);
      }
      console.error(`[JWT Verify] ❌ Verification failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get token info without verification (for debugging)
   */
  decodeToken(token: string): DecodedToken | null {
    try {
      return jwt.decode(token) as DecodedToken;
    } catch {
      return null;
    }
  }

  /**
   * Force refresh JWKS cache
   */
  async refreshCache(): Promise<void> {
    this.cacheExpiry = 0;
    await this.fetchJWKS();
  }

  /**
   * Get cache metrics and stats
   */
  getCacheStats(): {
    size: number;
    ttlMs: number;
    ttlRemainingSec: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const ttlRemaining = Math.max(0, this.cacheExpiry - Date.now());
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;

    return {
      size: this.cache.size,
      ttlMs: this.CACHE_TTL,
      ttlRemainingSec: Math.round(ttlRemaining / 1000),
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: Math.round(hitRate),
    };
  }

  /**
   * Verify cache integrity and key structure
   */
  verifyCacheIntegrity(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (this.cache.size === 0 && this.cacheExpiry > Date.now()) {
      issues.push('Cache size is 0 but TTL is still valid');
    }

    this.cache.forEach((key, kid) => {
      if (!key.kty) issues.push(`Key ${kid}: missing kty`);
      if (!key.kid) issues.push(`Key ${kid}: missing kid`);
      if (!key.n) issues.push(`Key ${kid}: missing RSA modulus (n)`);
      if (!key.e) issues.push(`Key ${kid}: missing RSA exponent (e)`);
      if (key.kty !== 'RSA') issues.push(`Key ${kid}: unexpected kty (${key.kty}), expected RSA`);
      if (key.alg !== 'RS256') issues.push(`Key ${kid}: unexpected alg (${key.alg}), expected RS256`);
    });

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Log cache and verification details
   */
  logStatus(): void {
    const stats = this.getCacheStats();
    const integrity = this.verifyCacheIntegrity();

    console.log('[JWKS Status]');
    console.log(`  Cache Size: ${stats.size} keys`);
    console.log(`  TTL: ${stats.ttlMs / 1000}s (remaining: ${stats.ttlRemainingSec}s)`);
    console.log(`  Cache Hits/Misses: ${stats.hits}/${stats.misses} (${stats.hitRate}% hit rate)`);
    console.log(`  Integrity: ${integrity.valid ? '✅ VALID' : '❌ ISSUES'}`);

    if (!integrity.valid) {
      integrity.issues.forEach((issue) => console.warn(`    - ${issue}`));
    }
  }
}

export default new JWKSService();
