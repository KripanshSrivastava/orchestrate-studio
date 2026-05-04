import { z } from 'zod';
import dotenv from 'dotenv';

const optionalUrl = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().url().optional()
);

/**
 * Environment variables schema
 * Validates all required and optional config on startup
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database
  DATABASE_URL: z.string().url().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().default(5432),
  DB_NAME: z.string().default('orchestrate_db'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().optional(),

  // Redis
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Keycloak / OAuth
  KEYCLOAK_URL: z.string().url().optional(),
  KEYCLOAK_INTERNAL_URL: z.string().url().optional(),
  KEYCLOAK_REALM: z.string().default('idp'),
  KEYCLOAK_CLIENT_ID: z.string().default('orchestrate-client'),
  KEYCLOAK_CLIENT_SECRET: z.string().optional(),
  KEYCLOAK_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  // Secret storage
  OPENBAO_ADDR: z.string().url().optional(),
  OPENBAO_TOKEN: z.string().optional(),
  OPENBAO_KV_MOUNT: z.string().default('secret'),
  OPENBAO_PATH_PREFIX: z.string().default('idp'),
  VAULT_ADDR: optionalUrl,
  VAULT_TOKEN: z.string().optional(),
  VAULT_KV_MOUNT: z.string().default('secret'),
  VAULT_PATH_PREFIX: z.string().default('idp'),
  SECRET_STORE_PROVIDER: z.enum(['openbao', 'hashicorp-vault']).default('openbao'),
  SECRET_STORE_REQUIRE_REMOTE: z.enum(['true', 'false']).default('false'),
  AWS_REGION: z.string().optional(),
  KUBERNETES_API_URL: optionalUrl,
  AZURE_KEY_VAULT_URL: optionalUrl,

  // JWT & Security
  JWT_ALGORITHM: z.string().default('RS256'),
  JWT_AUDIENCE: z.string().optional(),
  JWT_ISSUER: z.string().optional(),
  JWT_EXPIRY_SECONDS: z.coerce.number().int().positive().default(300),
  JWT_REFRESH_EXPIRY_SECONDS: z.coerce.number().int().positive().default(86400),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8080'),
  CORS_CREDENTIALS: z.enum(['true', 'false']).default('true'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('text'),

  // Feature flags
  ENABLE_SWAGGER_UI: z.enum(['true', 'false']).default('true'),
  ENABLE_AUDIT_LOGGING: z.enum(['true', 'false']).default('true'),
  ENABLE_METRICS: z.enum(['true', 'false']).default('true'),

  // API Configuration
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  MAX_PAYLOAD_SIZE_MB: z.coerce.number().positive().default(10),
  RATE_LIMIT_REQUESTS: z.coerce.number().int().positive().default(1000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),

  // Multi-tenancy
  DEFAULT_ORG_ID: z.string().default('default-org'),
  ENABLE_MULTI_TENANCY: z.enum(['true', 'false']).default('true'),
});

export type Environment = z.infer<typeof envSchema>;

/**
 * Validated environment variables
 * Set during application startup
 */
let validatedEnv: Environment | null = null;

/**
 * Validate environment configuration on startup
 * Called before server actually starts
 * 
 * @throws Error if validation fails
 * @returns Validated environment object
 */
export function validateConfig(): Environment {
  // Load .env file if exists
  dotenv.config();

  try {
    const env = envSchema.parse(process.env);
    validatedEnv = env;

    console.log('✅ Environment configuration validated');
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   Port: ${env.PORT}`);
    console.log(`   Database: ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
    console.log(`   Redis: ${env.REDIS_HOST}:${env.REDIS_PORT}`);
    console.log(`   Keycloak: ${env.KEYCLOAK_URL || 'http://localhost:8081'}`);
    console.log(`   Keycloak Internal: ${env.KEYCLOAK_INTERNAL_URL || env.KEYCLOAK_URL || 'http://localhost:8081'}`);
    console.log(`   Keycloak Realm: ${env.KEYCLOAK_REALM}`);
    console.log(`   Secret Store: ${env.OPENBAO_ADDR || 'local-dev-file fallback'}`);
    console.log(`   Swagger UI: ${env.ENABLE_SWAGGER_UI === 'true' ? 'enabled' : 'disabled'}`);
    console.log(`   Audit Logging: ${env.ENABLE_AUDIT_LOGGING === 'true' ? 'enabled' : 'disabled'}`);
    console.log(`   Multi-Tenancy: ${env.ENABLE_MULTI_TENANCY === 'true' ? 'enabled' : 'disabled'}`);

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment configuration validation failed');
      console.error('Missing or invalid environment variables:');
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        console.error(`   - ${path}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Get validated environment variable
 * Must be called after validateConfig()
 * 
 * @param key Environment variable key
 * @returns Value or undefined
 */
export function getEnv<K extends keyof Environment>(key: K): Environment[K] {
  if (!validatedEnv) {
    throw new Error('Config not validated yet. Call validateConfig() first.');
  }
  return validatedEnv[key];
}

/**
 * Get all validated environment variables
 */
export function getAllEnv(): Environment {
  if (!validatedEnv) {
    throw new Error('Config not validated yet. Call validateConfig() first.');
  }
  return validatedEnv;
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnv('NODE_ENV') === 'development';
}

/**
 * Check if running in staging
 */
export function isStaging(): boolean {
  return getEnv('NODE_ENV') === 'staging';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnv('NODE_ENV') === 'production';
}

/**
 * Get feature flag value
 */
export function isFeatureEnabled(feature: 'ENABLE_SWAGGER_UI' | 'ENABLE_AUDIT_LOGGING' | 'ENABLE_METRICS'): boolean {
  return getEnv(feature) === 'true';
}

/**
 * Print masked configuration (for logs)
 * Hides sensitive values
 */
export function getMaskedConfig(): Record<string, any> {
  const env = getAllEnv();
  const masked = { ...env } as Record<string, any>;

  // Mask sensitive values
  const sensitiveKeys = [
    'DB_PASSWORD',
    'REDIS_PASSWORD',
    'KEYCLOAK_CLIENT_SECRET',
    'OPENBAO_TOKEN',
    'VAULT_TOKEN',
    'JWT_SECRET',
  ];

  sensitiveKeys.forEach((key) => {
    if (masked[key]) {
      masked[key] = '***REDACTED***';
    }
  });

  return masked;
}

/**
 * Validate specific service connectivity on startup
 * Used by readiness check
 */
export async function validateServiceConnectivity(): Promise<{
  database: boolean;
  redis: boolean;
  keycloak: boolean;
}> {
  const checks = {
    database: false,
    redis: false,
    keycloak: false,
  };

  // Check database
  try {
    // TODO: Implement actual DB check
    checks.database = true;
  } catch (err) {
    console.error('❌ Database connectivity check failed');
  }

  // Check Redis
  try {
    // TODO: Implement actual Redis check
    checks.redis = true;
  } catch (err) {
    console.error('⚠️  Redis connectivity check failed (optional)');
  }

  // Check Keycloak
  try {
    // TODO: Implement actual Keycloak check
    checks.keycloak = true;
  } catch (err) {
    console.error('⚠️  Keycloak connectivity check failed (optional)');
  }

  return checks;
}

/**
 * Config validation schema for request bodies
 * Used by request validators
 */
export const ConfigSchemas = {
  /**
   * Pagination config
   */
  pagination: z.object({
    limit: z.number().int().min(1).max(1000).default(50),
    offset: z.number().int().min(0).default(0),
  }),

  /**
   * Sorting config
   */
  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  /**
   * Filtering base
   */
  filtering: z.object({
    search: z.string().optional(),
  }),
};
