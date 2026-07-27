import { describe, expect, it } from 'vitest';
import { loadAppConfig } from '../index.js';

describe('AppConfigSchema & loadAppConfig', () => {
  it('passes when valid development configuration is provided', () => {
    const env = {
      PUBLIC_SUPABASE_URL: 'https://xyz.supabase.co',
      PUBLIC_SUPABASE_ANON_KEY: 'anon-key-sample',
      NODE_ENV: 'development',
    };
    const config = loadAppConfig(env);
    expect(config.PUBLIC_SUPABASE_URL).toBe('https://xyz.supabase.co');
    expect(config.PUBLIC_SUPABASE_ANON_KEY).toBe('anon-key-sample');
    expect(config.NODE_ENV).toBe('development');
  });

  it('fails when PUBLIC_SUPABASE_URL is invalid URL', () => {
    const env = {
      PUBLIC_SUPABASE_URL: 'invalid-url',
      PUBLIC_SUPABASE_ANON_KEY: 'anon-key-sample',
    };
    expect(() => loadAppConfig(env)).toThrow('[TxtGrph Config Error]');
  });

  it('fails when PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    const env = {
      PUBLIC_SUPABASE_URL: 'https://xyz.supabase.co',
      PUBLIC_SUPABASE_ANON_KEY: '',
    };
    expect(() => loadAppConfig(env)).toThrow('[TxtGrph Config Error]');
  });

  it('defaults NODE_ENV to development when unset', () => {
    const env = {
      PUBLIC_SUPABASE_URL: 'https://xyz.supabase.co',
      PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    };
    const config = loadAppConfig(env);
    expect(config.NODE_ENV).toBe('development');
  });

  it('fails in production when SUPABASE_SERVICE_ROLE_KEY or VAULT_ROOT_KEY is missing/short', () => {
    const env = {
      PUBLIC_SUPABASE_URL: 'https://xyz.supabase.co',
      PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      NODE_ENV: 'production',
    };
    expect(() => loadAppConfig(env)).toThrow('[TxtGrph Config Error]');
  });

  it('passes in production when all security keys are valid', () => {
    const env = {
      PUBLIC_SUPABASE_URL: 'https://xyz.supabase.co',
      PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-valid',
      VAULT_ROOT_KEY: '12345678901234567890123456789012', // 32 chars
      NODE_ENV: 'production',
    };
    const config = loadAppConfig(env);
    expect(config.VAULT_ROOT_KEY).toHaveLength(32);
  });
});
