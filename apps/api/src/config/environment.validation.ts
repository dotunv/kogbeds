import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  ROOT_DOMAIN: z.string().min(1).default('localhost'),
  ROOT_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().default(''),

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6379'),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_SECRET: z.string().min(32),
  REFRESH_EXPIRES_IN: z.string().default('7d'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  UPLOAD_DIR: z.string().optional(),
});

export type EnvironmentVariables = z.infer<typeof envSchema>;

export const validateEnvironment = (
  config: Record<string, unknown>,
): EnvironmentVariables => {
  if (config.NODE_ENV === 'test') {
    const testSchema = envSchema.extend({
      DATABASE_URL: z.string().default('postgresql://test:test@localhost:5432/test'),
      JWT_SECRET: z.string().min(32).default('test-jwt-secret-please-change-0000000'),
      REFRESH_SECRET: z
        .string()
        .min(32)
        .default('test-refresh-secret-please-change-000'),
    });
    const parsed = testSchema.safeParse(config);
    if (!parsed.success) {
      throw new Error(
        `Invalid environment configuration: ${parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`,
      );
    }
    return parsed.data;
  }

  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const readableErrors = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${readableErrors}`);
  }

  return parsed.data;
};
