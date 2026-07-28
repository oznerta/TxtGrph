/**
 * Client-side WebCrypto Envelope Encryption (AES-256-GCM)
 */

const SALT = new TextEncoder().encode('txtgrph-byok-vault-salt-v1');

async function deriveKey(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const masterMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(`txtgrph-user-master-${userId}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    masterMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts raw API key into Base64 ciphertext payload.
 */
export async function encryptApiKey(apiKey: string, userId: string): Promise<string> {
  const key = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(apiKey);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts Base64 ciphertext payload back into raw API key.
 */
export async function decryptApiKey(encryptedPayload: string, userId: string): Promise<string> {
  const key = await deriveKey(userId);
  const binaryString = atob(encryptedPayload);
  const combined = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    combined[i] = binaryString.charCodeAt(i);
  }

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Generates a safe visual hint (e.g. "sk-ant-...a3f9") for key confirmation in UI.
 */
export function generateKeyHint(apiKey: string): string {
  if (!apiKey) return '';
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) return '••••' + trimmed.slice(-2);
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}
