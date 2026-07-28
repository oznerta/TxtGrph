import { describe, it, expect } from 'vitest';
import { encryptApiKey, decryptApiKey, generateKeyHint } from './crypto';

describe('crypto utilities', () => {
  it('encrypts and decrypts an API key accurately', async () => {
    const rawKey = 'sk-proj-test12345678901234567890';
    const userId = 'user-uuid-1234-5678';

    const encrypted = await encryptApiKey(rawKey, userId);
    expect(encrypted).not.toBe(rawKey);
    expect(typeof encrypted).toBe('string');

    const decrypted = await decryptApiKey(encrypted, userId);
    expect(decrypted).toBe(rawKey);
  });

  it('generates visual key hints properly', () => {
    expect(generateKeyHint('sk-ant-api03-1234567890')).toBe('sk-ant...7890');
    expect(generateKeyHint('short')).toBe('••••rt');
  });
});
