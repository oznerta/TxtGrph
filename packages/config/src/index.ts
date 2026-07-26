import { z } from 'zod';

/**
 * Environment configuration schema
 * Fails fast on boot if required values are invalid
 */
export const AppConfigSchema = z.object({
  PUBLIC_SUPABASE_URL: z.string().url().optional(),
  PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadAppConfig(env: Record<string, string | undefined>): AppConfig {
  const result = AppConfigSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`[TxtGrph Config Error] Environment validation failed: ${result.error.message}`);
  }
  return result.data;
}
