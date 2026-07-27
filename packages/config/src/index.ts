import { z } from 'zod';

export const AppConfigSchema = z
  .object({
    PUBLIC_SUPABASE_URL: z
      .string()
      .url('PUBLIC_SUPABASE_URL must be a valid URL'),
    PUBLIC_SUPABASE_ANON_KEY: z
      .string()
      .min(1, 'PUBLIC_SUPABASE_ANON_KEY is required'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    VAULT_ROOT_KEY: z.string().optional(),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV === 'production') {
      if (!val.SUPABASE_SERVICE_ROLE_KEY || val.SUPABASE_SERVICE_ROLE_KEY.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SUPABASE_SERVICE_ROLE_KEY'],
          message: 'SUPABASE_SERVICE_ROLE_KEY is required in production',
        });
      }
      if (!val.VAULT_ROOT_KEY || val.VAULT_ROOT_KEY.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['VAULT_ROOT_KEY'],
          message: 'VAULT_ROOT_KEY must be at least 32 characters long in production',
        });
      }
    }
  });

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadAppConfig(env: Record<string, string | undefined>): AppConfig {
  const result = AppConfigSchema.safeParse(env);
  if (!result.success) {
    const formattedErrors = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'root',
      message: issue.message,
    }));
    console.error('[TxtGrph Config Boot Error]', formattedErrors);
    throw new Error(`[TxtGrph Config Error] Environment validation failed: ${JSON.stringify(formattedErrors)}`);
  }
  return result.data;
}
